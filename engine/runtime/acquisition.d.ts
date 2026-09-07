/**
 * 취득세 계산 — 지방세법 + 농어촌특별세법 + 지방세특례제한법.
 *
 * 취득세는 세 개가 한 덩어리로 붙는다: 취득세 본세 · 지방교육세 · 농어촌특별세.
 * 세 세목의 과세표준이 서로 달라서(특히 중과·감면일 때) 여기서 자주 틀린다.
 *
 * 조문 값은 Graph DB(현행 법령)에서 확인했다:
 *   지방세법 §6(19) 중과기준세율 2% · §11① 표준세율 · §13의2 주택 중과
 *   §15① 세율 특례(1가구1주택 상속) · §151①1 지방교육세
 *   농특세법 §4·§5①6 · 지특법 §36의3 생애최초 감면
 */
import type { Headline, Step, Tip } from "./trace";
import { type CalculationValidation } from "./validation";
/** 중과기준세율 — 지방세법 제6조 제19호 */
export declare const 중과기준세율 = 0.02;
/** 국민주택규모 — 농특세 비과세 경계 */
export declare const 국민주택규모 = 85;
export declare const CAUSES: readonly ["purchase", "gift", "inherit", "original"];
export type Cause = (typeof CAUSES)[number];
export declare const CAUSE_LABEL: Record<Cause, string>;
export declare const KINDS: readonly ["house", "land-farm", "building"];
export type Kind = (typeof KINDS)[number];
export declare const KIND_LABEL: Record<Kind, string>;
export interface AcquisitionInput {
    cause: Cause;
    kind: Kind;
    /** 취득가액 (원) */
    price: number;
    /** 전용면적 (㎡) — 농특세 비과세 판정 */
    area: number;
    /** 조정대상지역 소재 */
    regulated: boolean;
    /** 취득 후 세대 보유 주택 수 (이 주택 포함) */
    houses: number;
    /** 법인이 취득 */
    corporate: boolean;
    /** 일시적 2주택 — 중과에서 빠진다 */
    temporaryTwo: boolean;
    /** 생애최초 주택 구입 (지특법 §36의3) */
    firstHome: boolean;
    /** 감면 300만원 구간 — 60㎡ 이하 소형·다가구·인구감소지역 */
    firstHomeSmall: boolean;
    /** 상속인이 1가구 1주택 (지방세법 §15①2가) */
    soleHeirHouse: boolean;
}
export interface AcquisitionResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    /** 세율 */
    rate: number;
    /** 중과 적용 여부와 이유 */
    heavy: string | null;
    acquisitionTax: number;
    eduTax: number;
    ruralTax: number;
    discount: number;
    total: number;
    /** 취득가액 대비 총부담 */
    effectiveRate: number;
    deadlineLabel: string;
}
export declare const EMPTY_ACQUISITION: AcquisitionInput;
/**
 * 유상거래 주택의 표준세율 — 지방세법 제11조 제1항 제8호.
 * 6~9억 구간은 계산식이 조문에 그대로 있다: (가액 × 2/3억 − 3) × 1/100.
 * 백분율의 소수점 다섯째자리에서 반올림한다 (7억원 → 1.6667%).
 * 공식 계산 예: https://www.ycg.kr/open.content/ko/section/taxation/do/acquisition/
 */
export declare function houseRate(price: number): number;
/** 중과 판정 — 지방세법 제13조의2 제1항. 반환값은 중과기준세율의 배수(200% / 400%) */
export declare function heavyMultiple(input: AcquisitionInput): 0 | 2 | 4;
export declare function calcAcquisition(input: AcquisitionInput): AcquisitionResult;
