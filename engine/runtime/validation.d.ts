import type { Headline, Step, Tip } from "./trace";
export interface CalculationValidation {
    validationError?: string;
}
export declare function isFiniteNumber(value: unknown, min?: number, max?: number): value is number;
export declare function isIntegerInRange(value: unknown, min: number, max: number): value is number;
export declare function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T;
/** YYYY-MM-DD only; never silently normalizes February 31 or depends on local TZ. */
export declare function parseDateOnly(value: string): Date | null;
/** Monetary/quantity inputs must stay finite even when a caller bypasses the form codec. */
export declare function hasInvalidNumbers(input: object): boolean;
export declare function invalidCalculation<T extends object>(values: T, message: string): T & CalculationValidation & {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
};
/** Loan UI uses years, but schedules consist of whole months; cap work at 100 years. */
export declare function loanMonths(years: number): number | null;
