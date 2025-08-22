import type { Request, Response } from "express";
import { comparePassword, hashPassword } from "../Utils/auth";
import { generateToken } from "../Utils/token";
import {
  sendConfirmationEmail,
  sendPassworsResetToken,
} from "../Emails/authEmails";
import { generateJWT } from "../Utils/jwt";
import { User, UserRole } from "../Models/User";
import { Customer } from "../Models/Customer";
import { AuthToken } from "../Models/AuthToken";
import { UserStats } from "../Models/UserStats";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";

// === === === Helpers === === ===
const includeBasics = [
  {
    model: Customer,
    attributes: ["id", "notes"],
    required: true,
  },
];

export const createAccount = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, phone, role } = req.body as {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      role?: UserRole;
    };

    const normEmail = email.trim().toLowerCase();

    // Verificar si el email ya existe
    const exists = await User.findOne({ where: { email: normEmail } });
    if (exists) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    const passwordHash = await hashPassword(password);
    const token = generateToken();

    // Crear el usuario con el nuevo modelo
    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normEmail,
      passwordHash,
      phone: phone || null,
      role: role || "customer", // default customer
      status: "active",
      emailVerified: false,
      phoneVerified: false,
      preferences: {},
    });

    // Crear AuthToken para verificación de email
    await AuthToken.create({
      userId: newUser.id,
      token,
      type: "email_verification",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    });

    // Inicializar UserStats para todos los usuarios
    await UserStats.create({
      userId: newUser.id,
      totalGamesPlayed: 0,
      totalHoursPlayed: 0,
      currentMonthGames: 0,
      totalSpent: 0,
      streakDays: 0,
      achievements: [],
      preferencesData: null,
    });

    // Enviar email de verificación en producción
    if (process.env.NODE_ENV === "production") {
      await sendConfirmationEmail({
        name: newUser.fullName,
        email: newUser.email,
        token,
      });
    } else {
      // En desarrollo, guardar el token para testing
      (globalThis as any).royalPadelConfirmationToken = token;
    }

    // Si el usuario tiene el rol de "customer" crearemos su perfil de cliente (legacy)
    if (newUser.role === "customer") {
      await Customer.create({
        userId: newUser.id,
        notes: "",
      });
    }

    return res.status(201).json({
      message:
        "Usuario creado correctamente. Revisa tu correo para confirmar tu cuenta.",
      userId: newUser.id,
    });
  } catch (error: any) {
    console.error("Error creating account:", error);
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const getUserData = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const userProfile = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone ?? "",
      status: user.status,
      googleSub: user.googleSub ?? "",
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      avatarUrl: !user.avatarUrl ? "" : user.avatarUrl,
      stats: {
        id: user.stats.id,
        userId: user.stats.userId,
        totalGamesPlayed: user.stats.totalGamesPlayed,
        totalHoursPlayed: user.stats.totalHoursPlayed,
        currentMonthGames: user.stats.currentMonthGames,
        favoriteCourtId: user.stats.favoriteCourtId ?? "",
        totalSpent: user.stats.totalSpent,
        averageRating: user.stats.averageRating ?? 0,
        lastGameDate: user.stats.lastGameDate ?? "",
        streakDays: user.stats.streakDays,
        achievements: user.stats.achievements,
        preferencesData: user.stats.preferencesData ?? [],
      },
    };
    res
      .status(200)
      .json({ message: "Perfil encontrado exitosamente", userProfile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const changeEmail = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);

    if (!user) {
      const error = new Error("Usuario no encontrado");
      res.status(404).json({ error: error.message });
      return;
    }

    if (req.body.email === user.email) {
      const error = new Error(
        "El email debe ser diferente al que ya tienes registrado"
      );
      res.status(406).json({ error: error.message });
      return;
    }

    const token = generateToken();

    // Actualizar email y marcar como no verificado
    await User.update(
      {
        email: req.body.email,
        emailVerified: false,
      },
      {
        where: { id: user.id },
      }
    );

    // Crear nuevo AuthToken
    await AuthToken.create({
      userId: user.id,
      token,
      type: "email_verification",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
    });

    if (process.env.NODE_ENV === "production") {
      await sendConfirmationEmail({
        name: user.fullName,
        email: req.body.email,
        token,
      });
    }

    res.status(200).json({
      message:
        "Email actualizado, es necesario que confirmes la cuenta desde tu bandeja de entrada para iniciar sesión de nuevo",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const confirmAccount = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token: string };

    // Buscar AuthToken válido
    const authToken = await AuthToken.findOne({
      where: {
        token,
        type: "email_verification",
        usedAt: null,
        expiresAt: { [require("sequelize").Op.gt]: new Date() },
      },
      include: [{ model: User, as: "user" }],
    });

    if (!authToken || !authToken.user) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // Marcar email como verificado
    await User.update(
      {
        emailVerified: true,
        status: "active",
      },
      { where: { id: authToken.userId } }
    );

    // Marcar token como usado
    await AuthToken.update(
      { usedAt: new Date() },
      { where: { id: authToken.id } }
    );

    return res.status(200).json({
      message: "Email confirmado con éxito, ya puedes iniciar sesión 👌🏻",
    });
  } catch (error: any) {
    console.error("Error confirming account:", error);
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const normEmail = email?.trim().toLowerCase();

    const user = normEmail
      ? await User.findOne({
          where: { email: normEmail },
          include: [
            {
              model: UserStats,
              as: "stats",
              required: false,
            },
          ],
        })
      : null;

    if (!user) {
      return res.status(403).json({
        error: "Email no registrado en el sistema, verifícalo 😔",
      });
    }

    // Verificar estado del usuario
    if (user.status !== "active") {
      return res.status(403).json({
        error:
          "Tu cuenta está suspendida o inactiva. Contacta al administrador.",
      });
    }

    // Verificar si el email está confirmado
    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Necesitas confirmar tu email para poder iniciar sesión",
      });
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "La contraseña es incorrecta ❌" });
    }

    const jwtToken = generateJWT(user.id);

    // Respuesta con información básica del usuario
    const userResponse = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      stats: user.stats || null,
    };

    if (process.env.NODE_ENV !== "production") {
      (globalThis as any).royalPadelJWT = jwtToken;
    }

    return res.status(200).json({
      message: "Has iniciado sesión correctamente ✌🏻",
      token: jwtToken,
      user: userResponse,
    });
  } catch (error: any) {
    console.error("Error during login:", error);
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

    const token = generateToken();

    // Crear AuthToken para reset de contraseña
    await AuthToken.create({
      userId: user.id,
      token,
      type: "password_reset",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
    });

    if (process.env.NODE_ENV === "production") {
      await sendPassworsResetToken({
        name: user.fullName,
        email: user.email,
        token,
      });
    } else {
      // En desarrollo, guardar el token para testing
      (globalThis as any).royalPadelPasswordResetToken = token;
    }

    return res
      .status(200)
      .json({ message: "Revisa tu email para restablecer la contraseña" });
  } catch (error: any) {
    console.error("Error in forgot password:", error);
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const validateToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token: string };

    const authToken = await AuthToken.findOne({
      where: {
        token,
        type: "password_reset",
        usedAt: null,
        expiresAt: { [require("sequelize").Op.gt]: new Date() },
      },
    });

    if (!authToken) {
      return res.status(403).json({ error: "Token incorrecto o expirado" });
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

    const authToken = await AuthToken.findOne({
      where: {
        token,
        type: "password_reset",
        usedAt: null,
        expiresAt: { [require("sequelize").Op.gt]: new Date() },
      },
      include: [{ model: User, as: "user" }],
    });

    if (!authToken || !authToken.user) {
      return res.status(404).json({ error: "Token inválido o expirado" });
    }

    // Actualizar contraseña
    await User.update(
      { passwordHash: await hashPassword(password) },
      { where: { id: authToken.userId } }
    );

    // Marcar token como usado
    await AuthToken.update(
      { usedAt: new Date() },
      { where: { id: authToken.id } }
    );

    return res
      .status(200)
      .json({ message: "Has restablecido tu contraseña exitosamente ✅" });
  } catch (error: any) {
    console.error("Error resetting password:", error);
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

    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) {
      return res
        .status(401)
        .json({ error: "La contraseña actual es incorrecta" });
    }

    await User.update(
      { passwordHash: await hashPassword(newPassword) },
      { where: { id: user.id } }
    );

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
      user.passwordHash
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

    const { fullName, email, phone, avatarUrl } = req.body as {
      fullName?: string;
      email?: string;
      phone: string;
      avatarUrl: string;
    };
    const normEmail = email?.trim().toLowerCase();

    const newEmail = normEmail === req.user.email ? null : normEmail;

    if (newEmail) {
      const verifyNewEmail = await User.findOne({
        where: { email: newEmail },
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
        ...(newEmail ? { email: newEmail } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(avatarUrl ? { avatarUrl: avatarUrl.trim() } : {}),
        ...(newEmail ? { emailVerified: false } : {}),
      },
      { where: { id: req.user.id } }
    );

    if (newEmail) {
      const token = generateToken();
      await AuthToken.update(
        {
          token,
          type: "email_verification",
          usedAt: null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
        {
          where: { userId: req.user.id },
        }
      );

      if (process.env.NODE_ENV === "production") {
        await sendConfirmationEmail({
          name: req.user.fullName,
          email: newEmail,
          token,
        });
      }

      return res.status(200).json({
        message:
          "Perfil actualizado con éxito, es necesario que confirmes el nuevo email desde tu bandeja de entrada 📥",
      });
    }

    return res.status(200).json({
      message: "Información actualizada ✅",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Error interno" });
  }
};

export const updateAvatarUrl = async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body as {
      avatarUrl: string;
    };
    if (!req.user.id) {
      return res.status(403).json({ message: "Usuario no autenticado" });
    }

    await User.update(
      {
        ...(avatarUrl ? { avatarUrl: avatarUrl.trim() } : {}),
      },
      {
        where: { id: req.user.id },
      }
    );

    res.status(200).json({ message: "Imagen guardada con éxito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleVerify = async (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) return res.status(400).json({ message: "Falta code" });

    // 1) Intercambio code -> tokens
    // Content-Type: x-www-form-urlencoded (recomendado por OAuth 2.0)
    const params = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!, // asegúrate de tenerlo en .env
      redirect_uri: "postmessage", // flujo JS popup
      grant_type: "authorization_code",
    });

    const { data } = await axios.post(
      "https://oauth2.googleapis.com/token",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      }
    );

    const id_token: string | undefined = data?.id_token;
    if (!id_token || id_token.split(".").length !== 3) {
      return res
        .status(401)
        .json({ message: "No se obtuvo un id_token válido de Google" });
    }

    // 2) Verificar id_token (JWT) y extraer datos
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub)
      return res.status(401).json({ message: "Token inválido" });
    if (!payload.email || !payload.email_verified) {
      return res
        .status(403)
        .json({ message: "El email de Google no está verificado" });
    }

    // 3) Mapear datos a tu modelo

    const { sub, email, email_verified, name, picture } = payload;
    if (!email || !email_verified) throw new Error("Email no verificado");

    const normEmail = email.trim().toLowerCase();
    console.log(`intentando ingresar el usuario ${payload.email}`);
    console.log("sub", sub);
    let user = await User.findOne({ where: { googleSub: sub } });
    if (!user) {
      user = await User.findOne({ where: { email: normEmail } });
      if (user) {
        if (user.googleSub && user.googleSub !== sub) {
          // Conflicto: ya vinculado a otro Google
          throw new Error("Cuenta ya vinculada a otro Google");
        }
        user.googleSub = sub;
        user.emailVerified = true;
        if (!user.avatarUrl && picture) user.avatarUrl = picture;
        await user.save();
      } else {
        user = await User.create({
          fullName: name || "Usuario Google",
          email: normEmail,
          phone: null,
          avatarUrl: picture ?? "",
          googleSub: sub,
          emailVerified: true,
        });
        const token = generateToken();
        // Crear AuthToken para verificación de email
        await AuthToken.create({
          userId: user.id,
          token,
          type: "email_verification",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        });

        // Inicializar UserStats para todos los usuarios
        await UserStats.create({
          userId: user.id,
          totalGamesPlayed: 0,
          totalHoursPlayed: 0,
          currentMonthGames: 0,
          totalSpent: 0,
          streakDays: 0,
          achievements: [],
          preferencesData: null,
        });
      }
    }
    const jwtToken = await generateJWT(user.id);

    if (process.env.NODE_ENV !== "production") {
      (globalThis as any).royalPadelJWT = jwtToken;
    }

    return res.status(200).json({
      message: "Has iniciado sesión correctamente ✌🏻",
      token: jwtToken,
    });
  } catch (err: any) {
    console.error(
      "googleCodeController error:",
      err?.response?.data || err?.message || err
    );
    // Errores comunes:
    // - invalid_grant: code usado/expirado, o redirect_uri no coincide
    // - redirect_uri mismatch: asegúrate de usar 'postmessage' si usas initCodeClient (popup)
    // - client_secret/GOOGLE_CLIENT_ID incorrectos
    return res.status(500).json({ message: "Error Google code flow" });
  }
};
