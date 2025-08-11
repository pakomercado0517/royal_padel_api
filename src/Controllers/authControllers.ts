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
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });

    if (user) {
      const error = new Error("El email ya está registrado");
      res.status(409).json({ error: error.message });
    }

    const newUser = await User.create(req.body);
    newUser.password_hash = await hashPassword(password);
    const token = generateToken();
    newUser.token = token;

    if (process.env.NODE_ENV === "production")
      globalThis.royalPadelConfirmationToken = token;

    await newUser.save();
    // await sendConfirmationEmail({
    //   name: newUser.name,
    //   email: newUser.email,
    //   token,
    // });

    res.status(201).json({
      message:
        "Usuario creado corretamente, por favor revisa tu correo para confirmar tu cuenta",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const confirmAccount = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ where: { token } });

    if (!user) {
      const error = new Error("El token es incorrecto");
      res.status(401).json({ error: error.message });
      return;
    }

    user.isActive = true;
    user.token = null; //borramos el token por seguridad
    await user.save();

    res.status(200).json({
      message: "Usuario confirmado con éxito, ya puedes iniciar sesión 👌🏻",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      const error = new Error(
        "Email no registrado en el sistema, verifícalo 😔"
      );
      res.status(403).json({ error: error.message });
      return;
    }

    if (!user.isActive) {
      const error = new Error(
        "Necesitas confirmar tu cuenta para poder iniciar sesión "
      );
      res.status(403).json({ error: error.message });
      return;
    }

    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      const error = new Error("La contraseña es incorrecta ❌");
      res.status(401).json({ error: error.message });
      return;
    }

    const jwtToken = generateJWT(user.id);

    if (process.env.NODE_ENV === "production")
      globalThis.royalPadelJWT = jwtToken;

    res
      .status(200)
      .json({ message: "Haz iniciado sesión correctamente ✌🏻", jwtToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!email) {
      const error = new Error(
        "Email incorreocto o no esta registrado en el sistema ⚠"
      );
      res.status(404).json({ error: error.message });
      return;
    }

    user.token = generateToken();
    await user.save();
    await sendPassworsResetToken({
      name: user.fullName,
      email: user.email,
      token: user.token,
    });

    res
      .status(200)
      .json({ message: "Revisa tu email para reestablecer la contraseña" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const validateToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const tokenExist = await User.findOne({ where: { token } });

    if (!tokenExist) {
      const error = new Error("Token incorrecto, verifícalo");
      res.status(403).json({ error: error.message });
      return;
    }

    res
      .status(200)
      .json({ message: "Token correcto, ahora puedes cambiar la contraseña" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const resetPasswordWithToken = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findOne({ where: { token } });

    if (!user) {
      const error = new Error("Token inválido, verifícalo");
      res.status(404).json({ error: error.message });
      return;
    }

    user.password_hash = await hashPassword(password);
    user.token = null;
    await user.save();

    res
      .status(200)
      .json({ message: "Haz reestablecido tu contraseña exitosamente ✅" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCurrentPassword = async (req: Request, res: Response) => {
  try {
    const { current_password, newPassword } = req.body;
    const user = await User.findByPk();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
