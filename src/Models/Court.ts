import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  AllowNull,
  HasMany,
} from "sequelize-typescript";
import { Reservation } from "./Reservation";

export interface CourtAttributes {
  id: number;
  name: string;
  surface?: string | null;
  isActive: boolean;
}

export interface CourtCreationAttributes
  extends Omit<CourtAttributes, "id" | "isActive"> {
  isActive?: boolean;
}

@Table({ tableName: "courts", timestamps: true })
export class Court extends Model<CourtAttributes, CourtCreationAttributes> {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.STRING)
  declare surface: string | null;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  @HasMany(() => Reservation, { foreignKey: "courtId" })
  declare reservations?: Reservation[];
}
