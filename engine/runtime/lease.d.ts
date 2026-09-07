/**
 * 임대차 계산 묶음 — 주택임대차보호법·소득세법·민법.
 *
 * 법정 숫자 (2026-09-03 법제처·Tax DB 현행본):
 *   전월세 전환율   주임법 §7의2·시행령 §9  min(연 10%, 기준금리 + 2%p)
 *   임대료 증액 상한 주임법 §7·시행령 §8     5% (1/20), 1년 안에는 재청구 불가, 조례로 하향 가능
 *   간주임대료      소득세법 §25·시행령 §53·시행규칙 §23
 *                   3주택 이상 & 보증금 3억 초과 / 2주택(기준시가 12억 초과 주택만 셈) & 보증금 12억 초과
 *                   (보증금 − 3억) × 60% × 정기예금이자율 3.1% − 임대사업 이자·배당수입
 *                   40㎡ 이하 & 기준시가 2억 이하 소형주택은 2026.12.31까지 주택 수 제외
 *   주택임대소득    소득세법 §64의2  총수입 2천만 이하 분리과세 선택: (수입 − 50%(등록 60%)
 *                   − 200만(등록 400만, 다른 종합소득 2천만 이하)) × 14% (+지방 10%)
 *
 * 법에 없는 숫자(수익률 경비, 보증보험 요율, 명도 노무비)는 입력값으로 두고 기본값에
 * 출처를 적는다. 여기서는 계산만 하고 판단은 화면의 팁이 한다.
 */
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
/** 시행령 §9: 연 10%, 기준금리 + 2%p 중 낮은 쪽 */
export declare const CONVERSION_CAP = 0.1;
export declare const CONVERSION_SPREAD = 0.02;
export declare function legalConversionRate(baseRate: number): number;
export interface ConversionInput {
    /** 지금 보증금 */
    deposit: number;
    /** 지금 월세 */
    monthly: number;
    /** 보증금 → 월세로 돌릴 금액 (양수) 또는 월세 → 보증금으로 돌릴 월세 (direction 이 toDeposit 이면 월세 금액) */
    amount: number;
    direction: "toMonthly" | "toDeposit";
    /** 한국은행 기준금리 (소수) */
    baseRate: number;
    /** 당사자 합의 전환율 (소수). 0이면 법정 상한 */
    agreedRate: number;
}
export declare const EMPTY_CONVERSION: ConversionInput;
export interface ConversionResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    legalRate: number;
    rate: number;
    newDeposit: number;
    newMonthly: number;
}
export declare function calcConversion(input: ConversionInput): ConversionResult;
export declare const RENT_CAP = 0.05;
export interface IncreaseInput {
    deposit: number;
    monthly: number; /** 조례 상한 (소수). 0이면 5% */
    localCap: number; /** 마지막 증액·계약일부터 지난 개월 */
    monthsSince: number;
}
export declare const EMPTY_INCREASE: IncreaseInput;
export interface IncreaseResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    cap: number;
    maxDeposit: number;
    maxMonthly: number;
    allowed: boolean;
}
export declare function calcIncrease(input: IncreaseInput): IncreaseResult;
export interface YieldInput {
    price: number;
    deposit: number;
    monthly: number;
    loan: number;
    loanRate: number; /** 연 경비 (재산세·수선·관리) */
    expenses: number; /** 공실률 (소수) */
    vacancy: number; /** 취득비용 (취득세·중개보수 등) */
    acquisitionCost: number;
}
export declare const EMPTY_YIELD: YieldInput;
export interface YieldResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    grossYield: number;
    netYield: number;
    equityYield: number;
    equity: number;
    cashflow: number;
}
export declare function calcYield(input: YieldInput): YieldResult;
export interface CompareInput {
    jeonse: number;
    wolseDeposit: number;
    monthly: number; /** 전세대출 금리 */
    loanRate: number; /** 대출 비율 (소수) — 나머지는 자기자금 */
    loanShare: number; /** 자기자금 기회비용 (예금금리) */
    depositRate: number;
}
export declare const EMPTY_COMPARE: CompareInput;
export interface CompareResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    jeonseMonthly: number;
    wolseMonthly: number;
    breakEvenMonthly: number;
}
export declare function calcCompare(input: CompareInput): CompareResult;
export interface InsuranceInput {
    deposit: number;
    homePrice: number;
    seniorDebt: number;
    apartment: boolean;
    metro: boolean; /** 보증료율 (소수, 연) */
    feeRate: number;
    years: number;
}
export declare const EMPTY_INSURANCE: InsuranceInput;
/** HUG 전세보증금반환보증 — 담보인정비율 90% (2024.1.1~), 보증한도 수도권 7억·그 밖 5억 */
export declare const LTV_LIMIT = 0.9;
export interface InsuranceResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    eligible: boolean;
    reasons: string[];
    maxDeposit: number;
    fee: number;
}
export declare function calcInsurance(input: InsuranceInput): InsuranceResult;
export interface OverdueInput {
    monthly: number; /** 연체 개월 수 */
    months: number; /** 지연 일수 (마지막 회차 기준 평균) */
    days: number; /** 연 이율 (소수). 약정 없으면 민사 법정이율 5% */
    annualRate: number;
}
export declare const EMPTY_OVERDUE: OverdueInput;
export interface OverdueResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    principal: number;
    interest: number;
    canTerminate: boolean;
}
export declare function calcOverdue(input: OverdueInput): OverdueResult;
export interface NocInput {
    deposit: number;
    monthly: number;
    maintenance: number; /** 계약면적 (㎡) */
    area: number; /** 전용면적 (㎡) */
    exclusive: number; /** 전환율 (소수) */
    rate: number; /** 렌트프리 개월 (1년 기준) */
    rentFree: number;
}
export declare const EMPTY_NOC: NocInput;
export interface NocResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    noc: number;
    nocPerPyeong: number;
    nocPerExclusivePyeong: number;
    effectiveMonthly: number;
}
export declare function calcNoc(input: NocInput): NocResult;
export declare const DEEMED_RATE = 0.031;
export declare const DEEMED_DEDUCTION: number;
export declare const DEEMED_RATIO = 0.6;
export interface DeemedInput {
    houses: number; /** 2주택일 때: 기준시가 12억 초과 주택 수 */
    highValueHouses: number;
    deposits: number; /** 임대사업 이자·배당 수입 */
    interestIncome: number;
    rate: number;
    days: number;
}
export declare const EMPTY_DEEMED: DeemedInput;
export interface DeemedResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    taxable: boolean;
    reason: string;
    deemed: number;
}
export declare function calcDeemed(input: DeemedInput): DeemedResult;
export declare const SEPARATE_LIMIT: number;
export interface RentalTaxInput {
    rent: number; /** 간주임대료 */
    deemed: number;
    registered: boolean; /** 주택임대 외 종합소득금액 */
    otherIncome: number; /** 종합과세 시 실제 필요경비 (장부). 0이면 분리과세 경비율 적용 */
    actualExpenses: number;
}
export declare const EMPTY_RENTAL_TAX: RentalTaxInput;
export interface RentalTaxResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    revenue: number;
    canSeparate: boolean;
    separateTax: number;
    combinedTax: number;
    better: "separate" | "combined";
    total: number;
}
export declare function calcRentalTax(input: RentalTaxInput): RentalTaxResult;
export interface EvictionInput {
    area: number; /** 집행 노무비 단가 (원/평) */
    laborPerPyeong: number; /** 집행관 수수료·여비 */
    bailiffFee: number; /** 사다리차·운반 */
    transport: number; /** 창고 보관 월 단가 */
    storageMonthly: number;
    storageMonths: number; /** 소송비용 (인지·송달·변호사) */
    litigation: number; /** 명도 지연 개월 — 그동안 못 받는 월세 */
    delayMonths: number;
    monthly: number;
}
export declare const EMPTY_EVICTION: EvictionInput;
export interface EvictionResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    execution: number;
    storage: number;
    lostRent: number;
    total: number;
}
export declare function calcEviction(input: EvictionInput): EvictionResult;
