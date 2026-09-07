/**
 * 재산세 — 지방세법 제110조(과세표준)·제111조(세율)·제111조의2(1세대 1주택 특례)·
 * 제112조(도시지역분)·제146조 제3항(소방분 지역자원시설세)·제151조 제1항 제6호(지방교육세).
 * 공정시장가액비율은 시행령 제109조, 과세표준상한액은 제109조의2.
 *
 * 조문은 2026-09-03 Tax DB(현행 시행 버전)에서 그대로 옮겼다. 세율표는 조문 표기
 * (구간 시작 세액 + 초과분 × 세율)를 그대로 쓰고, 검증 스크립트가 누진공제 표기와
 * 같은 값인지 대조한다.
 *
 * 한 고지서에 붙는 다섯 줄 — 재산세 본세 · 도시지역분 · 지방교육세 · 지역자원시설세
 * (소방분) 를 전부 계산한다. 사람들이 "재산세"라고 부르는 금액은 이 합계다.
 */
import type { Headline, Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
export declare const PROPERTY_KINDS: readonly ["house", "building", "land-general", "land-separate"];
export type PropertyKind = (typeof PROPERTY_KINDS)[number];
export declare const PROPERTY_KIND_LABEL: Record<PropertyKind, string>;
export interface PropertyInput {
    kind: PropertyKind;
    /** 시가표준액 — 주택은 공시가격, 건축물·토지는 지방자치단체 시가표준액 (원) */
    price: number;
    /** 1세대 1주택 (시행령 제110조의2) — 세율 특례·공정시장가액비율 특례 */
    oneHouse: boolean;
    /** 도시지역분 적용 지역 (도시지역 안 대부분) */
    urban: boolean;
    /** 직전 연도 공시가격 (원). 0이면 과세표준상한 계산을 건너뛴다 */
    prevPrice: number;
    /** 주택의 건물분 시가표준액 (원) — 소방분 지역자원시설세용. 0이면 계산하지 않는다 */
    buildingValue: number;
}
export declare const EMPTY_PROPERTY: PropertyInput;
/** 구간 표 — 조문 표기 그대로 (start: 구간 하한, base: 하한에서의 세액, rate: 초과분 세율) */
export interface StatuteBand {
    start: number;
    base: number;
    rate: number;
}
export declare function applyStatute(taxBase: number, bands: StatuteBand[]): {
    tax: number;
    band: StatuteBand;
};
/** 주택 표준세율 — 제111조 제1항 제3호 나목 */
export declare const HOUSE_BANDS: StatuteBand[];
/** 1세대 1주택 특례세율 (공시가격 9억원 이하) — 제111조의2 제1항 */
export declare const HOUSE_SPECIAL_BANDS: StatuteBand[];
/** 토지 종합합산 — 제111조 제1항 제1호 가목 */
export declare const LAND_GENERAL_BANDS: StatuteBand[];
/** 토지 별도합산 — 제111조 제1항 제1호 나목 */
export declare const LAND_SEPARATE_BANDS: StatuteBand[];
/** 소방분 지역자원시설세 — 제146조 제3항 제1호 */
export declare const FIRE_BANDS: StatuteBand[];
/** 그 밖의 건축물 — 제111조 제1항 제2호 다목 */
export declare const BUILDING_RATE = 0.0025;
/** 도시지역분 — 제112조 제1항 제2호 */
export declare const URBAN_RATE = 0.0014;
/** 지방교육세 — 제151조 제1항 제6호 (도시지역분은 제외한 재산세액의 20%) */
export declare const EDU_RATE = 0.2;
/** 과세표준상한율 — 시행령 제109조의2 제2항 */
export declare const CAP_RATE = 0.05;
/** 1세대 1주택 특례세율 상한 공시가격 — 제111조의2 제1항 */
export declare const SPECIAL_RATE_LIMIT: number;
/** 주택 세액 20만원 이하는 7월에 한꺼번에 — 제115조 제1항 제3호 */
export declare const SINGLE_PAYMENT_LIMIT: number;
/**
 * 공정시장가액비율 — 시행령 제109조 제1항 (2026년 납세의무 성립분).
 * 1세대 1주택은 공시가격 9억 초과분까지 43~45%. 그 외 주택 60%, 토지·건축물 70%.
 */
export declare function fairMarketRatio(input: Pick<PropertyInput, "kind" | "price" | "oneHouse">): number;
export interface PropertyResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    ratio: number;
    taxBase: number;
    /** 과세표준상한이 실제로 걸렸는가 */
    capped: boolean;
    specialRate: boolean;
    mainTax: number;
    urbanTax: number;
    eduTax: number;
    fireTax: number;
    total: number;
    /** 납부 일정 */
    july: number;
    september: number;
    scheduleLabel: string;
    /** 1세대 1주택 특례가 없었다면 (특례 적용 시에만) */
    withoutSpecial: number | null;
}
export declare function calcProperty(input: PropertyInput): PropertyResult;
