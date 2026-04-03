import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOperator, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { QueryMetricsDto } from './dto/query-metrics.dto';
import { CreateMetricDto } from './dto/create-metric.dto';
import { MetricEntity } from './entities/metric.entity';
import { ChartPoint, MetricRecord, MetricType, MetricUnit } from '../types/metric';
import { convertValue, getBaseUnit, isUnitCompatible } from '../utils/units';
import { resolveDateRange } from '../utils/date';

interface LatestMetricRow {
  id: string;
  date: string;
  value: number;
  unit: MetricUnit;
  createdAt: string | Date;
}

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(MetricEntity)
    private readonly metricRepository: Repository<MetricEntity>,
  ) {}

  async createMetric(input: CreateMetricDto): Promise<MetricRecord> {
    this.ensureUnitCompatibility(input.type, input.unit);

    const metric = this.metricRepository.create({
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
    });

    const savedMetric = await this.metricRepository.save(metric);
    return this.toMetricRecord(savedMetric);
  }

  async listMetrics(query: QueryMetricsDto): Promise<MetricRecord[]> {
    this.ensureQueryIsValid(query);

    const { from, to } = resolveDateRange(query);
    const metrics = await this.metricRepository.find({
      where: this.buildWhereClause(query.userId, query.type, from, to),
      order: {
        date: 'DESC',
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    return metrics.map((metric) => {
      const record = this.toMetricRecord(metric);

      if (!query.unit) {
        return record;
      }

      return {
        ...record,
        value: convertValue(record.value, record.unit, query.unit),
        unit: query.unit,
      };
    });
  }

  async getChartData(query: QueryMetricsDto): Promise<ChartPoint[]> {
    this.ensureQueryIsValid(query);

    const { from, to } = resolveDateRange(query);
    const targetUnit = query.unit ?? getBaseUnit(query.type);
    const { whereClause, parameters } = this.buildChartQueryFilter(query.userId, query.type, from, to);
    const latestMetricsPerDay = (await this.metricRepository.query(
      `
        SELECT
          ranked."id" AS "id",
          ranked."date" AS "date",
          ranked."value" AS "value",
          ranked."unit" AS "unit",
          ranked."createdAt" AS "createdAt"
        FROM (
          SELECT
            "id",
            "date",
            "value",
            "unit",
            "createdAt",
            ROW_NUMBER() OVER (
              PARTITION BY "date"
              ORDER BY datetime("createdAt") DESC, "id" DESC
            ) AS "rowNumber"
          FROM "metrics"
          ${whereClause}
        ) AS ranked
        WHERE ranked."rowNumber" = 1
        ORDER BY ranked."date" ASC, datetime(ranked."createdAt") DESC, ranked."id" DESC
      `,
      parameters,
    )) as LatestMetricRow[];

    return latestMetricsPerDay.map((metric) => ({
      metricId: metric.id,
      date: metric.date,
      value: convertValue(Number(metric.value), metric.unit, targetUnit),
      unit: targetUnit,
      createdAt: this.toIsoString(metric.createdAt),
    }));
  }

  private ensureQueryIsValid(query: QueryMetricsDto): void {
    if (query.unit) {
      this.ensureUnitCompatibility(query.type, query.unit);
    }
  }

  private ensureUnitCompatibility(type: MetricType, unit: MetricUnit): void {
    if (!isUnitCompatible(type, unit)) {
      throw new BadRequestException(`Unit ${unit} is not valid for ${type}.`);
    }
  }

  private buildWhereClause(
    userId: string,
    type: MetricType,
    from?: string,
    to?: string,
  ): FindOptionsWhere<MetricEntity> {
    const where: FindOptionsWhere<MetricEntity> & {
      date?: FindOperator<string>;
    } = {
      userId,
      type,
    };

    if (from && to) {
      where.date = Between(from, to);
    } else if (from) {
      where.date = MoreThanOrEqual(from);
    } else if (to) {
      where.date = LessThanOrEqual(to);
    }

    return where;
  }

  private buildChartQueryFilter(
    userId: string,
    type: MetricType,
    from?: string,
    to?: string,
  ): { whereClause: string; parameters: string[] } {
    const conditions = ['"userId" = ?', '"type" = ?'];
    const parameters = [userId, type];

    if (from) {
      conditions.push('"date" >= ?');
      parameters.push(from);
    }

    if (to) {
      conditions.push('"date" <= ?');
      parameters.push(to);
    }

    return {
      whereClause: `WHERE ${conditions.join(' AND ')}`,
      parameters,
    };
  }

  private toMetricRecord(metric: MetricEntity): MetricRecord {
    return {
      id: metric.id,
      userId: metric.userId,
      type: metric.type,
      value: metric.value,
      unit: metric.unit,
      date: metric.date,
      createdAt: this.toIsoString(metric.createdAt),
    };
  }

  private toIsoString(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    const normalizedValue = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)
      ? value.replace(' ', 'T').concat('Z')
      : value;

    return new Date(normalizedValue).toISOString();
  }
}