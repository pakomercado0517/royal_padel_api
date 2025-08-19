import { NotificationType, NotificationPriority } from "../Models/Notification";

// ========= Constantes =========
export const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  "reservation_confirmed",
  "payment_received", 
  "reminder",
  "system",
  "achievement"
];

export const VALID_NOTIFICATION_PRIORITIES: NotificationPriority[] = [
  "low",
  "medium", 
  "high",
  "urgent"
];

// Límites de texto
export const MAX_TITLE_LENGTH = 255;
export const MAX_MESSAGE_LENGTH = 2000;

// Configuración de expiración por tipo (en días)
export const NOTIFICATION_EXPIRY_DAYS = {
  reservation_confirmed: 30,
  payment_received: 90,
  reminder: 1,
  system: 365,
  achievement: 365
};

// Configuración de auto-read por tipo
export const AUTO_READ_TYPES = ["system"]; // Tipos que se marcan automáticamente como leídos

// ========= Validaciones =========

/**
 * Valida que un tipo de notificación sea válido
 */
export const isValidNotificationType = (type: string): type is NotificationType => {
  return VALID_NOTIFICATION_TYPES.includes(type as NotificationType);
};

/**
 * Valida que una prioridad de notificación sea válida
 */
export const isValidNotificationPriority = (priority: string): priority is NotificationPriority => {
  return VALID_NOTIFICATION_PRIORITIES.includes(priority as NotificationPriority);
};

/**
 * Valida que un URL sea válido (opcional)
 */
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Valida que un UUID sea válido
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Valida longitud de título
 */
export const isValidTitle = (title: string): boolean => {
  return typeof title === 'string' && title.length > 0 && title.length <= MAX_TITLE_LENGTH;
};

/**
 * Valida longitud de mensaje
 */
export const isValidMessage = (message: string): boolean => {
  return typeof message === 'string' && message.length > 0 && message.length <= MAX_MESSAGE_LENGTH;
};

// ========= Helpers de normalización =========

/**
 * Normaliza tipo de notificación
 */
export const normalizeNotificationType = (type: string): NotificationType => {
  const normalized = type.toLowerCase().trim() as NotificationType;
  if (!isValidNotificationType(normalized)) {
    throw new Error(`Tipo de notificación inválido: ${type}`);
  }
  return normalized;
};

/**
 * Normaliza prioridad de notificación
 */
export const normalizeNotificationPriority = (priority: string): NotificationPriority => {
  const normalized = priority.toLowerCase().trim() as NotificationPriority;
  if (!isValidNotificationPriority(normalized)) {
    throw new Error(`Prioridad de notificación inválida: ${priority}`);
  }
  return normalized;
};

/**
 * Normaliza título (limpia espacios y limita longitud)
 */
export const normalizeTitle = (title: string): string => {
  const normalized = title.trim().substring(0, MAX_TITLE_LENGTH);
  if (!normalized) {
    throw new Error("El título no puede estar vacío");
  }
  return normalized;
};

/**
 * Normaliza mensaje (limpia espacios y limita longitud)
 */
export const normalizeMessage = (message: string): string => {
  const normalized = message.trim().substring(0, MAX_MESSAGE_LENGTH);
  if (!normalized) {
    throw new Error("El mensaje no puede estar vacío");
  }
  return normalized;
};

// ========= Helpers de fecha y expiración =========

/**
 * Calcula fecha de expiración basada en el tipo de notificación
 */
export const calculateExpiryDate = (type: NotificationType, createdAt: Date = new Date()): Date => {
  const days = NOTIFICATION_EXPIRY_DAYS[type] || 30;
  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + days);
  return expiryDate;
};

/**
 * Verifica si una notificación ha expirado
 */
export const isNotificationExpired = (expiresAt: Date | null): boolean => {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
};

/**
 * Verifica si una notificación debe marcarse automáticamente como leída
 */
export const shouldAutoRead = (type: NotificationType): boolean => {
  return AUTO_READ_TYPES.includes(type);
};

// ========= Helpers de filtros =========

/**
 * Construye filtros WHERE para consultas de notificaciones
 */
