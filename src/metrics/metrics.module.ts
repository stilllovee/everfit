import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsCronService } from './metrics-cron.service';
import { MetricEntity } from './entities/metric.entity';
import { DailyMetricSnapshotEntity } from './entities/daily-metric-snapshot.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([MetricEntity, DailyMetricSnapshotEntity]),
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsCronService],
  exports: [MetricsService],
})
export class MetricsModule {}