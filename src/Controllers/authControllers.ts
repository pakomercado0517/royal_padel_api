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

//* Importante, no cambiar el email aquí, para eso se hizo otra ruta donde se manda a confirmar el nuevo email
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);

    if (!user) {
      const error = new Error("Usuario no encontrado");
      res.status(404).json({ error: error.message });
      return;
    }

    user.fullName = req.body;
    user.phone = req.body;

    if (req.body.role && req.body.role === "customer") {
      user.role = req.body;
    }

    if (user.role === "customer") {
      const customer = await Customer.findOne({ where: { userId: user.id } });
      customer.notes = req.body;

      res.status(201).json({ message: "Cliente actualizado con éxito" });
      return;
    }

    res.status(201).json({ message: "Usuario actualizado con éxito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      status: user.status,
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
