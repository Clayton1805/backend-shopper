import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from 'typeorm';
import { Measure } from './Measure';

@Entity()
export class User {

  @PrimaryGeneratedColumn()
    id: number;

  @Index()
  @Column({ unique: true })
    customer_code: string;
  
  @OneToMany(() => Measure, (measure) => measure.user)
    measure: Measure[];
}
