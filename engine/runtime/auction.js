"use strict";
/**
 * 경매 — 신청비용, 유찰별 최저가·입찰보증금, 배당.
 *
 * 법정 숫자: 경매신청 등록면허세 채권금액 × 0.2% + 지방교육세 20%(지방세법 §28①1라·§151),
 * 인지 5,000원(민사소송등인지법), 입찰보증금 최저매각가격의 10%(민사집행규칙 §63),
 * 저감률은 법원마다 20% 또는 30%(민사집행법 §119 — 법원이 정한다), 소액임차 최우선변제
 * (주택임대차보호법 §8·시행령 §10·§11, 2026-09-03 법제처 대조). 송달료·감정료·신문공고료는 실무 추정.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_PAYOUT = exports.EMPTY_MIN_BID = exports.EMPTY_AUCTION_COST = void 0;
exports.calcAuctionCost = calcAuctionCost;
exports.calcMinBid = calcMinBid;
exports.calcPayout = calcPayout;
const validation_1 = require("./validation");
const won_1 = require("./won");
const finance_1 = require("./finance");
const fees_1 = require("./fees");
exports.EMPTY_AUCTION_COST = { claim: 3 * won_1.억, appraisal: 8 * won_1.억, parties: 4, appraisalFee: 0, noticeFee: 250_000, bailiffFee: 150_000 };
function calcAuctionCost(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isIntegerInRange)(input.parties, 1, 10000))
        return (0, validation_1.invalidCalculation)({ regTax: 0, total: 0 }, "금액과 이해관계인 수(1~10,000명 정수)를 확인해 주세요.");
    const steps = [];
    const tips = [];
    const regTax = (0, won_1.truncate10)(input.claim * 0.002);
    const regEdu = (0, won_1.truncate10)(regTax * 0.2);
    const stamp = 5_000;
    const delivery = Math.max(2, input.parties) * 10 * 5_200; // 회당 5,200원 × 10회분 예납
    const appraisalFee = input.appraisalFee > 0 ? input.appraisalFee : (0, fees_1.calcAppraisalFee)({ value: input.appraisal, factor: 0.8, expenses: 0, vat: true }).total;
    const total = regTax + regEdu + stamp + delivery + appraisalFee + input.noticeFee + input.bailiffFee;
    steps.push({ label: "경매신청 등록면허세 (청구금액 × 0.2%)", value: regTax, law: "지방세법 제28조 제1항 제1호 라목" });
    steps.push({ label: "지방교육세 (등록면허세 × 20%)", value: regEdu, depth: 1, law: "지방세법 제151조 제1항 제2호" });
    steps.push({ label: "인지", value: stamp, law: "민사소송등인지법 제9조" });
    steps.push({ label: `송달료 예납 (${Math.max(2, input.parties)}명 × 10회 × 5,200원)`, value: delivery, note: "실무 예납 기준. 남으면 돌려받는다" });
    steps.push({ label: "감정평가 수수료 (하한 요율 × 1.1)", value: appraisalFee, law: "감정평가법인등의 보수에 관한 기준 [별표]", note: input.appraisalFee > 0 ? "입력값" : "감정가 기준 추정. 법원 감정은 하한 요율" });
    steps.push({ label: "신문공고료", value: input.noticeFee });
    steps.push({ label: "현황조사·집행관 수수료", value: input.bailiffFee, law: "집행관수수료규칙" });
    steps.push({ label: "경매 신청 비용 합계 (예납)", value: total, tone: "total" });
    tips.push({ level: "save", title: "집행비용은 배당에서 가장 먼저 돌려받습니다", body: "낙찰대금에서 집행비용을 0순위로 공제해 신청채권자에게 돌려줍니다. 무잉여로 취소되면 돌려받지 못하는 부분이 생깁니다.", law: "민사집행법 제53조" });
    tips.push({ level: "watch", title: "무잉여면 경매가 취소됩니다", body: "예상 낙찰가에서 선순위 채권과 비용을 빼고 신청채권자에게 남는 게 없으면 법원이 경매를 취소합니다. 배당 계산기로 먼저 확인하세요.", law: "민사집행법 제102조" });
    return { headline: [{ label: "경매 신청 비용 (예납)", value: total }, { label: "등록면허세+교육세", value: regTax + regEdu }, { label: "감정료", value: appraisalFee }], steps, tips, regTax, total };
}
exports.EMPTY_MIN_BID = { appraisal: 8 * won_1.억, failures: 2, reduction: 0.2, depositRate: 0.1 };
function calcMinBid(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isFiniteNumber)(input.appraisal, 1) || !(0, validation_1.isIntegerInRange)(input.failures, 0, 100) || !(0, validation_1.isFiniteNumber)(input.reduction, 0, 1) || !(0, validation_1.isFiniteNumber)(input.depositRate, 0, 1)) {
        return (0, validation_1.invalidCalculation)({ rows: [], current: { round: 0, minPrice: 0, deposit: 0, ratio: 0 } }, "감정가는 0보다 커야 하며, 유찰 횟수는 0~100회 정수, 비율은 0~100%여야 합니다.");
    }
    const steps = [];
    const tips = [];
    const rows = [];
    for (let i = 0; i <= Math.max(input.failures, 5); i++) {
        const minPrice = Math.floor(input.appraisal * Math.pow(1 - input.reduction, i));
        rows.push({ round: i + 1, minPrice, deposit: Math.floor(minPrice * input.depositRate), ratio: minPrice / input.appraisal });
    }
    const current = rows[input.failures];
    steps.push({ label: "감정가 (최초 최저매각가격)", value: input.appraisal, tone: "sub", law: "민사집행법 제97조" });
    for (const r of rows)
        steps.push({ label: `${r.round}회차 (${r.round - 1}회 유찰) — 감정가의 ${(r.ratio * 100).toFixed(1)}%`, value: r.minPrice, depth: 1, note: `보증금 ${(0, won_1.formatWon)(r.deposit)}`, tone: r.round === input.failures + 1 ? "sub" : undefined });
    steps.push({ label: `${input.failures + 1}회차 최저가`, value: current.minPrice, tone: "total", law: "민사집행법 제119조 (저감률은 법원이 정한다)" });
    steps.push({ label: `입찰보증금 (최저가 × ${(input.depositRate * 100).toFixed(0)}%)`, value: current.deposit, law: "민사집행규칙 제63조" });
    tips.push({ level: "must", title: "입찰가는 최저가 이상이면 되고, 보증금은 최저가 기준입니다", body: "보증금은 입찰가가 아니라 최저매각가격의 10%입니다. 1원이라도 모자라면 무효입니다. 재매각(전 낙찰자 미납)은 20~30%로 오릅니다." });
    tips.push({ level: "watch", title: "저감률은 법원마다 다릅니다", body: "서울·인천 등은 20%, 대부분 지방법원은 30%입니다. 매각물건명세서의 최저매각가격을 확인하세요.", law: "민사집행법 제119조" });
    tips.push({ level: "save", title: "유찰이 많다고 싼 게 아닙니다", body: "여러 번 유찰된 물건은 권리상 하자(선순위 임차인·유치권·법정지상권)가 있는 경우가 많습니다. 배당 계산기로 인수할 권리를 확인하세요." });
    return { headline: [{ label: `${input.failures + 1}회차 최저매각가격`, value: current.minPrice, hint: `감정가의 ${(current.ratio * 100).toFixed(1)}%` }, { label: "입찰보증금", value: current.deposit }, { label: "감정가", value: input.appraisal }], steps, tips, rows, current };
}
exports.EMPTY_PAYOUT = { price: 6 * won_1.억, costs: 300 * won_1.만, region: "seoul", tenant: 1 * won_1.억, tenantSenior: false, tax: 0, mortgage1: 3 * won_1.억, mortgage2: 1 * won_1.억, mortgage3: 0 };
function calcPayout(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isOneOf)(input.region, Object.keys(finance_1.REGION_LABEL)))
        return (0, validation_1.invalidCalculation)({ lines: [], remainder: 0, tenantLoss: 0 }, "금액과 소액임차보증금 적용 지역을 확인해 주세요.");
    const steps = [];
    const tips = [];
    let pool = input.price;
    const lines = [];
    const take = (label, claim) => { const paid = Math.min(claim, pool); pool -= paid; lines.push({ label, claim, paid }); return paid; };
    take("0. 집행비용", input.costs);
    // 소액임차 최우선변제 — 보증금이 시행령 §11 상한 이하일 때 §10 금액 (주택가액의 1/2 한도)
    const smallLimit = { seoul: 16500 * won_1.만, "metro-over": 14500 * won_1.만, "metro-city": 8500 * won_1.만, other: 7500 * won_1.만 };
    let tenantLeft = input.tenant;
    if (input.tenant > 0 && input.tenant <= smallLimit[input.region]) {
        const prio = Math.min(finance_1.ROOM_DEDUCTION[input.region], input.tenant, Math.floor(input.price / 2));
        tenantLeft -= take(`1. 소액임차인 최우선변제 (${finance_1.REGION_LABEL[input.region]} ${(0, won_1.formatWon)(finance_1.ROOM_DEDUCTION[input.region])} 한도)`, prio);
    }
    take("2. 당해세 (재산세·종부세 체납)", input.tax);
    if (input.tenantSenior && tenantLeft > 0)
        tenantLeft -= take("3. 선순위 임차인 (확정일자, 근저당보다 먼저)", tenantLeft);
    take("4. 1순위 근저당", input.mortgage1);
    if (!input.tenantSenior && tenantLeft > 0)
        tenantLeft -= take("5. 후순위 임차인 (확정일자)", tenantLeft);
    take("6. 2순위 근저당", input.mortgage2);
    take("7. 3순위 근저당", input.mortgage3);
    const remainder = pool;
    steps.push({ label: "낙찰대금", value: input.price, tone: "sub" });
    for (const l of lines)
        steps.push({ label: `${l.label} — 청구 ${(0, won_1.formatWon)(l.claim)}`, value: l.paid, tone: l.paid < l.claim ? "minus" : "plus", note: l.paid < l.claim ? `${(0, won_1.formatWon)(l.claim - l.paid)} 못 받음` : undefined });
    steps.push({ label: "잉여 (소유자에게)", value: remainder, tone: "total" });
    const tenantLoss = tenantLeft;
    if (tenantLoss > 0)
        tips.push({ level: "must", title: `임차인이 ${(0, won_1.formatWon)(tenantLoss)}를 못 받습니다`, body: input.tenantSenior ? "선순위인데도 낙찰가가 낮아 못 받는 부분입니다. 대항력 있는 선순위 임차인의 미배당 보증금은 낙찰자가 인수합니다 — 입찰가에 반영하세요." : "후순위라 근저당 뒤로 밀렸습니다. 대항력이 없으면 못 받은 채로 끝나고, 대항력이 있으면(근저당보다 먼저 전입) 낙찰자가 인수합니다.", law: "주택임대차보호법 제3조 · 제3조의2" });
    tips.push({ level: "watch", title: "당해세는 임차인보다 앞서지만 2023년부터 예외가 생겼습니다", body: "임차인 확정일자보다 늦게 법정기일이 온 당해세는 임차보증금 뒤로 밀립니다(2023.4~). 여기서는 당해세를 앞에 뒀으니 법정기일을 확인하세요.", law: "국세기본법 제35조 제7항" });
    tips.push({ level: "save", title: "배당표는 채권신고 금액으로 만듭니다", body: "근저당은 채권최고액이 아니라 실제 채권액(원금+이자)으로 배당받습니다. 채권최고액을 넣었으면 실제는 이보다 적을 수 있습니다." });
    return { headline: [{ label: "잉여 (소유자 몫)", value: remainder }, { label: "임차인 미회수", value: tenantLoss, hint: tenantLoss > 0 ? "인수 위험" : undefined }, { label: "낙찰대금", value: input.price }], steps, tips, lines, remainder, tenantLoss };
}
