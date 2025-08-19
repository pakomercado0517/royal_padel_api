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
  Max,
} from "sequelize-typescript";
import { Court } from "./Court";

export type Season = "high" | "medium" | "low";

export interface CourtPricingAttributes {
  id: string; // UUID
  courtId: string;
  dayOfWeek: number; // 0=domingo, 1=lunes, etc.
  startTime: string; // TIME formato HH:mm
  endTime: string; // TIME formato HH:mm
  pricePerHour: number; // DECIMAL(8,2)
  season: Season;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourtPricingCreationAttributes
  extends Omit<CourtPricingAttributes, "id" | "season" | "isActive" | "createdAt" | "updatedAt"> {
  season?: Season;
  isActive?: boolean;
}

@Table({ 
  tableName: "court_pricing", 
  timestamps: true,
  underscored: true // snake_case en DB
})
export class CourtPricing extends Model<
  CourtPricingAttributes,
  CourtPricingCreationAttributes
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
  @Min(0)
  @Max(6)
  @Column(DataType.INTEGER)
  declare dayOfWeek: number;

  @AllowNull(false)
  @Column(DataType.TIME)
  declare startTime: string;

  @AllowNull(false)
  @Column(DataType.TIME)
  declare endTime: string;

  @AllowNull(false)
  @Min(0)
  @Column(DataType.DECIMAL(8, 2))
  declare pricePerHour: number;

  @Default("medium")
  @Column(DataType.ENUM("high", "medium", "low"))
  declare season: Season;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @BelongsTo(() => Court, { foreignKey: "courtId", as: "court" })
  declare court?: Court;
}
