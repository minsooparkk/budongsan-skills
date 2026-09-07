"use strict";
/**
 * 임대차 계산 묶음 — 주택임대차보호법·소득세법·민법.
 *
 * 법정 숫자 (2026-09-03 법제처·Tax DB 현행본):
 *   전월세 전환율   주임법 §7의2·시행령 §9  min(연 10%, 기준금리 + 2%p)
 *   임대료 증액 상한 주임법 §7·시행령 §8     5% (1/20), 1년 안에는 재청구 불가, 조례로 하향 가능
 *   간주임대료      소득세법 §25·시행령 §53·시행규칙 §23
 *                   3주택 이상 & 보증금 3억 초과 / 2주택(기준시가 12억 초과 주택만 셈) & 보증금 12억 초과
 *                   (보증금 − 3억) × 60% × 정기예금이자율 3.1% − 임대사업 이자·배당수입
 *                   40㎡ 이하 & 기준시가 2억 이하 소형주택은 2026.12.31까지 주택 수 제외
 *   주택임대소득    소득세법 §64의2  총수입 2천만 이하 분리과세 선택: (수입 − 50%(등록 60%)
 *                   − 200만(등록 400만, 다른 종합소득 2천만 이하)) × 14% (+지방 10%)
 *
 * 법에 없는 숫자(수익률 경비, 보증보험 요율, 명도 노무비)는 입력값으로 두고 기본값에
 * 출처를 적는다. 여기서는 계산만 하고 판단은 화면의 팁이 한다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_EVICTION = exports.EMPTY_RENTAL_TAX = exports.SEPARATE_LIMIT = exports.EMPTY_DEEMED = exports.DEEMED_RATIO = exports.DEEMED_DEDUCTION = exports.DEEMED_RATE = exports.EMPTY_NOC = exports.EMPTY_OVERDUE = exports.LTV_LIMIT = exports.EMPTY_INSURANCE = exports.EMPTY_COMPARE = exports.EMPTY_YIELD = exports.EMPTY_INCREASE = exports.RENT_CAP = exports.EMPTY_CONVERSION = exports.CONVERSION_SPREAD = exports.CONVERSION_CAP = void 0;
exports.legalConversionRate = legalConversionRate;
exports.calcConversion = calcConversion;
exports.calcIncrease = calcIncrease;
exports.calcYield = calcYield;
exports.calcCompare = calcCompare;
exports.calcInsurance = calcInsurance;
exports.calcOverdue = calcOverdue;
exports.calcNoc = calcNoc;
exports.calcDeemed = calcDeemed;
exports.calcRentalTax = calcRentalTax;
exports.calcEviction = calcEviction;
const validation_1 = require("./validation");
const bands_1 = require("./bands");
const property_1 = require("./property");
const won_1 = require("./won");
/* ═══════════════════════════ 전월세 전환율 ═══════════════════════════ */
/** 시행령 §9: 연 10%, 기준금리 + 2%p 중 낮은 쪽 */
exports.CONVERSION_CAP = 0.1;
exports.CONVERSION_SPREAD = 0.02;
function legalConversionRate(baseRate) {
    return Math.min(exports.CONVERSION_CAP, baseRate + exports.CONVERSION_SPREAD);
}
exports.EMPTY_CONVERSION = { deposit: 3 * won_1.억, monthly: 0, amount: 1 * won_1.억, direction: "toMonthly", baseRate: 0.025, agreedRate: 0 };
function calcConversion(input) {
    const steps = [];
    const tips = [];
    const legalRate = legalConversionRate(Math.max(0, input.baseRate));
    const rate = input.agreedRate > 0 ? Math.min(input.agreedRate, legalRate) : legalRate;
    steps.push({ label: "법정 전환율 상한", value: `${(legalRate * 100).toFixed(2)}%`, law: "주택임대차보호법 제7조의2 · 시행령 제9조", note: `연 10% 와 기준금리 ${(input.baseRate * 100).toFixed(2)}% + 2%p 중 낮은 쪽` });
    if (rate < legalRate)
        steps.push({ label: "합의 전환율", value: `${(rate * 100).toFixed(2)}%` });
    let newDeposit = input.deposit, newMonthly = input.monthly;
    if (input.direction === "toMonthly") {
        const x = Math.min(Math.max(0, input.amount), input.deposit);
        const add = Math.floor((x * rate) / 12);
        newDeposit = input.deposit - x;
        newMonthly = input.monthly + add;
        steps.push({ label: "월세로 돌리는 보증금", value: x, tone: "sub" });
        steps.push({ label: `× 전환율 ${(rate * 100).toFixed(2)}% ÷ 12 = 월세 증가분`, value: add, tone: "plus" });
    }
    else {
        const y = Math.min(Math.max(0, input.amount), input.monthly);
        const add = rate > 0 ? Math.floor((y * 12) / rate) : 0;
        newDeposit = input.deposit + add;
        newMonthly = input.monthly - y;
        steps.push({ label: "보증금으로 돌리는 월세", value: y, tone: "sub" });
        steps.push({ label: `× 12 ÷ 전환율 ${(rate * 100).toFixed(2)}% = 보증금 증가분`, value: add, tone: "plus", note: "월세→보증금은 법이 상한을 두지 않는다. 같은 율로 역산한 참고값" });
    }
    steps.push({ label: "전환 후 보증금", value: newDeposit, tone: "sub" });
    steps.push({ label: "전환 후 월세", value: newMonthly, tone: "total" });
    tips.push({ level: "must", title: "상한은 「보증금 → 월세」 방향에만 있습니다", body: "계약 기간 중이나 갱신 때 보증금을 월세로 돌릴 때 이 율을 넘으면 초과분은 무효입니다. 반대로 월세를 보증금으로 돌리는 건 자유 협의입니다.", law: "주택임대차보호법 제7조의2 · 제10조" });
    tips.push({ level: "watch", title: "갱신 때 5% 상한과 같이 봅니다", body: "갱신요구권을 쓴 갱신은 보증금·월세 각각 5% 이내여야 하고, 그 안에서 전환할 때 이 전환율을 씁니다. 두 상한이 동시에 걸립니다.", law: "주택임대차보호법 제6조의3 제3항 · 제7조" });
    tips.push({ level: "save", title: "기준금리가 바뀌면 상한도 바뀝니다", body: "한국은행 기준금리 + 2%p 가 10% 보다 낮으므로 사실상 기준금리가 상한을 정합니다. 계약 시점의 기준금리를 넣으세요." });
    const headline = [
        { label: "전환 후 월세", value: newMonthly, hint: `보증금 ${(0, won_1.formatWon)(newDeposit)}` },
        { label: "법정 전환율", value: 0, displayValue: `${(legalRate * 100).toFixed(2)}%` },
        { label: "월세 변동", value: newMonthly - input.monthly, higherIsWorse: true },
    ];
    return { headline, steps, tips, legalRate, rate, newDeposit, newMonthly };
}
/* ═══════════════════════════ 임대료 상승분 ═══════════════════════════ */
exports.RENT_CAP = 0.05;
exports.EMPTY_INCREASE = { deposit: 5 * won_1.억, monthly: 0, localCap: 0, monthsSince: 24 };
function calcIncrease(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isIntegerInRange)(input.monthsSince, 0, 1200))
        return (0, validation_1.invalidCalculation)({ cap: 0, maxDeposit: 0, maxMonthly: 0, allowed: false }, "금액과 계약·증액 후 지난 개월(0~1,200개월 정수)을 확인해 주세요.");
    const steps = [];
    const tips = [];
    const cap = input.localCap > 0 ? Math.min(input.localCap, exports.RENT_CAP) : exports.RENT_CAP;
    const allowed = input.monthsSince >= 12;
    const maxDeposit = Math.floor(input.deposit * (1 + cap));
    const maxMonthly = Math.floor(input.monthly * (1 + cap));
    steps.push({ label: "증액 상한", value: `${(cap * 100).toFixed(1)}%`, law: "주택임대차보호법 제7조 제2항 · 시행령 제8조", note: input.localCap > 0 ? "조례로 낮춘 상한" : "약정 차임·보증금의 1/20" });
    steps.push({ label: "보증금 상한", value: maxDeposit, tone: "sub", note: `증가분 ${(0, won_1.formatWon)(maxDeposit - input.deposit)}` });
    steps.push({ label: "월세 상한", value: maxMonthly, tone: "sub", note: `증가분 ${(0, won_1.formatWon)(maxMonthly - input.monthly)}` });
    steps.push({ label: "증액 청구 가능 여부", value: allowed ? "가능 (마지막 증액·계약 후 1년 경과)" : `불가 — ${12 - input.monthsSince}개월 뒤`, law: "주택임대차보호법 제7조 제1항 후단" });
    tips.push({ level: "must", title: "5%는 갱신요구권을 쓴 갱신에 적용됩니다", body: "임차인이 갱신요구권(1회, 2년)을 행사한 갱신은 5%를 넘을 수 없습니다. 갱신요구권을 이미 쓴 뒤 새로 맺는 계약은 시세대로 정할 수 있습니다.", law: "주택임대차보호법 제6조의3 제3항" });
    tips.push({ level: "watch", title: "보증금과 월세를 동시에 올릴 때는 환산해서 봅니다", body: "보증금 일부를 월세로 돌리며 올리면 전환율(기준금리+2%p)로 환산한 총액이 5% 이내여야 합니다. 두 숫자 각각 5%가 아니라 합쳐서 5%입니다.", law: "주택임대차보호법 제7조의2" });
    tips.push({ level: "save", title: "등록임대주택은 5%가 절대 상한입니다", body: "민간임대주택으로 등록했으면 갱신 여부와 관계없이 5%를 넘을 수 없고, 넘기면 세제 혜택(필요경비 60%·공제 400만)이 빠지고 과태료가 붙습니다.", law: "민간임대주택에 관한 특별법 제44조" });
    return { headline: [...(allowed ? [{ label: "올릴 수 있는 보증금 상한", value: maxDeposit, hint: `+${(0, won_1.formatWon)(maxDeposit - input.deposit)}` }] : [{ label: "현재 증액 청구", value: 0, displayValue: "증액 불가", hint: `${12 - input.monthsSince}개월 뒤 가능` }, { label: "가능 시점 가정 보증금 상한", value: maxDeposit }]), { label: allowed ? "월세 상한" : "가능 시점 가정 월세 상한", value: maxMonthly }], steps, tips, cap, maxDeposit, maxMonthly, allowed };
}
exports.EMPTY_YIELD = { price: 5 * won_1.억, deposit: 5000 * won_1.만, monthly: 150 * won_1.만, loan: 2 * won_1.억, loanRate: 0.045, expenses: 300 * won_1.만, vacancy: 0.05, acquisitionCost: 0 };
function calcYield(input) {
    const steps = [];
    const tips = [];
    const annualRent = input.monthly * 12;
    const effectiveRent = Math.floor(annualRent * (1 - Math.min(1, Math.max(0, input.vacancy))));
    const interest = Math.floor(input.loan * input.loanRate);
    const invested = input.price + input.acquisitionCost - input.deposit;
    const equity = invested - input.loan;
    const noi = effectiveRent - input.expenses;
    const cashflow = noi - interest;
    const grossYield = invested > 0 ? annualRent / invested : 0;
    const netYield = invested > 0 ? noi / invested : 0;
    const equityYield = equity > 0 ? cashflow / equity : 0;
    steps.push({ label: "매입가 + 취득비용", value: input.price + input.acquisitionCost, tone: "sub" });
    steps.push({ label: "− 보증금 (무이자 레버리지)", value: input.deposit, tone: "minus" });
    steps.push({ label: "실투자금 (대출 포함)", value: invested, tone: "sub" });
    steps.push({ label: "− 대출", value: input.loan, tone: "minus" });
    steps.push({ label: "자기자본", value: equity, tone: "sub" });
    steps.push({ label: "연 월세 수입", value: annualRent });
    steps.push({ label: `공실 ${(input.vacancy * 100).toFixed(0)}% 반영 수입`, value: effectiveRent, depth: 1 });
    steps.push({ label: "− 연 경비", value: input.expenses, tone: "minus" });
    steps.push({ label: "순영업소득 (NOI)", value: noi, tone: "sub" });
    steps.push({ label: `− 대출이자 ${(input.loanRate * 100).toFixed(2)}%`, value: interest, tone: "minus" });
    steps.push({ label: "연 현금흐름 (세전)", value: cashflow, tone: "total" });
    steps.push({ label: "표면수익률 (연 월세 ÷ 실투자금)", value: `${(grossYield * 100).toFixed(2)}%` });
    steps.push({ label: "순수익률 (NOI ÷ 실투자금)", value: `${(netYield * 100).toFixed(2)}%` });
    steps.push({ label: "자기자본수익률 (현금흐름 ÷ 자기자본)", value: `${(equityYield * 100).toFixed(2)}%` });
    if (input.loan > 0 && netYield < input.loanRate)
        tips.push({ level: "must", title: "순수익률이 대출금리보다 낮습니다 — 역레버리지", body: `순수익률 ${(netYield * 100).toFixed(2)}% < 대출금리 ${(input.loanRate * 100).toFixed(2)}%. 대출을 늘릴수록 자기자본수익률이 떨어집니다. 시세차익 없이는 손실입니다.` });
    tips.push({ level: "watch", title: "세금은 아직 안 뺐습니다", body: "월세 수입은 임대소득세(2천만 이하 분리과세 14%)가, 보유 중엔 재산세·종부세가 붙습니다. 주택임대소득세 계산기로 이어서 보세요.", law: "소득세법 제64조의2" });
    tips.push({ level: "save", title: "보증금은 이자 없는 대출입니다", body: "보증금을 높이면 실투자금이 줄어 수익률이 올라 보이지만, 보증금 반환 위험과 간주임대료(3주택 이상)가 따라옵니다." });
    return { headline: [{ label: "순수익률 (연)", value: 0, displayValue: `${(netYield * 100).toFixed(2)}% · 표면 ${(grossYield * 100).toFixed(2)}%` }, { label: "연 현금흐름 (세전)", value: cashflow, higherIsWorse: false }, { label: "자기자본수익률", value: 0, displayValue: `${(equityYield * 100).toFixed(2)}%` }], steps, tips, grossYield, netYield, equityYield, equity, cashflow };
}
exports.EMPTY_COMPARE = { jeonse: 5 * won_1.억, wolseDeposit: 1 * won_1.억, monthly: 120 * won_1.만, loanRate: 0.04, loanShare: 0.6, depositRate: 0.03 };
function calcCompare(input) {
    const steps = [];
    const tips = [];
    const loan = Math.floor(input.jeonse * Math.min(1, Math.max(0, input.loanShare)));
    const own = input.jeonse - loan;
    const jInterest = Math.floor((loan * input.loanRate) / 12);
    const jOpp = Math.floor((own * input.depositRate) / 12);
    const jeonseMonthly = jInterest + jOpp;
    const wOpp = Math.floor((input.wolseDeposit * input.depositRate) / 12);
    const wolseMonthly = input.monthly + wOpp;
    steps.push({ label: "전세 — 대출이자 (월)", value: jInterest, note: `보증금 ${(0, won_1.formatWon)(input.jeonse)} 중 ${(input.loanShare * 100).toFixed(0)}% 대출, 금리 ${(input.loanRate * 100).toFixed(2)}%` });
    steps.push({ label: "전세 — 자기자금 기회비용 (월)", value: jOpp, note: `${(0, won_1.formatWon)(own)} × 예금금리 ${(input.depositRate * 100).toFixed(2)}% ÷ 12` });
    steps.push({ label: "전세 월비용", value: jeonseMonthly, tone: "sub" });
    steps.push({ label: "월세 — 월세", value: input.monthly });
    steps.push({ label: "월세 — 보증금 기회비용 (월)", value: wOpp });
    steps.push({ label: "월세 월비용", value: wolseMonthly, tone: "sub" });
    steps.push({ label: "차이 (월세 − 전세)", value: wolseMonthly - jeonseMonthly, tone: "total" });
    const breakEvenMonthly = jeonseMonthly - wOpp;
    tips.push({ level: "watch", title: breakEvenMonthly < 0 ? "월세가 0원이어도 전세의 월비용이 낮습니다" : breakEvenMonthly === 0 ? "월세가 0원일 때 두 월비용이 같습니다" : `월세가 ${(0, won_1.formatWon)(breakEvenMonthly)}보다 낮으면 월세가 유리합니다`, body: breakEvenMonthly < 0 ? "월세 보증금의 기회비용만으로 전세 월비용을 넘습니다. 0원 이상 월세에서는 손익분기점이 없습니다." : "같은 자기자금·대출 조건에서 두 월비용이 같아지는 월세입니다. 그보다 싸면 월세, 비싸면 전세." });
    tips.push({ level: "must", title: "전세는 보증금 반환 위험을 안습니다", body: "월비용이 싸 보여도 집값 대비 보증금이 70%를 넘으면 전세보증보험 가입 여부부터 확인하세요. 보험료(연 0.1%대)를 전세 월비용에 더해 다시 비교해야 공정합니다." });
    tips.push({ level: "save", title: "월세는 세액공제, 전세대출은 소득공제", body: "총급여 8천만 이하 무주택자는 월세의 15~17%(연 1천만 한도)를 세액공제 받고, 전세대출 원리금은 40% 소득공제(연 400만 한도)입니다. 둘 다 이 비교엔 안 넣었습니다.", law: "조세특례제한법 제95조의2 · 소득세법 제52조 제4항" });
    return { headline: [{ label: "월세 월비용", value: wolseMonthly, compareTo: jeonseMonthly, compareLabel: "전세", hint: "월세 + 보증금 기회비용" }, { label: "전세 월비용", value: jeonseMonthly, hint: "대출이자 + 자기자금 기회비용" }, { label: "손익분기 월세", value: breakEvenMonthly, displayValue: breakEvenMonthly < 0 ? "손익분기 없음" : undefined }], steps, tips, jeonseMonthly, wolseMonthly, breakEvenMonthly };
}
exports.EMPTY_INSURANCE = { deposit: 4 * won_1.억, homePrice: 6 * won_1.억, seniorDebt: 0, apartment: true, metro: true, feeRate: 0.00122, years: 2 };
/** HUG 전세보증금반환보증 — 담보인정비율 90% (2024.1.1~), 보증한도 수도권 7억·그 밖 5억 */
exports.LTV_LIMIT = 0.9;
function calcInsurance(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isFiniteNumber)(input.feeRate, 0, 1) || !(0, validation_1.isFiniteNumber)(input.years, 0, 100))
        return (0, validation_1.invalidCalculation)({ eligible: false, reasons: [], maxDeposit: 0, fee: 0 }, "보증금·주택가격·선순위 채권과 보증기간·요율을 확인해 주세요.");
    const steps = [];
    const tips = [];
    const reasons = [];
    const limit = input.metro ? 7 * won_1.억 : 5 * won_1.억;
    const collateralLimit = Math.max(0, Math.floor(input.homePrice * exports.LTV_LIMIT - input.seniorDebt));
    const maxDeposit = Math.min(limit, collateralLimit);
    steps.push({ label: "주택가격 × 담보인정비율 90%", value: Math.floor(input.homePrice * exports.LTV_LIMIT), law: "HUG 전세보증금반환보증 업무처리기준 (2024.1.1~)" });
    steps.push({ label: "− 선순위 채권 (근저당 등)", value: input.seniorDebt, tone: "minus" });
    steps.push({ label: "가입 가능한 보증금 상한", value: maxDeposit, tone: "sub" });
    if (input.deposit > collateralLimit)
        reasons.push(`보증금이 담보 상한 ${(0, won_1.formatWon)(collateralLimit)}을 넘습니다 (주택가격의 90% − 선순위)`);
    if (input.deposit > limit)
        reasons.push(`보증금이 ${input.metro ? "수도권" : "그 밖 지역"} 한도 ${(0, won_1.formatWon)(limit)}을 넘습니다`);
    const eligible = reasons.length === 0;
    const fee = (0, won_1.floorProduct)([input.deposit, input.feeRate, input.years]);
    steps.push({ label: "가입 가능 여부", value: eligible ? "가능" : reasons.join(" · ") });
    steps.push({ label: `보증료 (보증금 × ${(input.feeRate * 100).toFixed(3)}% × ${input.years}년)`, value: fee, tone: "total", note: "요율은 주택유형·부채비율에 따라 0.115~0.154% 사이. HUG 홈페이지의 현재 요율표로 확인" });
    if (!eligible)
        tips.push({ level: "must", title: "지금 조건으로는 가입이 안 됩니다", body: "보증금을 낮추거나 선순위 근저당을 말소하는 조건을 계약서 특약에 넣으세요. 가입 불가 매물은 반환 위험이 그만큼 큽니다." });
    tips.push({ level: "watch", title: "주택가격은 감정가가 아니라 HUG 기준입니다", body: "아파트는 KB·한국부동산원 시세, 그 밖은 공시가격의 140% 등 순서로 정합니다. 공시가격 기준이면 시세보다 낮게 잡혀 가입 한도가 줄어듭니다." });
    tips.push({ level: "save", title: "보증료는 임대인이 대신 낼 수도 있습니다", body: "등록임대주택은 임대인의 보증보험 가입이 의무이고(보증료 75% 임대인 부담), 일반 계약도 특약으로 임대인 부담을 정할 수 있습니다.", law: "민간임대주택에 관한 특별법 제49조" });
    return { headline: [{ label: eligible ? "가입 가능 — 보증료" : "가입 불가", value: fee, hint: eligible ? `${input.years}년 · 연 ${(input.feeRate * 100).toFixed(3)}%` : reasons[0] }, { label: "가입 가능 보증금 상한", value: maxDeposit }, { label: "보증 한도 (지역)", value: limit }], steps, tips, eligible, reasons, maxDeposit, fee };
}
exports.EMPTY_OVERDUE = { monthly: 100 * won_1.만, months: 2, days: 45, annualRate: 0.05 };
function calcOverdue(input) {
    const steps = [];
    const tips = [];
    const principal = input.monthly * input.months;
    // 각 회차가 순서대로 밀렸다고 보고 평균 지연일수를 쓴다
    const interest = Math.floor((principal * input.annualRate * input.days) / 365);
    const canTerminate = input.months >= 2;
    steps.push({ label: "연체 원금 (월세 × 개월)", value: principal, tone: "sub" });
    steps.push({ label: `지연이자 (연 ${(input.annualRate * 100).toFixed(1)}% × ${input.days}일 ÷ 365)`, value: interest, tone: "plus", law: input.annualRate === 0.05 ? "민법 제379조 (법정이율 5%)" : "약정이율 (민법 제397조)" });
    steps.push({ label: "합계", value: principal + interest, tone: "total" });
    steps.push({ label: "해지 가능 여부", value: canTerminate ? "가능 — 2기 차임액 연체" : "아직 — 2기 차임액 미달", law: "민법 제640조 · 주택임대차보호법 제6조의3 제1항 제1호" });
    tips.push({ level: "must", title: "「2기」는 두 달 연속이 아니라 누적 두 달치입니다", body: "밀린 금액의 합이 월세 2회분에 이르면 됩니다. 한 달 밀리고 한 달 내고를 반복해도 누적이 2회분이면 해지·갱신거절 사유입니다.", law: "민법 제640조" });
    tips.push({ level: "watch", title: "약정이율이 없으면 연 5%입니다", body: "계약서에 연체이율을 적지 않았으면 민사 법정이율 5%. 적었어도 이자제한법 상한(연 20%)을 넘는 부분은 무효입니다.", law: "이자제한법 제2조" });
    tips.push({ level: "save", title: "보증금에서 공제하려면 계약 종료 때", body: "연체 월세와 이자는 보증금 반환 시 상계할 수 있습니다. 계약 중간에 보증금에서 빼 쓰는 건 임대인이 일방적으로 할 수 없습니다." });
    return { headline: [{ label: "연체 원금 + 이자", value: principal + interest, hint: canTerminate ? "2기 연체 — 해지 사유" : undefined }, { label: "지연이자", value: interest }, { label: "연체 원금", value: principal }], steps, tips, principal, interest, canTerminate };
}
exports.EMPTY_NOC = { deposit: 5000 * won_1.만, monthly: 300 * won_1.만, maintenance: 80 * won_1.만, area: 165, exclusive: 82, rate: 0.06, rentFree: 0 };
function calcNoc(input) {
    const steps = [];
    const tips = [];
    const depositAsRent = Math.floor((input.deposit * input.rate) / 12);
    const freeAdj = input.rentFree > 0 ? Math.floor((input.monthly * input.rentFree) / 12) : 0;
    const effectiveMonthly = input.monthly - freeAdj;
    const noc = depositAsRent + effectiveMonthly + input.maintenance;
    const pyeong = input.area / 3.3058;
    const exPyeong = input.exclusive / 3.3058;
    const nocPerPyeong = pyeong > 0 ? noc / pyeong : 0;
    const nocPerExclusivePyeong = exPyeong > 0 ? noc / exPyeong : 0;
    steps.push({ label: `보증금 환산 월임대료 (보증금 × ${(input.rate * 100).toFixed(1)}% ÷ 12)`, value: depositAsRent });
    steps.push({ label: "월임대료", value: input.monthly });
    if (freeAdj > 0)
        steps.push({ label: `− 렌트프리 ${input.rentFree}개월 환산`, value: freeAdj, tone: "minus", depth: 1 });
    steps.push({ label: "월관리비", value: input.maintenance });
    steps.push({ label: "환산 월점유비용 (NOC)", value: noc, tone: "total" });
    steps.push({ label: `계약면적 ${pyeong.toFixed(1)}평 기준 평당`, value: Math.floor(nocPerPyeong) });
    steps.push({ label: `전용면적 ${exPyeong.toFixed(1)}평 기준 평당`, value: Math.floor(nocPerExclusivePyeong), note: `전용률 ${input.area > 0 ? ((input.exclusive / input.area) * 100).toFixed(0) : 0}%` });
    tips.push({ level: "watch", title: "비교는 전용면적 평당 NOC로", body: "계약면적 평당가는 전용률이 낮은 건물이 싸 보입니다. 실제 쓰는 면적당 비용으로 견줘야 오피스·상가 비교가 맞습니다." });
    tips.push({ level: "save", title: "렌트프리를 넣으면 실질 임대료가 보입니다", body: "표면 임대료는 같아도 렌트프리 2개월이면 실질은 17% 쌉니다. 계약서의 명목 임대료가 아니라 이 숫자로 협상하세요." });
    return { headline: [{ label: "환산 월점유비용 (NOC)", value: noc, hint: `전용 평당 ${(0, won_1.formatWon)(Math.floor(nocPerExclusivePyeong))}` }, { label: "계약 평당", value: Math.floor(nocPerPyeong) }, { label: "전용 평당", value: Math.floor(nocPerExclusivePyeong) }], steps, tips, noc, nocPerPyeong, nocPerExclusivePyeong, effectiveMonthly };
}
/* ═══════════════════════════ 간주임대료 ═══════════════════════════ */
exports.DEEMED_RATE = 0.031;
exports.DEEMED_DEDUCTION = 3 * won_1.억;
exports.DEEMED_RATIO = 0.6;
exports.EMPTY_DEEMED = { houses: 3, highValueHouses: 0, deposits: 8 * won_1.억, interestIncome: 0, rate: exports.DEEMED_RATE, days: 365 };
function calcDeemed(input) {
    const steps = [];
    const tips = [];
    let taxable = false;
    let reason = "";
    if (input.houses >= 3 && input.deposits > 3 * won_1.억) {
        taxable = true;
        reason = "3주택 이상 · 보증금 합계 3억원 초과";
    }
    else if (input.houses === 2 && input.highValueHouses >= 2 && input.deposits > 12 * won_1.억) {
        taxable = true;
        reason = "2주택(기준시가 12억 초과 주택) · 보증금 합계 12억원 초과";
    }
    else if (input.houses === 2 && input.highValueHouses < 2)
        reason = "2주택은 두 채 모두 기준시가 12억을 넘을 때만 셉니다";
    else if (input.houses >= 3)
        reason = "보증금 합계 3억원 이하";
    else if (input.houses === 2)
        reason = "보증금 합계 12억원 이하";
    else
        reason = "1주택은 대상이 아닙니다 (고가주택 월세만 과세)";
    steps.push({ label: "과세 대상 판정", value: taxable ? `대상 — ${reason}` : `대상 아님 — ${reason}`, law: "소득세법 제25조 제1항 · 시행령 제53조 제1항" });
    let deemed = 0;
    if (taxable) {
        const excess = Math.max(0, input.deposits - exports.DEEMED_DEDUCTION);
        const gross = Math.floor((excess * exports.DEEMED_RATIO * input.rate * input.days) / 365);
        deemed = Math.max(0, gross - input.interestIncome);
        steps.push({ label: "보증금 합계", value: input.deposits, tone: "sub" });
        steps.push({ label: "− 3억원", value: exports.DEEMED_DEDUCTION, tone: "minus", law: "소득세법 시행령 제53조 제3항 제1호" });
        steps.push({ label: "× 60%", value: Math.floor(excess * exports.DEEMED_RATIO) });
        steps.push({ label: `× 정기예금이자율 ${(input.rate * 100).toFixed(1)}% × ${input.days}/365`, value: gross, law: "소득세법 시행규칙 제23조 제1항 (2026년 3.1%)" });
        if (input.interestIncome > 0)
            steps.push({ label: "− 임대사업 이자·배당 수입", value: input.interestIncome, tone: "minus", note: "장부를 쓰는 경우만. 추계신고는 빼지 않는다" });
        steps.push({ label: "간주임대료 (총수입금액 산입)", value: deemed, tone: "total" });
    }
    tips.push({ level: "watch", title: "40㎡ 이하 · 기준시가 2억 이하 소형주택은 2026년까지 주택 수에서 뺍니다", body: "그 주택의 보증금도 합계에서 빠집니다. 2027년부터는 이 특례가 없어질 수 있으니 세제개편안을 확인하세요.", law: "소득세법 제25조 제1항 단서" });
    if (taxable)
        tips.push({ level: "must", title: "간주임대료는 월세와 합쳐 임대소득세로 갑니다", body: `이 ${(0, won_1.formatWon)(deemed)}에 월세 수입을 더한 총수입이 2천만 이하면 분리과세 14%를 고를 수 있습니다. 주택임대소득세 계산기로 이어서 보세요.`, law: "소득세법 제64조의2" });
    tips.push({ level: "save", title: "보증금이 가장 큰 집부터 3억을 뺍니다", body: "3억 공제는 보증금 적수가 가장 큰 주택부터 차례로 적용됩니다. 주택별 보증금 배분을 바꿔도 합계가 같으면 결과는 같습니다." });
    return { headline: [{ label: taxable ? "간주임대료 (연)" : "간주임대료 없음", value: deemed, hint: reason }, { label: "보증금 합계", value: input.deposits }, { label: "정기예금이자율", value: 0, displayValue: `${(input.rate * 100).toFixed(1)}%` }], steps, tips, taxable, reason, deemed };
}
/* ═══════════════════════════ 주택임대소득세 ═══════════════════════════ */
exports.SEPARATE_LIMIT = 2000 * won_1.만;
exports.EMPTY_RENTAL_TAX = { rent: 1800 * won_1.만, deemed: 0, registered: false, otherIncome: 5000 * won_1.만, actualExpenses: 0 };
function calcRentalTax(input) {
    const steps = [];
    const tips = [];
    const revenue = Math.max(0, input.rent) + Math.max(0, input.deemed);
    const canSeparate = revenue <= exports.SEPARATE_LIMIT;
    const expRate = input.registered ? 0.6 : 0.5;
    const basic = input.otherIncome <= 2000 * won_1.만 ? (input.registered ? 400 * won_1.만 : 200 * won_1.만) : 0;
    steps.push({ label: "총수입금액 (월세 + 간주임대료)", value: revenue, tone: "sub", law: "소득세법 제24조 · 제25조" });
    /* 분리과세 */
    let separateTax = 0;
    if (canSeparate) {
        const income = Math.max(0, revenue - Math.floor(revenue * expRate) - basic);
        const tax = (0, won_1.truncate10)(income * 0.14);
        const local = (0, won_1.truncate10)(tax * 0.1);
        separateTax = tax + local;
        steps.push({ label: `분리과세 — 필요경비 ${(expRate * 100).toFixed(0)}%`, value: Math.floor(revenue * expRate), tone: "minus", law: "소득세법 제64조의2 제2항", note: input.registered ? "등록임대주택 60%" : "미등록 50%" });
        steps.push({ label: `분리과세 — 기본공제`, value: basic, tone: "minus", depth: 1, note: basic > 0 ? "다른 종합소득 2천만 이하" : "다른 종합소득이 2천만을 넘어 공제 없음" });
        steps.push({ label: "분리과세 — 사업소득금액", value: income, tone: "sub", depth: 1 });
        steps.push({ label: "분리과세 — 세액 14% + 지방소득세 10%", value: separateTax, tone: "sub", law: "소득세법 제64조의2 제1항 제2호" });
    }
    else {
        steps.push({ label: "분리과세 선택 불가", value: "총수입 2천만원 초과 — 종합과세만", law: "소득세법 제14조 제3항 제7호" });
    }
    /* 종합과세 — 다른 소득에 합산했을 때의 증분 */
    const expenses = input.actualExpenses > 0 ? input.actualExpenses : Math.floor(revenue * expRate);
    const rentalIncome = Math.max(0, revenue - expenses);
    const withTax = (0, property_1.applyStatute)(input.otherIncome + rentalIncome, bands_1.INCOME_BANDS).tax;
    const withoutTax = (0, property_1.applyStatute)(input.otherIncome, bands_1.INCOME_BANDS).tax;
    const delta = (0, won_1.truncate10)(withTax - withoutTax);
    const combinedTax = delta + (0, won_1.truncate10)(delta * 0.1);
    steps.push({ label: `종합과세 — 필요경비${input.actualExpenses > 0 ? " (장부)" : ` (경비율 ${(expRate * 100).toFixed(0)}% 가정)`}`, value: expenses, tone: "minus" });
    steps.push({ label: "종합과세 — 임대소득금액", value: rentalIncome, tone: "sub", depth: 1 });
    steps.push({ label: `종합과세 — 다른 소득 ${(0, won_1.formatWon)(input.otherIncome)}에 합산한 세액 증분 + 지방소득세`, value: combinedTax, tone: "sub", law: "소득세법 제55조", note: "소득공제·세액공제는 반영하지 않은 증분" });
    const better = canSeparate && separateTax <= combinedTax ? "separate" : "combined";
    const total = better === "separate" ? separateTax : combinedTax;
    steps.push({ label: better === "separate" ? "선택: 분리과세" : canSeparate ? "선택: 종합과세 (더 낮음)" : "종합과세", value: total, tone: "total" });
    if (canSeparate)
        tips.push({ level: "save", title: better === "separate" ? `분리과세가 ${(0, won_1.formatWon)(combinedTax - separateTax)} 유리합니다` : `종합과세가 ${(0, won_1.formatWon)(separateTax - combinedTax)} 유리합니다`, body: "총수입 2천만 이하는 해마다 둘 중 하나를 고를 수 있습니다. 다른 소득이 적은 해에는 종합과세가 낮을 수 있으니 매년 다시 비교하세요.", law: "소득세법 제64조의2 제1항" });
    if (!input.registered)
        tips.push({ level: "watch", title: "등록임대주택이면 경비율 60% · 공제 400만", body: "10년 이상 임대 조건입니다. 지키지 못하면 차액을 추징합니다. 5% 임대료 상한도 같이 붙습니다.", law: "소득세법 제64조의2 제3항" });
    tips.push({ level: "must", title: "1주택자도 기준시가 12억 초과 주택의 월세는 과세됩니다", body: "1주택 월세는 원칙 비과세지만 고가주택(기준시가 12억 초과)과 국외주택은 과세입니다. 2주택부터는 월세 전부, 3주택부터는 보증금(간주임대료)까지입니다.", law: "소득세법 제12조 제2호 나목" });
    tips.push({ level: "watch", title: "건강보험료가 따라옵니다", body: "피부양자였다면 임대소득이 생기는 순간(사업자등록 시 1원, 미등록 400만 초과) 지역가입자로 바뀝니다. 세금보다 보험료가 클 수 있습니다." });
    return { headline: [{ label: better === "separate" ? "주택임대소득세 (분리과세)" : "주택임대소득세 (종합과세 증분)", value: total, hint: `총수입 ${(0, won_1.formatWon)(revenue)} · 지방소득세 포함` }, { label: "분리과세", value: canSeparate ? separateTax : 0, hint: canSeparate ? undefined : "2천만 초과 — 불가" }, { label: "종합과세 증분", value: combinedTax }], steps, tips, revenue, canSeparate, separateTax, combinedTax, better, total };
}
exports.EMPTY_EVICTION = { area: 84, laborPerPyeong: 120_000, bailiffFee: 200_000, transport: 500_000, storageMonthly: 300_000, storageMonths: 3, litigation: 1_500_000, delayMonths: 6, monthly: 100 * won_1.만 };
function calcEviction(input) {
    const steps = [];
    const tips = [];
    const pyeong = input.area / 3.3058;
    const labor = Math.floor(pyeong * input.laborPerPyeong);
    const execution = labor + input.bailiffFee + input.transport;
    const storage = input.storageMonthly * input.storageMonths;
    const lostRent = input.monthly * input.delayMonths;
    const total = input.litigation + execution + storage + lostRent;
    steps.push({ label: "소송비용 (인지·송달료·변호사)", value: input.litigation, note: "명도소송 6개월 안팎. 인지대는 소가 기준" });
    steps.push({ label: `강제집행 노무비 (${pyeong.toFixed(1)}평 × ${(0, won_1.formatWon)(input.laborPerPyeong)})`, value: labor, note: "집행관 사무소가 짐 양·층수·엘리베이터 유무로 인원을 정한다. 실무 단가 평당 10~15만원" });
    steps.push({ label: "집행관 수수료·여비", value: input.bailiffFee, law: "집행관수수료규칙", depth: 1 });
    steps.push({ label: "사다리차·운반", value: input.transport, depth: 1 });
    steps.push({ label: "집행비용 소계", value: execution, tone: "sub" });
    steps.push({ label: `유체동산 보관료 (${input.storageMonths}개월)`, value: storage, note: "짐을 안 찾아가면 창고 보관 후 경매 처분" });
    steps.push({ label: `명도 지연 기간 못 받는 월세 (${input.delayMonths}개월)`, value: lostRent, note: "소 제기부터 집행까지" });
    steps.push({ label: "명도 총비용 (직접비 + 기회비용)", value: total, tone: "total" });
    tips.push({ level: "save", title: "집행비용은 임차인에게 청구할 수 있지만 회수는 별개입니다", body: "집행비용·소송비용은 채무자 부담이 원칙이나, 보증금이 이미 연체 월세로 소진됐으면 받을 곳이 없습니다. 보증금에서 먼저 공제하세요.", law: "민사집행법 제53조" });
    tips.push({ level: "must", title: "제소전화해 조서가 있으면 소송을 건너뜁니다", body: "계약 때 제소전화해를 받아두면 연체 즉시 집행문을 받아 강제집행할 수 있습니다. 비용 30~50만원으로 6개월과 소송비를 아낍니다.", law: "민사소송법 제385조" });
    tips.push({ level: "watch", title: "짐을 임의로 치우면 형사 문제가 됩니다", body: "연체 중이라도 임대인이 문을 따고 짐을 옮기면 주거침입·재물손괴입니다. 반드시 집행관을 통해야 합니다." });
    return { headline: [{ label: "명도 총비용", value: total, hint: `직접비 ${(0, won_1.formatWon)(input.litigation + execution + storage)} + 못 받는 월세 ${(0, won_1.formatWon)(lostRent)}` }, { label: "집행비용", value: execution }, { label: "소송비용", value: input.litigation }], steps, tips, execution, storage, lostRent, total };
}
