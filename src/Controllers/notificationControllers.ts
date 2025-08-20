import type { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import db from "../Config/db";
import type { NotificationType, NotificationPriority, NotificationCreationAttributes } from "../Models/Notification";
import {
  isValidUUID,
  normalizeNotificationType,
  normalizeNotificationPriority,
  normalizeTitle,
  normalizeMessage,
  isValidURL,
  calculateExpiryDate,
  isNotificationExpired,
  shouldAutoRead,
  canDeleteNotification,
  canMarkAsRead,
  canCreateBulkNotifications,
  buildNotificationFilters,
  normalizePagination,
  calculateNotificationStats,
  createReservationConfirmedNotification,
  createPaymentReceivedNotification,
  createReminderNotification,
  createAchievementNotification,
  createSystemNotification,
} from "../Utils/notificationHelpers";

const { Notification, User, conn } = db;

// ========= Includes para relaciones =========
const includeBasics = [
  {
    model: User,
    as: "user",
    attributes: ["id", "fullName", "email"],
  },
];

const includeDetailed = [
  {
    model: User,
    as: "user",
    attributes: ["id", "fullName", "email", "phone"],
  },
];

// ========= Create Notification =========
/**
 * POST /notifications
 * Crea una nueva notificación
 */
export const createNotification = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const {
      userId,
      title,
      message,
      type,
      priority = "medium",
      actionUrl,
      metadata,
      expiresAt,
    } = req.body;

    // Validar que el usuario destino existe
    const targetUser = await User.findByPk(userId, { transaction: t });
    if (!targetUser) {
      await t.rollback();
      return res.status(404).json({ error: "Usuario destinatario no encontrado" });
    }

    // Normalizar y validar datos
    const normalizedTitle = normalizeTitle(title);
    const normalizedMessage = normalizeMessage(message);
    const normalizedType = normalizeNotificationType(type);
    const normalizedPriority = normalizeNotificationPriority(priority);

    // Validar URL si se proporciona
    if (actionUrl && !isValidURL(actionUrl)) {
      await t.rollback();
      return res.status(400).json({ error: "URL de acción inválida" });
    }

    const notificationData: NotificationCreationAttributes = {
      userId,
      title: normalizedTitle,
      message: normalizedMessage,
      type: normalizedType,
      priority: normalizedPriority,
      actionUrl: actionUrl || null,
      metadata: metadata || null,
      expiresAt: expiresAt ? new Date(expiresAt) : calculateExpiryDate(normalizedType),
    };

    // Auto-marcar como leída si es necesario
    if (shouldAutoRead(normalizedType)) {
      notificationData.isRead = true;
      notificationData.readAt = new Date();
    }

    const notification = await Notification.create(notificationData, { transaction: t });
    await t.commit();

    const notificationWithDetails = await Notification.findByPk(notification.id, {
      include: includeDetailed,
    });

    return res.status(201).json({
      message: "Notificación creada exitosamente",
      notification: notificationWithDetails,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error creando notificación:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Get Notification by ID =========
/**
 * GET /notifications/:id
 * Obtiene una notificación por su ID
 */
export const getNotificationById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de notificación inválido" });
    }

    const notification = await Notification.findByPk(id, { include: includeDetailed });
    if (!notification) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    // Verificar permisos (solo el propietario o admin/staff)
    if (notification.userId !== req.user.id && !["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permisos para ver esta notificación" });
    }

    return res.json({
      message: "Notificación encontrada",
      notification,
      isExpired: isNotificationExpired(notification.expiresAt),
      canDelete: canDeleteNotification(
        notification.isRead,
        notification.createdAt,
        req.user.id,
        notification.userId
      ),
      canMarkAsRead: canMarkAsRead(notification.isRead),
    });
  } catch (err: any) {
    console.error("Error obteniendo notificación:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= List Notifications =========
/**
 * GET /notifications
 * Lista notificaciones con filtros
 */
export const listNotifications = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      type,
      priority,
      isRead,
      createdFrom,
      createdTo,
      includeExpired,
      page,
      pageSize,
    } = req.query as {
      userId?: string;
      type?: NotificationType;
      priority?: NotificationPriority;
      isRead?: string;
      createdFrom?: string;
      createdTo?: string;
      includeExpired?: string;
      page?: string;
      pageSize?: string;
    };

    // Los usuarios normales solo pueden ver sus notificaciones
    let targetUserId = userId;
    if (req.user.role === "customer") {
      targetUserId = req.user.id;
    }

    // Construir filtros
    const where = buildNotificationFilters({
      userId: targetUserId,
      type,
      priority,
      isRead: isRead !== undefined ? isRead === "true" : undefined,
      createdFrom,
      createdTo,
      includeExpired: includeExpired === "true",
    });

    // Paginación
    const pagination = normalizePagination(page, pageSize);

    const { rows, count } = await Notification.findAndCountAll({
      where,
      include: includeBasics,
      order: [
        ["isRead", "ASC"], // No leídas primero
        ["priority", "DESC"], // Prioridad alta primero
        ["createdAt", "DESC"], // Más recientes primero
      ],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    const stats = calculateNotificationStats(rows);

    return res.json({
      message: "Notificaciones obtenidas exitosamente",
      items: rows,
      pagination: {
        total: count,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(count / pagination.pageSize),
      },
      stats,
    });
  } catch (err: any) {
    console.error("Error listando notificaciones:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Get User Notifications =========
/**
 * GET /notifications/user/:userId
 * Obtiene notificaciones de un usuario específico
 */
export const getUserNotifications = async (
  req: Request<{ userId: string }>,
  res: Response
) => {
  try {
    const { userId } = req.params;
    const { 
      unreadOnly,
      type,
      priority,
      page,
      pageSize 
    } = req.query as {
      unreadOnly?: string;
      type?: NotificationType;
      priority?: NotificationPriority;
      page?: string;
      pageSize?: string;
    };

    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    // Verificar permisos
    if (userId !== req.user.id && !["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permisos para ver estas notificaciones" });
    }

    const where = buildNotificationFilters({
      userId,
      type,
      priority,
      isRead: unreadOnly === "true" ? false : undefined,
      includeExpired: false, // No incluir expiradas por defecto
    });

    const pagination = normalizePagination(page, pageSize);

    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [
        ["isRead", "ASC"],
        ["priority", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.json({
      message: "Notificaciones del usuario obtenidas exitosamente",
      items: rows,
      pagination: {
        total: count,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(count / pagination.pageSize),
      },
      stats: calculateNotificationStats(rows),
    });
  } catch (err: any) {
    console.error("Error obteniendo notificaciones del usuario:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Mark as Read =========
/**
 * POST /notifications/:id/read
 * Marca una notificación como leída
 */
export const markAsRead = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de notificación inválido" });
    }

    const notification = await Notification.findByPk(id, { transaction: t });
    if (!notification) {
      await t.rollback();
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    // Verificar permisos
    if (notification.userId !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ error: "No tienes permisos para modificar esta notificación" });
    }

    if (!canMarkAsRead(notification.isRead)) {
      await t.rollback();
      return res.status(409).json({ error: "La notificación ya está marcada como leída" });
    }

    await notification.update({
      isRead: true,
      readAt: new Date(),
    }, { transaction: t });

    await t.commit();

    const updatedNotification = await Notification.findByPk(notification.id, {
      include: includeDetailed,
    });

    return res.json({
      message: "Notificación marcada como leída",
      notification: updatedNotification,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error marcando como leída:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Mark All as Read =========
/**
 * POST /notifications/mark-all-read
 * Marca todas las notificaciones del usuario como leídas
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const userId = req.user.id;

    const [updatedCount] = await Notification.update({
      isRead: true,
      readAt: new Date(),
    }, {
      where: {
        userId,
        isRead: false,
      },
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: `${updatedCount} notificaciones marcadas como leídas`,
      updatedCount,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error marcando todas como leídas:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Delete Notification =========
/**
 * DELETE /notifications/:id
 * Elimina una notificación
 */
export const deleteNotification = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de notificación inválido" });
    }

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    if (!canDeleteNotification(
      notification.isRead,
      notification.createdAt,
      req.user.id,
      notification.userId
    )) {
      return res.status(409).json({ 
        error: "No se puede eliminar esta notificación. Solo se pueden eliminar notificaciones leídas o muy antiguas." 
      });
    }

    await notification.destroy();

    return res.json({
      message: "Notificación eliminada exitosamente",
      deletedId: id,
    });
  } catch (err: any) {
    console.error("Error eliminando notificación:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Bulk Create Notifications =========
/**
 * POST /notifications/bulk
 * Crea notificaciones masivas para múltiples usuarios
 */
export const bulkCreateNotifications = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const {
      userIds,
      title,
      message,
      type,
      priority = "medium",
      actionUrl,
      metadata,
    } = req.body;

    // Validar parámetros
    const validation = canCreateBulkNotifications(userIds);
    if (!validation.valid) {
      await t.rollback();
      return res.status(400).json({ error: validation.error });
    }

    // Normalizar datos
    const normalizedTitle = normalizeTitle(title);
    const normalizedMessage = normalizeMessage(message);
    const normalizedType = normalizeNotificationType(type);
    const normalizedPriority = normalizeNotificationPriority(priority);

    // Verificar que todos los usuarios existen
    const existingUsers = await User.findAll({
      where: { id: userIds },
      attributes: ["id"],
      transaction: t,
    });

    const existingUserIds = existingUsers.map(u => u.id);
    const nonExistentUsers = userIds.filter((id: string) => !existingUserIds.includes(id));

    if (nonExistentUsers.length > 0) {
      await t.rollback();
      return res.status(400).json({ 
        error: `Usuarios no encontrados: ${nonExistentUsers.join(", ")}` 
      });
    }

    // Crear notificaciones
    const notificationsData = existingUserIds.map(userId => ({
      userId,
      title: normalizedTitle,
      message: normalizedMessage,
      type: normalizedType,
      priority: normalizedPriority,
      actionUrl: actionUrl || null,
      metadata: metadata || null,
      expiresAt: calculateExpiryDate(normalizedType),
      isRead: shouldAutoRead(normalizedType),
      readAt: shouldAutoRead(normalizedType) ? new Date() : null,
    }));

    const createdNotifications = await Notification.bulkCreate(notificationsData, { 
      transaction: t 
    });

    await t.commit();

    return res.status(201).json({
      message: `${createdNotifications.length} notificaciones creadas exitosamente`,
      created: createdNotifications.length,
      notifications: createdNotifications,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error en creación masiva:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Create Template Notifications =========
/**
 * POST /notifications/templates/reservation-confirmed
 * Crea notificación usando plantilla de reserva confirmada
 */
export const createReservationConfirmedTemplate = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const { userId, reservationId, courtName, date, time } = req.body;

    const templateData = createReservationConfirmedNotification(
      userId,
      reservationId,
      courtName,
      date,
      time
    );

    const notification = await Notification.create(templateData, { transaction: t });
    await t.commit();

    const notificationWithDetails = await Notification.findByPk(notification.id, {
      include: includeDetailed,
    });

    return res.status(201).json({
      message: "Notificación de reserva confirmada creada",
      notification: notificationWithDetails,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error creando notificación de reserva:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

/**
 * POST /notifications/templates/payment-received
 * Crea notificación usando plantilla de pago recibido
 */
export const createPaymentReceivedTemplate = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const { userId, paymentId, amount, currency } = req.body;

    const templateData = createPaymentReceivedNotification(
      userId,
      paymentId,
      amount,
      currency
    );

    const notification = await Notification.create(templateData, { transaction: t });
    await t.commit();

    const notificationWithDetails = await Notification.findByPk(notification.id, {
      include: includeDetailed,
    });

    return res.status(201).json({
      message: "Notificación de pago recibido creada",
      notification: notificationWithDetails,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error creando notificación de pago:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Get Notification Stats =========
/**
 * GET /notifications/stats
 * Obtiene estadísticas de notificaciones
 */
export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      dateFrom,
      dateTo,
      type,
      priority,
    } = req.query as {
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
      type?: NotificationType;
      priority?: NotificationPriority;
    };

    // Los usuarios normales solo pueden ver sus estadísticas
    let targetUserId = userId;
    if (req.user.role === "customer") {
      targetUserId = req.user.id;
    }

    const where = buildNotificationFilters({
      userId: targetUserId,
      type,
      priority,
      createdFrom: dateFrom,
      createdTo: dateTo,
      includeExpired: true,
    });

    const notifications = await Notification.findAll({ where });
    const stats = calculateNotificationStats(notifications);

    return res.json({
      message: "Estadísticas de notificaciones obtenidas exitosamente",
      period: {
        from: dateFrom || null,
        to: dateTo || null,
      },
      stats,
      userId: targetUserId || "all",
    });
  } catch (err: any) {
    console.error("Error obteniendo estadísticas:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
