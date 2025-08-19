import { Router } from "express";
import { body, param } from "express-validator";
import handleInputErrors from "../Middleware/validation";
import * as authControllers from "../Controllers/authControllers";
import { authenticate } from "../Middleware/auth";

const router = Router();

// POST /create_account
router.post(
  "/create_account",
  body("fullName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nombre Completo debe tener entre 2 y 100 caracteres"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email debe ser válido"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("La contraseña debe contener al menos una minúscula, una mayúscula y un número"),
  body("phone")
    .optional()
    .isMobilePhone("es-MX")
    .withMessage("Teléfono debe ser un número válido"),
  body("role")
    .optional()
    .isIn(["customer", "staff", "admin"])
    .withMessage("Rol debe ser customer, staff o admin"),
  handleInputErrors,
  authControllers.createAccount
);

//PUT /update_acount
router.put(
  "/:id/update_account",
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Nombre completo es requerido"),
  body("phone")
    .optional()
    .isMobilePhone("es-MX")
    .withMessage("Teléfono debe ser un número válido"),
  handleInputErrors,
  authControllers.updateUser
);

//PUT /change_email
router.put(
  "/:id/change_email",
  body("email").isEmail().normalizeEmail().withMessage("Email debe ser válido"),
  handleInputErrors,
  authControllers.changeEmail
);

// POST /confirm_account
router.post(
  "/confirm_account",
  body("token")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Token inválido"),
  handleInputErrors,
  authControllers.confirmAccount
);

// POST /login
router.post(
  "/login",
  body("email").isEmail().normalizeEmail().withMessage("Email no válido"),
  body("password").notEmpty().withMessage("La contraseña es obligatoria"),
  handleInputErrors,
  authControllers.login
);

// POST /forgot_password
router.post(
  "/forgot_password",
  body("email").isEmail().normalizeEmail().withMessage("Email no válido"),
  handleInputErrors,
  authControllers.forgotPassword
);

// POST /validate_token
router.post(
  "/validate_token",
  body("token")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Token no válido"),
  handleInputErrors,
  authControllers.validateToken
);

// POST /reset_password/:token
router.post(
  "/reset_password/:token",
  param("token")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Token no válido"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("El password es corto, mínimo es de 8 caracteres"),
  handleInputErrors,
  authControllers.resetPasswordWithToken
);

// POST /update_password
router.post(
  "/update_password",
  authenticate,
  body("currentPassword")
    .notEmpty()
    .withMessage("La contraseña actual no puede ir vacía"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("La nueva contraseña debe tener al menos 8 caracteres")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("La nueva contraseña debe ser diferente a la actual");
      }
      return true;
    }),
  handleInputErrors,
  authControllers.updateCurrentPassword
);

// POST /check_password
router.post(
  "/check_password",
  authenticate,
  body("password").notEmpty().withMessage("La contraseña no puede ir vacía"),
  handleInputErrors,
  authControllers.checkPassword
);

// PUT / (update user data)
router.put(
  "/",
  authenticate,
  body("fullName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Nombre Completo es requerido"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Email debe ser válido"),
  body("phone")
    .optional()
    .isMobilePhone("es-MX")
    .withMessage("Teléfono debe ser válido"),
  handleInputErrors,
  authControllers.updateUserData
);

// GET /profile (obtener perfil del usuario autenticado)
router.get(
  "/profile",
  authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      const userProfile = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      };
      
      res.json({
        message: "Perfil obtenido exitosamente",
        user: userProfile
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Error interno" });
    }
  }
);

// POST /resend_verification (reenviar email de verificación)
router.post(
  "/resend_verification",
  body("email").isEmail().normalizeEmail().withMessage("Email debe ser válido"),
  handleInputErrors,
  async (req, res) => {
    try {
      // Este endpoint se puede implementar más tarde
      res.status(501).json({ message: "Funcionalidad por implementar" });
    } catch (error: any) {
      res.status(500).json({ error: error.message ?? "Error interno" });
    }
  }
);

export default router;
