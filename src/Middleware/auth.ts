import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../Utils/jwt";
import { User } from "../Models/User";
import { param, validationResult } from "express-validator";
import { UserStats } from "../Models/UserStats";

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

export const validateUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await param("userId")
    .isUUID()
    .withMessage("ID debe ser un UUID válido")
    .run(req);

  const errors = validationResult(req);

  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  next();
};

export const validateUserExist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error("Usuario no encontrado");
      res.status(404).json({ error: error.message });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autorización requerido" });
  }

  const token = bearer.substring(7); // Remove "Bearer " prefix

  if (!token) {
    return res.status(401).json({ error: "Token no válido" });
  }

  try {
    const payload = verifyJWT(token);

    if (typeof payload === "object" && payload.id) {
      const user = await User.findByPk(payload.id, {
        attributes: [
          "id",
          "fullName",
          "email",
          "role",
          "phone",
          "status",
          "googleSub",
          "emailVerified",
          "phoneVerified",
          "avatarUrl",
        ],
        include: [{ model: UserStats }],
      });

      if (!user) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }

      // Verificar que el usuario esté activo
      if (user.status !== "active") {
        return res.status(403).json({ error: "Cuenta suspendida o inactiva" });
      }

      // Verificar que el email esté confirmado
      if (!user.emailVerified) {
        return res.status(403).json({ error: "Email no verificado" });
      }

      req.user = user;
      next();
    } else {
      return res.status(401).json({ error: "Token inválido" });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};

// Middleware para autorizar roles específicos
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Roles requeridos: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Middleware para verificar que el usuario es admin
export const requireAdmin = authorize("admin");

// Middleware para verificar que el usuario es staff o admin
export const requireStaff = authorize("admin", "staff");
