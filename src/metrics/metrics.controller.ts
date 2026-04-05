import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { getBaseUnit } from '../utils/units';
import { MetricsService } from './metrics.service';
import { CreateMetricDto } from './dto/create-metric.dto';
import { QueryMetricsDto } from './dto/query-metrics.dto';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post()
  async createMetric(@Body() input: CreateMetricDto) {
    const metric = await this.metricsService.createMetric(input);

    return { data: metric };
  }

  @Get()
  async listMetrics(@Query() query: QueryMetricsDto) {
    const metrics = await this.metricsService.listMetrics(query);

    return {
      data: metrics,
      meta: {
        count: metrics.length,
        convertedToUnit: query.unit ?? null,
      },
    };
  }

  @Get('chart')
  async getChartData(@Query() query: QueryMetricsDto) {
    const chartData = await this.metricsService.getChartData(query);

    return {
      data: chartData,
      meta: {
        count: chartData.length,
        unit: query.unit ?? getBaseUnit(query.type),
      },
    };
  }

  /**
   * Chart data v2 — reads from the pre-computed daily_metric_snapshots table
   * that is populated by the nightly cron job.  Identical query parameters to
   * GET /metrics/chart; faster at scale because the latest-per-day reduction
   * is already materialised.
   */
  @Get('chart/v2')
  async getChartDataV2(@Query() query: QueryMetricsDto) {
    const chartData = await this.metricsService.getChartDataV2(query);

    return {
      data: chartData,
      meta: {
        count: chartData.length,
        unit: query.unit ?? getBaseUnit(query.type),
      },
    };
  }
}