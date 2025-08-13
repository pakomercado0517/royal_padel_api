import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  AllowNull,
  HasOne,
  HasMany,
} from "sequelize-typescript";
import { Customer } from "./Customer";
import { Reservation } from "./Reservation";

export type UserRole = "admin" | "staff";

export interface UserAttributes {
  id: number;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password_hash?: string | null;
  isActive: boolean;
  role: UserRole;
  token: string | null;
  token_expires_at: string | null;
}

export interface UserCreationAttributes
  extends Omit<UserAttributes, "id" | "isActive" | "role"> {
  isActive?: boolean;
  role?: UserRole;
}

@Table({ tableName: "users", timestamps: true })
export class User extends Model<UserAttributes, UserCreationAttributes> {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare fullName: string;

  @Column(DataType.STRING)
  declare email: string | null;

  @Column(DataType.STRING)
  declare phone: string | null;

  @Column(DataType.TEXT)
  declare password_hash: string | null;

  @Column(DataType.DATE)
  declare token_expires_at;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @Default("staff")
  @Column(DataType.ENUM("admin", "staff"))
  declare role: UserRole;

  @Column(DataType.STRING(6))
  declare token: string | null;

  // Relacion 1:1 con Customer
  @HasOne(() => Customer, { foreignKey: "userId" })
  declare customer?: Customer;

  // Quien registró una reserva (staff o él mismo)
  @HasMany(() => Reservation, { foreignKey: "bookedByUser" })
  declare reservationsBooked?: Reservation[];
}
