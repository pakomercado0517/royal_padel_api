import type { Request, Response } from "express";
import db from "../Config/db";
import { comparePassword, hashPassword } from "../Utils/auth";
import { generateToken } from "../Utils/token";
import {
  sendConfirmationEmail,
  sendPassworsResetToken,
} from "../Emails/authEmails";
import { generateJWT } from "../Utils/jwt";

const { User } = db;

export const createAccount = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body as {
      fullName: string;
      email: string;
      password: string;
    };

    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      return res
        .status(400)
        .json({ error: "fullName, email y password son requeridos." });
    }

    const normEmail = email.trim().toLowerCase();
    const exists = await User.findOne({ where: { email: normEmail } });
    if (exists) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    const password_hash = await hashPassword(password);
    const token = generateToken();

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normEmail,
      password_hash,
      isActive: false,
      token,
    });

    if (process.env.NODE_ENV === "production") {
      (globalThis as any).royalPadelConfirmationToken = token;
    }

    await sendConfirmationEmail({
      name: newUser.fullName,
      email: newUser.email,
      token,
    });

    return res.status(201).json({
      message:
        "Usuario creado correctamente, revisa tu correo para confirmar tu cuenta.",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const confirmAccount = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token: string };
    const user = await User.findOne({ where: { token } });

    if (!user) {
      return res.status(401).json({ error: "El token es incorrecto" });
    }

    user.isActive = true;
    user.token = null; // borrar token por seguridad
    await user.save();

    return res.status(200).json({
      message: "Usuario confirmado con éxito, ya puedes iniciar sesión 👌🏻",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const normEmail = email?.trim().toLowerCase();

    const user = normEmail
      ? await User.findOne({ where: { email: normEmail } })
      : null;

    if (!user) {
      return res.status(403).json({
        error: "Email no registrado en el sistema, verifícalo 😔",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Necesitas confirmar tu cuenta para poder iniciar sesión",
      });
    }

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "La contraseña es incorrecta ❌" });
    }

    const jwtToken = generateJWT(user.id);

    if (process.env.NODE_ENV === "production") {
      (globalThis as any).royalPadelJWT = jwtToken;
    }

    return res
      .status(200)
      .json({ message: "Has iniciado sesión correctamente ✌🏻", jwtToken });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    const normEmail = email?.trim().toLowerCase();

    const user = normEmail
      ? await User.findOne({ where: { email: normEmail } })
      : null;

    if (!user) {
      return res.status(404).json({
        error: "Email incorrecto o no está registrado en el sistema ⚠",
      });
    }

    user.token = generateToken();
    await user.save();

    await sendPassworsResetToken({
      name: user.fullName,
      email: user.email,
      token: user.token!,
    });

    return res
      .status(200)
      .json({ message: "Revisa tu email para restablecer la contraseña" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const validateToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token: string };
    const tokenExist = await User.findOne({ where: { token } });

    if (!tokenExist) {
      return res.status(403).json({ error: "Token incorrecto, verifícalo" });
    }

    return res.status(200).json({
      message: "Token correcto, ahora puedes cambiar la contraseña",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const resetPasswordWithToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params as { token: string };
    const { password } = req.body as { password: string };

    const user = await User.findOne({ where: { token } });
    if (!user) {
      return res.status(404).json({ error: "Token inválido, verifícalo" });
    }

    user.password_hash = await hashPassword(password);
    user.token = null;
    await user.save();

    return res
      .status(200)
      .json({ message: "Has restablecido tu contraseña exitosamente ✅" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const updateCurrentPassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!req.user?.id) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const ok = await comparePassword(currentPassword, user.password_hash);
    if (!ok) {
      return res
        .status(401)
        .json({ error: "La contraseña actual es incorrecta" });
    }

    user.password_hash = await hashPassword(newPassword);
    await user.save();

    return res.status(200).json({ message: "Contraseña actualizada" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const checkPassword = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const { password } = req.body as { password: string };
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isPasswordCorrect = await comparePassword(
      password,
      user.password_hash
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: "La contraseña es incorrecta 😞" });
    }

    return res.status(200).json({ message: "Contraseña correcta" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const updateUserData = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const { fullName, email } = req.body as {
      fullName?: string;
      email?: string;
    };
    const normEmail = email?.trim().toLowerCase();

    if (normEmail) {
      const verifyNewEmail = await User.findOne({
        where: { email: normEmail },
      });
      if (verifyNewEmail && verifyNewEmail.id !== req.user.id) {
        return res
          .status(409)
          .json({ error: "El email pertenece a otro usuario" });
      }
    }

    await User.update(
      {
        ...(fullName ? { fullName: fullName.trim() } : {}),
        ...(normEmail ? { email: normEmail } : {}),
      },
      { where: { id: req.user.id } }
    );

    return res.status(200).json({ message: "Información actualizada 👍🏻" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};
