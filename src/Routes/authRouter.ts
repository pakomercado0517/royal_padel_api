import { Router } from "express";
import { body, param } from "express-validator";
import handleInputErrors from "../Middleware/validation";
import * as authControllers from "../Controllers/authControllers";

const router = Router();

//POST Methods
router.post(
  "/create_account",
  body("fullName").notEmpty().withMessage("Nombre Completo es requerido"),
  body("email").isEmail().withMessage("Email debe ser válido"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("phone")
    .optional()
    .isMobilePhone("es-MX")
    .withMessage("Teléfono debe ser un número válido"),
  body("role")
    .optional()
    .isIn(["admin", "user"])
    .withMessage("Rol debe ser 'admin' o 'user'"),
  handleInputErrors,
  authControllers.createAccount
);

router.post(
  "/confirm_account",
  body("token").isLength({ min: 6, max: 6 }).withMessage("Token inválido"),
  handleInputErrors,
  authControllers.confirmAccount
);

router.post(
  "/login",
  body("email").isEmail().withMessage("Email no válido"),
  body("password").notEmpty().withMessage("La contraseña es obligatoria"),
  handleInputErrors,
  authControllers.login
);

router.post(
  "/forgot_password",
  body("email").isEmail().withMessage("Email no válido"),
  handleInputErrors,
  authControllers.forgotPassword
);

router.post(
  "/validate_token",
  body("token")
    .notEmpty()
    .isLength({ min: 6, max: 6 })
    .withMessage("Token no válido"),
  handleInputErrors,
  authControllers.validateToken
);

router.post(
  "/reset_password/:token",
  param("token")
    .notEmpty()
    .isLength({ min: 6, max: 6 })
    .withMessage("Token no válido"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("El password es corto, mínimo es de 8 caracteres"),
  handleInputErrors,
  authControllers.resetPasswordWithToken
);

export default router;
