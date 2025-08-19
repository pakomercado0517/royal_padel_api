import { Router } from "express";
import { body, param, query } from "express-validator";
import * as ctrl from "../Controllers/notificationControllers";
import { authenticate, authorize } from "../Middleware/auth";
import { 
  VALID_NOTIFICATION_TYPES, 
  VALID_NOTIFICATION_PRIORITIES,
  MAX_TITLE_LENGTH,
  MAX_MESSAGE_LENGTH
} from "../Utils/notificationHelpers";

const router = Router();

// ========= Validation Schemas =========

// Validación para UUID
const validateUUID = (field: string) => 
  param(field)
    .isUUID(4)
    .withMessage(`${field} debe ser un UUID válido`);

// Validaciones para crear notificación
const createNotificationValidation = [
  body("userId")
    .isUUID(4)
    .withMessage("userId debe ser un UUID válido"),
  body("title")
    .isLength({ min: 1, max: MAX_TITLE_LENGTH })
    .withMessage(`title debe tener entre 1 y ${MAX_TITLE_LENGTH} caracteres`)
    .trim(),
  body("message")
    .isLength({ min: 1, max: MAX_MESSAGE_LENGTH })
    .withMessage(`message debe tener entre 1 y ${MAX_MESSAGE_LENGTH} caracteres`)
    .trim(),
  body("type")
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`type debe ser uno de: ${VALID_NOTIFICATION_TYPES.join(", ")}`),
  body("priority")
    .optional()
    .isIn(VALID_NOTIFICATION_PRIORITIES)
    .withMessage(`priority debe ser uno de: ${VALID_NOTIFICATION_PRIORITIES.join(", ")}`),
  body("actionUrl")
    .optional()
    .isURL()
    .withMessage("actionUrl debe ser una URL válida"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("metadata debe ser un objeto JSON válido"),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("expiresAt debe ser una fecha ISO8601 válida"),
];

// Validaciones para creación masiva
const bulkCreateValidation = [
  body("userIds")
    .isArray({ min: 1, max: 1000 })
    .withMessage("userIds debe ser un array con 1-1000 elementos"),
  body("userIds.*")
    .isUUID(4)
    .withMessage("Cada userId debe ser un UUID válido"),
  body("title")
    .isLength({ min: 1, max: MAX_TITLE_LENGTH })
    .withMessage(`title debe tener entre 1 y ${MAX_TITLE_LENGTH} caracteres`)
    .trim(),
  body("message")
    .isLength({ min: 1, max: MAX_MESSAGE_LENGTH })
    .withMessage(`message debe tener entre 1 y ${MAX_MESSAGE_LENGTH} caracteres`)
    .trim(),
  body("type")
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`type debe ser uno de: ${VALID_NOTIFICATION_TYPES.join(", ")}`),
  body("priority")
    .optional()
    .isIn(VALID_NOTIFICATION_PRIORITIES)
    .withMessage(`priority debe ser uno de: ${VALID_NOTIFICATION_PRIORITIES.join(", ")}`),
  body("actionUrl")
    .optional()
    .isURL()
    .withMessage("actionUrl debe ser una URL válida"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("metadata debe ser un objeto JSON válido"),
];

// Validaciones para listado
const listNotificationsValidation = [
  query("userId")
    .optional()
    .isUUID(4)
    .withMessage("userId debe ser un UUID válido"),
  query("type")
    .optional()
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`type debe ser uno de: ${VALID_NOTIFICATION_TYPES.join(", ")}`),
  query("priority")
    .optional()
    .isIn(VALID_NOTIFICATION_PRIORITIES)
    .withMessage(`priority debe ser uno de: ${VALID_NOTIFICATION_PRIORITIES.join(", ")}`),
  query("isRead")
    .optional()
    .isBoolean()
    .withMessage("isRead debe ser un booleano"),
  query("createdFrom")
    .optional()
    .isISO8601()
    .withMessage("createdFrom debe ser una fecha ISO8601 válida"),
  query("createdTo")
    .optional()
    .isISO8601()
    .withMessage("createdTo debe ser una fecha ISO8601 válida"),
  query("includeExpired")
    .optional()
    .isBoolean()
    .withMessage("includeExpired debe ser un booleano"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page debe ser un entero positivo"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("pageSize debe ser un entero entre 1 y 100"),
];

