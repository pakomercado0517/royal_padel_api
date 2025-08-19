import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

/**
 * Middleware para validar requests usando express-validator
 * Si hay errores de validación, retorna 400 con detalles del error
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : error.type,
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    return res.status(400).json({
      error: "Datos de entrada inválidos",
      details: errorMessages
    });
  }

  next();
};
