/**
 * 등기비용 종합 — 매매로 집·건물·땅을 사서 소유권이전등기를 마칠 때까지 드는 돈 전부.
 *
 *   취득세·지방교육세·농어촌특별세     acquisition.ts (지방세법)
 *   국민주택채권 매입 → 즉시 매도 할인비용  주택도시기금법 제8조 · 시행령 [별표]
 *   인지세                             인지세법 제3조 · 제6조
 *   등기신청수수료                     등기사항증명서 등 수수료규칙 제5조의2
 *   법무사 보수                        협의 (대한법무사협회 보수표가 상한)
 *   근저당권 설정 (대출 시)            등록면허세 0.2% + 지방교육세 20% + 채권 1%
 *
 * 채권 매입률표는 세법이 아니라 Tax DB에 없다. 주택도시기금법 시행령 [별표] 부표
 * 제15호(개정 2025.8.26)를 korean-law-mcp(법제처 API)로 2026-09-03 대조했다 — 바뀌면
 * `BOND_TABLE` 하나만 고친다. 매입금액은 별표 제4호대로 1만원 단위(5천원 이상 올림,
 * 미만 버림, 최저 1만원). 할인율은 매일 은행이 고시하므로 입력값으로 둔다.
 */
import { type AcquisitionResult } from "./acquisition";
import type { Headline, Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
export declare const REG_KINDS: readonly ["house", "officetel", "building", "land"];
export type RegKind = (typeof REG_KINDS)[number];
export declare const REG_KIND_LABEL: Record<RegKind, string>;
export interface RegistrationInput {
    kind: RegKind;
    /** 거래금액 (원) */
    price: number;
    /** 시가표준액 (원). 0이면 거래금액의 70%로 추정한다 — 채권 매입액의 기준 */
    standardValue: number;
    /** 특별시·광역시 소재 (채권 매입률이 다르다) */
    metro: boolean;
    /** 전용면적 (㎡) — 주택 농특세 판정 */
    area: number;
    /** 조정대상지역 */
    regulated: boolean;
    /** 취득 후 세대 보유 주택 수 (이 주택 포함) */
    houses: number;
    /** 생애최초 주택 구입 */
    firstHome: boolean;
    /** 법인 취득 */
    corporate: boolean;
    /** 조정대상지역 일시적 2주택 — 중과 제외 (§13의2①1 괄호) */
    temporaryTwo: boolean;
    /** 셀프등기 — 법무사 보수 0 */
    selfRegistration: boolean;
    /** 법무사 보수 (원, 협의액) */
    legalFee: number;
    /** 채권 할인율 (%) — 매입 즉시 매도할 때 은행이 떼는 비율 */
    discountRate: number;
    /** 대출 채권최고액 (원). 0이면 근저당 설정 없음 */
    mortgageMax: number;
    /** e-Form(전자표준양식) 신청 여부 — 서면 15,000원 → 13,000원. 완전 전자신청은 10,000원이지만 매매 등기에서는 드물다 */
    eForm: boolean;
}
export declare const EMPTY_REGISTRATION: RegistrationInput;
/**
 * 제1종 국민주택채권 매입률 — 주택도시기금법 시행령 [별표] 부표 제15호 가목
 * "소유권의 보존 또는 이전" (매매 등 유상). 구간은 시가표준액 기준, 특별시·광역시 / 그 밖의 지역.
 * 상속·증여(나목)는 요율이 다르며 이 계산기(매매 전용)에서는 쓰지 않는다.
 */
interface BondBand {
    /** 이 구간의 하한 (이상) */
    from: number;
    metro: number;
    other: number;
}
export declare const BOND_TABLE: Record<"house" | "land" | "building", BondBand[]>;
export declare function bondRate(kind: RegKind, standardValue: number, metro: boolean): number;
/** 인지세 — 인지세법 제3조 제1항 제1호. 주택 1억원 이하는 비과세(제6조 제5호) */
export declare function stampDuty(price: number, isHouse: boolean): number;
/** 등기신청수수료 — 소유권이전 서면 15,000원, e-Form 13,000원 (완전 전자신청 10,000원) */
export declare const REG_FEE: {
    readonly paper: 15000;
    readonly eForm: 13000;
};
/** 근저당권 설정 등록면허세 — 지방세법 제28조 제1항 제1호 다목 (채권금액의 0.2%) */
export declare const MORTGAGE_TAX_RATE = 0.002;
/** 근저당 설정 시 채권 매입률 — [별표] 부표 제15호 다목: 설정금액 2천만원 이상일 때 1%, 매입액 상한 10억원 */
export declare const MORTGAGE_BOND_RATE = 0.01;
export declare const MORTGAGE_BOND_MIN: number;
export declare const MORTGAGE_BOND_CAP: number;
/** 채권 매입금액 단수 — [별표] 제4호: 1만원 단위, 5천원 이상은 올리고 미만은 버린다. 최저 1만원 */
export declare function roundBond(amount: number): number;
export interface RegistrationResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    acquisition: AcquisitionResult;
    standardValue: number;
    bondRate: number;
    bondAmount: number;
    bondCost: number;
    stamp: number;
    regFee: number;
    legalFee: number;
    mortgageTax: number;
    mortgageBondCost: number;
    /** 세금 (취득세 3종 + 인지세 + 등록면허세) */
    taxes: number;
    /** 비용 (채권 할인 + 수수료 + 법무사) */
    costs: number;
    total: number;
    effectiveRate: number;
}
export declare function calcRegistration(input: RegistrationInput): RegistrationResult;
export {};
