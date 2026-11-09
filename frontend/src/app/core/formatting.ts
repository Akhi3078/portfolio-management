import { Pipe, type PipeTransform } from '@angular/core';

/**
 * Money and dates are formatted in exactly two places, so the whole app is
 * consistent by construction rather than by everyone remembering the same
 * pipe arguments.
 */

const AED = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
});

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/**
 * Parses an ISO date-only string as a LOCAL date.
 *
 * `new Date('2027-06-30')` is parsed as UTC midnight, which displays as the 29th
 * anywhere west of Greenwich. Splitting the parts avoids that off-by-one.
 */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Money as AED with thousands separators, e.g. "AED 1,200,000". */
@Pipe({ name: 'aed' })
export class AedPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : AED.format(value);
  }
}

/** The one date format used throughout, e.g. "30 Jun 2027". */
@Pipe({ name: 'appDate' })
export class AppDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const parsed = parseIsoDate(value);

    return parsed ? DATE.format(parsed) : value;
  }
}

/** Spend as a share of budget, e.g. "95%". Guards a zero budget. */
@Pipe({ name: 'spendShare' })
export class SpendSharePipe implements PipeTransform {
  transform(actualCost: number, budget: number): string {
    if (!budget) {
      return '-';
    }

    return `${Math.round((actualCost / budget) * 100)}%`;
  }
}
