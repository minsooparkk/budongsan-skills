/**
 * 보수·수수료와 단일 세목 페이지 엔진.
 *
 *   감정평가수수료  「감정평가법인등의 보수에 관한 기준」(국토부 공고, 2026.2.9) [별표] — 법제처 대조
 *   법무사 보수     대한법무사협회 보수표(소유권이전등기 기본보수) — 협회 규정이라 법령 DB에 없다. 확인일 2026-09-03, 상한 기준
 *   지적측량수수료  한국국토정보공사 고시 — 종류별 기본단가를 입력값으로 둔 추정
 *   국민주택채권·인지세·지역자원시설세  registration.ts·property.ts 의 계산을 단독 페이지로
 */
import { type StatuteBand } from "./property";
import { type RegKind } from "./registration";
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
export declare const APPRAISAL_FEE_BANDS: StatuteBand[];
export interface AppraisalFeeInput {
    value: number; /** 0.8~1.2 */
    factor: number; /** 실비 (출장·등본 등) */
    expenses: number;
    vat: boolean;
}
export declare const EMPTY_APPRAISAL_FEE: AppraisalFeeInput;
export interface AppraisalFeeResult {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    base: number;
    fee: number;
    vat: number;
    total: number;
}
export declare function calcAppraisalFee(input: AppraisalFeeInput): AppraisalFeeResult;
/** 대한법무사협회 보수표 — 소유권이전등기 기본보수 (과세표준 기준). 협회 규정, 확인일 2026-09-03 */
export declare const JUDICIAL_BANDS: StatuteBand[];
export interface JudicialFeeInput {
    base: number;
    mortgage: number; /** 일당·교통비·제증명 등 실비 */
    expenses: number; /** 협의 할인율 (소수) */
    discount: number;
    vat: boolean;
}
export declare const EMPTY_JUDICIAL: JudicialFeeInput;
export interface JudicialFeeResult {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    transferFee: number;
    mortgageFee: number;
    total: number;
}
export declare function calcJudicialFee(input: JudicialFeeInput): JudicialFeeResult;
export declare const SURVEY_KINDS: readonly ["boundary", "division", "status", "conversion", "registration"];
export type SurveyKind = (typeof SURVEY_KINDS)[number];
export declare const SURVEY_KIND_LABEL: Record<SurveyKind, string>;
/** 한국국토정보공사 고시 기본단가 근사 — 도시지역 1필지 1,000㎡ 이하. 확인일 2026-09-03, 추정 */
export declare const SURVEY_BASE: Record<SurveyKind, number>;
export interface SurveyInput {
    kind: SurveyKind; /** 면적 ㎡ */
    area: number;
    parcels: number; /** 기본단가 (원) — 고시값으로 바꿔 넣는다 */
    baseFee: number; /** 추가 필지 단가 비율 */
    extraParcelRatio: number;
}
export declare const EMPTY_SURVEY: SurveyInput;
export interface SurveyResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    total: number;
}
export declare function calcSurvey(input: SurveyInput): SurveyResult;
export interface BondInput {
    kind: RegKind;
    standardValue: number;
    metro: boolean;
    discountRate: number; /** 매입 후 보유 시 연 표면금리 (참고) */
    couponRate: number;
}
export declare const EMPTY_BOND: BondInput;
export interface BondResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    rate: number;
    amount: number;
    cost: number;
}
export declare function calcBond(input: BondInput): BondResult;
export interface StampInput {
    amount: number;
    isHouse: boolean; /** 매수·매도 분담 비율 (매수인 부담, 소수) */
    buyerShare: number;
}
export declare const EMPTY_STAMP: StampInput;
export interface StampResult {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    stamp: number;
    buyer: number;
}
export declare function calcStamp(input: StampInput): StampResult;
export interface FireTaxInput {
    buildingValue: number;
    kind: "house" | "building";
    oneHouse: boolean; /** 화재위험 건축물 배율 1·2·3 */
    riskMultiple: number;
}
export declare const EMPTY_FIRE: FireTaxInput;
export interface FireTaxResult {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    taxBase: number;
    tax: number;
}
export declare function calcFireTax(input: FireTaxInput): FireTaxResult;
