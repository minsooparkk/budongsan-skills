/**
 * 경매 — 신청비용, 유찰별 최저가·입찰보증금, 배당.
 *
 * 법정 숫자: 경매신청 등록면허세 채권금액 × 0.2% + 지방교육세 20%(지방세법 §28①1라·§151),
 * 인지 5,000원(민사소송등인지법), 입찰보증금 최저매각가격의 10%(민사집행규칙 §63),
 * 저감률은 법원마다 20% 또는 30%(민사집행법 §119 — 법원이 정한다), 소액임차 최우선변제
 * (주택임대차보호법 §8·시행령 §10·§11, 2026-09-03 법제처 대조). 송달료·감정료·신문공고료는 실무 추정.
 */
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
import { type Region } from "./finance";
export interface AuctionCostInput {
    claim: number;
    appraisal: number; /** 이해관계인 수 (송달) */
    parties: number; /** 감정료 (0이면 감정평가수수료표로 추정) */
    appraisalFee: number; /** 신문공고료 */
    noticeFee: number; /** 현황조사·집행관 수수료 */
    bailiffFee: number;
}
export declare const EMPTY_AUCTION_COST: AuctionCostInput;
export interface AuctionCostResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    regTax: number;
    total: number;
}
export declare function calcAuctionCost(input: AuctionCostInput): AuctionCostResult;
export interface MinBidInput {
    appraisal: number;
    failures: number; /** 저감률 (소수) 0.2 또는 0.3 */
    reduction: number; /** 보증금 비율 (재매각은 20~30%) */
    depositRate: number;
}
export declare const EMPTY_MIN_BID: MinBidInput;
export interface MinBidRow {
    round: number;
    minPrice: number;
    deposit: number;
    ratio: number;
}
export interface MinBidResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    rows: MinBidRow[];
    current: MinBidRow;
}
export declare function calcMinBid(input: MinBidInput): MinBidResult;
export interface PayoutInput {
    price: number;
    costs: number;
    region: Region; /** 임차인 보증금 (확정일자 있음) */
    tenant: number; /** 임차인이 1순위 근저당보다 먼저 전입·확정일자 */
    tenantSenior: boolean; /** 당해세 (재산세·종부세 체납) */
    tax: number;
    mortgage1: number;
    mortgage2: number;
    mortgage3: number;
}
export declare const EMPTY_PAYOUT: PayoutInput;
export interface PayoutLine {
    label: string;
    claim: number;
    paid: number;
}
export interface PayoutResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    lines: PayoutLine[];
    remainder: number;
    tenantLoss: number;
}
export declare function calcPayout(input: PayoutInput): PayoutResult;
