require("dotenv").config();
import { Sequelize } from "sequelize-typescript";

// Importa tus clases de modelos (sequelize-typescript)
import { User } from "../Models/User";
import { Customer } from "../Models/Customer";
import { Court } from "../Models/Court";
import { Reservation } from "../Models/Reservation";
import { Payment } from "../Models/Payment";
import { AuthToken } from "../Models/AuthToken";
import { CourtPricing } from "../Models/CourtPricing";
import { ReservationPlayer } from "../Models/ReservationPlayer";
import { UserStats } from "../Models/UserStats";
import { CourtAvailability } from "../Models/CourtAvailability";
import { UserAchievement } from "../Models/UserAchievement";
import { Notification } from "../Models/Notification";

const { DATABASE_URL } = process.env;

// Instancia de Sequelize registrando las CLASES directamente
export const conn = new Sequelize(`${DATABASE_URL}`, {
  logging: false,
  dialect: "postgres",
  native: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  // 👇 clave: registra aquí las clases de modelos
  models: [
    User, 
    Customer, 
    Court, 
    Reservation, 
    Payment, 
    AuthToken, 
    CourtPricing, 
    ReservationPlayer, 
    UserStats, 
    CourtAvailability, 
    UserAchievement, 
    Notification
  ],
});

// Las relaciones se declaran en los decoradores de cada modelo
// (@HasOne, @BelongsTo, @HasMany, etc.), no aquí.

// Export por defecto para poder hacer: import db from "../Config/db";
export default {
  User,
  Customer,
  Court,
  Reservation,
  Payment,
  AuthToken,
  CourtPricing,
  ReservationPlayer,
  UserStats,
  CourtAvailability,
  UserAchievement,
  Notification,
  conn,
};
