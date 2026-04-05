import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { MetricEntity } from '../src/metrics/entities/metric.entity';
import { DailyMetricSnapshotEntity } from '../src/metrics/entities/daily-metric-snapshot.entity';
import { MetricsService } from '../src/metrics/metrics.service';

describe('MetricsService', () => {
  let dataSource: DataSource;
  let service: MetricsService;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqljs',
      entities: [MetricEntity, DailyMetricSnapshotEntity],
      synchronize: true,
    });

    await dataSource.initialize();
    service = new MetricsService(
      dataSource.getRepository(MetricEntity),
      dataSource.getRepository(DailyMetricSnapshotEntity),
    );
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('returns the latest metric per day for chart queries', async () => {
    const repository = dataSource.getRepository(MetricEntity);

    const firstMetric = repository.create({
      userId: 'user-1',
      type: 'DISTANCE',
      value: 100,
      unit: 'cm',
      date: '2026-03-01',
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
    });

    const secondMetric = repository.create({
      userId: 'user-1',
      type: 'DISTANCE',
      value: 2,
      unit: 'm',
      date: '2026-03-01',
      createdAt: new Date('2026-03-01T12:00:00.000Z'),
    });

    const thirdMetric = repository.create({
      userId: 'user-1',
      type: 'DISTANCE',
      value: 1,
      unit: 'yd',
      date: '2026-03-02',
      createdAt: new Date('2026-03-02T09:00:00.000Z'),
    });

    const savedMetrics = await repository.save([firstMetric, secondMetric, thirdMetric]);
    const chartData = await service.getChartData({
      userId: 'user-1',
      type: 'DISTANCE',
      from: '2026-03-01',
      to: '2026-03-31',
    });

    expect(chartData).toEqual([
      {
        metricId: savedMetrics[1].id,
        date: '2026-03-01',
        value: 2,
        unit: 'm',
        createdAt: '2026-03-01T12:00:00.000Z',
      },
      {
        metricId: savedMetrics[2].id,
        date: '2026-03-02',
        value: 0.9144,
        unit: 'm',
        createdAt: '2026-03-02T09:00:00.000Z',
      },
    ]);
  });

  it('converts list responses when a target unit is requested', async () => {
    const repository = dataSource.getRepository(MetricEntity);
    const savedMetric = await repository.save(
      repository.create({
        userId: 'user-2',
        type: 'TEMPERATURE',
        value: 0,
        unit: 'C',
        date: '2026-03-03',
        createdAt: new Date('2026-03-03T07:30:00.000Z'),
      }),
    );

    const metrics = await service.listMetrics({
      userId: 'user-2',
      type: 'TEMPERATURE',
      unit: 'F',
    });

    expect(metrics).toEqual([
      {
        id: savedMetric.id,
        userId: 'user-2',
        type: 'TEMPERATURE',
        value: 32,
        unit: 'F',
        date: '2026-03-03',
        createdAt: '2026-03-03T07:30:00.000Z',
      },
    ]);
  });
});