import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './User';

export enum MeasureTypeEnum {
  WATER = 'WATER',
  GAS = 'GAS',
}

@Entity()
export class Measure {

  @PrimaryGeneratedColumn()
    id: number;

  @Column({ type: 'timestamptz' })
    datetime: Date;

  @Column({
    type: 'enum',
    enum: MeasureTypeEnum,
  })
    type: MeasureTypeEnum;

  @Column({ default: false })
    has_confirmed: boolean;

  @Column({ unique: true })
    image_url: string;

  @Column()
    measure_value: number;
  
  @ManyToOne(() => User, (user) => user.measure)
    user: User;
}
