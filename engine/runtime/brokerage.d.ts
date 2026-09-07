/**
 * 부동산 중개보수(복비) — 공인중개사법 제32조, 같은 법 시행규칙 제20조 [별표 1].
 *
 * 요율은 **상한**이다. 조문은 "거래금액의 1천분의 N **이내**에서 협의"라고 적고, 시·도
 * 조례가 그 상한을 그대로 받는다(서울시 주택 중개보수 조례 2021.12.). 여기 계산은
 * 상한액이고, 실제 보수는 그 안에서 중개사와 정한다. 매도인·매수인(임대인·임차인)이
 * **각각** 이 금액을 낸다.
 *
 * 요율표 확인일 2026-09-03 — 2021-10-19 개정 이후 바뀌지 않았다. 바뀌면 이 파일 하나만
 * 고친다. 세법이 아니라 Tax DB에 조문이 없으므로 출처는 국가법령정보센터
 * (공인중개사법 시행규칙 별표 1).
 */
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
export declare const BROKERAGE_KINDS: readonly ["house", "officetel-home", "other"];
export type BrokerageKind = (typeof BROKERAGE_KINDS)[number];
export declare const BROKERAGE_KIND_LABEL: Record<BrokerageKind, string>;
export declare const DEALS: readonly ["sale", "lease"];
export type Deal = (typeof DEALS)[number];
export declare const DEAL_LABEL: Record<Deal, string>;
export interface BrokerageInput {
    kind: BrokerageKind;
    deal: Deal;
    /** 매매가액, 또는 임대차 보증금 (원) */
    price: number;
    /** 월세 (원). 임대차에서만 쓴다 */
    monthly: number;
    /** 중개사가 일반과세자면 부가가치세 10%가 따로 붙는다 */
    vat: boolean;
    /** 협의 요율 (기타 부동산·상한 미만 협의 시). 0~상한. 0이면 상한 적용 */
    agreedRate: number;
}
export declare const EMPTY_BROKERAGE: BrokerageInput;
interface Band {
    /** 이 구간의 상한 — 미만 */
    below: number;
    rate: number;
    /** 한도액 (원). 없으면 Infinity */
    cap: number;
}
/** 주택 매매·교환 — 별표 1 제1호 가목 */
export declare const HOUSE_SALE: Band[];
/** 주택 임대차 — 별표 1 제1호 나목 */
export declare const HOUSE_LEASE: Band[];
/** 주거용 오피스텔(전용 85㎡ 이하, 부엌·화장실·목욕시설) — 별표 1 제2호 */
export declare const OFFICETEL_RATE: Record<Deal, number>;
/** 그 밖의 부동산 — 별표 1 제3호. 0.9% 이내 협의 */
export declare const OTHER_MAX_RATE = 0.009;
/**
 * 임대차 거래금액 — 시행규칙 제20조 제5항.
 * 보증금 + 월세 × 100. 그 합이 5천만원 미만이면 보증금 + 월세 × 70 으로 다시 계산한다.
 */
export declare function leaseDealAmount(deposit: number, monthly: number): {
    amount: number;
    multiplier: 100 | 70;
};
export interface BrokerageResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    /** 거래금액 (임대차는 환산액) */
    dealAmount: number;
    rate: number;
    cap: number;
    /** 상한 보수 (부가세 전) */
    fee: number;
    vat: number;
    total: number;
    /** 상한 요율 (협의 요율과 비교용) */
    maxRate: number;
}
export declare function calcBrokerage(input: BrokerageInput): BrokerageResult;
export {};