// Validaciones para notificaciones de usuario
const userNotificationsValidation = [
  validateUUID("userId"),
  query("unreadOnly")
    .optional()
    .isBoolean()
    .withMessage("unreadOnly debe ser un booleano"),
  query("type")
    .optional()
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`type debe ser uno de: ${VALID_NOTIFICATION_TYPES.join(", ")}`),
  query("priority")
    .optional()
    .isIn(VALID_NOTIFICATION_PRIORITIES)
    .withMessage(`priority debe ser uno de: ${VALID_NOTIFICATION_PRIORITIES.join(", ")}`),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page debe ser un entero positivo"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("pageSize debe ser un entero entre 1 y 100"),
];

// Validaciones para estadísticas
const statsValidation = [
  query("userId")
    .optional()
    .isUUID(4)
    .withMessage("userId debe ser un UUID válido"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom debe ser una fecha ISO8601 válida"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo debe ser una fecha ISO8601 válida"),
  query("type")
    .optional()
    .isIn(VALID_NOTIFICATION_TYPES)
    .withMessage(`type debe ser uno de: ${VALID_NOTIFICATION_TYPES.join(", ")}`),
  query("priority")
    .optional()
    .isIn(VALID_NOTIFICATION_PRIORITIES)
    .withMessage(`priority debe ser uno de: ${VALID_NOTIFICATION_PRIORITIES.join(", ")}`),
];

// Validaciones para plantilla de reserva confirmada
const reservationConfirmedTemplateValidation = [
  body("userId")
    .isUUID(4)
    .withMessage("userId debe ser un UUID válido"),
  body("reservationId")
    .isUUID(4)
    .withMessage("reservationId debe ser un UUID válido"),
  body("courtName")
    .isLength({ min: 1, max: 100 })
    .withMessage("courtName debe tener entre 1 y 100 caracteres")
    .trim(),
  body("date")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("date debe tener formato YYYY-MM-DD"),
  body("time")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("time debe tener formato HH:MM"),
];

// Validaciones para plantilla de pago recibido
const paymentReceivedTemplateValidation = [
  body("userId")
    .isUUID(4)
    .withMessage("userId debe ser un UUID válido"),
  body("paymentId")
    .isUUID(4)
    .withMessage("paymentId debe ser un UUID válido"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("amount debe ser un número positivo"),
  body("currency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("currency debe ser un código de 3 letras (ej: MXN, USD)"),
];

// ========= Routes =========

// Crear notificación - Solo staff y admin
router.post(
  "/",
  authenticate,
  authorize("staff", "admin"),
  createNotificationValidation,
  ctrl.createNotification
);

// Listar notificaciones - Usuarios ven solo las suyas, staff/admin ven todas
router.get(
  "/",
  authenticate,
  listNotificationsValidation,
  ctrl.listNotifications
);

// Obtener estadísticas - Usuarios ven solo las suyas, staff/admin ven todas
router.get(
  "/stats",
  authenticate,
  statsValidation,
  ctrl.getNotificationStats
);

// Marcar todas como leídas - Solo usuarios propios
router.post(
  "/mark-all-read",
  authenticate,
  ctrl.markAllAsRead
);

// Creación masiva - Solo admin
router.post(
  "/bulk",
  authenticate,
  authorize("admin"),
  bulkCreateValidation,
  ctrl.bulkCreateNotifications
);

// Plantillas de notificaciones - Solo staff/admin
router.post(
  "/templates/reservation-confirmed",
  authenticate,
  authorize("staff", "admin"),
  reservationConfirmedTemplateValidation,
  ctrl.createReservationConfirmedTemplate
);

router.post(
  "/templates/payment-received",
  authenticate,
  authorize("staff", "admin"),
  paymentReceivedTemplateValidation,
  ctrl.createPaymentReceivedTemplate
);

// Obtener notificaciones de usuario específico - Usuario propio, staff/admin cualquiera
router.get(
  "/user/:userId",
  authenticate,
  userNotificationsValidation,
  ctrl.getUserNotifications
);

// Obtener notificación por ID - Usuario propio, staff/admin cualquiera
router.get(
  "/:id",
  authenticate,
  validateUUID("id"),
  ctrl.getNotificationById
);

// Marcar como leída - Solo usuario propietario
router.post(
  "/:id/read",
  authenticate,
  validateUUID("id"),
  ctrl.markAsRead
);

// Eliminar notificación - Solo usuario propietario
router.delete(
  "/:id",
  authenticate,
  validateUUID("id"),
  ctrl.deleteNotification
);

export default router;
