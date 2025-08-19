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
  IsEmail,
} from "sequelize-typescript";
import { Reservation } from "./Reservation";
import { User } from "./User";

export type PlayerRole = "organizer" | "player" | "guest";
export type PlayerStatus = "confirmed" | "pending" | "declined";

export interface ReservationPlayerAttributes {
  id: string; // UUID
  reservationId: string;
  userId?: string | null; // NULLABLE (null si invitado)
  guestName?: string | null; // VARCHAR - nombre si no está registrado
  guestEmail?: string | null; // VARCHAR - email del invitado
  role: PlayerRole;
  status: PlayerStatus;
  joinedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationPlayerCreationAttributes
  extends Omit<ReservationPlayerAttributes, "id" | "role" | "status" | "createdAt" | "updatedAt"> {
  role?: PlayerRole;
  status?: PlayerStatus;
}

@Table({ 
  tableName: "reservation_players", 
  timestamps: true,
  underscored: true // snake_case en DB
})
export class ReservationPlayer extends Model<
  ReservationPlayerAttributes,
  ReservationPlayerCreationAttributes
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
  @Column(DataType.UUID)
  declare userId: string | null;

  @Column(DataType.STRING)
  declare guestName: string | null;

  @IsEmail
  @Column(DataType.STRING)
  declare guestEmail: string | null;

  @Default("player")
  @Column(DataType.ENUM("organizer", "player", "guest"))
  declare role: PlayerRole;

  @Default("pending")
  @Column(DataType.ENUM("confirmed", "pending", "declined"))
  declare status: PlayerStatus;

  @Column(DataType.DATE)
  declare joinedAt: Date | null;

  @BelongsTo(() => Reservation, { foreignKey: "reservationId", as: "reservation" })
  declare reservation?: Reservation;

  @BelongsTo(() => User, { foreignKey: "userId", as: "user" })
  declare user?: User;
}
