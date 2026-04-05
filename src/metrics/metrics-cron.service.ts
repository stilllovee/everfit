import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricEntity } from './entities/metric.entity';
import { DailyMetricSnapshotEntity } from './entities/daily-metric-snapshot.entity';
import { MetricType, MetricUnit } from '../types/metric';

interface LatestMetricRow {
  id: string;
  userId: string;
  type: MetricType;
  value: number;
  unit: MetricUnit;
  date: string;
  createdAt: string | Date;
}

@Injectable()
export class MetricsCronService {
  private readonly logger = new Logger(MetricsCronService.name);

  constructor(
    @InjectRepository(MetricEntity)
    private readonly metricRepository: Repository<MetricEntity>,
    @InjectRepository(DailyMetricSnapshotEntity)
    private readonly snapshotRepository: Repository<DailyMetricSnapshotEntity>,
  ) {}

  /**
   * Runs at 00:05 every day and materialises the latest metric per
   * (userId, type, date) for yesterday into the daily_metric_snapshots table.
   */
  @Cron('5 0 * * *')
  async snapshotYesterday(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    this.logger.log(`Running daily snapshot for ${dateStr}`);
    const count = await this.refreshSnapshotsForDate(dateStr);
    this.logger.log(`Snapshot complete – ${count} row(s) written for ${dateStr}`);
  }

  /**
   * Finds the latest metric per (userId, type) for the given date and
   * upserts the result into daily_metric_snapshots.
   *
   * Safe to call manually to back-fill historical dates.
   */
  async refreshSnapshotsForDate(date: string): Promise<number> {
    const latest = (await this.metricRepository.query(
      `
        SELECT id, "userId", "type", "value", "unit", "date", "createdAt"
        FROM (
          SELECT
            id, "userId", "type", "value", "unit", "date", "createdAt",
            ROW_NUMBER() OVER (
              PARTITION BY "userId", "type"
              ORDER BY datetime("createdAt") DESC, "id" DESC
            ) AS rn
          FROM "metrics"
          WHERE "date" = ?
        )
        WHERE rn = 1
      `,
      [date],
    )) as LatestMetricRow[];

    const now = new Date();
    for (const row of latest) {
      // Remove any stale snapshot for this (userId, type, date) triple.
      await this.snapshotRepository.delete({
        userId: row.userId,
        type: row.type,
        date: row.date,
      });

      await this.snapshotRepository.save(
        this.snapshotRepository.create({
          id: randomUUID(),
          userId: row.userId,
          type: row.type,
          metricId: row.id,
          value: Number(row.value),
          unit: row.unit,
          date: row.date,
          metricCreatedAt: new Date(
            typeof row.createdAt === 'string'
              ? row.createdAt.replace(' ', 'T').replace(/(?<!\.\d)$/, 'Z')
              : row.createdAt,
          ),
          snapshotAt: now,
        }),
      );
    }

    return latest.length;
  }
}
