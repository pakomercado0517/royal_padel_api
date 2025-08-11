import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../Utils/jwt";
import { User } from "../Models/User";
import { param, validationResult } from "express-validator";

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
    .isInt()
    .withMessage("ID no válido")
    .bail()
    .custom((value) => value > 0)
    .withMessage("ID no válido")
    .bail()
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

  if (!bearer) {
    const error = new Error("Usuario no autorizado");
    res.status(401).json({ error: error.message });
    return;
  }

  const [, token] = bearer.split(" ");

  if (!token) {
    const error = new Error("Usuario no autorizado");
    res.status(401).json({ error: error.message });
    return;
  }

  try {
    const payload = verifyJWT(token);

    if (typeof payload === "object" && payload.id) {
      const user = await User.findByPk(payload.id, {
        attributes: ["id", "fullName", "email"],
      });

      if (user) req.user = user;

      next();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
