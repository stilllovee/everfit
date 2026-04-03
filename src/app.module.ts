import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: process.env.DB_PATH ?? 'metrics.sqlite',
      autoSave: true,
      autoLoadEntities: true,
      synchronize: true,
      logging: false,
    }),
    MetricsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}