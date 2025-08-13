// src/Utils/timedToken.ts
import crypto from "crypto";

interface TimedToken {
  value: string;
  expiresAt: Date;
}

export const generateTimedToken = (minutes = 10): TimedToken => {
  const value = crypto.randomInt(100000, 999999).toString(); // token de 6 dígitos
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000); // tiempo de expiración

  return { value, expiresAt };
};

export const isTokenExpired = (expiresAt: Date): boolean => {
  return new Date() > new Date(expiresAt);
};
