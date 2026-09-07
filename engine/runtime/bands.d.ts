/**
 * 누진세율 속산표 — 세목별 구간표 한 곳.
 *
 * 조문은 "1억원 초과 5억원 이하: 1천만원 + (1억원을 초과하는 금액의 20%)"처럼 적고,
 * 실무는 "과세표준 × 세율 − 누진공제"로 계산한다. 둘은 같은 값이고, 누진공제는
 * 구간 하한 × 세율 − 구간 시작 세액이다. 여기서는 조문 표기(StatuteBand)만 들고
 * 누진공제는 계산해서 보여준다 — 손으로 옮겨 적은 누진공제가 한 자리 틀리는 사고를 막는다.
 *
 * 출처: 소득세법 §55(2023~), 상증세법 §26, 종부세법 §9①(2023~), 법인세법 §55(2026~),
 * 지방세법 §111·§111의2·§103의20. 전부 2026-09-03 Tax DB 현행본.
 */
import { type StatuteBand } from "./property";
export interface BandTable {
    id: string;
    name: string;
    law: string;
    /** 과세표준이 무엇인지 한 줄 */
    baseNote: string;
    bands: StatuteBand[];
    /** 기본 입력값 */
    sample: number;
}
/** 소득세 기본세율 — 소득세법 제55조 제1항 (종합·양도소득 공통) */
export declare const INCOME_BANDS: StatuteBand[];
/** 상속·증여세율 — 상증세법 제26조·제56조 */
export declare const ESTATE_BANDS: StatuteBand[];
/** 종부세 주택 2주택 이하 — 종부세법 제9조 제1항 제1호 */
export declare const CPT_BANDS_2: StatuteBand[];
/** 종부세 주택 3주택 이상 — 종부세법 제9조 제1항 제2호 */
export declare const CPT_BANDS_3: StatuteBand[];
export declare const BAND_TABLES: BandTable[];
/** 누진공제 = 구간 하한 × 세율 − 구간 시작 세액 */
export declare function quickDeduction(b: StatuteBand): number;
export interface BandsResult {
    tax: number;
    band: StatuteBand;
    bandIndex: number;
    quick: number;
    effectiveRate: number;
}
export declare function applyTable(taxBase: number, table: BandTable): BandsResult;