export const buildNotificationFilters = (filters: {
  userId?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  isRead?: boolean;
  createdFrom?: string;
  createdTo?: string;
  includeExpired?: boolean;
}) => {
  const where: any = {};
  
  if (filters.userId) {
    where.userId = filters.userId;
  }
  
  if (filters.type) {
    where.type = filters.type;
  }
  
  if (filters.priority) {
    where.priority = filters.priority;
  }
  
  if (filters.isRead !== undefined) {
    where.isRead = filters.isRead;
  }
  
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {};
    if (filters.createdFrom) {
      where.createdAt.gte = new Date(filters.createdFrom);
    }
    if (filters.createdTo) {
      where.createdAt.lte = new Date(filters.createdTo);
    }
  }
  
  // Excluir expiradas por defecto
  if (!filters.includeExpired) {
    where.expiresAt = {
      $or: [
        { $eq: null },
        { $gt: new Date() }
      ]
    };
  }
  
  return where;
};

// ========= Helpers de formato =========

/**
 * Formatea tipo de notificación para mostrar al usuario
 */
export const formatNotificationType = (type: NotificationType): string => {
  const types: Record<NotificationType, string> = {
    reservation_confirmed: "Reserva Confirmada",
    payment_received: "Pago Recibido",
    reminder: "Recordatorio",
    system: "Sistema",
    achievement: "Logro"
  };
  
  return types[type];
};

/**
 * Formatea prioridad de notificación para mostrar al usuario
 */
export const formatNotificationPriority = (priority: NotificationPriority): string => {
  const priorities: Record<NotificationPriority, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente"
  };
  
  return priorities[priority];
};

/**
 * Obtiene emoji para la prioridad
 */
export const getPriorityEmoji = (priority: NotificationPriority): string => {
  const emojis: Record<NotificationPriority, string> = {
    low: "📘",
    medium: "📙", 
    high: "📕",
    urgent: "🚨"
  };
  
  return emojis[priority];
};

/**
 * Obtiene emoji para el tipo
 */
export const getTypeEmoji = (type: NotificationType): string => {
  const emojis: Record<NotificationType, string> = {
    reservation_confirmed: "✅",
    payment_received: "💰",
    reminder: "⏰",
    system: "🔧",
    achievement: "🏆"
  };
  
  return emojis[type];
};

// ========= Helpers de paginación =========

/**
 * Normaliza parámetros de paginación
 */
export const normalizePagination = (page?: string, pageSize?: string) => {
  const normalizedPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const normalizedPageSize = Math.max(1, Math.min(100, parseInt(pageSize || "20", 10) || 20));
  const offset = (normalizedPage - 1) * normalizedPageSize;
  
  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    offset,
    limit: normalizedPageSize
  };
};

// ========= Helpers de estadísticas =========

/**
 * Calcula estadísticas de notificaciones
 */
export const calculateNotificationStats = (notifications: any[]) => {
  const total = notifications.length;
  const read = notifications.filter(n => n.isRead).length;
  const unread = total - read;
  const expired = notifications.filter(n => isNotificationExpired(n.expiresAt)).length;
  
  const byType = notifications.reduce((acc, notification) => {
    const type = notification.type;
    if (!acc[type]) {
      acc[type] = { total: 0, read: 0, unread: 0 };
    }
    acc[type].total++;
    if (notification.isRead) {
      acc[type].read++;
    } else {
      acc[type].unread++;
    }
    return acc;
  }, {} as Record<string, any>);
  
  const byPriority = notifications.reduce((acc, notification) => {
    const priority = notification.priority;
    if (!acc[priority]) {
      acc[priority] = { total: 0, read: 0, unread: 0 };
    }
    acc[priority].total++;
    if (notification.isRead) {
      acc[priority].read++;
    } else {
      acc[priority].unread++;
    }
    return acc;
  }, {} as Record<string, any>);
  
  return {
    total,
    read,
    unread,
    expired,
    readRate: total > 0 ? Math.round((read / total) * 100) : 0,
    byType,
    byPriority,
  };
};

// ========= Helpers de plantillas =========

/**
 * Genera plantilla de notificación para reserva confirmada
 */
