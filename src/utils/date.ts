import { BadRequestException } from '@nestjs/common';

export const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface RangeQueryInput {
  from?: string;
  to?: string;
  period?: string;
}

export function isIsoDateOnly(value: string): boolean {
  if (!ISO_DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return toIsoDateOnly(parsed) === value;
}

export function toIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveDateRange(input: RangeQueryInput): { from?: string; to?: string } {
  const { from, to, period } = input;

  if (from && to && from > to) {
    throw new BadRequestException('The from date must be earlier than or equal to the to date.');
  }

  if (!period) {
    return { from, to };
  }

  if (from) {
    throw new BadRequestException('Use either from/to or period, but not both.');
  }

  const match = /^(\d+)([dm])$/.exec(period);
  if (!match) {
    throw new BadRequestException('Period must use values like 30d or 2m.');
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const end = new Date(`${to ?? toIsoDateOnly(new Date())}T00:00:00.000Z`);
  const start = new Date(end);

  if (unit === 'd') {
    start.setUTCDate(start.getUTCDate() - amount);
  } else {
    start.setUTCMonth(start.getUTCMonth() - amount);
  }

  return {
    from: toIsoDateOnly(start),
    to: toIsoDateOnly(end),
  };
}