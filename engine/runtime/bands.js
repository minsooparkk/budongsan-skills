"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BAND_TABLES = exports.CPT_BANDS_3 = exports.CPT_BANDS_2 = exports.ESTATE_BANDS = exports.INCOME_BANDS = void 0;
exports.quickDeduction = quickDeduction;
exports.applyTable = applyTable;
const corporate_1 = require("./corporate");
const property_1 = require("./property");
const won_1 = require("./won");
/** 소득세 기본세율 — 소득세법 제55조 제1항 (종합·양도소득 공통) */
exports.INCOME_BANDS = [
    { start: 0, base: 0, rate: 0.06 },
    { start: 1400 * won_1.만, base: 840_000, rate: 0.15 },
    { start: 5000 * won_1.만, base: 6_240_000, rate: 0.24 },
    { start: 8800 * won_1.만, base: 15_360_000, rate: 0.35 },
    { start: 1.5 * won_1.억, base: 37_060_000, rate: 0.38 },
    { start: 3 * won_1.억, base: 94_060_000, rate: 0.4 },
    { start: 5 * won_1.억, base: 174_060_000, rate: 0.42 },
    { start: 10 * won_1.억, base: 384_060_000, rate: 0.45 },
];
/** 상속·증여세율 — 상증세법 제26조·제56조 */
exports.ESTATE_BANDS = [
    { start: 0, base: 0, rate: 0.1 },
    { start: 1 * won_1.억, base: 10_000_000, rate: 0.2 },
    { start: 5 * won_1.억, base: 90_000_000, rate: 0.3 },
    { start: 10 * won_1.억, base: 240_000_000, rate: 0.4 },
    { start: 30 * won_1.억, base: 1_040_000_000, rate: 0.5 },
];
/** 종부세 주택 2주택 이하 — 종부세법 제9조 제1항 제1호 */
exports.CPT_BANDS_2 = [
    { start: 0, base: 0, rate: 0.005 },
    { start: 3 * won_1.억, base: 1_500_000, rate: 0.007 },
    { start: 6 * won_1.억, base: 3_600_000, rate: 0.01 },
    { start: 12 * won_1.억, base: 9_600_000, rate: 0.013 },
    { start: 25 * won_1.억, base: 26_500_000, rate: 0.015 },
    { start: 50 * won_1.억, base: 64_000_000, rate: 0.02 },
    { start: 94 * won_1.억, base: 152_000_000, rate: 0.027 },
];
/** 종부세 주택 3주택 이상 — 종부세법 제9조 제1항 제2호 */
exports.CPT_BANDS_3 = [
    { start: 0, base: 0, rate: 0.005 },
    { start: 3 * won_1.억, base: 1_500_000, rate: 0.007 },
    { start: 6 * won_1.억, base: 3_600_000, rate: 0.01 },
    { start: 12 * won_1.억, base: 9_600_000, rate: 0.02 },
    { start: 25 * won_1.억, base: 35_600_000, rate: 0.03 },
    { start: 50 * won_1.억, base: 110_600_000, rate: 0.04 },
    { start: 94 * won_1.억, base: 286_600_000, rate: 0.05 },
];
exports.BAND_TABLES = [
    { id: "income", name: "소득세 (종합·양도)", law: "소득세법 제55조 제1항", baseNote: "종합소득 과세표준 또는 양도소득 과세표준 (지방소득세 10% 별도)", bands: exports.INCOME_BANDS, sample: 1 * won_1.억 },
    { id: "estate", name: "상속세 · 증여세", law: "상속세 및 증여세법 제26조 · 제56조", baseNote: "공제 후 과세표준. 세대생략 할증 30~40% 별도", bands: exports.ESTATE_BANDS, sample: 10 * won_1.억 },
    { id: "corp", name: "법인세", law: "법인세법 제55조 제1항 (2026년~)", baseNote: "각 사업연도 소득 과세표준 (지방소득세 10% 별도)", bands: corporate_1.CORP_BANDS, sample: 5 * won_1.억 },
    { id: "corp-local", name: "법인지방소득세", law: "지방세법 제103조의20", baseNote: "법인세 과세표준과 같다", bands: corporate_1.CORP_LOCAL_BANDS, sample: 5 * won_1.억 },
    { id: "cpt2", name: "종합부동산세 (주택, 2주택 이하)", law: "종합부동산세법 제9조 제1항 제1호", baseNote: "(공시가격 합계 − 9억/12억) × 공정시장가액비율 60%", bands: exports.CPT_BANDS_2, sample: 5 * won_1.억 },
    { id: "cpt3", name: "종합부동산세 (주택, 3주택 이상)", law: "종합부동산세법 제9조 제1항 제2호", baseNote: "(공시가격 합계 − 9억) × 60%. 과세표준 12억 초과부터 중과", bands: exports.CPT_BANDS_3, sample: 15 * won_1.억 },
    { id: "prop-house", name: "재산세 (주택 표준)", law: "지방세법 제111조 제1항 제3호", baseNote: "공시가격 × 공정시장가액비율 60%", bands: property_1.HOUSE_BANDS, sample: 3 * won_1.억 },
    { id: "prop-house-1", name: "재산세 (1세대 1주택 특례, 공시 9억 이하)", law: "지방세법 제111조의2", baseNote: "공시가격 × 43~45%", bands: property_1.HOUSE_SPECIAL_BANDS, sample: 3 * won_1.억 },
    { id: "prop-land-g", name: "재산세 (종합합산 토지)", law: "지방세법 제111조 제1항 제1호 가목", baseNote: "시가표준액 × 70%", bands: property_1.LAND_GENERAL_BANDS, sample: 2 * won_1.억 },
    { id: "prop-land-s", name: "재산세 (별도합산 토지)", law: "지방세법 제111조 제1항 제1호 나목", baseNote: "시가표준액 × 70%", bands: property_1.LAND_SEPARATE_BANDS, sample: 5 * won_1.억 },
];
/** 누진공제 = 구간 하한 × 세율 − 구간 시작 세액 */
function quickDeduction(b) {
    return Math.round(b.start * b.rate - b.base);
}
function applyTable(taxBase, table) {
    const x = Math.max(0, taxBase);
    let i = 0;
    for (let k = 0; k < table.bands.length; k++)
        if (x > table.bands[k].start)
            i = k;
    const band = table.bands[i];
    const tax = band.base + (x - band.start) * band.rate;
    return { tax, band, bandIndex: i, quick: quickDeduction(band), effectiveRate: x > 0 ? tax / x : 0 };
}
