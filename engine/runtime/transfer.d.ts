/**
 * 양도소득세 4개년 시뮬레이터 — 현행 vs 2026년 세제개편 정부안(9·1 국무회의 확정).
 *
 * 보유세 계산기와 같은 구조다. "지금 팔면 얼마"가 아니라 **"언제 파느냐로 얼마나
 * 달라지느냐"**를 본다. 개편안은 2027년부터 단계적으로 들어오고, 같은 집·같은
 * 차익이라도 양도 연도에 따라 세액이 몇 배로 벌어진다.
 *
 * 현행 조문(Graph DB 확인):
 *   소득세법 §55 기본세율 · §89① 1세대1주택 비과세 · §95② 표1·표2 장기보유특별공제
 *   §103 양도소득 기본공제 250만원 · §104⑦ 조정대상지역 다주택 중과
 *   지방세법 §103의3 개인지방소득세 10%
 *
 * 개편안 수치 — 2026. 8. 3. 발표, 2026. 9. 1. 국무회의에서 정부안으로 확정(양도세 항목은 8·3안과 같다).
 * 출처: 기획재정부 「2026년 세제개편안 상세본」 56~59·68·72쪽, 문답자료 36~38·48·53쪽. 아직 법이 아니다.
 *   장기보유특별공제 → 장기거주 소득공제로 이원화, '28.1.1. 이후 양도분부터 (상세본 56쪽)
 *   1세대1주택(3년 보유 + 2년 거주): 2028년 거주 6%(최대 60%)·보유 2%(최대 20%) / 2029년 거주 8%(최대 80%)
 *   그 밖의 주택(거주 2년 미만 1주택 포함): 2028년 보유 1%(최대 15%)와 거주 2%(최대 30%) 중 높은 쪽 / 2029년 거주 2%만
 *   공제금액 한도: 2028년 20억원 · 2029년 이후 10억원 — 인별 연간·양도물건별 각각 (현행·2027년은 한도 없음)
 *   다주택 중과 한시 완화(보유 2년 이상): '27년 +5%p·+10%p / '28년 +10%p·+15%p / '29년 원상복귀.
 *     특례규정 — 중과세율이 적용된 '26년 양도분도 '27.1.1. 이후 신고 시 +5%p·+10%p 적용 (상세본 72쪽).
 *     한시 완화 기간 중에도 현행과 같이 장기보유특별공제 미적용 (문답자료 53쪽).
 *   양도소득 기본공제: 10년 이상 거주한 양도가액 30억원 이하 1세대1주택 2,500만원 ('27.1.1. 이후 양도분)
 */
import type { Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
export declare const YEARS: readonly [2026, 2027, 2028, 2029];
export type Year = (typeof YEARS)[number];
/** 1세대 1주택 고가주택 기준 — 소득세법 §89①3 (실지거래가액 12억 초과). 범위·안분은 시행령 §156·§160 */
export declare const 고가주택기준: number;
export interface TransferInput {
    /** 1세대 1주택인가 */
    single: boolean;
    /** 다주택일 때 주택 수 (2 또는 3 이상) */
    houses: number;
    /** 조정대상지역 — 다주택 중과 판정 */
    regulated: boolean;
    /** 양도가액 (원) */
    salePrice: number;
    /** 취득가액 (원) */
    buyPrice: number;
    /** 필요경비 (원) */
    expense: number;
    /** 실거주 중인가 — 매년 거주기간이 함께 늘어난다 */
    resident: boolean;
    /** 2026년 시점 거주기간 (년) */
    liveYears: number;
    /** 2026년 시점 보유기간 (년) */
    holdYears: number;
}
export declare const EMPTY_TRANSFER: TransferInput;
export type Regime = "current" | "reform";
export interface YearResult extends CalculationValidation {
    year: Year;
    regime: Regime;
    /** 그해 시점의 보유·거주 기간 */
    hold: number;
    live: number;
    /** 개편안이 이미 시행됐는지 (2026년은 시행 전이라 현행과 같다) */
    reformed: boolean;
    exempt: boolean;
    gain: number;
    taxableGain: number;
    deductionRate: number;
    deductionCap: number | null;
    deduction: number;
    capApplied: boolean;
    basicDeduction: number;
    taxBase: number;
    rate: number;
    surcharge: number;
    transferTax: number;
    localTax: number;
    total: number;
    steps: Step[];
}
/** 표1 — 보유기간별 (3년 6% … 15년 30%). 소득세법 §95② 표1 */
export declare function table1(hold: number): number;
/** 표2 — 1세대1주택 보유 + 거주. 각 최대 40%, 합 최대 80%. §95② 표2 */
export declare function table2(hold: number, live: number): number;
/**
 * 그해에 실제로 적용되는 공제율.
 * 개편안이 시행되지 않은 연도(2026)와 유예 연도(2027)는 현행과 같다.
 */
export declare function deductionRateOf(year: Year, regime: Regime, single: boolean, hold: number, live: number): number;
/** 공제금액 한도 — 개편안만. 현행은 한도가 없다 */
export declare function deductionCapOf(year: Year, regime: Regime): number | null;
/**
 * 조정대상지역 다주택 중과 가산율 (%p).
 * 한시 완화는 보유 2년 이상 주택에만 붙고, 중과세율이 적용된 2026년 양도분도 2027.1.1. 이후
 * 예정·확정신고 때 2027년 완화율(+5%p·+10%p)을 적용받는다(개정안 특례규정).
 */
export declare function surchargeOf(year: Year, regime: Regime, houses: number, hold?: number): number;
/** 양도소득 기본공제 — 개편안은 2027년부터 장기거주 1주택에 2,500만원 */
export declare function basicDeductionOf(year: Year, regime: Regime, single: boolean, live: number, salePrice: number): number;
export declare function calcYear(input: TransferInput, year: Year, regime: Regime): YearResult;
export interface TransferResult extends CalculationValidation {
    /** 각 연도에 실제로 적용될 법 기준 — 2026년은 현행, 2027년부터 개편안 */
    actual: YearResult[];
    /** 같은 해에 개편안이 없었다면 (비교용) */
    current: YearResult[];
    /** 개편안 기준 세액이 가장 낮은 해 */
    cheapest: YearResult;
    /** 2026년 대비 가장 많이 오르는 해 */
    worst: YearResult;
    tips: Tip[];
}
export declare function calcTransfer(input: TransferInput): TransferResult;
