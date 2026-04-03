export const metricTypes = ['DISTANCE', 'TEMPERATURE'] as const;

export type MetricType = (typeof metricTypes)[number];

export const distanceUnits = ['m', 'cm', 'inch', 'ft', 'yd'] as const;
export const temperatureUnits = ['C', 'F', 'K'] as const;
export const metricUnits = [...distanceUnits, ...temperatureUnits] as const;

export type DistanceUnit = (typeof distanceUnits)[number];
export type TemperatureUnit = (typeof temperatureUnits)[number];
export type MetricUnit = (typeof metricUnits)[number];

export interface MetricRecord {
  id: string;
  userId: string;
  type: MetricType;
  value: number;
  unit: MetricUnit;
  date: string;
  createdAt: string;
}

export interface CreateMetricInput {
  userId: string;
  type: MetricType;
  value: number;
  unit: MetricUnit;
  date: string;
}

export interface MetricFilter {
  userId: string;
  type: MetricType;
  from?: string;
  to?: string;
}

export interface MetricQuery extends MetricFilter {
  unit?: MetricUnit;
}

export interface ChartPoint {
  metricId: string;
  date: string;
  value: number;
  unit: MetricUnit;
  createdAt: string;
}