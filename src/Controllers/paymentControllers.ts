import type { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import db from "../Config/db";
import type { PaymentMethod, PaymentStatus, PaymentCreationAttributes } from "../Models/Payment";
import {
  isValidUUID,
  normalizePaymentMethod,
  normalizeCurrency,
  normalizeAmount,
  canMarkAsCompleted,
  canRefund,
  canDelete,
  canUpdate,
  buildPaymentFilters,
  normalizePagination,
  calculatePaymentStats,
  isPaymentExpired,
  DEFAULT_CURRENCY,
} from "../Utils/paymentHelpers";

const { Payment, Reservation, User, conn } = db;

// ========= Includes para relaciones =========
const includeBasics = [
  {
    model: Reservation,
    as: "reservation",
    attributes: [
      "id",
      "courtId",
      "userId",
      "status",
      "date",
      "startTime",
      "endTime",
      "totalAmount",
      "currency",
    ],
  },
  {
    model: User,
    as: "user",
    attributes: ["id", "fullName", "email"],
  },
];

const includeDetailed = [
  {
    model: Reservation,
    as: "reservation",
    attributes: [
      "id",
      "courtId",
      "userId",
      "status",
      "date",
      "startTime",
      "endTime",
      "totalAmount",
      "currency",
      "notes",
    ],
  },
  {
    model: User,
    as: "user",
    attributes: ["id", "fullName", "email", "phone"],
  },
];

// ========= Create Payment =========
/**
 * POST /payments
 * Crea un nuevo pago para una reserva
 * body: { reservationId: string, amount: number, paymentMethod: PaymentMethod, currency?: string, paymentProvider?: string, externalPaymentId?: string, markAsCompleted?: boolean }
 */
export const createPayment = async (req: Request, res: Response) => {
  const t = await conn.transaction();
  try {
    const {
      reservationId,
      amount,
      paymentMethod,
      currency = DEFAULT_CURRENCY,
      paymentProvider,
      externalPaymentId,
      markAsCompleted = false,
    } = req.body;

    // Validaciones básicas
    if (!reservationId || !isValidUUID(reservationId)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de reservación inválido" });
    }

    // Encontrar la reservación
    const reservation = await Reservation.findByPk(reservationId, { transaction: t });
    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ error: "Reservación no encontrada" });
    }

    // Solo permitir pagos para reservas en ciertos estados
    if (!["pending", "confirmed"].includes(reservation.status)) {
      await t.rollback();
      return res.status(409).json({
        error: "Solo se pueden crear pagos para reservas pendientes o confirmadas",
      });
    }

    // Normalizar y validar datos
    const normalizedAmount = normalizeAmount(amount);
    const normalizedMethod = normalizePaymentMethod(paymentMethod);
    const normalizedCurrency = normalizeCurrency(currency);

    const paymentData: PaymentCreationAttributes = {
      reservationId: reservation.id,
      userId: reservation.userId,
      amount: normalizedAmount,
      currency: normalizedCurrency,
      paymentMethod: normalizedMethod,
      paymentProvider: paymentProvider || null,
      externalPaymentId: externalPaymentId || null,
      status: markAsCompleted ? "completed" : "pending",
    };

    if (markAsCompleted) {
      paymentData.processedAt = new Date();
    }

    const payment = await Payment.create(paymentData, { transaction: t });

    // Si se marca como completado y la reserva estaba pendiente, confirmarla
    if (markAsCompleted && reservation.status === "pending") {
      await reservation.update({ status: "confirmed" }, { transaction: t });
    }

    await t.commit();

    const paymentWithDetails = await Payment.findByPk(payment.id, {
      include: includeDetailed,
    });

    return res.status(201).json({
      message: "Pago creado exitosamente",
      payment: paymentWithDetails,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error creando pago:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Get Payment by ID =========
/**
 * GET /payments/:id
 * Obtiene un pago por su ID con detalles completos
 */
export const getPaymentById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const payment = await Payment.findByPk(id, { include: includeDetailed });
    if (!payment) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    return res.json({
      message: "Pago encontrado",
      payment,
      isExpired: isPaymentExpired(payment.createdAt, payment.status),
    });
  } catch (err: any) {
    console.error("Error obteniendo pago:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= List Payments =========
/**
 * GET /payments
 * Lista pagos con filtros avanzados y paginación
 * query: reservationId?, userId?, status?, paymentMethod?, processedFrom?, processedTo?, amountFrom?, amountTo?, currency?, paymentProvider?, page?, pageSize?
 */
export const listPayments = async (req: Request, res: Response) => {
  try {
    const {
      reservationId,
      userId,
      status,
      paymentMethod,
      processedFrom,
      processedTo,
      amountFrom,
      amountTo,
      currency,
      paymentProvider,
      page,
      pageSize,
    } = req.query as {
      reservationId?: string;
      userId?: string;
      status?: PaymentStatus;
      paymentMethod?: PaymentMethod;
      processedFrom?: string;
      processedTo?: string;
      amountFrom?: string;
      amountTo?: string;
      currency?: string;
      paymentProvider?: string;
      page?: string;
      pageSize?: string;
    };

    // Construir filtros usando helper
    const where = buildPaymentFilters({
      reservationId,
      userId,
      status,
      paymentMethod,
      processedFrom,
      processedTo,
      amountFrom: amountFrom ? parseFloat(amountFrom) : undefined,
      amountTo: amountTo ? parseFloat(amountTo) : undefined,
      currency,
      paymentProvider,
    });

    // Normalizar paginación
    const pagination = normalizePagination(page, pageSize);

    const { rows, count } = await Payment.findAndCountAll({
      where,
      include: includeBasics,
      order: [
        ["processedAt", "DESC NULLS LAST"],
        ["createdAt", "DESC"],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    // Calcular estadísticas si se solicitan
    const stats = calculatePaymentStats(rows);

    return res.json({
      message: "Pagos obtenidos exitosamente",
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
    console.error("Error listando pagos:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Get Payments by User =========
/**
 * GET /payments/user/:userId
 * Obtiene todos los pagos de un usuario específico
 */
export const getPaymentsByUser = async (
  req: Request<{ userId: string }>,
  res: Response
) => {
  try {
    const { userId } = req.params;
    const { page, pageSize, status } = req.query as {
      page?: string;
      pageSize?: string;
      status?: PaymentStatus;
    };

    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    const where: any = { userId };
    if (status) where.status = status;

    const pagination = normalizePagination(page, pageSize);

    const { rows, count } = await Payment.findAndCountAll({
      where,
      include: includeBasics,
      order: [
        ["processedAt", "DESC NULLS LAST"],
        ["createdAt", "DESC"],
      ],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return res.json({
      message: "Pagos del usuario obtenidos exitosamente",
      items: rows,
      pagination: {
        total: count,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(count / pagination.pageSize),
      },
      stats: calculatePaymentStats(rows),
    });
  } catch (err: any) {
    console.error("Error obteniendo pagos del usuario:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Update Payment =========
/**
 * PUT /payments/:id
 * Actualiza un pago (solo permitido para pagos pendientes)
 */
export const updatePayment = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const { id } = req.params;
    const { amount, paymentMethod, currency, paymentProvider, externalPaymentId } = req.body;

    if (!isValidUUID(id)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    if (!canUpdate(payment.status)) {
      await t.rollback();
      return res.status(409).json({
        error: "Solo se pueden actualizar pagos en estado pendiente",
      });
    }

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = normalizeAmount(amount);
    if (paymentMethod) updateData.paymentMethod = normalizePaymentMethod(paymentMethod);
    if (currency) updateData.currency = normalizeCurrency(currency);
    if (paymentProvider !== undefined) updateData.paymentProvider = paymentProvider;
    if (externalPaymentId !== undefined) updateData.externalPaymentId = externalPaymentId;

    await payment.update(updateData, { transaction: t });
    await t.commit();

    const updatedPayment = await Payment.findByPk(payment.id, {
      include: includeDetailed,
    });

    return res.json({
      message: "Pago actualizado exitosamente",
      payment: updatedPayment,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error actualizando pago:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Mark Payment as Completed =========
/**
 * POST /payments/:id/complete
 * Marca un pago como completado
 */
export const markPaymentAsCompleted = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const { id } = req.params;
    const { externalPaymentId, paymentProvider } = req.body;

    if (!isValidUUID(id)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    if (payment.status === "completed") {
      await t.rollback();
      return res.json({ 
        message: "El pago ya está completado",
        payment
      });
    }

    if (!canMarkAsCompleted(payment.status)) {
      await t.rollback();
      return res.status(409).json({
        error: "Solo se pueden completar pagos en estado pendiente",
      });
    }

    // Obtener la reservación para actualizarla si es necesario
    const reservation = await Reservation.findByPk(payment.reservationId, {
      transaction: t,
    });

    if (!reservation) {
      await t.rollback();
      return res.status(404).json({ error: "Reservación asociada no encontrada" });
    }

    const updateData: any = {
      status: "completed",
      processedAt: new Date(),
    };

    if (externalPaymentId) updateData.externalPaymentId = externalPaymentId;
    if (paymentProvider) updateData.paymentProvider = paymentProvider;

    await payment.update(updateData, { transaction: t });

    // Si la reservación estaba pendiente, confirmarla
    if (reservation.status === "pending") {
      await reservation.update({ status: "confirmed" }, { transaction: t });
    }

    await t.commit();

    const completedPayment = await Payment.findByPk(payment.id, {
      include: includeDetailed,
    });

    return res.json({
      message: "Pago marcado como completado exitosamente",
      payment: completedPayment,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error completando pago:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Refund Payment =========
/**
 * POST /payments/:id/refund
 * Reembolsa un pago completado
 */
export const refundPayment = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const { id } = req.params;
    const { refundAmount, reason } = req.body;

    if (!isValidUUID(id)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    if (!canRefund(payment.status)) {
      await t.rollback();
      return res.status(409).json({
        error: "Solo se pueden reembolsar pagos completados",
      });
    }

    const finalRefundAmount = refundAmount ? normalizeAmount(refundAmount) : payment.amount;

    // Validar que el monto de reembolso no sea mayor al monto original
    if (finalRefundAmount > payment.amount) {
      await t.rollback();
      return res.status(400).json({
        error: "El monto de reembolso no puede ser mayor al monto original",
      });
    }

    await payment.update(
      {
        status: "refunded",
        refundedAt: new Date(),
        refundAmount: finalRefundAmount,
      },
      { transaction: t }
    );

    await t.commit();

    const refundedPayment = await Payment.findByPk(payment.id, {
      include: includeDetailed,
    });

    return res.json({
      message: "Pago reembolsado exitosamente",
      payment: refundedPayment,
      refundAmount: finalRefundAmount,
      reason: reason || null,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error reembolsando pago:", err);
    return res.status(500).json({ error: err?.message || "Error interno del servidor" });
  }
};

// ========= Mark Payment as Failed =========
/**
 * POST /payments/:id/fail
 * Marca un pago como fallido
 */
export const markPaymentAsFailed = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  const t = await conn.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidUUID(id)) {
      await t.rollback();
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const payment = await Payment.findByPk(id, { transaction: t });
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    if (payment.status !== "pending") {
      await t.rollback();
      return res.status(409).json({
        error: "Solo se pueden marcar como fallidos pagos pendientes",
      });
    }

    await payment.update(
      {
        status: "failed",
        processedAt: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    const failedPayment = await Payment.findByPk(payment.id, {
      include: includeDetailed,
    });

    return res.json({
      message: "Pago marcado como fallido",
      payment: failedPayment,
      reason: reason || null,
    });
  } catch (err: any) {
    await t.rollback();
    console.error("Error marcando pago como fallido:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Delete Payment =========
/**
 * DELETE /payments/:id
 * Elimina un pago (solo permitido para pagos pendientes o fallidos)
 */
export const deletePayment = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: "ID de pago inválido" });
    }

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    if (!canDelete(payment.status)) {
      return res.status(409).json({
        error: "Solo se pueden eliminar pagos pendientes o fallidos",
      });
    }

    await payment.destroy();

    return res.json({ 
      message: "Pago eliminado exitosamente",
      deletedId: id 
    });
  } catch (err: any) {
    console.error("Error eliminando pago:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ========= Get Payment Statistics =========
/**
 * GET /payments/stats
 * Obtiene estadísticas de pagos con filtros opcionales
 */
export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      dateFrom,
      dateTo,
      paymentMethod,
      currency = DEFAULT_CURRENCY,
    } = req.query as {
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
      paymentMethod?: PaymentMethod;
      currency?: string;
    };

    const where: any = {};
    if (userId) {
      if (!isValidUUID(userId)) {
        return res.status(400).json({ error: "ID de usuario inválido" });
      }
      where.userId = userId;
    }

    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (currency) where.currency = currency.toUpperCase();

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    const payments = await Payment.findAll({ where });
    const stats = calculatePaymentStats(payments);

    // Estadísticas por método de pago
    const statsByMethod = {};
    for (const method of ["card", "cash", "transfer", "wallet"]) {
      const methodPayments = payments.filter(p => p.paymentMethod === method);
      statsByMethod[method] = calculatePaymentStats(methodPayments);
    }

    return res.json({
      message: "Estadísticas obtenidas exitosamente",
      overall: stats,
      byPaymentMethod: statsByMethod,
      period: {
        from: dateFrom || null,
        to: dateTo || null,
      },
      currency,
    });
  } catch (err: any) {
    console.error("Error obteniendo estadísticas de pagos:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
