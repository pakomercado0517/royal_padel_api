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
import { User } from "./User";

export type AchievementType = "games_played" | "consecutive_days" | "hours_played" | "first_win" | "loyalty";

export interface UserAchievementAttributes {
  id: string; // UUID
  userId: string;
  achievementType: AchievementType;
  achievementName: string; // "Jugador Matutino", "Rey de la Cancha"
  description: string; // Descripción del logro
  points: number; // Sistema de puntos
  unlockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievementCreationAttributes
  extends Omit<UserAchievementAttributes, "id" | "points" | "createdAt" | "updatedAt"> {
  points?: number;
}

@Table({ 
  tableName: "user_achievements", 
  timestamps: true,
  underscored: true // snake_case en DB
})
export class UserAchievement extends Model<
  UserAchievementAttributes,
  UserAchievementCreationAttributes
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @AllowNull(false)
  @Column(DataType.ENUM("games_played", "consecutive_days", "hours_played", "first_win", "loyalty"))
  declare achievementType: AchievementType;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare achievementName: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare description: string;

  @Default(0)
  @Min(0)
  @Column(DataType.INTEGER)
  declare points: number;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare unlockedAt: Date;

  @BelongsTo(() => User, { foreignKey: "userId", as: "user" })
  declare user?: User;
}
