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
  Min,
} from "sequelize-typescript";
import { Reservation } from "./Reservation";
import { User } from "./User";

export type PaymentMethod = "card" | "cash" | "transfer" | "wallet";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface PaymentAttributes {
  id: string; // UUID
  reservationId: string;
  userId: string;
  amount: number; // DECIMAL
  currency: string;
  paymentMethod: PaymentMethod;
  paymentProvider?: string | null;
  externalPaymentId?: string | null;
  status: PaymentStatus;
  processedAt?: Date | null;
  refundedAt?: Date | null;
  refundAmount?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentCreationAttributes
  extends Omit<PaymentAttributes, "id" | "status" | "currency" | "createdAt" | "updatedAt"> {
  status?: PaymentStatus;
  currency?: string;
}

@Table({ 
  tableName: "payments", 
  timestamps: true,
  underscored: true // snake_case en DB
})
export class Payment extends Model<
  PaymentAttributes,
  PaymentCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Reservation)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare reservationId: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @AllowNull(false)
  @Min(0)
  @Column(DataType.DECIMAL(8, 2))
  declare amount: number;

  @Default("USD")
  @Column(DataType.STRING(3))
  declare currency: string;

  @AllowNull(false)
  @Column(DataType.ENUM("card", "cash", "transfer", "wallet"))
  declare paymentMethod: PaymentMethod;

  @Column(DataType.STRING)
  declare paymentProvider: string | null;

  @Column(DataType.STRING)
  declare externalPaymentId: string | null;

  @Default("pending")
  @Column(DataType.ENUM("pending", "completed", "failed", "refunded"))
  declare status: PaymentStatus;

  @Column(DataType.DATE)
  declare processedAt: Date | null;

  @Column(DataType.DATE)
  declare refundedAt: Date | null;

  @Column(DataType.DECIMAL(8, 2))
  declare refundAmount: number | null;

  @BelongsTo(() => Reservation, { foreignKey: "reservationId", as: "reservation" })
  declare reservation?: Reservation;

  @BelongsTo(() => User, { foreignKey: "userId", as: "user" })
  declare user?: User;
}
