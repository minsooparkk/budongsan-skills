/**
 * 법인의 부동산 양도 — 법인세법 제55조(세율) + 제55조의2(토지등 양도소득에 대한 과세특례)
 * + 지방세법 제103조의20(법인지방소득세).
 *
 * 개인과 달리 법인은 양도소득이 따로 없다. 양도차익이 그 사업연도 소득에 합쳐져 법인세율
 * (2026년부터 10·20·22·25%, 2025.12.23 개정)을 타고, 주택·비사업용토지·입주권·분양권이면
 * 그 위에 **추가과세**(20% / 10% / 미등기 40%)가 얹힌다. 조문은 2026-09-03 Tax DB 현행본.
 *
 * 그래서 "법인양도세"라는 세목은 없고, 이 계산기가 내는 값은 **이 양도로 늘어나는
 * 법인세·추가과세·지방소득세의 합**이다 — 그 해 다른 소득이 있으면 한계구간이 달라지므로
 * 다른 소득을 입력받아 증분으로 계산한다.
 */
import type { Headline, Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
import type { StatuteBand } from "./property";
export declare const CORP_KINDS: readonly ["house", "land-nonbiz", "right", "building", "land-biz"];
export type CorpKind = (typeof CORP_KINDS)[number];
export declare const CORP_KIND_LABEL: Record<CorpKind, string>;
export interface CorporateInput {
    kind: CorpKind;
    /** 양도가액 */
    price: number;
    /** 취득가액 (장부가액) */
    cost: number;
    /** 양도비용·자본적지출 등 필요경비 */
    expenses: number;
    /** 미등기 양도 */
    unregistered: boolean;
    /** 이 양도를 빼고 그 사업연도 과세표준 (0 이상). 한계구간을 정한다 */
    otherIncome: number;
}
export declare const EMPTY_CORPORATE: CorporateInput;
/** 법인세율 — 법인세법 제55조 제1항 제1호 (2026년 1월 1일 이후 개시 사업연도) */
export declare const CORP_BANDS: StatuteBand[];
/** 법인지방소득세 — 지방세법 제103조의20 제1항 제1호 (법인세율의 1/10) */
export declare const CORP_LOCAL_BANDS: StatuteBand[];
/** 추가과세율 — 법인세법 제55조의2 제1항 */
export declare function surtaxRate(kind: CorpKind, unregistered: boolean): {
    rate: number;
    law: string;
    label: string;
};
export interface CorporateResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    gain: number;
    /** 이 양도로 늘어난 법인세 (증분) */
    corpTaxDelta: number;
    surtax: number;
    localTax: number;
    total: number;
    effectiveRate: number;
    marginalRate: number;
}
export declare function calcCorporate(input: CorporateInput): CorporateResult;
