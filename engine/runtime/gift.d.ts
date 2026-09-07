/**
 * 증여세 계산 — 상속세 및 증여세법.
 *
 * 조문 값은 Graph DB(현행 법령)에서 확인했다:
 *   §47 과세가액(동일인 10년 합산) · §53 증여재산공제 · §53의2 혼인·출산공제 1억
 *   §55 과세표준(50만원 미만 부과 제외) · §56 세율(제26조 준용) · §57 세대생략 할증
 *   §58 납부세액공제 · §69② 신고세액공제 3%
 *
 * 들어가지 않은 것: 창업자금·가업승계 과세특례(조특법 §30의5·§30의6), 저가양수·
 * 고가양도 등 증여의제, 명의신탁, 비거주자 증여.
 */
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
export declare const RELATIONS: readonly ["spouse", "lineal-desc", "lineal-asc", "kin", "other"];
export type Relation = (typeof RELATIONS)[number];
export declare const RELATION_LABEL: Record<Relation, string>;
/** 증여재산공제 한도 (§53) — 10년 통산 */
export declare function relationDeductionCap(relation: Relation, minor: boolean): number;
export interface GiftInput {
    year: number;
    month: number;
    relation: Relation;
    /** 수증자가 미성년자(19세 미만) */
    minor: boolean;
    /** 증여재산 (원) */
    realEstate: number;
    cash: number;
    stock: number;
    etc: number;
    /** 부담부증여 — 수증자가 떠안는 채무 */
    assumedDebt: number;
    /** 같은 사람에게서 10년 이내에 받은 증여재산가액 (합산) */
    priorGift: number;
    /** @deprecated Legacy actual-payment input; do not treat as pre-credit assessed tax. */
    priorGiftTaxPaid: number;
    /** 합산하는 사전증여의 산출세액 (신고세액공제 전, 가산세·세대생략 할증 제외) */
    priorGiftGrossTax?: number;
    /** 이전 신고서에서 0원인 항목까지 확인했는지; 미확인과 정당한 0원을 구분한다. */
    priorDetailsConfirmed?: boolean;
    /** 합산하는 사전증여의 과세표준 */
    priorTaxBase?: number;
    /** usedDeduction 중 이번에 합산하는 사전증여에 적용한 공제 */
    priorIncludedDeduction?: number;
    /** usedMarriageBirth 중 이번에 합산하는 사전증여에 적용한 공제 */
    priorIncludedMarriageBirth?: number;
    /** 10년 이내에 이미 쓴 증여재산공제액 */
    usedDeduction: number;
    /** 혼인·출산 증여재산공제 대상 (§53의2) */
    marriageBirth: boolean;
    /** 이미 쓴 혼인·출산 공제액 */
    usedMarriageBirth: number;
    /** 세대를 건너뛴 증여 — 조부모 → 손주 */
    generationSkip: boolean;
}
export interface GiftResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    payable: number;
    taxBase: number;
    grossTax: number;
    effectiveRate: number;
    deadline: string;
    belowMinimum: boolean;
    /** 부담부증여로 양도세가 따로 생기는 금액 */
    transferPortion: number;
    priorCredit: number;
    relationDeduction: number;
    marriageDeduction: number;
}
export declare const EMPTY_GIFT: GiftInput;
export declare function calcGift(input: GiftInput): GiftResult;
/** Two gifts more than ten years apart, applying the selected current law to both.
 * Asset/debt won are conserved; only the first gift assumes marriage/birth eligibility.
 * The second event's tax law and recipient age must be checked when it actually occurs.
 */
export declare function calcGiftSplit(input: GiftInput): {
    firstInput: GiftInput;
    secondInput: GiftInput;
    first: GiftResult;
    second: GiftResult;
    total: number;
};
/** 신고기한 — 증여일이 속하는 달의 말일부터 3개월 (§68) */
export declare function giftDeadline(year: number, month: number): string;
