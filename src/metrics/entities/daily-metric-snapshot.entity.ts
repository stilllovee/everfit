import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';
import { MetricType, MetricUnit } from '../../types/metric';

@Entity({ name: 'daily_metric_snapshots' })
@Index(['userId', 'type', 'date'])
@Unique(['userId', 'type', 'date'])
export class DailyMetricSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar' })
  type!: MetricType;

  /** The source metric id this snapshot was derived from. */
  @Column({ type: 'varchar' })
  metricId!: string;

  @Column('float')
  value!: number;

  @Column({ type: 'varchar' })
  unit!: MetricUnit;

  /** Calendar date of the metric (YYYY-MM-DD). */
  @Column({ type: 'varchar', length: 10 })
  date!: string;

  /** createdAt of the source metric entry. */
  @Column({ type: 'datetime' })
  metricCreatedAt!: Date;

  /** When the cron job produced this snapshot. */
  @Column({ type: 'datetime' })
  snapshotAt!: Date;
}
