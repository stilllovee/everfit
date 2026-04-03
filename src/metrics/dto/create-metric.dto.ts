import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsString, Matches } from 'class-validator';
import { metricTypes, metricUnits, MetricType, MetricUnit } from '../../types/metric';
import { ISO_DATE_ONLY_PATTERN } from '../../utils/date';

export class CreateMetricDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsIn(metricTypes)
  type!: MetricType;

  @Type(() => Number)
  @IsNumber()
  value!: number;

  @IsIn(metricUnits)
  unit!: MetricUnit;

  @Matches(ISO_DATE_ONLY_PATTERN)
  date!: string;
}