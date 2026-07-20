import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const DEFAULT_CURRENCY = "AUD";
export const DEFAULT_LOCALE = "en-AU";

/** Format integer cents as AUD currency string */
export function formatCents(
  cents: number | bigint,
  options?: { currency?: string; locale?: string; showSign?: boolean }
): string {
  const value = Number(cents) / 100;
  const currency = options?.currency ?? DEFAULT_CURRENCY;
  const locale = options?.locale ?? DEFAULT_LOCALE;

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  if (options?.showSign && Number(cents) !== 0) {
    return Number(cents) < 0 ? `-${formatted}` : `+${formatted}`;
  }

  return Number(cents) < 0 ? `-${formatted}` : formatted;
}

/** Parse dollar string to integer cents */
export function parseToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) return 0;
  return new Decimal(cleaned).mul(100).round().toNumber();
}

export function addCents(...amounts: number[]): number {
  return amounts
    .reduce((sum, a) => sum.plus(a), new Decimal(0))
    .round()
    .toNumber();
}

export function subtractCents(a: number, b: number): number {
  return new Decimal(a).minus(b).round().toNumber();
}

export function multiplyCents(cents: number, factor: number): number {
  return new Decimal(cents).mul(factor).round().toNumber();
}

export function centsToDollars(cents: number): string {
  return new Decimal(cents).div(100).toFixed(2);
}

export function dollarsToCents(dollars: number | string): number {
  return new Decimal(dollars).mul(100).round().toNumber();
}

/** Work hours from after-tax hourly rate */
export function centsToWorkHours(
  cents: number,
  afterTaxHourlyCents: number
): number | null {
  if (!afterTaxHourlyCents || afterTaxHourlyCents <= 0) return null;
  return new Decimal(cents).div(afterTaxHourlyCents).toDecimalPlaces(1).toNumber();
}

export function computeAfterTaxHourly(
  hourlyRateCents: number,
  taxRatePercent: number
): number {
  const netMultiplier = new Decimal(1).minus(
    new Decimal(taxRatePercent).div(100)
  );
  return new Decimal(hourlyRateCents).mul(netMultiplier).round().toNumber();
}
