import { Router } from "express";
import { body, param, query } from "express-validator";
import * as ctrl from "../Controllers/courtPricingControllers";
import { authenticate, authorize } from "../Middleware/auth";
import { 
  VALID_SEASONS, 
  VALID_DAYS_OF_WEEK,
  VALID_TIME_FORMAT,
  MIN_PRICE_PER_HOUR,
  MAX_PRICE_PER_HOUR,
} from "../Utils/courtPricingHelpers";

const router = Router();

// ========= Validation Schemas =========

// Validación para UUID
const validateUUID = (field: string) => 
  param(field)
    .isUUID(4)
    .withMessage(`${field} debe ser un UUID válido`);

// Validaciones para crear regla de precio
const createPricingRuleValidation = [
  body("courtId")
    .isUUID(4)
    .withMessage("courtId debe ser un UUID válido"),
  body("dayOfWeek")
    .isInt({ min: 0, max: 6 })
    .withMessage("dayOfWeek debe ser un número del 0 (domingo) al 6 (sábado)"),
  body("startTime")
    .matches(VALID_TIME_FORMAT)
    .withMessage("startTime debe tener formato HH:MM (24 horas)"),
  body("endTime")
    .matches(VALID_TIME_FORMAT)
    .withMessage("endTime debe tener formato HH:MM (24 horas)"),
  body("pricePerHour")
    .isFloat({ min: MIN_PRICE_PER_HOUR, max: MAX_PRICE_PER_HOUR })
    .withMessage(`pricePerHour debe estar entre ${MIN_PRICE_PER_HOUR} y ${MAX_PRICE_PER_HOUR}`),
  body("season")
    .optional()
    .isIn(VALID_SEASONS)
    .withMessage(`season debe ser uno de: ${VALID_SEASONS.join(", ")}`),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive debe ser un booleano"),
];

// Validaciones para actualizar regla de precio
const updatePricingRuleValidation = [
  validateUUID("id"),
  body("startTime")
    .optional()
    .matches(VALID_TIME_FORMAT)
    .withMessage("startTime debe tener formato HH:MM (24 horas)"),
  body("endTime")
    .optional()
    .matches(VALID_TIME_FORMAT)
    .withMessage("endTime debe tener formato HH:MM (24 horas)"),
  body("pricePerHour")
    .optional()
    .isFloat({ min: MIN_PRICE_PER_HOUR, max: MAX_PRICE_PER_HOUR })
    .withMessage(`pricePerHour debe estar entre ${MIN_PRICE_PER_HOUR} y ${MAX_PRICE_PER_HOUR}`),
  body("season")
    .optional()
    .isIn(VALID_SEASONS)
    .withMessage(`season debe ser uno de: ${VALID_SEASONS.join(", ")}`),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive debe ser un booleano"),
];

// Validaciones para cálculo de precio
const calculatePriceValidation = [
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
];

// Validaciones para listado
const listPricingRulesValidation = [
  query("courtId")
    .optional()
    .isUUID(4)
    .withMessage("courtId debe ser un UUID válido"),
  query("dayOfWeek")
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage("dayOfWeek debe ser un número del 0 al 6"),
  query("season")
    .optional()
    .isIn(VALID_SEASONS)
    .withMessage(`season debe ser uno de: ${VALID_SEASONS.join(", ")}`),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive debe ser un booleano"),
  query("priceFrom")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("priceFrom debe ser un número positivo"),
  query("priceTo")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("priceTo debe ser un número positivo"),
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
  query("courtId")
    .optional()
    .isUUID(4)
    .withMessage("courtId debe ser un UUID válido"),
  query("season")
    .optional()
    .isIn(VALID_SEASONS)
    .withMessage(`season debe ser uno de: ${VALID_SEASONS.join(", ")}`),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive debe ser un booleano"),
];

// ========= Routes =========

// Crear regla de precio - Solo admin
router.post(
  "/",
  authenticate,
  authorize("admin"),
  createPricingRuleValidation,
  ctrl.createPricingRule
);

// Listar reglas de precio - Staff y admin
router.get(
  "/",
  authenticate,
  authorize("staff", "admin"),
  listPricingRulesValidation,
  ctrl.listPricingRules
);

// Obtener estadísticas - Solo admin
router.get(
  "/stats",
  authenticate,
  authorize("admin"),
  statsValidation,
  ctrl.getPricingStats
);

// Calcular precio para reserva - Todos los usuarios autenticados
router.post(
  "/calculate",
  authenticate,
  calculatePriceValidation,
  ctrl.calculatePrice
);

// Crear plantilla estándar - Solo admin
router.post(
  "/template/:courtId",
  authenticate,
  authorize("admin"),
  validateUUID("courtId"),
  ctrl.createStandardTemplate
);

// Obtener precios de cancha específica - Todos los usuarios autenticados
router.get(
  "/court/:courtId",
  authenticate,
  validateUUID("courtId"),
  ctrl.getCourtPricing
);

// Obtener regla por ID - Staff y admin
router.get(
  "/:id",
  authenticate,
  authorize("staff", "admin"),
  validateUUID("id"),
  ctrl.getPricingRuleById
);

// Actualizar regla de precio - Solo admin
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updatePricingRuleValidation,
  ctrl.updatePricingRule
);

// Eliminar regla de precio - Solo admin
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  validateUUID("id"),
  ctrl.deletePricingRule
);

export default router;
