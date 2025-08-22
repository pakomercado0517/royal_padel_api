import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  AllowNull,
  HasOne,
  HasMany,
  PrimaryKey,
  Unique,
  IsEmail,
  IsUrl,
} from "sequelize-typescript";
import { Customer } from "./Customer";
import { Reservation } from "./Reservation";
import { AuthToken } from "./AuthToken";
import { UserStats } from "./UserStats";
import { UserAchievement } from "./UserAchievement";
import { Notification } from "./Notification";
import { Payment } from "./Payment";
import { ReservationPlayer } from "./ReservationPlayer";

export type UserStatus = "active" | "inactive" | "suspended";
export type UserRole = "admin" | "staff" | "customer";

export interface UserAttributes {
  id: string; // UUID
  email: string;
  passwordHash: string | null; // Permite null para usuarios creados vía Google
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: Date | null;
  status: UserStatus;
  role: UserRole;
  googleSub: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  preferences: object;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface UserCreationAttributes
  extends Omit<
    UserAttributes,
    | "id"
    | "status"
    | "role"
    | "emailVerified"
    | "phoneVerified"
    | "createdAt"
    | "updatedAt"
    | "passwordHash"
  > {
  status?: UserStatus;
  role?: UserRole;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  // Hacer opcional para permitir alta sin contraseña (Google)
  passwordHash?: string | null;
}

@Table({
  tableName: "users",
  timestamps: true,
  paranoid: true, // soft delete
  underscored: true, // snake_case en DB
})
export class User extends Model<UserAttributes, UserCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Unique
  @IsEmail
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare passwordHash: string | null;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare fullName: string;

  @Column(DataType.STRING)
  declare phone: string | null;

  @IsUrl
  @Column(DataType.STRING)
  declare avatarUrl: string | null;

  @Column(DataType.DATE)
  declare dateOfBirth: Date | null;

  @Default("active")
  @Column(DataType.ENUM("active", "inactive", "suspended"))
  declare status: UserStatus;

  @Default("customer")
  @Column(DataType.ENUM("admin", "staff", "customer"))
  declare role: UserRole;

  @Column({ type: DataType.STRING(255), allowNull: true, unique: true })
  declare googleSub: string | null;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare emailVerified: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare phoneVerified: boolean;

  @Default({})
  @Column(DataType.JSON)
  declare preferences: object;

  // User relationships según especificaciones
  @HasMany(() => Reservation, { foreignKey: "userId", as: "reservations" })
  declare reservations?: Reservation[];

  @HasMany(() => AuthToken, { foreignKey: "userId", as: "tokens" })
  declare tokens?: AuthToken[];

  @HasOne(() => UserStats, { foreignKey: "userId", as: "stats" })
  declare stats?: UserStats;

  @HasMany(() => UserAchievement, { foreignKey: "userId", as: "achievements" })
  declare achievements?: UserAchievement[];

  @HasMany(() => Notification, { foreignKey: "userId", as: "notifications" })
  declare notifications?: Notification[];

  @HasMany(() => Payment, { foreignKey: "userId", as: "payments" })
  declare payments?: Payment[];

  @HasMany(() => ReservationPlayer, {
    foreignKey: "userId",
    as: "playerReservations",
  })
  declare playerReservations?: ReservationPlayer[];

  // Relacion 1:1 con Customer (legacy - mantener para compatibilidad)
  @HasOne(() => Customer, { foreignKey: "userId" })
  declare customer?: Customer;
}
