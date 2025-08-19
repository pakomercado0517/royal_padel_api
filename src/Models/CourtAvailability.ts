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
} from "sequelize-typescript";
import { Court } from "./Court";
import { User } from "./User";

export type AvailabilityReason = "maintenance" | "private_event" | "reserved" | "blocked";

export interface CourtAvailabilityAttributes {
  id: string; // UUID
  courtId: string;
  date: Date; // DATE - día específico
  startTime: string; // TIME formato HH:mm
  endTime: string; // TIME formato HH:mm
  isAvailable: boolean;
  reason?: AvailabilityReason | null;
  notes?: string | null;
  createdBy?: string | null; // FK → users.id (admin que creó)
  createdAt: Date;
  updatedAt: Date;
}

export interface CourtAvailabilityCreationAttributes
  extends Omit<CourtAvailabilityAttributes, "id" | "isAvailable" | "createdAt" | "updatedAt"> {
  isAvailable?: boolean;
}

@Table({ 
  tableName: "court_availability", 
  timestamps: true,
  underscored: true // snake_case en DB
})
export class CourtAvailability extends Model<
  CourtAvailabilityAttributes,
  CourtAvailabilityCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Court)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare courtId: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare date: Date;

  @AllowNull(false)
  @Column(DataType.TIME)
  declare startTime: string;

  @AllowNull(false)
  @Column(DataType.TIME)
  declare endTime: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isAvailable: boolean;

  @Column(DataType.ENUM("maintenance", "private_event", "reserved", "blocked"))
  declare reason: AvailabilityReason | null;

  @Column(DataType.TEXT)
  declare notes: string | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare createdBy: string | null;

  @BelongsTo(() => Court, { foreignKey: "courtId", as: "court" })
  declare court?: Court;

  @BelongsTo(() => User, { foreignKey: "createdBy", as: "creator" })
  declare creator?: User;
}
