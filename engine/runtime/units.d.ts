/**
 * 면적·단위·날짜·건축 기본 도구. 법정 숫자: 평 = 400/121 ㎡(계량법 부칙), 재건축 연한 30년
 * (도시정비법 시행령 §2·조례), 건폐율·용적률 상한(국토계획법 §77·§78 — 조례로 정한다).
 */
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
export declare const PYEONG: number;
export interface DateInput {
    from: string;
    to: string;
}
export declare const EMPTY_DATE: DateInput;
export interface DateResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    days: number;
    years: number;
    months: number;
    rest: number;
}
export declare function calcDate(input: DateInput): DateResult;
export interface AreaInput {
    value: number;
    unit: "sqm" | "pyeong" | "sqft";
}
export declare const EMPTY_AREA: AreaInput;
export interface AreaResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    sqm: number;
    pyeong: number;
    sqft: number;
}
export declare function calcArea(input: AreaInput): AreaResult;
export declare const LENGTH_UNITS: {
    readonly m: 1;
    readonly km: 1000;
    readonly cm: 0.01;
    readonly mm: 0.001;
    readonly inch: 0.0254;
    readonly ft: 0.3048;
    readonly yd: 0.9144;
    readonly mile: 1609.344;
    readonly ja: number;
    readonly ri: 392.727;
};
export type LengthUnit = keyof typeof LENGTH_UNITS;
export declare const LENGTH_LABEL: Record<LengthUnit, string>;
export interface LengthInput {
    value: number;
    unit: LengthUnit;
}
export declare const EMPTY_LENGTH: LengthInput;
export interface LengthResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    meters: number;
}
export declare function calcLength(input: LengthInput): LengthResult;
export interface UnitPriceInput {
    price: number;
    area: number;
    unit: "sqm" | "pyeong";
}
export declare const EMPTY_UNIT_PRICE: UnitPriceInput;
export interface UnitPriceResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    perSqm: number;
    perPyeong: number;
}
export declare function calcUnitPrice(input: UnitPriceInput): UnitPriceResult;
export interface LandShareInput {
    siteArea: number;
    myExclusive: number;
    totalExclusive: number; /** ㎡당 공시지가 */
    landPrice: number;
}
export declare const EMPTY_LAND_SHARE: LandShareInput;
export interface LandShareResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    share: number;
    shareRatio: number;
    value: number;
}
export declare function calcLandShare(input: LandShareInput): LandShareResult;
export interface CoverageInput {
    siteArea: number;
    buildingArea: number;
    floorArea: number; /** 법정 상한 (소수) */
    maxCoverage: number;
    maxFar: number;
}
export declare const EMPTY_COVERAGE: CoverageInput;
export interface CoverageResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    coverage: number;
    far: number;
    maxBuildingArea: number;
    maxFloorArea: number;
}
export declare function calcCoverage(input: CoverageInput): CoverageResult;
export interface RebuildInput {
    completedYear: number; /** 조례 연한 (년) */
    limitYears: number; /** 안전진단 통과 여부 */
    safetyPassed: boolean;
}
export declare const EMPTY_REBUILD: RebuildInput;
export interface RebuildResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    eligibleYear: number;
    yearsLeft: number;
}
export declare function calcRebuild(input: RebuildInput): RebuildResult;