export const createReservationConfirmedNotification = (
  userId: string,
  reservationId: string,
  courtName: string,
  date: string,
  time: string
) => {
  return {
    userId,
    title: "¡Reserva Confirmada!",
    message: `Tu reserva en ${courtName} para el ${date} a las ${time} ha sido confirmada exitosamente.`,
    type: "reservation_confirmed" as NotificationType,
    priority: "medium" as NotificationPriority,
    actionUrl: `/reservations/${reservationId}`,
    metadata: {
      reservationId,
      courtName,
      date,
      time
    },
    expiresAt: calculateExpiryDate("reservation_confirmed")
  };
};

/**
 * Genera plantilla de notificación para pago recibido
 */
export const createPaymentReceivedNotification = (
  userId: string,
  paymentId: string,
  amount: number,
  currency: string = "MXN"
) => {
  return {
    userId,
    title: "Pago Recibido",
    message: `Hemos recibido tu pago de $${amount} ${currency}. Gracias por tu preferencia.`,
    type: "payment_received" as NotificationType,
    priority: "medium" as NotificationPriority,
    actionUrl: `/payments/${paymentId}`,
    metadata: {
      paymentId,
      amount,
      currency
    },
    expiresAt: calculateExpiryDate("payment_received")
  };
};

/**
 * Genera plantilla de notificación de recordatorio
 */
export const createReminderNotification = (
  userId: string,
  title: string,
  message: string,
  actionUrl?: string
) => {
  return {
    userId,
    title: `⏰ ${title}`,
    message,
    type: "reminder" as NotificationType,
    priority: "high" as NotificationPriority,
    actionUrl: actionUrl || null,
    expiresAt: calculateExpiryDate("reminder")
  };
};

/**
 * Genera plantilla de notificación de logro
 */
export const createAchievementNotification = (
  userId: string,
  achievementName: string,
  description: string,
  points: number
) => {
  return {
    userId,
    title: `🏆 ¡Nuevo Logro Desbloqueado!`,
    message: `Has conseguido el logro "${achievementName}": ${description}. Has ganado ${points} puntos.`,
    type: "achievement" as NotificationType,
    priority: "medium" as NotificationPriority,
    actionUrl: `/profile/achievements`,
    metadata: {
      achievementName,
      points
    },
    expiresAt: calculateExpiryDate("achievement")
  };
};

/**
 * Genera plantilla de notificación del sistema
 */
export const createSystemNotification = (
  userId: string,
  title: string,
  message: string,
  priority: NotificationPriority = "low"
) => {
  return {
    userId,
    title: `🔧 ${title}`,
    message,
    type: "system" as NotificationType,
    priority,
    expiresAt: calculateExpiryDate("system")
  };
};

// ========= Helpers de validación de negocio =========

/**
 * Verifica si una notificación puede ser eliminada
 */
export const canDeleteNotification = (
  isRead: boolean,
  createdAt: Date,
  currentUserId: string,
  notificationUserId: string
): boolean => {
  // Solo el propietario puede eliminar
  if (currentUserId !== notificationUserId) {
    return false;
  }
  
  // Se pueden eliminar notificaciones leídas o muy antiguas (30+ días)
  if (isRead) return true;
  
  const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreated > 30;
};

/**
 * Verifica si una notificación puede ser marcada como leída
 */
export const canMarkAsRead = (isRead: boolean): boolean => {
  return !isRead;
};

/**
 * Verifica si se pueden crear notificaciones masivas
 */
export const canCreateBulkNotifications = (userIds: string[]): { valid: boolean; error?: string } => {
  if (!userIds || userIds.length === 0) {
    return { valid: false, error: "La lista de usuarios no puede estar vacía" };
  }
  
  if (userIds.length > 1000) {
    return { valid: false, error: "No se pueden enviar más de 1000 notificaciones a la vez" };
  }
  
  // Verificar UUIDs válidos
  for (const userId of userIds) {
    if (!isValidUUID(userId)) {
      return { valid: false, error: `UUID de usuario inválido: ${userId}` };
    }
  }
  
  return { valid: true };
};
