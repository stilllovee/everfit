import { BadRequestException } from '@nestjs/common';
import { distanceUnits, MetricType, MetricUnit, temperatureUnits } from '../types/metric';

const distanceUnitSet = new Set<MetricUnit>(distanceUnits);
const temperatureUnitSet = new Set<MetricUnit>(temperatureUnits);

const baseUnitByType: Record<MetricType, MetricUnit> = {
  DISTANCE: 'm',
  TEMPERATURE: 'C',
};

export function getBaseUnit(type: MetricType): MetricUnit {
  return baseUnitByType[type];
}

export function getTypeForUnit(unit: MetricUnit): MetricType {
  if (distanceUnitSet.has(unit)) {
    return 'DISTANCE';
  }

  return 'TEMPERATURE';
}

export function isUnitCompatible(type: MetricType, unit: MetricUnit): boolean {
  return getTypeForUnit(unit) === type;
}

export function convertValue(value: number, fromUnit: MetricUnit, toUnit: MetricUnit): number {
  const sourceType = getTypeForUnit(fromUnit);
  const targetType = getTypeForUnit(toUnit);

  if (sourceType !== targetType) {
    throw new BadRequestException(`Cannot convert ${fromUnit} to ${toUnit}.`);
  }

  if (fromUnit === toUnit) {
    return round(value);
  }

  if (sourceType === 'DISTANCE') {
    const meters = convertDistanceToMeters(value, fromUnit);
    return round(convertMetersToDistance(meters, toUnit));
  }

  const celsius = convertTemperatureToCelsius(value, fromUnit);
  return round(convertCelsiusToTemperature(celsius, toUnit));
}

function convertDistanceToMeters(value: number, unit: MetricUnit): number {
  switch (unit) {
    case 'm':
      return value;
    case 'cm':
      return value / 100;
    case 'inch':
      return value * 0.0254;
    case 'ft':
      return value * 0.3048;
    case 'yd':
      return value * 0.9144;
    default:
      throw new BadRequestException(`Unsupported distance unit: ${unit}.`);
  }
}

function convertMetersToDistance(value: number, unit: MetricUnit): number {
  switch (unit) {
    case 'm':
      return value;
    case 'cm':
      return value * 100;
    case 'inch':
      return value / 0.0254;
    case 'ft':
      return value / 0.3048;
    case 'yd':
      return value / 0.9144;
    default:
      throw new BadRequestException(`Unsupported distance unit: ${unit}.`);
  }
}

function convertTemperatureToCelsius(value: number, unit: MetricUnit): number {
  switch (unit) {
    case 'C':
      return value;
    case 'F':
      return (value - 32) * (5 / 9);
    case 'K':
      return value - 273.15;
    default:
      throw new BadRequestException(`Unsupported temperature unit: ${unit}.`);
  }
}

function convertCelsiusToTemperature(value: number, unit: MetricUnit): number {
  switch (unit) {
    case 'C':
      return value;
    case 'F':
      return value * (9 / 5) + 32;
    case 'K':
      return value + 273.15;
    default:
      throw new BadRequestException(`Unsupported temperature unit: ${unit}.`);
  }
}

function round(value: number): number {
  return Number(value.toFixed(6));
}