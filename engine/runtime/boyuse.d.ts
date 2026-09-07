/**
 * 주택분 보유세(종합부동산세 + 농특세 + 재산세 + 지방교육세) 계산.
 *
 * 계산 순서와 산식은 회계사님이 주신 「종부세 계산기」 시트를 그대로 따랐고,
 * 시트의 네 경우(실거주/비거주 × 단독/공동명의) 숫자를 전부 재현하는 것을
 * 확인했다. 개편안 수치의 출처는 기획재정부 「2026년 세제개편안 문답자료」
 * (2026. 8. 3.) 39~44쪽이고, 기본공제는 2026. 9. 1. 국무회의에서 확정된
 * 정부안(기재부 보도자료 「2026년 세제개편안 정부안 확정」 첨부 수정사항)으로
 * 갱신했다 — 비거주 기본공제와 세부담상한이 당초안에서 되돌려졌다.
 *
 * 정부안이 확정됐을 뿐 아직 법률은 아니다. 국회 심의에서 다시 바뀔 수 있다.
 */
export type Regime = "current" | "y2027" | "y2028";
export declare const REGIME_LABEL: Record<Regime, string>;
/** 재산세 공정시장가액비율 — 1세대 1주택 특례 45% */
export declare const PROPERTY_FMV = 0.45;
/**
 * 재산세 도시지역분 세율 — 지방세법 제112조 제1항 제2호.
 * 제110조 과세표준(= 공시가격 × 공정시장가액비율)에 1천분의 1.4를 곱한다.
 * 조례로 1천분의 2.3까지 올릴 수 있으나 서울시는 표준세율을 쓴다.
 * 도시지역분에는 지방교육세가 붙지 않고(제151조 제1항 제6호 괄호),
 * 종부세에서 공제되지도 않는다(공제 대상은 표준세율 상당액뿐).
 */
export declare const URBAN_AREA_RATE = 0.0014;
export interface Case {
    key: string;
    label: string;
    resident: boolean;
    joint: boolean;
    /** 부부공동명의 1세대1주택자 특례를 신청한 경우 (종부세법 제10조의2) */
    special?: boolean;
}
export declare const CASES: Case[];
/** 연령별 공제 — 현행·개편안 동일 */
export declare function ageCreditRate(age: number): number;
/**
 * 기간별 공제율.
 * 현행은 보유기간 기준, '28년부터는 거주기간 기준, '27년은 전환기라
 * 보유공제(절반)와 거주공제 중 큰 쪽을 적용한다.
 */
export declare function periodCreditRate(holdYears: number, liveYears: number, regime: Regime): number;
export declare function creditRateOf(p: Params, regime: Regime): number;
export interface Params {
    /** 주택 전체 공시가격 (원) */
    price: number;
    /** 만 나이 */
    age: number;
    /** 보유기간 (년) */
    holdYears: number;
    /** 거주기간 (년) */
    liveYears: number;
}
export interface CaseResult {
    /** 이 납세의무자 몫의 공시가격 */
    price: number;
    /** 과세대상 문턱을 넘었는가 */
    taxable: boolean;
    threshold: number;
    deduction: number;
    fmv: number;
    taxBase: number;
    rate: number;
    quick: number;
    grossTax: number;
    propertyOverlap: number;
    creditRate: number;
    creditCapped: boolean;
    credit: number;
    taxPerPerson: number;
    taxHousehold: number;
    ruralTax: number;
    jongbuTotal: number;
    propertyTax: number;
    urbanTax: number;
    eduTax: number;
    holdingTotal: number;
}
export declare function calculateCase(c: Case, p: Params, regime: Regime): CaseResult;
export declare function calculateAll(p: Params, regime: Regime): Record<string, CaseResult>;
/** 같은 명의에서 비거주가 실거주보다 얼마나 더 내는지 */
export declare function awayPenalty(results: Record<string, CaseResult>, joint: boolean): number;
export declare function formatWon(value: number): string;
export declare function formatEok(value: number): string;
