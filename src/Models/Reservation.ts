import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
  Default,
  BelongsTo,
  ForeignKey,
  HasMany,
} from "sequelize-typescript";
import { Court } from "./Court";
import { Customer } from "./Customer";
import { User } from "./User";
import { Payment } from "./Payment";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "completed";

export interface ReservationAttributes {
  id: number;
  courtId: number;
  customerId?: number | null;
  bookedByUser?: number | null;
  status: ReservationStatus;
  startsAt: Date;
  endsAt: Date;
  playersCount?: number | null;
  priceCents: number;
  currency: string;
  notes?: string | null;
}

export interface ReservationCreationAttributes
  extends Omit<ReservationAttributes, "id" | "status" | "currency"> {
  status?: ReservationStatus;
  currency?: string;
}

@Table({ tableName: "reservations", timestamps: true })
export class Reservation extends Model<
  ReservationAttributes,
  ReservationCreationAttributes
> {
  @ForeignKey(() => Court)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  declare courtId: number;

  @ForeignKey(() => Customer)
  @Column(DataType.BIGINT)
  declare customerId: number | null;

  @ForeignKey(() => User)
  @Column(DataType.BIGINT)
  declare bookedByUser: number | null;

  @Default("pending")
  @Column(
    DataType.ENUM("pending", "confirmed", "cancelled", "no_show", "completed")
  )
  declare status: ReservationStatus;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare startsAt: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare endsAt: Date;

  @Column(DataType.INTEGER)
  declare playersCount: number | null;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare priceCents: number;

  @Default("MXN")
  @Column(DataType.STRING)
  declare currency: string;

  @Column(DataType.TEXT)
  declare notes: string | null;

  @BelongsTo(() => Court)
  declare court?: Court;

  @BelongsTo(() => Customer)
  declare customer?: Customer;

  @BelongsTo(() => User, { foreignKey: "bookedByUser", targetKey: "id" })
  declare bookedBy?: User;

  @HasMany(() => Payment, { foreignKey: "reservationId" })
  declare payments?: Payment[];
}
