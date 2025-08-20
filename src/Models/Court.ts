import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  AllowNull,
  HasMany,
  PrimaryKey,
  Unique,
  Min,
  Max,
} from "sequelize-typescript";
import { Reservation } from "./Reservation";
import { CourtPricing } from "./CourtPricing";
import { CourtAvailability } from "./CourtAvailability";
import { UserStats } from "./UserStats";

export type CourtStatus = "active" | "maintenance" | "inactive";

export interface CourtAttributes {
  id: string; // UUID
  name: string;
  description?: string | null;
  capacity: number;
  features: string[];
  basePricePerHour: number;
  status: CourtStatus;
  locationDetails?: object | null;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CourtCreationAttributes
  extends Omit<CourtAttributes, "id" | "status" | "createdAt" | "updatedAt"> {
  status?: CourtStatus;
}

@Table({ 
  tableName: "courts", 
  timestamps: true,
  paranoid: true, // soft delete
  underscored: true // snake_case en DB
})
export class Court extends Model<CourtAttributes, CourtCreationAttributes> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.TEXT)
  declare description: string | null;

  @Default(4)
  @Min(2)
  @Max(8)
  @Column(DataType.INTEGER)
  declare capacity: number;

  @Default([])
  @Column(DataType.JSON)
  declare features: string[];

  @AllowNull(false)
  @Min(0)
  @Column(DataType.DECIMAL(8, 2))
  declare basePricePerHour: number;

  @Default("active")
  @Column(DataType.ENUM("active", "maintenance", "inactive"))
  declare status: CourtStatus;

  @Column(DataType.JSON)
  declare locationDetails: object | null;

  @Default([])
  @Column(DataType.JSON)
  declare images: string[];

  // Court relationships según especificaciones
  @HasMany(() => Reservation, { foreignKey: "courtId", as: "reservations" })
  declare reservations?: Reservation[];

  @HasMany(() => CourtPricing, { foreignKey: "courtId", as: "pricing" })
  declare pricing?: CourtPricing[];

  @HasMany(() => CourtAvailability, { foreignKey: "courtId", as: "availability" })
  declare availability?: CourtAvailability[];

  @HasMany(() => UserStats, { foreignKey: "favoriteCourtId", as: "usersFavoriteCourt" })
  declare usersFavoriteCourt?: UserStats[];
}
