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
  HasOne,
  PrimaryKey,
  Min,
} from "sequelize-typescript";
import { Court } from "./Court";
import { Customer } from "./Customer";
import { User } from "./User";
import { Payment } from "./Payment";
import { ReservationPlayer } from "./ReservationPlayer";

export type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type BookingType = "individual" | "group" | "tournament";

export interface ReservationAttributes {
  id: string; // UUID
  userId: string;
  courtId: string;
  reservationDate: Date;
  startTime: string; // TIME formato HH:mm
  endTime: string; // TIME formato HH:mm
  durationMinutes: number;
  totalPrice: number; // DECIMAL
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  bookingType: BookingType;
  specialRequests?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: Date | null;
  confirmedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationCreationAttributes
  extends Omit<ReservationAttributes, "id" | "status" | "paymentStatus" | "bookingType" | "createdAt" | "updatedAt"> {
  status?: ReservationStatus;
  paymentStatus?: PaymentStatus;
  bookingType?: BookingType;
}

@Table({ 
  tableName: "reservations", 
  timestamps: true,
  underscored: true // snake_case en DB
})
export class Reservation extends Model<
  ReservationAttributes,
  ReservationCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @ForeignKey(() => Court)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare courtId: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare reservationDate: Date;

  @AllowNull(false)
  @Column(DataType.TIME)
  declare startTime: string;

  @AllowNull(false)
  @Column(DataType.TIME)
  declare endTime: string;

  @AllowNull(false)
  @Min(30)
  @Column(DataType.INTEGER)
  declare durationMinutes: number;

  @AllowNull(false)
  @Min(0)
  @Column(DataType.DECIMAL(8, 2))
  declare totalPrice: number;

  @Default("pending")
  @Column(DataType.ENUM("pending", "confirmed", "completed", "cancelled", "no_show"))
  declare status: ReservationStatus;

  @Default("pending")
  @Column(DataType.ENUM("pending", "paid", "refunded", "failed"))
  declare paymentStatus: PaymentStatus;

  @Default("individual")
  @Column(DataType.ENUM("individual", "group", "tournament"))
  declare bookingType: BookingType;

  @Column(DataType.TEXT)
  declare specialRequests: string | null;

  @Column(DataType.TEXT)
  declare cancellationReason: string | null;

  @Column(DataType.DATE)
  declare cancelledAt: Date | null;

  @Column(DataType.DATE)
  declare confirmedAt: Date | null;

  @BelongsTo(() => User, { foreignKey: "userId", as: "user" })
  declare user?: User;

  @BelongsTo(() => Court, { foreignKey: "courtId", as: "court" })
  declare court?: Court;

  @HasOne(() => Payment, { foreignKey: "reservationId", as: "payment" })
  declare payment?: Payment;

  @HasMany(() => ReservationPlayer, { foreignKey: "reservationId", as: "players" })
  declare players?: ReservationPlayer[];
}
