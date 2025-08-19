import { Router } from "express";
import { body, param, query } from "express-validator";
import * as ctrl from "../Controllers/courtControllers";
import { validateRequest } from "../Middleware/validateRequest";
import { authenticate, authorize } from "../Middleware/auth";

const router = Router();

// ====== Court Validations ======

// UUID validation
const uuidValidation = param("id")
  .isUUID()
  .withMessage("ID debe ser un UUID válido");

// Create court validations
const createCourtValidations = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nombre debe tener entre 2 y 100 caracteres"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Descripción no puede exceder 500 caracteres"),
  body("capacity")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Capacidad debe ser un número entre 1 y 20"),
  body("features")
    .optional()
    .isArray()
    .withMessage("Features debe ser un array"),
  body("basePricePerHour")
    .isFloat({ min: 0 })
    .withMessage("Precio base por hora debe ser un número positivo"),
  body("status")
    .optional()
    .isIn(["active", "maintenance", "inactive"])
    .withMessage("Status debe ser: active, maintenance o inactive"),
  body("locationDetails")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Detalles de ubicación no pueden exceder 200 caracteres"),
  body("images")
    .optional()
    .isArray()
    .withMessage("Images debe ser un array de URLs")
];

// Update court validations
const updateCourtValidations = [
  uuidValidation,
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nombre debe tener entre 2 y 100 caracteres"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Descripción no puede exceder 500 caracteres"),
  body("capacity")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Capacidad debe ser un número entre 1 y 20"),
  body("features")
    .optional()
    .isArray()
    .withMessage("Features debe ser un array"),
  body("basePricePerHour")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Precio base por hora debe ser un número positivo"),
  body("status")
    .optional()
    .isIn(["active", "maintenance", "inactive"])
    .withMessage("Status debe ser: active, maintenance o inactive"),
  body("locationDetails")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Detalles de ubicación no pueden exceder 200 caracteres"),
  body("images")
    .optional()
    .isArray()
    .withMessage("Images debe ser un array de URLs")
];

// Change status validations
const changeStatusValidations = [
  uuidValidation,
  body("status")
    .isIn(["active", "maintenance", "inactive"])
    .withMessage("Status debe ser: active, maintenance o inactive"),
  body("reason")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Razón no puede exceder 200 caracteres")
];

// List courts query validations
const listCourtsValidations = [
  query("q")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Búsqueda no puede exceder 100 caracteres"),
  query("status")
    .optional()
    .isIn(["active", "maintenance", "inactive"])
    .withMessage("Status debe ser: active, maintenance o inactive"),
  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Precio mínimo debe ser un número positivo"),
  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Precio máximo debe ser un número positivo"),
  query("features")
    .optional()
    .isString()
    .withMessage("Features debe ser una cadena separada por comas"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Página debe ser un número entero mayor a 0"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Tamaño de página debe estar entre 1 y 100")
];

// ====== Routes ======

// Create court (Admin/Staff only)
router.post(
  "/",
  authenticate,
  authorize("admin", "staff"),
  createCourtValidations,
  validateRequest,
  ctrl.createCourt
);

// List courts (Public)
router.get(
  "/",
  listCourtsValidations,
  validateRequest,
  ctrl.listCourts
);

// Get court by ID (Public)
router.get(
  "/:id",
  uuidValidation,
  validateRequest,
  ctrl.getCourtById
);

// Update court (Admin/Staff only)
router.put(
  "/:id",
  authenticate,
  authorize("admin", "staff"),
  updateCourtValidations,
  validateRequest,
  ctrl.updateCourt
);

// Change court status (Admin/Staff only)
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "staff"),
  changeStatusValidations,
  validateRequest,
  ctrl.changeCourtStatus
);

// Delete court (Admin only)
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  uuidValidation,
  validateRequest,
  ctrl.deleteCourt
);

export default router;
