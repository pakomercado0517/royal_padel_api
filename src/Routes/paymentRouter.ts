import { Router } from "express";
import { body, param, query } from "express-validator";
import * as ctrl from "../Controllers/paymentControllers";
import { authenticate, authorize } from "../Middleware/auth";
import { VALID_PAYMENT_METHODS, ALLOWED_CURRENCIES, MIN_PAYMENT_AMOUNT, MAX_PAYMENT_AMOUNT } from "../Utils/paymentHelpers";

const router = Router();

// ========= Validation Schemas =========

// Validación para UUID
const validateUUID = (field: string) => 
  param(field)
    .isUUID(4)
    .withMessage(`${field} debe ser un UUID válido`);

// Validaciones para crear pago
const createPaymentValidation = [
  body("reservationId")
    .isUUID(4)
    .withMessage("reservationId debe ser un UUID válido"),
  body("amount")
    .isFloat({ min: MIN_PAYMENT_AMOUNT, max: MAX_PAYMENT_AMOUNT })
    .withMessage(`amount debe ser un número entre ${MIN_PAYMENT_AMOUNT} y ${MAX_PAYMENT_AMOUNT}`),
  body("paymentMethod")
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage(`paymentMethod debe ser uno de: ${VALID_PAYMENT_METHODS.join(", ")}`),
  body("currency")
    .optional()
    .isIn(ALLOWED_CURRENCIES)
    .withMessage(`currency debe ser una de: ${ALLOWED_CURRENCIES.join(", ")}`),
  body("paymentProvider")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("paymentProvider debe tener entre 1 y 100 caracteres"),
  body("externalPaymentId")
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage("externalPaymentId debe tener entre 1 y 255 caracteres"),
  body("markAsCompleted")
    .optional()
    .isBoolean()
    .withMessage("markAsCompleted debe ser un booleano"),
];

// Validaciones para actualizar pago
const updatePaymentValidation = [
  validateUUID("id"),
  body("amount")
    .optional()
    .isFloat({ min: MIN_PAYMENT_AMOUNT, max: MAX_PAYMENT_AMOUNT })
    .withMessage(`amount debe ser un número entre ${MIN_PAYMENT_AMOUNT} y ${MAX_PAYMENT_AMOUNT}`),
  body("paymentMethod")
    .optional()
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage(`paymentMethod debe ser uno de: ${VALID_PAYMENT_METHODS.join(", ")}`),
  body("currency")
    .optional()
    .isIn(ALLOWED_CURRENCIES)
    .withMessage(`currency debe ser una de: ${ALLOWED_CURRENCIES.join(", ")}`),
  body("paymentProvider")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("paymentProvider debe tener entre 1 y 100 caracteres"),
  body("externalPaymentId")
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage("externalPaymentId debe tener entre 1 y 255 caracteres"),
];

// Validaciones para marcar como completado
const markAsCompletedValidation = [
  validateUUID("id"),
  body("externalPaymentId")
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage("externalPaymentId debe tener entre 1 y 255 caracteres"),
  body("paymentProvider")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("paymentProvider debe tener entre 1 y 100 caracteres"),
];

// Validaciones para reembolso
const refundValidation = [
  validateUUID("id"),
  body("refundAmount")
    .optional()
    .isFloat({ min: MIN_PAYMENT_AMOUNT })
    .withMessage(`refundAmount debe ser un número mayor a ${MIN_PAYMENT_AMOUNT}`),
  body("reason")
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage("reason debe tener entre 1 y 500 caracteres"),
];

// Validaciones para marcar como fallido
const markAsFailedValidation = [
  validateUUID("id"),
  body("reason")
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage("reason debe tener entre 1 y 500 caracteres"),
];

// Validaciones para listado
const listPaymentsValidation = [
  query("reservationId")
    .optional()
    .isUUID(4)
    .withMessage("reservationId debe ser un UUID válido"),
  query("userId")
    .optional()
    .isUUID(4)
    .withMessage("userId debe ser un UUID válido"),
  query("status")
    .optional()
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("status debe ser: pending, completed, failed, o refunded"),
  query("paymentMethod")
    .optional()
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage(`paymentMethod debe ser uno de: ${VALID_PAYMENT_METHODS.join(", ")}`),
  query("processedFrom")
    .optional()
    .isISO8601()
    .withMessage("processedFrom debe ser una fecha ISO8601 válida"),
  query("processedTo")
    .optional()
    .isISO8601()
    .withMessage("processedTo debe ser una fecha ISO8601 válida"),
  query("amountFrom")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("amountFrom debe ser un número positivo"),
  query("amountTo")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("amountTo debe ser un número positivo"),
  query("currency")
    .optional()
    .isIn(ALLOWED_CURRENCIES)
    .withMessage(`currency debe ser una de: ${ALLOWED_CURRENCIES.join(", ")}`),
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
  query("paymentMethod")
    .optional()
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage(`paymentMethod debe ser uno de: ${VALID_PAYMENT_METHODS.join(", ")}`),
  query("currency")
    .optional()
    .isIn(ALLOWED_CURRENCIES)
    .withMessage(`currency debe ser una de: ${ALLOWED_CURRENCIES.join(", ")}`),
];

// ========= Routes =========

// Crear pago - Solo usuarios autenticados
router.post(
  "/",
  authenticate,
  createPaymentValidation,
  ctrl.createPayment
);

// Listar pagos - Staff y admin pueden ver todos, usuarios solo los suyos
router.get(
  "/",
  authenticate,
  listPaymentsValidation,
  ctrl.listPayments
);

// Obtener estadísticas - Solo staff y admin
router.get(
  "/stats",
  authenticate,
  authorize("staff", "admin"),
  statsValidation,
  ctrl.getPaymentStats
);

// Obtener pagos por usuario - Usuarios pueden ver solo los suyos, staff y admin pueden ver de cualquiera
router.get(
  "/user/:userId",
  authenticate,
  validateUUID("userId"),
  ctrl.getPaymentsByUser
);

// Obtener pago por ID - Usuarios pueden ver solo sus pagos, staff y admin pueden ver cualquiera
router.get(
  "/:id",
  authenticate,
  validateUUID("id"),
  ctrl.getPaymentById
);

// Actualizar pago - Solo usuarios propietarios o staff/admin
router.put(
  "/:id",
  authenticate,
  updatePaymentValidation,
  ctrl.updatePayment
);

// Marcar como completado - Solo staff y admin
router.post(
  "/:id/complete",
  authenticate,
  authorize("staff", "admin"),
  markAsCompletedValidation,
  ctrl.markPaymentAsCompleted
);

// Reembolsar pago - Solo admin
router.post(
  "/:id/refund",
  authenticate,
  authorize("admin"),
  refundValidation,
  ctrl.refundPayment
);

// Marcar como fallido - Solo staff y admin
router.post(
  "/:id/fail",
  authenticate,
  authorize("staff", "admin"),
  markAsFailedValidation,
  ctrl.markPaymentAsFailed
);

// Eliminar pago - Solo admin
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateUUID("id"),
  ctrl.deletePayment
);

export default router;
