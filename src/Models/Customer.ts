import {
  Table,
  Column,
  Model,
  DataType,
  AllowNull,
  BelongsTo,
  ForeignKey,
  HasMany,
} from "sequelize-typescript";
import { User } from "./User";
import { Reservation } from "./Reservation";

export interface CustomerAttributes {
  id: number;
  userId?: number | null;
  // fullName: string;
  // email?: string | null;
  // phone?: string | null;
  notes?: string | null;
}

export interface CustomerCreationAttributes
  extends Omit<CustomerAttributes, "id"> {}

@Table({ tableName: "customers", timestamps: true })
export class Customer extends Model<
  CustomerAttributes,
  CustomerCreationAttributes
> {
  @ForeignKey(() => User)
  @Column(DataType.BIGINT)
  declare userId: number | null;

  // @AllowNull(false)
  // @Column(DataType.STRING)
  // declare fullName: string;

  // @Column(DataType.STRING)
  // declare email: string | null;

  // @Column(DataType.STRING)
  // declare phone: string | null;

  @Column(DataType.TEXT)
  declare notes: string | null;

  @BelongsTo(() => User)
  declare user?: User;

  @HasMany(() => Reservation, { foreignKey: "customerId" })
  declare reservations?: Reservation[];
}
