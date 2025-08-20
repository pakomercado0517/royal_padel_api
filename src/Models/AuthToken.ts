import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  Default,
  Unique,
} from "sequelize-typescript";
import { User } from "./User";

export type TokenType = "email_verification" | "password_reset" | "phone_verification";

export interface AuthTokenAttributes {
  id: string; // UUID
  userId: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  usedAt?: Date | null;
  metadata?: object | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenCreationAttributes
  extends Omit<AuthTokenAttributes, "id" | "createdAt" | "updatedAt"> {}

@Table({ 
  tableName: "auth_tokens", 
  timestamps: true,
  underscored: true // snake_case en DB
})
export class AuthToken extends Model<
  AuthTokenAttributes,
  AuthTokenCreationAttributes
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
  @Unique
  @Column(DataType.STRING)
  declare token: string;

  @AllowNull(false)
  @Column(DataType.ENUM("email_verification", "password_reset", "phone_verification"))
  declare type: TokenType;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expiresAt: Date;

  @Column(DataType.DATE)
  declare usedAt: Date | null;

  @Column(DataType.JSON)
  declare metadata: object | null;

  @BelongsTo(() => User, { foreignKey: "userId", as: "user" })
  declare user?: User;
}
