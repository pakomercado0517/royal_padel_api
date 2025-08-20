import { Router } from "express";
import { body, param, query } from "express-validator";
import * as ctrl from "../Controllers/courtAvailabilityControllers";
import { authenticate, authorize } from "../Middleware/auth";
import { VALID_AVAILABILITY_REASONS, VALID_TIME_FORMAT } from "../Utils/courtAvailabilityHelpers";

const router = Router();

// ========= Validation Schemas =========

// Validación para UUID
const validateUUID = (field: string) => 
  param(field)
    .isUUID(4)
    .withMessage(`${field} debe ser un UUID válido`);

// Validaciones para crear disponibilidad
const createAvailabilityValidation = [
  body("courtId")
    .isUUID(4)
    .withMessage("courtId debe ser un UUID válido"),
  body("date")
    .isISO8601()
    .withMessage("date debe ser una fecha válida (YYYY-MM-DD)"),
  body("startTime")
    .matches(VALID_TIME_FORMAT)
    .withMessage("startTime debe tener formato HH:MM (24 horas)"),
  body("endTime")
    .matches(VALID_TIME_FORMAT)
    .withMessage("endTime debe tener formato HH:MM (24 horas)"),
  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable debe ser un booleano"),
  body("reason")
    .optional()
    .isIn(VALID_AVAILABILITY_REASONS)
    .withMessage(`reason debe ser uno de: ${VALID_AVAILABILITY_REASONS.join(", ")}`),
  body("notes")
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage("notes debe tener entre 1 y 500 caracteres"),
];

// Validaciones para actualizar disponibilidad
const updateAvailabilityValidation = [
  validateUUID("id"),
  body("startTime")
    .optional()
    .matches(VALID_TIME_FORMAT)
    .withMessage("startTime debe tener formato HH:MM (24 horas)"),
  body("endTime")
    .optional()
    .matches(VALID_TIME_FORMAT)
    .withMessage("endTime debe tener formato HH:MM (24 horas)"),
  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable debe ser un booleano"),
  body("reason")
    .optional()
    .isIn([...VALID_AVAILABILITY_REASONS, null])
    .withMessage(`reason debe ser uno de: ${VALID_AVAILABILITY_REASONS.join(", ")} o null`),
  body("notes")
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage("notes debe tener entre 1 y 500 caracteres"),
];

// Validaciones para creación masiva
const bulkCreateValidation = [
  body("courtId")
    .isUUID(4)
    .withMessage("courtId debe ser un UUID válido"),
  body("dateFrom")
    .isISO8601()
    .withMessage("dateFrom debe ser una fecha válida (YYYY-MM-DD)"),
  body("dateTo")
    .isISO8601()
    .withMessage("dateTo debe ser una fecha válida (YYYY-MM-DD)"),
  body("startTime")
    .matches(VALID_TIME_FORMAT)
    .withMessage("startTime debe tener formato HH:MM (24 horas)"),
  body("endTime")
    .matches(VALID_TIME_FORMAT)
    .withMessage("endTime debe tener formato HH:MM (24 horas)"),
  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable debe ser un booleano"),
  body("reason")
    .optional()
    .isIn(VALID_AVAILABILITY_REASONS)
    .withMessage(`reason debe ser uno de: ${VALID_AVAILABILITY_REASONS.join(", ")}`),
  body("notes")
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage("notes debe tener entre 1 y 500 caracteres"),
  body("daysOfWeek")
    .optional()
    .isArray()
    .withMessage("daysOfWeek debe ser un array"),
  body("daysOfWeek.*")
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage("Cada día de la semana debe ser un número del 0 (domingo) al 6 (sábado)"),
];

// Validaciones para listado
const listAvailabilitiesValidation = [
  query("courtId")
    .optional()
    .isUUID(4)
    .withMessage("courtId debe ser un UUID válido"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom debe ser una fecha válida (YYYY-MM-DD)"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo debe ser una fecha válida (YYYY-MM-DD)"),
  query("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable debe ser un booleano"),
  query("reason")
    .optional()
    .isIn(VALID_AVAILABILITY_REASONS)
    .withMessage(`reason debe ser uno de: ${VALID_AVAILABILITY_REASONS.join(", ")}`),
  query("createdBy")
    .optional()
    .isUUID(4)
    .withMessage("createdBy debe ser un UUID válido"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page debe ser un entero positivo"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("pageSize debe ser un entero entre 1 y 100"),
];

// Validaciones para consulta de cancha específica
const courtAvailabilityValidation = [
  validateUUID("courtId"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom debe ser una fecha válida (YYYY-MM-DD)"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo debe ser una fecha válida (YYYY-MM-DD)"),
];

// Validaciones para estadísticas
const statsValidation = [
  query("courtId")
    .optional()
    .isUUID(4)
    .withMessage("courtId debe ser un UUID válido"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom debe ser una fecha válida (YYYY-MM-DD)"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo debe ser una fecha válida (YYYY-MM-DD)"),
];

// ========= Routes =========

// Crear disponibilidad - Solo staff y admin
router.post(
  "/",
  authenticate,
  authorize("staff", "admin"),
  createAvailabilityValidation,
  ctrl.createAvailability
);

// Listar disponibilidades - Staff y admin pueden ver todas, usuarios pueden consultar para hacer reservas
router.get(
  "/",
  authenticate,
  listAvailabilitiesValidation,
  ctrl.listAvailabilities
);

// Obtener estadísticas - Solo staff y admin
router.get(
  "/stats",
  authenticate,
  authorize("staff", "admin"),
  statsValidation,
  ctrl.getAvailabilityStats
);

// Creación masiva - Solo admin
router.post(
  "/bulk",
  authenticate,
  authorize("admin"),
  bulkCreateValidation,
  ctrl.bulkCreateAvailability
);

// Obtener disponibilidad de cancha específica - Todos los usuarios autenticados
router.get(
  "/court/:courtId",
  authenticate,
  courtAvailabilityValidation,
  ctrl.getCourtAvailability
);

// Obtener disponibilidad por ID - Staff y admin
router.get(
  "/:id",
  authenticate,
  authorize("staff", "admin"),
  validateUUID("id"),
  ctrl.getAvailabilityById
);

// Actualizar disponibilidad - Solo staff y admin
router.put(
  "/:id",
  authenticate,
  authorize("staff", "admin"),
  updateAvailabilityValidation,
  ctrl.updateAvailability
);

// Eliminar disponibilidad - Solo admin
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateUUID("id"),
  ctrl.deleteAvailability
);

export default router;
