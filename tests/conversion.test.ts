import { describe, expect, it } from 'vitest';
import { convertValue, getBaseUnit, isUnitCompatible } from '../src/utils/units';

describe('unit compatibility', () => {
  it('matches units to metric families', () => {
    expect(isUnitCompatible('DISTANCE', 'yd')).toBe(true);
    expect(isUnitCompatible('TEMPERATURE', 'K')).toBe(true);
    expect(isUnitCompatible('DISTANCE', 'K')).toBe(false);
  });
});

describe('value conversion', () => {
  it('converts distance using meters as the base unit', () => {
    expect(getBaseUnit('DISTANCE')).toBe('m');
    expect(convertValue(100, 'cm', 'm')).toBe(1);
    expect(convertValue(1, 'yd', 'inch')).toBe(36);
  });

  it('converts temperature using celsius as the base unit', () => {
    expect(getBaseUnit('TEMPERATURE')).toBe('C');
    expect(convertValue(32, 'F', 'C')).toBe(0);
    expect(convertValue(0, 'C', 'K')).toBe(273.15);
  });

  it('rejects cross-type conversions', () => {
    expect(() => convertValue(10, 'm', 'C')).toThrow('Cannot convert m to C.');
  });
});