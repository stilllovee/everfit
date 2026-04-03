import { Index, Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { MetricType, MetricUnit } from '../../types/metric';

@Entity({ name: 'metrics' })
@Index(['userId', 'type', 'date', 'createdAt'])
export class MetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  type!: MetricType;

  @Column('float')
  value!: number;

  @Column({ type: 'varchar' })
  unit!: MetricUnit;

  @Column({ type: 'varchar', length: 10 })
  date!: string;

  @Column({ type: 'datetime' })
  createdAt!: Date;
}