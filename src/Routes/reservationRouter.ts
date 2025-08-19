import { Router } from "express";
import { body, param, query } from "express-validator";
import * as ctrl from "../Controllers/reservationControllers";
import { validateRequest } from "../Middleware/validateRequest";
import { authenticate, authorize } from "../Middleware/auth";

const router = Router();

// ====== Reservation Validations ======

// UUID validation
const uuidValidation = param("id")
  .isUUID()
  .withMessage("ID debe ser un UUID válido");

// Create reservation validations
const createReservationValidations = [
  body("courtId")
    .isUUID()
    .withMessage("ID de cancha debe ser un UUID válido"),
  body("reservationDate")
    .isISO8601()
    .toDate()
    .withMessage("Fecha de reservación debe ser una fecha válida (YYYY-MM-DD)"),
  body("startTime")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Hora de inicio debe estar en formato HH:mm"),
  body("endTime")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Hora de fin debe estar en formato HH:mm"),
  body("totalPrice")
    .isFloat({ min: 0 })
    .withMessage("Precio total debe ser un número positivo"),
  body("bookingType")
    .optional()
    .isIn(["individual", "group", "tournament"])
    .withMessage("Tipo de reserva debe ser: individual, group o tournament"),
  body("specialRequests")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Solicitudes especiales no pueden exceder 500 caracteres")
];

// Update reservation validations
const updateReservationValidations = [
  uuidValidation,
  body("reservationDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Fecha de reservación debe ser una fecha válida (YYYY-MM-DD)"),
  body("startTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Hora de inicio debe estar en formato HH:mm"),
  body("endTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Hora de fin debe estar en formato HH:mm"),
  body("totalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Precio total debe ser un número positivo"),
  body("bookingType")
    .optional()
    .isIn(["individual", "group", "tournament"])
    .withMessage("Tipo de reserva debe ser: individual, group o tournament"),
  body("specialRequests")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Solicitudes especiales no pueden exceder 500 caracteres"),
  body("status")
    .optional()
    .isIn(["pending", "confirmed", "completed", "cancelled", "no_show"])
    .withMessage("Status debe ser: pending, confirmed, completed, cancelled o no_show")
];

// Cancel reservation validations
const cancelReservationValidations = [
  uuidValidation,
  body("cancellationReason")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Razón de cancelación no puede exceder 300 caracteres")
];

// List reservations query validations
const listReservationsValidations = [
  query("courtId")
    .optional()
    .isUUID()
    .withMessage("ID de cancha debe ser un UUID válido"),
  query("userId")
    .optional()
    .isUUID()
    .withMessage("ID de usuario debe ser un UUID válido"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Fecha desde debe ser una fecha válida (YYYY-MM-DD)"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("Fecha hasta debe ser una fecha válida (YYYY-MM-DD)"),
  query("status")
    .optional()
    .isIn(["pending", "confirmed", "completed", "cancelled", "no_show"])
    .withMessage("Status debe ser: pending, confirmed, completed, cancelled o no_show"),
  query("bookingType")
    .optional()
    .isIn(["individual", "group", "tournament"])
    .withMessage("Tipo de reserva debe ser: individual, group o tournament"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Página debe ser un número entero mayor a 0"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Tamaño de página debe estar entre 1 y 100")
];

// Availability check validations
const availabilityValidations = [
  param("courtId")
    .isUUID()
    .withMessage("ID de cancha debe ser un UUID válido"),
  query("date")
    .isISO8601()
    .withMessage("Fecha debe ser una fecha válida (YYYY-MM-DD)"),
  query("startTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Hora de inicio debe estar en formato HH:mm"),
  query("endTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Hora de fin debe estar en formato HH:mm")
];

// ====== Routes ======

// Create reservation (Authenticated users)
router.post(
  "/",
  authenticate,
  createReservationValidations,
  validateRequest,
  ctrl.createReservation
);

// List reservations (Staff/Admin can see all, users see their own)
router.get(
  "/",
  authenticate,
  listReservationsValidations,
  validateRequest,
  ctrl.listReservations
);

// Check availability (Public)
router.get(
  "/availability/:courtId",
  availabilityValidations,
  validateRequest,
  ctrl.checkAvailability
);

// Get reservation statistics (Admin/Staff only)
router.get(
  "/stats",
  authenticate,
  authorize("admin", "staff"),
  ctrl.getReservationStats
);

// Get user reservations (Users can see their own, staff/admin can see any)
router.get(
  "/user/:userId",
  authenticate,
  param("userId").isUUID().withMessage("ID de usuario debe ser un UUID válido"),
  validateRequest,
  ctrl.getUserReservations
);

// Get reservation by ID (Owner, staff, or admin)
router.get(
  "/:id",
  authenticate,
  uuidValidation,
  validateRequest,
  ctrl.getReservationById
);

// Update reservation (Owner, staff, or admin)
router.put(
  "/:id",
  authenticate,
  updateReservationValidations,
  validateRequest,
  ctrl.updateReservation
);

// Cancel reservation (Owner, staff, or admin)
router.post(
  "/:id/cancel",
  authenticate,
  cancelReservationValidations,
  validateRequest,
  ctrl.cancelReservation
);

// Complete reservation (Staff/Admin only)
router.post(
  "/:id/complete",
  authenticate,
  authorize("admin", "staff"),
  uuidValidation,
  validateRequest,
  ctrl.completeReservation
);

// Mark no-show (Staff/Admin only)
router.post(
  "/:id/no-show",
  authenticate,
  authorize("admin", "staff"),
  uuidValidation,
  validateRequest,
  ctrl.markNoShow
);

// Delete reservation (Owner, staff, or admin - only pending/cancelled)
router.delete(
  "/:id",
  authenticate,
  uuidValidation,
  validateRequest,
  ctrl.deleteReservation
);

export default router;
