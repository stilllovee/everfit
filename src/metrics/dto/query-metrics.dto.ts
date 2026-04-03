import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { metricTypes, metricUnits, MetricType, MetricUnit } from '../../types/metric';
import { ISO_DATE_ONLY_PATTERN } from '../../utils/date';

export class QueryMetricsDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsIn(metricTypes)
  type!: MetricType;

  @IsOptional()
  @Matches(ISO_DATE_ONLY_PATTERN)
  from?: string;

  @IsOptional()
  @Matches(ISO_DATE_ONLY_PATTERN)
  to?: string;

  @IsOptional()
  @Matches(/^[1-9]\d*[dm]$/)
  period?: string;

  @IsOptional()
  @IsIn(metricUnits)
  unit?: MetricUnit;
}