import type { Headline, Step, Tip } from "./trace";

export interface CalculationValidation { validationError?: string; }

export function isFiniteNumber(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value, min, max) && Number.isInteger(value);
}

export function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

/** YYYY-MM-DD only; never silently normalizes February 31 or depends on local TZ. */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

/** Monetary/quantity inputs must stay finite even when a caller bypasses the form codec. */
export function hasInvalidNumbers(input: object): boolean {
  return Object.values(input).some(value => typeof value === "number" && !isFiniteNumber(value));
}

export function invalidCalculation<T extends object>(values: T, message: string): T & CalculationValidation & { headline: Headline[]; steps: Step[]; tips: Tip[] } {
  return {
    ...values,
    validationError: message,
    headline: [{ label: "계산할 수 없습니다", value: 0, displayValue: "입력 확인 필요", hint: message }],
    steps: [],
    tips: [{ level: "must", title: "입력값을 확인해 주세요", body: message }],
  };
}

/** Loan UI uses years, but schedules consist of whole months; cap work at 100 years. */
export function loanMonths(years: number): number | null {
  const months = years * 12;
  return isIntegerInRange(months, 1, 1200) ? months : null;
}
