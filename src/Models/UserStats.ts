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
  Unique,
  Min,
} from "sequelize-typescript";
import { User } from "./User";
import { Court } from "./Court";

export interface UserStatsAttributes {
  id: string; // UUID
  userId: string;
  totalGamesPlayed: number;
  totalHoursPlayed: number; // DECIMAL(5,2)
  currentMonthGames: number; // se resetea cada mes
  favoriteCourtId?: string | null;
  totalSpent: number; // DECIMAL(10,2)
  averageRating?: number | null; // DECIMAL(3,2) - rating como jugador
  lastGameDate?: Date | null;
  streakDays: number; // días consecutivos jugando
  achievements: string[]; // JSON Array - badges desbloqueados
  preferencesData?: object | null; // JSON - horarios preferidos, etc.
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStatsCreationAttributes
  extends Omit<UserStatsAttributes, "id" | "totalGamesPlayed" | "totalHoursPlayed" | "currentMonthGames" | "totalSpent" | "streakDays" | "achievements" | "createdAt" | "updatedAt"> {
  totalGamesPlayed?: number;
  totalHoursPlayed?: number;
  currentMonthGames?: number;
  totalSpent?: number;
  streakDays?: number;
  achievements?: string[];
}

@Table({ 
  tableName: "user_stats", 
  timestamps: true,
  underscored: true // snake_case en DB
})
export class UserStats extends Model<
  UserStatsAttributes,
  UserStatsCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Unique
  @Column(DataType.UUID)
  declare userId: string;

  @Default(0)
  @Min(0)
  @Column(DataType.INTEGER)
  declare totalGamesPlayed: number;

  @Default(0)
  @Min(0)
  @Column(DataType.DECIMAL(5, 2))
  declare totalHoursPlayed: number;

  @Default(0)
  @Min(0)
  @Column(DataType.INTEGER)
  declare currentMonthGames: number;

  @ForeignKey(() => Court)
  @Column(DataType.UUID)
  declare favoriteCourtId: string | null;

  @Default(0)
  @Min(0)
  @Column(DataType.DECIMAL(10, 2))
  declare totalSpent: number;

  @Min(0)
  @Column(DataType.DECIMAL(3, 2))
  declare averageRating: number | null;

  @Column(DataType.DATE)
  declare lastGameDate: Date | null;

  @Default(0)
  @Min(0)
  @Column(DataType.INTEGER)
  declare streakDays: number;

  @Default([])
  @Column(DataType.JSON)
  declare achievements: string[];

  @Column(DataType.JSON)
  declare preferencesData: object | null;

  @BelongsTo(() => User, { foreignKey: "userId", as: "user" })
  declare user?: User;

  @BelongsTo(() => Court, { foreignKey: "favoriteCourtId", as: "favoriteCourt" })
  declare favoriteCourt?: Court;
}
