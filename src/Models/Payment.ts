import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
  Default,
  BelongsTo,
  ForeignKey,
} from "sequelize-typescript";
import { Reservation } from "./Reservation";

export type PaymentMethod = "cash" | "card" | "transfer" | "online";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface PaymentAttributes {
  id: number;
  reservationId: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  externalRef?: string | null;
  paidAt?: Date | null;
}

export interface PaymentCreationAttributes
  extends Omit<PaymentAttributes, "id" | "status" | "currency"> {
  status?: PaymentStatus;
  currency?: string;
}

@Table({ tableName: "payments", timestamps: true })
export class Payment extends Model<
  PaymentAttributes,
  PaymentCreationAttributes
> {
  @ForeignKey(() => Reservation)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  declare reservationId: number;

  @AllowNull(false)
  @Column(DataType.ENUM("cash", "card", "transfer", "online"))
  declare method: PaymentMethod;

  @Default("pending")
  @Column(DataType.ENUM("pending", "paid", "refunded", "failed"))
  declare status: PaymentStatus;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare amountCents: number;

  @Default("MXN")
  @Column(DataType.STRING)
  declare currency: string;

  @Column(DataType.STRING)
  declare externalRef: string | null;

  @Column(DataType.DATE)
  declare paidAt: Date | null;

  @BelongsTo(() => Reservation)
  declare reservation?: Reservation;
}
