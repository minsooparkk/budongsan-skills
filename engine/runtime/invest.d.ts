/**
 * 투자·평가 — 적정 매수가, 종합소득세, 리모델링 수익, 건물 기준시가, 잔존가치, 건물 부가세,
 * 감정평가 8방식.
 *
 * 법정 숫자: 종합소득세는 소득세법 §50(기본공제 150만)·§55(세율)·§59의4(표준세액공제 7만, 근로자 13만),
 * 건물 부가세 안분은 부가세법 시행령 §64(기준시가 비율). 나머지는 부동산 실무 산식이며 입력값이 답을 정한다.
 */
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
export interface FairPriceInput {
    monthly: number;
    deposit: number; /** 목표 순수익률 (소수) */
    targetYield: number;
    annualExpenses: number;
    vacancy: number; /** 취득비용률 (취득세·중개보수 등, 소수) */
    acquisitionRate: number; /** 명도·수리 등 추가비용 (경매용) */
    extraCost: number;
}
export declare const EMPTY_FAIR: FairPriceInput;
export interface FairPriceResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    noi: number;
    price: number;
}
export declare function calcFairPrice(input: FairPriceInput): FairPriceResult;
export interface TotalIncomeInput {
    earned: number;
    business: number;
    rental: number;
    other: number; /** 기본공제 인원 (본인 포함) */
    dependents: number; /** 그 밖의 소득공제 (연금보험료·주택자금 등) */
    deductions: number; /** 세액공제·감면 합계 */
    credits: number; /** 기납부세액 (원천징수·중간예납) */
    prepaid: number;
    hasEarned: boolean;
}
export declare const EMPTY_TOTAL_INCOME: TotalIncomeInput;
export interface TotalIncomeResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    income: number;
    taxBase: number;
    tax: number;
    determined: number;
    due: number;
    marginal: number;
}
export declare function calcTotalIncome(input: TotalIncomeInput): TotalIncomeResult;
export interface RemodelInput {
    cost: number; /** 리모델링 후 월세 증가분 */
    rentIncrease: number; /** 리모델링 후 예상 가치 상승 */
    valueIncrease: number;
    years: number; /** 자금 조달 금리 */
    rate: number;
}
export declare const EMPTY_REMODEL: RemodelInput;
export interface RemodelResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    totalGain: number;
    net: number;
    payback: number;
    roi: number;
}
export declare function calcRemodel(input: RemodelInput): RemodelResult;
export interface BuildingValueInput {
    area: number; /** ㎡당 금액 (국세청 고시, 2026년 신축 기준) */
    unitPrice: number;
    structureIndex: number;
    useIndex: number;
    locationIndex: number; /** 경과연수별 잔가율 */
    residualRate: number;
}
export declare const EMPTY_BUILDING_VALUE: BuildingValueInput;
export interface BuildingValueResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    perSqm: number;
    value: number;
}
export declare function calcBuildingValue(input: BuildingValueInput): BuildingValueResult;
export interface ResidualInput {
    newCost: number;
    age: number; /** 내용연수 */
    life: number; /** 최종 잔가율 */
    salvage: number;
    method: "straight" | "declining";
}
export declare const EMPTY_RESIDUAL: ResidualInput;
export interface ResidualResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    rate: number;
    value: number;
    depreciation: number;
}
export declare function calcResidual(input: ResidualInput): ResidualResult;
export interface BuildingVatInput {
    price: number;
    landStd: number;
    buildingStd: number; /** 계약서에 건물가액을 따로 적었는가 */
    contractBuilding: number; /** 매수인이 사업자 (매입세액공제) */
    buyerBusiness: boolean;
}
export declare const EMPTY_BUILDING_VAT: BuildingVatInput;
export interface BuildingVatResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    buildingPrice: number;
    vat: number;
    landPrice: number;
    contractOk: boolean;
}
export declare function calcBuildingVat(input: BuildingVatInput): BuildingVatResult;
export declare const APPRAISAL_METHODS: readonly ["cost", "sales", "land", "income", "dcf", "rent-sales", "rent-cost", "rent-income"];
export type AppraisalMethod = (typeof APPRAISAL_METHODS)[number];
export declare const APPRAISAL_METHOD_LABEL: Record<AppraisalMethod, string>;
export interface AppraisalInput {
    method: AppraisalMethod;
    landValue: number;
    newCost: number;
    residualRate: number;
    caseValue: number;
    timeFactor: number;
    areaFactor: number;
    conditionFactor: number;
    otherFactor: number;
    officialPrice: number;
    area: number;
    timeRate: number;
    regionFactor: number;
    itemFactor: number;
    noi: number;
    capRate: number;
    years: number;
    growth: number;
    discountRate: number;
    exitCap: number;
    baseValue: number;
    expectedRate: number;
    expenses: number;
    businessProfit: number;
    rentShare: number;
}
export declare const EMPTY_APPRAISAL: AppraisalInput;
export interface AppraisalResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    value: number;
    isRent: boolean;
}
export declare function calcAppraisal(input: AppraisalInput): AppraisalResult;
