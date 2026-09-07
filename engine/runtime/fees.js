"use strict";
/**
 * 보수·수수료와 단일 세목 페이지 엔진.
 *
 *   감정평가수수료  「감정평가법인등의 보수에 관한 기준」(국토부 공고, 2026.2.9) [별표] — 법제처 대조
 *   법무사 보수     대한법무사협회 보수표(소유권이전등기 기본보수) — 협회 규정이라 법령 DB에 없다. 확인일 2026-09-03, 상한 기준
 *   지적측량수수료  한국국토정보공사 고시 — 종류별 기본단가를 입력값으로 둔 추정
 *   국민주택채권·인지세·지역자원시설세  registration.ts·property.ts 의 계산을 단독 페이지로
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_FIRE = exports.EMPTY_STAMP = exports.EMPTY_BOND = exports.EMPTY_SURVEY = exports.SURVEY_BASE = exports.SURVEY_KIND_LABEL = exports.SURVEY_KINDS = exports.EMPTY_JUDICIAL = exports.JUDICIAL_BANDS = exports.EMPTY_APPRAISAL_FEE = exports.APPRAISAL_FEE_BANDS = void 0;
exports.calcAppraisalFee = calcAppraisalFee;
exports.calcJudicialFee = calcJudicialFee;
exports.calcSurvey = calcSurvey;
exports.calcBond = calcBond;
exports.calcStamp = calcStamp;
exports.calcFireTax = calcFireTax;
const property_1 = require("./property");
const registration_1 = require("./registration");
const validation_1 = require("./validation");
const won_1 = require("./won");
/* ═══════════ 감정평가수수료 ═══════════ */
exports.APPRAISAL_FEE_BANDS = [
    { start: 0, base: 250_000, rate: 0 },
    { start: 5000 * won_1.만, base: 250_000, rate: 0.0011 },
    { start: 5 * won_1.억, base: 745_000, rate: 0.0009 },
    { start: 10 * won_1.억, base: 1_195_000, rate: 0.0008 },
    { start: 50 * won_1.억, base: 4_395_000, rate: 0.0007 },
    { start: 100 * won_1.억, base: 7_895_000, rate: 0.0006 },
    { start: 500 * won_1.억, base: 31_895_000, rate: 0.0005 },
    { start: 1000 * won_1.억, base: 56_895_000, rate: 0.0004 },
    { start: 3000 * won_1.억, base: 136_895_000, rate: 0.0003 },
    { start: 6000 * won_1.억, base: 226_895_000, rate: 0.0002 },
    { start: 10000 * won_1.억, base: 306_895_000, rate: 0.0001 },
];
exports.EMPTY_APPRAISAL_FEE = { value: 10 * won_1.억, factor: 1, expenses: 0, vat: true };
function calcAppraisalFee(input) {
    const steps = [];
    const tips = [];
    const v = Math.max(0, input.value);
    const { tax: base, band } = (0, property_1.applyStatute)(v, exports.APPRAISAL_FEE_BANDS);
    const factor = Math.min(1.2, Math.max(0.8, input.factor));
    const fee = Math.floor(v <= 5000 * won_1.만 ? base : base * factor);
    const vat = input.vat ? Math.floor((fee + input.expenses) * 0.1) : 0;
    const total = fee + input.expenses + vat;
    steps.push({ label: "감정평가액", value: v, tone: "sub" });
    steps.push({ label: "기준 수수료", value: Math.floor(base), law: "감정평가법인등의 보수에 관한 기준 [별표]", note: band.start === 0 ? "5천만원 이하 정액 25만원" : `${(0, won_1.formatWon)(band.base)} + ${(0, won_1.formatWon)(band.start)} 초과액 × ${(band.rate * 10000).toFixed(0)}/10,000` });
    if (v > 5000 * won_1.만)
        steps.push({ label: `× 요율 조정 ${factor.toFixed(2)} (0.8~1.2 범위)`, value: fee, tone: "sub" });
    steps.push({ label: "+ 실비", value: input.expenses, tone: "plus" });
    steps.push({ label: "+ 부가가치세 10%", value: vat, tone: "plus" });
    steps.push({ label: "합계", value: total, tone: "total" });
    tips.push({ level: "save", title: "요율은 기준의 0.8~1.2배 안에서 협의합니다", body: "담보평가는 은행이 지정하고 요율이 낮은 편이고, 소송·보상 평가는 상한 쪽입니다. 견적을 받을 때 배율을 물어보세요." });
    tips.push({ level: "watch", title: "양도세 필요경비·취득가액에 들어갑니다", body: "양도 목적의 감정평가 수수료는 필요경비, 취득 때 평가는 취득가액에 더할 수 있습니다. 세금계산서를 받아 두세요.", law: "소득세법 시행령 제163조" });
    return { headline: [{ label: "감정평가수수료 (부가세·실비 포함)", value: total }, { label: "수수료", value: fee }, { label: "부가세", value: vat }], steps, tips, base, fee, vat, total };
}
/* ═══════════ 법무사 보수 ═══════════ */
/** 대한법무사협회 보수표 — 소유권이전등기 기본보수 (과세표준 기준). 협회 규정, 확인일 2026-09-03 */
exports.JUDICIAL_BANDS = [
    { start: 0, base: 70_000, rate: 0 },
    { start: 1000 * won_1.만, base: 70_000, rate: 0.0011 },
    { start: 5000 * won_1.만, base: 114_000, rate: 0.001 },
    { start: 1 * won_1.억, base: 164_000, rate: 0.0009 },
    { start: 3 * won_1.억, base: 344_000, rate: 0.0008 },
    { start: 5 * won_1.억, base: 504_000, rate: 0.0007 },
    { start: 10 * won_1.억, base: 854_000, rate: 0.0005 },
];
exports.EMPTY_JUDICIAL = { base: 9 * won_1.억, mortgage: 0, expenses: 100_000, discount: 0, vat: true };
function calcJudicialFee(input) {
    const steps = [];
    const tips = [];
    const { tax: t, band } = (0, property_1.applyStatute)(input.base, exports.JUDICIAL_BANDS);
    const transferFee = Math.floor(t);
    steps.push({ label: "소유권이전등기 기본보수", value: transferFee, law: "대한법무사협회 보수표", note: band.start === 0 ? "1천만원 이하 7만원" : `${(0, won_1.formatWon)(band.base)} + ${(0, won_1.formatWon)(band.start)} 초과액 × ${(band.rate * 10000).toFixed(0)}/10,000` });
    let mortgageFee = 0;
    if (input.mortgage > 0) {
        const { tax: m } = (0, property_1.applyStatute)(input.mortgage, exports.JUDICIAL_BANDS);
        mortgageFee = Math.floor(m * 0.7);
        steps.push({ label: "근저당권설정등기 보수 (채권최고액 기준, 이전등기 보수의 70% 가정)", value: mortgageFee, tone: "plus", note: "은행 지정 법무사가 별도로 청구하는 게 보통" });
    }
    const gross = transferFee + mortgageFee;
    const discounted = Math.floor(gross * (1 - Math.min(0.9, Math.max(0, input.discount))));
    if (input.discount > 0)
        steps.push({ label: `협의 할인 ${(input.discount * 100).toFixed(0)}%`, value: discounted, tone: "sub" });
    steps.push({ label: "+ 실비 (일당·교통비·제증명)", value: input.expenses, tone: "plus" });
    const vat = input.vat ? Math.floor((discounted + input.expenses) * 0.1) : 0;
    steps.push({ label: "+ 부가가치세", value: vat, tone: "plus" });
    const total = discounted + input.expenses + vat;
    steps.push({ label: "합계", value: total, tone: "total" });
    tips.push({ level: "save", title: "보수표는 상한이고 시장은 그 아래입니다", body: "법무통·인터넷 견적 비교로 기본보수의 절반 아래도 흔합니다. 은행 대출이 끼면 은행 지정 법무사라 협상 여지가 작습니다." });
    tips.push({ level: "watch", title: "보수와 공과금은 다른 돈입니다", body: "법무사 영수증의 큰 숫자는 취득세·채권·인지세 같은 공과금이고, 보수는 그중 일부입니다. 항목을 나눠 받으세요." });
    return { headline: [{ label: "법무사 보수 (실비·부가세 포함)", value: total }, { label: "이전등기 보수", value: transferFee }, { label: "근저당 보수", value: mortgageFee }], steps, tips, transferFee, mortgageFee, total };
}
/* ═══════════ 지적측량수수료 (추정) ═══════════ */
exports.SURVEY_KINDS = ["boundary", "division", "status", "conversion", "registration"];
exports.SURVEY_KIND_LABEL = { boundary: "경계복원측량 (경계 확인·담장)", division: "분할측량 (필지 나누기)", status: "지적현황측량 (건축물 위치)", conversion: "등록전환측량 (임야 → 토지대장)", registration: "신규등록측량" };
/** 한국국토정보공사 고시 기본단가 근사 — 도시지역 1필지 1,000㎡ 이하. 확인일 2026-09-03, 추정 */
exports.SURVEY_BASE = { boundary: 660_000, division: 900_000, status: 600_000, conversion: 760_000, registration: 760_000 };
exports.EMPTY_SURVEY = { kind: "boundary", area: 500, parcels: 1, baseFee: 660_000, extraParcelRatio: 0.5 };
function calcSurvey(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isOneOf)(input.kind, exports.SURVEY_KINDS) || !(0, validation_1.isIntegerInRange)(input.parcels, 1, 10000))
        return (0, validation_1.invalidCalculation)({ total: 0 }, "측량 종류와 금액·면적, 필지 수(1~10,000개 정수)를 확인해 주세요.");
    const steps = [];
    const tips = [];
    const areaFactor = input.area <= 1000 ? 1 : 1 + Math.ceil((input.area - 1000) / 1000) * 0.15;
    const first = Math.floor(input.baseFee * areaFactor);
    const extra = Math.max(0, input.parcels - 1) * Math.floor(input.baseFee * input.extraParcelRatio);
    const total = first + extra;
    steps.push({ label: `${exports.SURVEY_KIND_LABEL[input.kind]} 기본단가`, value: input.baseFee, law: "한국국토정보공사 지적측량수수료 고시", note: "도시지역 1필지 1,000㎡ 이하 기준 근사값. 고시 단가로 바꿔 넣으세요" });
    if (areaFactor > 1)
        steps.push({ label: `면적 가산 (1,000㎡ 초과 1,000㎡마다 15%)`, value: first, tone: "sub" });
    if (extra > 0)
        steps.push({ label: `추가 필지 ${input.parcels - 1}개 (기본단가의 ${(input.extraParcelRatio * 100).toFixed(0)}%)`, value: extra, tone: "plus" });
    steps.push({ label: "합계 (부가세 면제)", value: total, tone: "total" });
    tips.push({ level: "watch", title: "정확한 금액은 지적측량바로처리센터에서 즉시 견적됩니다", body: "LX 수수료는 지역(도시·비도시)·면적·필지 수·측량 종류의 표로 정해지며 여기 값은 그 표의 근사입니다. 신청 전 견적 조회를 하세요." });
    tips.push({ level: "save", title: "분할과 경계복원을 같이 하면 한쪽이 할인됩니다", body: "같은 필지에 두 측량을 동시에 신청하면 뒤 측량은 감액 적용됩니다." });
    return { headline: [{ label: "지적측량수수료 (추정)", value: total }, { label: "기본", value: first }, { label: "추가 필지", value: extra }], steps, tips, total };
}
exports.EMPTY_BOND = { kind: "house", standardValue: 5 * won_1.억, metro: true, discountRate: 10, couponRate: 1.3 };
function calcBond(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isOneOf)(input.kind, Object.keys(registration_1.REG_KIND_LABEL)))
        return (0, validation_1.invalidCalculation)({ rate: 0, amount: 0, cost: 0 }, "채권 매입 대상과 시가표준액·할인율을 확인해 주세요.");
    const steps = [];
    const tips = [];
    const rate = (0, registration_1.bondRate)(input.kind, input.standardValue, input.metro);
    const amount = rate > 0 ? (0, registration_1.roundBond)(input.standardValue * rate) : 0;
    const cost = Math.floor((amount * input.discountRate) / 100);
    steps.push({ label: `${registration_1.REG_KIND_LABEL[input.kind]} 시가표준액`, value: input.standardValue, tone: "sub" });
    steps.push({ label: `매입률 ${(rate * 100).toFixed(1)}% (${input.metro ? "특별시·광역시" : "그 밖의 지역"})`, value: amount, law: "주택도시기금법 시행령 [별표] 부표 제15호", note: rate === 0 ? "매입 대상 금액 미만" : "1만원 단위 (5천원 이상 올림)" });
    steps.push({ label: `즉시 매도 할인비용 (할인율 ${input.discountRate}%)`, value: cost, tone: "total" });
    tips.push({ level: "save", title: "보유하면 5년 뒤 액면 + 이자를 받습니다", body: `표면금리 연 ${input.couponRate}% 복리, 5년 만기. 할인율 ${input.discountRate}%면 되파는 쪽이 보통 유리하지만, 금리가 낮을 때는 보유가 나을 수 있습니다.` });
    tips.push({ level: "watch", title: "은행 창구 할인율은 매일 바뀝니다", body: "등기 당일 주택도시기금 취급 은행(우리·국민·신한·하나·농협·기업)의 고시 할인율로 정산됩니다." });
    return { headline: [{ label: "채권 즉시매도 할인비용", value: cost }, { label: "채권 매입액", value: amount }, { label: "매입률", value: 0, displayValue: `${(rate * 100).toFixed(1)}%` }], steps, tips, rate, amount, cost };
}
exports.EMPTY_STAMP = { amount: 9 * won_1.억, isHouse: true, buyerShare: 0.5 };
function calcStamp(input) {
    const steps = [];
    const tips = [];
    const stamp = (0, registration_1.stampDuty)(input.amount, input.isHouse);
    const buyer = Math.floor(stamp * Math.min(1, Math.max(0, input.buyerShare)));
    steps.push({ label: "기재금액", value: input.amount, tone: "sub" });
    steps.push({ label: "인지세", value: stamp, law: "인지세법 제3조 제1항 제1호", note: stamp === 0 ? (input.isHouse ? "주택 1억원 이하 비과세 (제6조 제5호)" : "1천만원 이하 비과세") : "1천만~3천만 2만 · ~5천만 4만 · ~1억 7만 · ~10억 15만 · 초과 35만" });
    steps.push({ label: `매수인 부담 (${(input.buyerShare * 100).toFixed(0)}%)`, value: buyer, tone: "total", note: "법은 문서 작성자 연대납부, 관행은 절반씩" });
    tips.push({ level: "must", title: "계약서 작성 때 전자수입인지를 붙여야 합니다", body: "잔금 때가 아니라 계약서를 쓰는 날입니다. 늦게 붙이면 미납세액의 100~300% 가산세.", law: "인지세법 제8조 제1항" });
    tips.push({ level: "save", title: "분양권·입주권 전매 계약서도 인지세 대상입니다", body: "부동산 소유권 이전에 관한 증서로 봅니다. 주택 1억 이하 비과세는 주택 매매계약서에만 적용됩니다.", law: "인지세법 제6조" });
    return { headline: [{ label: "인지세", value: stamp }, { label: "매수인 몫", value: buyer }, { label: "매도인 몫", value: stamp - buyer }], steps, tips, stamp, buyer };
}
exports.EMPTY_FIRE = { buildingValue: 2 * won_1.억, kind: "house", oneHouse: true, riskMultiple: 1 };
function calcFireTax(input) {
    const steps = [];
    const tips = [];
    const ratio = input.kind === "house" ? (0, property_1.fairMarketRatio)({ kind: "house", price: input.buildingValue, oneHouse: input.oneHouse }) : 0.7;
    const taxBase = Math.floor(input.buildingValue * ratio);
    const { tax: raw, band } = (0, property_1.applyStatute)(taxBase, property_1.FIRE_BANDS);
    const tax = (0, won_1.truncate10)(raw * Math.min(3, Math.max(1, input.riskMultiple)));
    steps.push({ label: "건물분 시가표준액", value: input.buildingValue, tone: "sub" });
    steps.push({ label: `× 공정시장가액비율 ${Math.round(ratio * 100)}%`, value: taxBase, law: "지방세법 제146조 제4항" });
    steps.push({ label: "소방분 지역자원시설세", value: (0, won_1.truncate10)(raw), law: "지방세법 제146조 제3항 제1호", note: band.start === 0 ? "0.04%" : `${(0, won_1.formatWon)(band.base)} + ${(0, won_1.formatWon)(band.start)} 초과분 × ${(band.rate * 100).toFixed(2)}%` });
    if (input.riskMultiple > 1)
        steps.push({ label: `× 화재위험 건축물 ${input.riskMultiple}배`, value: tax, tone: "total", law: "지방세법 제146조 제3항 제2호·제2호의2" });
    else
        steps.push({ label: "세액 (10원 미만 절사)", value: tax, tone: "total" });
    tips.push({ level: "watch", title: "재산세 고지서 네 번째 줄입니다", body: "따로 고지되지 않고 7월 건축물·주택 재산세와 같이 나옵니다. 토지에는 붙지 않습니다.", law: "지방세법 제147조" });
    tips.push({ level: "save", title: "4층 이상·주유소·극장은 2배, 11층 이상·대형마트·호텔은 3배", body: "아파트 4층 이상도 2배 대상이었으나 공동주택은 제외됩니다. 상가건물 층수를 확인하세요.", law: "지방세법 시행령 제138조" });
    return { headline: [{ label: "소방분 지역자원시설세 (연)", value: tax }, { label: "과세표준", value: taxBase }, { label: "배율", value: 0, displayValue: `${input.riskMultiple}배` }], steps, tips, taxBase, tax };
}
