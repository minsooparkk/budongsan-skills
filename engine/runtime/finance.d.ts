/**
 * DSR·LTV·금융 — 대출 규제와 이자 계산.
 *
 * 규제 숫자(DSR 40%, 스트레스 금리, LTV)는 법률이 아니라 금융위원회 행정지도·은행업감독규정이며
 * 수시로 바뀐다. 전부 입력값으로 두고 기본값에 확인일을 적는다(2026-09-03). 방공제(소액임차보증금)
 * 는 주택임대차보호법 시행령 제10조(2026-09-03 법제처 대조) 금액이다.
 */
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
export type Repay = "annuity" | "principal" | "bullet";
export declare const REPAY_LABEL: Record<Repay, string>;
/** 월 상환액 — 원리금균등 */
export declare function annuityPayment(principal: number, annualRate: number, months: number): number;
export interface ScheduleRow {
    year: number;
    principal: number;
    interest: number;
    balance: number;
}
/** 연도별 상환표 + 총이자. 거치기간 동안은 이자만 */
export declare function schedule(principal: number, annualRate: number, months: number, repay: Repay, graceMonths?: number): {
    rows: ScheduleRow[];
    totalInterest: number;
    firstMonthly: number;
    maxMonthly: number;
};
/** 연 원리금 — DSR 계산용. 만기일시는 이자 + 원금/만기(년) 로 본다(금융위 산정방식 근사) */
export declare function annualDebtService(principal: number, annualRate: number, months: number, repay: Repay): number;
export interface DsrInput {
    income: number; /** 기존 대출 연 원리금 합계 */
    existing: number;
    amount: number;
    rate: number;
    years: number;
    repay: Repay; /** 스트레스 가산금리 (소수) */
    stress: number; /** 한도 (소수) 0.4 은행 / 0.5 2금융 */
    limit: number;
}
export declare const EMPTY_DSR: DsrInput;
export interface DsrResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    newService: number;
    dsr: number;
    ok: boolean;
    maxAmount: number;
}
export declare function calcDsr(input: DsrInput): DsrResult;
export interface DtiInput {
    income: number; /** 신규 주담대 */
    amount: number;
    rate: number;
    years: number; /** 기존 주담대 연 원리금 (신DTI는 포함) */
    existingMortgage: number; /** 기타 대출 연 이자 */
    otherInterest: number;
    limit: number;
}
export declare const EMPTY_DTI: DtiInput;
export interface DtiResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    dti: number;
    ok: boolean;
    maxAmount: number;
}
export declare function calcDti(input: DtiInput): DtiResult;
export interface RtiInput {
    rent: number; /** 신규 대출 */
    amount: number;
    rate: number; /** 기존 담보 대출 연 이자 */
    existingInterest: number;
    isHousing: boolean;
}
export declare const EMPTY_RTI: RtiInput;
export interface RtiResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    rti: number;
    required: number;
    ok: boolean;
    maxAmount: number;
}
export declare function calcRti(input: RtiInput): RtiResult;
export declare const REGIONS: readonly ["seoul", "metro-over", "metro-city", "other"];
export type Region = (typeof REGIONS)[number];
export declare const REGION_LABEL: Record<Region, string>;
/** 소액임차보증금 중 최우선변제액 (방공제) — 주택임대차보호법 시행령 제10조 제1항 */
export declare const ROOM_DEDUCTION: Record<Region, number>;
export interface LtvInput {
    price: number;
    ltv: number;
    senior: number;
    region: Region;
    rooms: number; /** MCI·MCG 가입 → 방공제 안 함 */
    mci: boolean; /** 규제지역 대출 한도 (0이면 없음) */
    cap: number;
}
export declare const EMPTY_LTV: LtvInput;
export interface LtvResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    byLtv: number;
    deduction: number;
    amount: number;
}
export declare function calcLtv(input: LtvInput): LtvResult;
export interface LoanLimitInput extends LtvInput {
    income: number;
    existing: number;
    rate: number;
    years: number;
    stress: number;
    dsrLimit: number;
}
export declare const EMPTY_LOAN_LIMIT: LoanLimitInput;
export interface LoanLimitResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    byCollateral: number;
    byIncome: number;
    amount: number;
    binding: "담보" | "소득";
}
export declare function calcLoanLimit(input: LoanLimitInput): LoanLimitResult;
export interface ImputedIncomeInput {
    method: "card" | "health" | "pension"; /** 연 신용카드 사용액 */
    cardSpend: number; /** 월 건강보험료 (본인 부담) */
    healthMonthly: number; /** 월 국민연금 (본인 부담) */
    pensionMonthly: number; /** 건보 본인부담 요율 */
    healthRate: number;
    pensionRate: number; /** 인정 비율 */
    recognition: number; /** 인정소득 상한 */
    capAmount: number;
}
/** Official 2026 workplace-insurance baseline, verified 2026-09-07. */
export declare const IMPUTED_RATES: {
    readonly year: 2026;
    readonly healthTotal: 0.0719;
    readonly healthEmployee: 0.03595;
    readonly pensionTotal: 0.095;
    readonly pensionEmployee: 0.0475;
    readonly healthSource: "https://edi.nhis.or.kr/portal/images/popup/20251204_pop01longdesc.html";
    readonly pensionSource: "https://www.nps.or.kr/eng/ntnlpnsplan/cntb/getOHAI0013M0.do";
};
export declare const EMPTY_IMPUTED: ImputedIncomeInput;
export interface ImputedIncomeResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    raw: number;
    income: number;
}
export declare function calcImputedIncome(input: ImputedIncomeInput): ImputedIncomeResult;
export interface FutureIncomeInput {
    income: number;
    age: number;
    years: number; /** 연령대별 증가율 (소수) */
    rate20: number;
    rate25: number;
    rate30: number;
}
export declare const EMPTY_FUTURE: FutureIncomeInput;
export interface FutureIncomeResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    rate: number;
    income: number;
}
export declare function calcFutureIncome(input: FutureIncomeInput): FutureIncomeResult;
export interface LoanInterestInput {
    amount: number;
    rate: number;
    years: number;
    repay: Repay;
    graceYears: number;
}
export declare const EMPTY_LOAN_INTEREST: LoanInterestInput;
export interface LoanInterestResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    totalInterest: number;
    firstMonthly: number;
    rows: ScheduleRow[];
}
export declare function calcLoanInterest(input: LoanInterestInput): LoanInterestResult;
export interface RefinanceInput {
    balance: number;
    currentRate: number;
    remainingYears: number;
    newRate: number;
    newYears: number; /** 중도상환수수료 */
    prepayFee: number; /** 설정비·인지세 등 신규 비용 */
    costs: number;
    repay: Repay;
}
export declare const EMPTY_REFINANCE: RefinanceInput;
export interface RefinanceResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    currentInterest: number;
    newInterest: number;
    saving: number;
    breakEvenMonths: number;
    monthlyDiff: number;
}
export declare function calcRefinance(input: RefinanceInput): RefinanceResult;
export interface PrepayInput {
    amount: number;
    feeRate: number; /** 대출 실행 후 경과 개월 */
    elapsedMonths: number; /** 수수료 부과 기간 (개월) */
    feeMonths: number;
}
export declare const EMPTY_PREPAY: PrepayInput;
export interface PrepayResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    fee: number;
    remainingRatio: number;
}
export declare function calcPrepay(input: PrepayInput): PrepayResult;
export interface AuctionLoanInput {
    bid: number;
    appraisal: number; /** 낙찰가 대비 */
    bidLtv: number; /** 감정가 대비 */
    appraisalLtv: number;
    region: Region;
    rooms: number;
    mci: boolean;
}
export declare const EMPTY_AUCTION_LOAN: AuctionLoanInput;
export interface AuctionLoanResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    byBid: number;
    byAppraisal: number;
    deduction: number;
    amount: number;
}
export declare function calcAuctionLoan(input: AuctionLoanInput): AuctionLoanResult;
export interface SavingsInput {
    kind: "deposit" | "installment";
    amount: number; /** 적금 월 납입 */
    monthly: number;
    rate: number;
    months: number;
    compound: boolean; /** 세율 0.154 일반 / 0.095 세금우대 / 0 비과세 */
    taxRate: number;
}
export declare const EMPTY_SAVINGS: SavingsInput;
export interface SavingsResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    principal: number;
    interest: number;
    tax: number;
    net: number;
}
export declare function calcSavings(input: SavingsInput): SavingsResult;
