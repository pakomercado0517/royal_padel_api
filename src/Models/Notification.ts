import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
  Default,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  IsUrl,
} from "sequelize-typescript";
import { User } from "./User";

export type NotificationType = "reservation_confirmed" | "payment_received" | "reminder" | "system" | "achievement";
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface NotificationAttributes {
  id: string; // UUID
  userId: string;
  title: string;
  message: string; // TEXT
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: Date | null;
  actionUrl?: string | null; // URL para acción específica
  metadata?: object | null; // JSON - datos adicionales
  createdAt: Date;
  expiresAt?: Date | null;
}

export interface NotificationCreationAttributes
  extends Omit<NotificationAttributes, "id" | "priority" | "isRead" | "createdAt"> {
  priority?: NotificationPriority;
  isRead?: boolean;
}

@Table({ 
  tableName: "notifications", 
  timestamps: false, // Solo usamos createdAt personalizado
  underscored: true // snake_case en DB
})
export class Notification extends Model<
  NotificationAttributes,
  NotificationCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare title: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare message: string;

  @AllowNull(false)
  @Column(DataType.ENUM("reservation_confirmed", "payment_received", "reminder", "system", "achievement"))
  declare type: NotificationType;

  @Default("medium")
  @Column(DataType.ENUM("low", "medium", "high", "urgent"))
  declare priority: NotificationPriority;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isRead: boolean;

  @Column(DataType.DATE)
  declare readAt: Date | null;

  @IsUrl
  @Column(DataType.STRING)
  declare actionUrl: string | null;

  @Column(DataType.JSON)
  declare metadata: object | null;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  declare createdAt: Date;

  @Column(DataType.DATE)
  declare expiresAt: Date | null;

  @BelongsTo(() => User, { foreignKey: "userId", as: "user" })
  declare user?: User;
}
