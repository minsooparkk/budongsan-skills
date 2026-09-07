"use strict";
/**
 * DSR·LTV·금융 — 대출 규제와 이자 계산.
 *
 * 규제 숫자(DSR 40%, 스트레스 금리, LTV)는 법률이 아니라 금융위원회 행정지도·은행업감독규정이며
 * 수시로 바뀐다. 전부 입력값으로 두고 기본값에 확인일을 적는다(2026-09-03). 방공제(소액임차보증금)
 * 는 주택임대차보호법 시행령 제10조(2026-09-03 법제처 대조) 금액이다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_SAVINGS = exports.EMPTY_AUCTION_LOAN = exports.EMPTY_PREPAY = exports.EMPTY_REFINANCE = exports.EMPTY_LOAN_INTEREST = exports.EMPTY_FUTURE = exports.EMPTY_IMPUTED = exports.IMPUTED_RATES = exports.EMPTY_LOAN_LIMIT = exports.EMPTY_LTV = exports.ROOM_DEDUCTION = exports.REGION_LABEL = exports.REGIONS = exports.EMPTY_RTI = exports.EMPTY_DTI = exports.EMPTY_DSR = exports.REPAY_LABEL = void 0;
exports.annuityPayment = annuityPayment;
exports.schedule = schedule;
exports.annualDebtService = annualDebtService;
exports.calcDsr = calcDsr;
exports.calcDti = calcDti;
exports.calcRti = calcRti;
exports.calcLtv = calcLtv;
exports.calcLoanLimit = calcLoanLimit;
exports.calcImputedIncome = calcImputedIncome;
exports.calcFutureIncome = calcFutureIncome;
exports.calcLoanInterest = calcLoanInterest;
exports.calcRefinance = calcRefinance;
exports.calcPrepay = calcPrepay;
exports.calcAuctionLoan = calcAuctionLoan;
exports.calcSavings = calcSavings;
const validation_1 = require("./validation");
const won_1 = require("./won");
exports.REPAY_LABEL = { annuity: "원리금균등", principal: "원금균등", bullet: "만기일시" };
/** 월 상환액 — 원리금균등 */
function annuityPayment(principal, annualRate, months) {
    if (!(0, validation_1.isFiniteNumber)(principal) || !(0, validation_1.isFiniteNumber)(annualRate, 0, 10) || !(0, validation_1.isIntegerInRange)(months, 1, 1200))
        return 0;
    const r = annualRate / 12;
    if (r === 0)
        return principal / months;
    return (principal * r) / -Math.expm1(-months * Math.log1p(r));
}
/** 연도별 상환표 + 총이자. 거치기간 동안은 이자만 */
function schedule(principal, annualRate, months, repay, graceMonths = 0) {
    if (!(0, validation_1.isFiniteNumber)(principal) || !(0, validation_1.isFiniteNumber)(annualRate, 0, 10) || !(0, validation_1.isIntegerInRange)(months, 1, 1200) || !(0, validation_1.isIntegerInRange)(graceMonths, 0, months - (repay === "bullet" ? 0 : 1)) || !(0, validation_1.isOneOf)(repay, Object.keys(exports.REPAY_LABEL)))
        return { rows: [], totalInterest: 0, firstMonthly: 0, maxMonthly: 0 };
    const r = annualRate / 12;
    let balance = principal;
    let totalInterest = 0;
    const rows = [];
    let firstMonthly = 0;
    let maxMonthly = 0;
    const amortMonths = Math.max(1, months - graceMonths);
    const annuity = annuityPayment(principal, annualRate, amortMonths);
    for (let m = 1; m <= months; m++) {
        const interest = balance * r;
        let pay = 0;
        if (m === months)
            pay = balance;
        else if (m <= graceMonths)
            pay = 0;
        else if (repay === "annuity")
            pay = annuity - interest;
        else if (repay === "principal")
            pay = principal / amortMonths;
        else
            pay = m === months ? balance : 0;
        pay = Math.max(0, Math.min(pay, balance));
        balance -= pay;
        totalInterest += interest;
        const monthly = pay + interest;
        if (m === 1)
            firstMonthly = monthly;
        if (monthly > maxMonthly && !(repay === "bullet" && m === months))
            maxMonthly = monthly;
        const y = Math.ceil(m / 12);
        if (!rows[y - 1])
            rows[y - 1] = { year: y, principal: 0, interest: 0, balance: 0 };
        rows[y - 1].principal += pay;
        rows[y - 1].interest += interest;
        rows[y - 1].balance = balance;
    }
    return { rows, totalInterest: Math.floor(totalInterest), firstMonthly: Math.floor(firstMonthly), maxMonthly: Math.floor(maxMonthly) };
}
/** 연 원리금 — DSR 계산용. 만기일시는 이자 + 원금/만기(년) 로 본다(금융위 산정방식 근사) */
function annualDebtService(principal, annualRate, months, repay) {
    if (principal <= 0)
        return 0;
    if (repay === "annuity")
        return annuityPayment(principal, annualRate, months) * 12;
    if (repay === "principal")
        return (principal / months) * 12 + principal * annualRate;
    return principal * annualRate + principal / Math.max(1, months / 12);
}
exports.EMPTY_DSR = { income: 7000 * won_1.만, existing: 300 * won_1.만, amount: 4 * won_1.억, rate: 0.042, years: 30, repay: "annuity", stress: 0.015, limit: 0.4 };
function calcDsr(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isFiniteNumber)(input.income, 1) || !(0, validation_1.isFiniteNumber)(input.rate + input.stress, 0, 10) || (0, validation_1.loanMonths)(input.years) === null || !(0, validation_1.isOneOf)(input.repay, Object.keys(exports.REPAY_LABEL)))
        return (0, validation_1.invalidCalculation)({ newService: 0, dsr: 0, ok: false, maxAmount: 0 }, "연소득은 0보다 커야 합니다. 상환 방식·만기(1~1,200개월)와 스트레스 가산 후 금리(0~1,000%)를 확인해 주세요.");
    const steps = [];
    const tips = [];
    const months = input.years * 12;
    const stressRate = input.rate + input.stress;
    const newService = Math.floor(annualDebtService(input.amount, stressRate, months, input.repay));
    const total = input.existing + newService;
    const dsr = input.income > 0 ? total / input.income : Infinity;
    const ok = dsr <= input.limit;
    // 한도 역산: 허용 연 원리금 → 원금
    const room = Math.max(0, input.income * input.limit - input.existing);
    const unit = annualDebtService(1 * won_1.억, stressRate, months, input.repay);
    const maxAmount = unit > 0 ? Math.floor((room / unit) * 1 * won_1.억 / won_1.만) * won_1.만 : 0;
    steps.push({ label: "연소득", value: input.income, tone: "sub" });
    steps.push({ label: "기존 대출 연 원리금", value: input.existing });
    steps.push({ label: `신규 대출 연 원리금 (${exports.REPAY_LABEL[input.repay]}, 금리 ${(input.rate * 100).toFixed(2)}% + 스트레스 ${(input.stress * 100).toFixed(2)}%p, ${input.years}년)`, value: newService, tone: "plus", note: "스트레스 DSR — 한도 산정 때만 가산금리를 얹어 상환액을 계산한다. 실제 이자는 약정금리" });
    steps.push({ label: "연 원리금 합계", value: total, tone: "sub" });
    steps.push({ label: `빚 갚을 능력 비율(DSR) = 연 원리금 합계 ÷ 연소득`, value: `${(dsr * 100).toFixed(1)}% (한도 ${(input.limit * 100).toFixed(0)}%)`, tone: "total" });
    steps.push({ label: "한도 안에서 빌릴 수 있는 최대 금액", value: maxAmount, law: "은행업감독규정 · 금융위 스트레스 DSR (2025.7~ 3단계)" });
    if (!ok)
        tips.push({ level: "must", title: `DSR ${(dsr * 100).toFixed(1)}% — 한도 ${(input.limit * 100).toFixed(0)}%를 넘습니다`, body: `${(0, won_1.formatWon)(maxAmount)}까지가 가능합니다. 만기를 늘리거나(40년 이하), 기존 신용대출을 갚거나, 소득 인정(부부 합산·추정소득)을 더하면 늘어납니다.` });
    tips.push({ level: "watch", title: "신용대출은 만기 5년으로 계산됩니다", body: "실제 만기가 1년이어도 DSR 산정에서는 5년 분할상환으로 봅니다. 마이너스통장은 한도 전액이 대출로 잡힙니다.", law: "은행업감독업무시행세칙 [별표 18]" });
    tips.push({ level: "save", title: "전세대출·중도금·집단대출은 DSR에 안 들어갑니다(원칙)", body: "다만 2024년부터 주담대가 있는 사람의 전세대출 이자는 DSR에 포함됩니다. 은행마다 적용이 달라 창구 확인이 필요합니다." });
    return { headline: [{ label: "DSR", value: 0, displayValue: `${(dsr * 100).toFixed(1)}% ${ok ? "— 가능" : "— 한도 초과"}` }, { label: "최대 대출 가능액", value: maxAmount }, { label: "신규 연 원리금", value: newService }], steps, tips, newService, dsr, ok, maxAmount };
}
exports.EMPTY_DTI = { income: 7000 * won_1.만, amount: 4 * won_1.억, rate: 0.042, years: 30, existingMortgage: 0, otherInterest: 100 * won_1.만, limit: 0.4 };
function calcDti(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isFiniteNumber)(input.income, 1) || !(0, validation_1.isFiniteNumber)(input.rate, 0, 10) || (0, validation_1.loanMonths)(input.years) === null)
        return (0, validation_1.invalidCalculation)({ dti: 0, ok: false, maxAmount: 0 }, "연소득은 0보다 커야 합니다. 만기(1~1,200개월 정수)와 금리(0~1,000%)를 확인해 주세요.");
    const steps = [];
    const tips = [];
    const service = Math.floor(annuityPayment(input.amount, input.rate, input.years * 12) * 12);
    const total = service + input.existingMortgage + input.otherInterest;
    const dti = input.income > 0 ? total / input.income : Infinity;
    const ok = dti <= input.limit;
    const room = Math.max(0, input.income * input.limit - input.existingMortgage - input.otherInterest);
    const maxAmount = Math.floor((room / (annuityPayment(1 * won_1.억, input.rate, input.years * 12) * 12)) * 1 * won_1.억 / won_1.만) * won_1.만;
    steps.push({ label: "연소득", value: input.income, tone: "sub" });
    steps.push({ label: "신규 주담대 연 원리금", value: service, tone: "plus" });
    steps.push({ label: "기존 주담대 연 원리금 (신DTI)", value: input.existingMortgage, tone: "plus" });
    steps.push({ label: "기타 대출 연 이자", value: input.otherInterest, tone: "plus" });
    steps.push({ label: "DTI = 합계 ÷ 연소득", value: `${(dti * 100).toFixed(1)}% (한도 ${(input.limit * 100).toFixed(0)}%)`, tone: "total" });
    steps.push({ label: "한도 안 최대 대출", value: maxAmount });
    tips.push({ level: "watch", title: "DTI는 주담대만 원리금, 나머지는 이자만 봅니다", body: "DSR은 모든 대출의 원리금을 보므로 대개 DSR이 더 빡빡합니다. 둘 다 통과해야 합니다." });
    if (!ok)
        tips.push({ level: "must", title: "DTI 한도 초과", body: `${(0, won_1.formatWon)(maxAmount)}까지 가능합니다. 규제지역은 40%, 그 밖은 60%가 보통이며 은행이 정합니다.` });
    return { headline: [{ label: "DTI", value: 0, displayValue: `${(dti * 100).toFixed(1)}% ${ok ? "— 가능" : "— 초과"}` }, { label: "최대 대출 가능액", value: maxAmount }, { label: "신규 연 원리금", value: service }], steps, tips, dti, ok, maxAmount };
}
exports.EMPTY_RTI = { rent: 3600 * won_1.만, amount: 5 * won_1.억, rate: 0.05, existingInterest: 0, isHousing: false };
function calcRti(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isFiniteNumber)(input.rate, Number.MIN_VALUE, 10) || Math.floor(input.amount * input.rate) + input.existingInterest <= 0)
        return (0, validation_1.invalidCalculation)({ rti: 0, required: input.isHousing ? 1.25 : 1.5, ok: false, maxAmount: 0 }, "금리와 연 이자비용이 0보다 커야 RTI 및 대출 한도를 계산할 수 있습니다.");
    const steps = [];
    const tips = [];
    const required = input.isHousing ? 1.25 : 1.5;
    const interest = Math.floor(input.amount * input.rate) + input.existingInterest;
    const rti = interest > 0 ? input.rent / interest : Infinity;
    const ok = rti >= required;
    const maxInterest = input.rent / required - input.existingInterest;
    const maxAmount = input.rate > 0 ? Math.max(0, Math.floor(maxInterest / input.rate / won_1.만) * won_1.만) : 0;
    steps.push({ label: "연 임대소득", value: input.rent, tone: "sub" });
    steps.push({ label: `신규 대출 연 이자 (${(input.rate * 100).toFixed(2)}%)`, value: Math.floor(input.amount * input.rate) });
    steps.push({ label: "기존 담보 대출 연 이자", value: input.existingInterest });
    steps.push({ label: `RTI = 임대소득 ÷ 이자비용 (기준 ${required}배)`, value: `${rti.toFixed(2)}배`, tone: "total" });
    steps.push({ label: "기준 안 최대 대출", value: maxAmount });
    if (!ok)
        tips.push({ level: "must", title: `RTI ${rti.toFixed(2)} — 기준 ${required} 미달`, body: `${(0, won_1.formatWon)(maxAmount)}까지 가능합니다. 임대소득 증빙(임대차계약서·세금신고)을 늘리거나 금리를 낮추면 올라갑니다.` });
    tips.push({ level: "watch", title: "임대소득은 증빙 기준입니다", body: "임대차계약서 월세와 간주임대료(전세보증금 환산)를 합칩니다. 신고하지 않은 월세는 인정되지 않습니다.", law: "은행업감독규정 제29조의2" });
    return { headline: [{ label: "RTI", value: 0, displayValue: `${rti.toFixed(2)}배 ${ok ? "— 가능" : "— 미달"} (기준 ${required})` }, { label: "최대 대출 가능액", value: maxAmount }, { label: "연 이자비용", value: interest }], steps, tips, rti, required, ok, maxAmount };
}
/* ═══════════ LTV · 대출가능액 ═══════════ */
exports.REGIONS = ["seoul", "metro-over", "metro-city", "other"];
exports.REGION_LABEL = { seoul: "서울", "metro-over": "과밀억제권역·세종·용인·화성·김포", "metro-city": "광역시·안산·광주·파주·이천·평택", other: "그 밖의 지역" };
/** 소액임차보증금 중 최우선변제액 (방공제) — 주택임대차보호법 시행령 제10조 제1항 */
exports.ROOM_DEDUCTION = { seoul: 5500 * won_1.만, "metro-over": 4800 * won_1.만, "metro-city": 2800 * won_1.만, other: 2500 * won_1.만 };
exports.EMPTY_LTV = { price: 10 * won_1.억, ltv: 0.7, senior: 0, region: "seoul", rooms: 1, mci: true, cap: 6 * won_1.억 };
function calcLtv(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isOneOf)(input.region, Object.keys(exports.REGION_LABEL)) || !(0, validation_1.isIntegerInRange)(input.rooms, 1, 10000))
        return (0, validation_1.invalidCalculation)({ byLtv: 0, deduction: 0, amount: 0 }, "담보 금액, 적용 지역과 방 수(1~10,000실 정수)를 확인해 주세요.");
    const steps = [];
    const tips = [];
    const byLtv = Math.floor(input.price * input.ltv);
    const deduction = input.mci ? 0 : exports.ROOM_DEDUCTION[input.region] * Math.max(1, input.rooms);
    let amount = Math.max(0, byLtv - input.senior - deduction);
    const capped = input.cap > 0 && amount > input.cap;
    if (capped)
        amount = input.cap;
    steps.push({ label: "담보가치 (KB시세·감정가)", value: input.price, tone: "sub" });
    steps.push({ label: `× LTV ${(input.ltv * 100).toFixed(0)}%`, value: byLtv, tone: "sub", law: "은행업감독규정 [별표 6]" });
    steps.push({ label: "− 선순위 채권", value: input.senior, tone: "minus" });
    steps.push({ label: input.mci ? "− 방공제 (MCI·MCG 가입으로 면제)" : `− 방공제 ${exports.REGION_LABEL[input.region]} ${(0, won_1.formatWon)(exports.ROOM_DEDUCTION[input.region])} × ${input.rooms}실`, value: deduction, tone: "minus", law: "주택임대차보호법 시행령 제10조 제1항" });
    if (capped)
        steps.push({ label: `규제지역 대출 한도 ${(0, won_1.formatWon)(input.cap)} 적용`, value: input.cap, tone: "sub" });
    steps.push({ label: "담보 기준 대출 가능액", value: amount, tone: "total" });
    tips.push({ level: "watch", title: "LTV는 지역·주택 수·목적에 따라 40~80%입니다", body: "규제지역 무주택 40~70%, 비규제 70%, 생애최초 최대 80%(수도권 70%). 2025.6.27 대책으로 수도권·규제지역 주담대는 6억원 한도가 붙었습니다. 은행 창구 기준으로 다시 확인하세요." });
    tips.push({ level: "save", title: "MCI·MCG에 가입하면 방공제가 사라집니다", body: "모기지신용보험(MCI, 보험료 은행 부담)이나 보증(MCG, 본인 부담)을 붙이면 소액임차보증금을 빼지 않아 한도가 늘어납니다." });
    tips.push({ level: "must", title: "담보 한도와 DSR 한도 중 작은 쪽이 실제 한도입니다", body: "여기 숫자는 담보만 본 것입니다. DSR 계산기의 최대 대출액과 비교해 작은 값이 빌릴 수 있는 돈입니다." });
    return { headline: [{ label: "담보 기준 대출 가능액", value: amount, hint: `LTV ${(input.ltv * 100).toFixed(0)}%` }, { label: "LTV 적용액", value: byLtv }, { label: "방공제", value: deduction }], steps, tips, byLtv, deduction, amount };
}
exports.EMPTY_LOAN_LIMIT = { ...exports.EMPTY_LTV, income: 8000 * won_1.만, existing: 0, rate: 0.042, years: 30, stress: 0.015, dsrLimit: 0.4 };
function calcLoanLimit(input) {
    const l = calcLtv(input);
    const d = calcDsr({ income: input.income, existing: input.existing, amount: 0, rate: input.rate, years: input.years, repay: "annuity", stress: input.stress, limit: input.dsrLimit });
    if (l.validationError || d.validationError)
        return (0, validation_1.invalidCalculation)({ byCollateral: 0, byIncome: 0, amount: 0, binding: "소득" }, l.validationError || d.validationError);
    const amount = Math.min(l.amount, d.maxAmount);
    const binding = l.amount <= d.maxAmount ? "담보" : "소득";
    const steps = [...l.steps, { label: `소득 기준 (DSR ${(input.dsrLimit * 100).toFixed(0)}%, 스트레스 ${(input.stress * 100).toFixed(2)}%p) 최대 대출`, value: d.maxAmount, tone: "sub" }, { label: `대출가능액 — ${binding}이 한도를 정한다`, value: amount, tone: "total" }];
    const tips = [...l.tips.slice(0, 2), { level: "watch", title: `${binding} 한도가 걸렸습니다`, body: binding === "담보" ? "소득 여유가 있으니 담보가 더 큰 집이면 더 빌릴 수 있습니다." : `담보 여유 ${(0, won_1.formatWon)(l.amount - amount)}가 남습니다. 만기 연장·부부 합산·기존 대출 상환으로 소득 한도를 늘리세요.` }];
    return { headline: [{ label: "대출가능액", value: amount, hint: `${binding} 한도` }, { label: "담보 기준", value: l.amount }, { label: "소득 기준", value: d.maxAmount }], steps, tips, byCollateral: l.amount, byIncome: d.maxAmount, amount, binding };
}
/** Official 2026 workplace-insurance baseline, verified 2026-09-07. */
exports.IMPUTED_RATES = {
    year: 2026, healthTotal: 0.0719, healthEmployee: 0.03595, pensionTotal: 0.095, pensionEmployee: 0.0475,
    healthSource: "https://edi.nhis.or.kr/portal/images/popup/20251204_pop01longdesc.html",
    pensionSource: "https://www.nps.or.kr/eng/ntnlpnsplan/cntb/getOHAI0013M0.do",
};
exports.EMPTY_IMPUTED = { method: "health", cardSpend: 3000 * won_1.만, healthMonthly: 150_000, pensionMonthly: 200_000, healthRate: exports.IMPUTED_RATES.healthEmployee, pensionRate: exports.IMPUTED_RATES.pensionEmployee, recognition: 0.95, capAmount: 5000 * won_1.만 };
function calcImputedIncome(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isOneOf)(input.method, ["health", "pension", "card"]) || (input.method === "health" && input.healthRate <= 0) || (input.method === "pension" && input.pensionRate <= 0))
        return (0, validation_1.invalidCalculation)({ raw: 0, income: 0 }, "소득 역산에 사용할 방식과 0보다 큰 본인부담 요율을 입력해 주세요.");
    const steps = [];
    const tips = [];
    let raw = 0;
    if (input.method === "health") {
        raw = Math.floor((input.healthMonthly / input.healthRate) * 12);
        steps.push({ label: `건강보험료 ${(0, won_1.formatWon)(input.healthMonthly)} ÷ 본인부담 요율 ${(input.healthRate * 100).toFixed(3)}% × 12`, value: raw, note: `직장가입자 보수월액 역산. ${exports.IMPUTED_RATES.year}년 기본 요율 ${(exports.IMPUTED_RATES.healthTotal * 100).toFixed(2)}%의 절반(본인 ${(exports.IMPUTED_RATES.healthEmployee * 100).toFixed(3)}%). 입력 요율을 적용한다` });
    }
    else if (input.method === "pension") {
        raw = Math.floor((input.pensionMonthly / input.pensionRate) * 12);
        steps.push({ label: `국민연금 ${(0, won_1.formatWon)(input.pensionMonthly)} ÷ 본인부담 ${(input.pensionRate * 100).toFixed(2)}% × 12`, value: raw, note: `${exports.IMPUTED_RATES.year}년 기본 요율 ${(exports.IMPUTED_RATES.pensionTotal * 100).toFixed(1)}%의 절반(본인 ${(exports.IMPUTED_RATES.pensionEmployee * 100).toFixed(2)}%). 기준소득월액 상한에 걸리면 실제 소득보다 낮게 나온다` });
    }
    else {
        raw = input.cardSpend;
        steps.push({ label: "연 신용카드 사용액 (신고소득 대용)", value: raw, note: "카드 사용액을 소득으로 보는 은행 자체 기준. 사용액의 일부만 인정하는 곳도 있다" });
    }
    const income = Math.min(input.capAmount, Math.floor(raw * input.recognition));
    steps.push({ label: `× 인정 비율 ${(input.recognition * 100).toFixed(0)}%`, value: Math.floor(raw * input.recognition) });
    steps.push({ label: `인정소득 (상한 ${(0, won_1.formatWon)(input.capAmount)})`, value: income, tone: "total", law: "은행업감독업무시행세칙 [별표 18] 소득 산정" });
    tips.push({ level: "watch", title: "증빙소득이 있으면 그게 우선입니다", body: "원천징수영수증·소득금액증명이 있으면 추정소득은 쓰지 않습니다. 추정·인정소득은 증빙이 없는 프리랜서·주부·신입에게 쓰는 보조 수단입니다." });
    tips.push({ level: "save", title: "여러 방식 중 유리한 것을 고를 수 있습니다", body: "은행에 따라 건보료·국민연금·카드사용액 중 높은 값을 인정하기도 합니다. 세 방식을 다 계산해 보세요." });
    return { headline: [{ label: "인정소득 (연)", value: income }, { label: "역산 소득", value: raw }, { label: "상한", value: input.capAmount }], steps, tips, raw, income };
}
exports.EMPTY_FUTURE = { income: 4000 * won_1.만, age: 28, years: 30, rate20: 0.516, rate25: 0.314, rate30: 0.131 };
function calcFutureIncome(input) {
    const steps = [];
    const tips = [];
    let rate = 0;
    if (input.age >= 20 && input.age <= 24)
        rate = input.rate20;
    else if (input.age >= 25 && input.age <= 29)
        rate = input.rate25;
    else if (input.age >= 30 && input.age <= 34)
        rate = input.rate30;
    const eligible = rate > 0 && input.years >= 10;
    const income = eligible ? Math.floor(input.income * (1 + rate)) : input.income;
    steps.push({ label: "현재 연소득", value: input.income, tone: "sub" });
    steps.push({ label: `만 ${input.age}세 · 대출 만기 ${input.years}년`, value: eligible ? `장래소득 반영 대상 (증가율 ${(rate * 100).toFixed(1)}%)` : "대상 아님 (만 20~34세, 만기 10년 이상 분할상환만)" });
    steps.push({ label: "DSR 산정용 소득", value: income, tone: "total", law: "은행업감독업무시행세칙 [별표 18] · 은행연합회 장래소득 반영 기준" });
    tips.push({ level: "watch", title: "증가율 표는 은행연합회가 고용노동부 통계로 매년 갱신합니다", body: "기본값은 2023년 발표 표(20~24세 51.6%, 25~29세 31.4%, 30~34세 13.1%)입니다. 은행별 적용 표로 바꿔 넣으세요." });
    tips.push({ level: "save", title: "만기 10년 이상 분할상환 주담대에만 적용됩니다", body: "신용대출·만기일시상환에는 안 붙습니다. 반영을 요청해야 적용하는 은행도 있습니다." });
    return { headline: [{ label: "장래소득 반영 후 연소득", value: income, hint: eligible ? `+${(rate * 100).toFixed(1)}%` : "반영 없음" }, { label: "현재 소득", value: input.income }, { label: "증가분", value: income - input.income }], steps, tips, rate, income };
}
exports.EMPTY_LOAN_INTEREST = { amount: 4 * won_1.억, rate: 0.042, years: 30, repay: "annuity", graceYears: 0 };
function calcLoanInterest(input) {
    const months = (0, validation_1.loanMonths)(input.years);
    const grace = input.graceYears * 12;
    if ((0, validation_1.hasInvalidNumbers)(input) || months === null || !(0, validation_1.isFiniteNumber)(input.rate, 0, 10) || !(0, validation_1.isIntegerInRange)(grace, 0, months - (input.repay === "bullet" ? 0 : 1)) || !(0, validation_1.isOneOf)(input.repay, Object.keys(exports.REPAY_LABEL)))
        return (0, validation_1.invalidCalculation)({ totalInterest: 0, firstMonthly: 0, rows: [] }, "만기는 1~1,200개월, 거치기간은 만기 이내의 정수 개월이어야 합니다. 분할상환은 거치 종료 뒤 최소 1개월이 필요합니다.");
    const steps = [];
    const tips = [];
    const s = schedule(input.amount, input.rate, input.years * 12, input.repay, input.graceYears * 12);
    steps.push({ label: "대출 원금", value: input.amount, tone: "sub" });
    steps.push({ label: `${exports.REPAY_LABEL[input.repay]} · ${(input.rate * 100).toFixed(2)}% · ${input.years}년${input.graceYears ? ` (거치 ${input.graceYears}년)` : ""}`, value: `첫 달 ${(0, won_1.formatWon)(s.firstMonthly)}${input.repay === "principal" ? ` → 마지막 달 ${(0, won_1.formatWon)(Math.floor(input.amount / Math.max(1, (input.years - input.graceYears) * 12) * (1 + input.rate / 12)))}` : ""}` });
    for (const row of s.rows.filter((_, i) => i < 5 || (i + 1) % 5 === 0 || i === s.rows.length - 1))
        steps.push({ label: `${row.year}년차 — 원금 ${(0, won_1.formatWon)(Math.floor(row.principal))} · 이자 ${(0, won_1.formatWon)(Math.floor(row.interest))}`, value: Math.floor(row.balance), depth: 1, note: "잔액" });
    steps.push({ label: "총 이자", value: s.totalInterest, tone: "total" });
    steps.push({ label: "총 상환액", value: input.amount + s.totalInterest });
    const alt = input.repay === "annuity" ? schedule(input.amount, input.rate, input.years * 12, "principal", input.graceYears * 12) : null;
    if (alt)
        tips.push({ level: "save", title: `원금균등이면 총 이자 ${(0, won_1.formatWon)(alt.totalInterest)} — ${(0, won_1.formatWon)(s.totalInterest - alt.totalInterest)} 적습니다`, body: `대신 첫 달 상환액이 ${(0, won_1.formatWon)(alt.firstMonthly)}로 큽니다. 초기 현금흐름이 되면 원금균등이 유리합니다.` });
    tips.push({ level: "watch", title: "변동금리는 6개월마다 이 표가 바뀝니다", body: "여기 총이자는 금리가 만기까지 그대로라는 가정입니다. 금리 1%p가 오르면 30년 4억 기준 총이자가 약 8천만원 늘어납니다." });
    tips.push({ level: "save", title: "주담대 이자는 소득공제 대상입니다", body: "무주택·1주택 세대주가 기준시가 6억 이하 주택을 사며 받은 15년 이상 장기주택저당차입금 이자는 연 600만~2,000만원 소득공제됩니다.", law: "소득세법 제52조 제5항" });
    return { headline: [{ label: "총 이자", value: s.totalInterest, hint: `${input.years}년 · ${exports.REPAY_LABEL[input.repay]}` }, { label: "첫 달 상환액", value: s.firstMonthly }, { label: "총 상환액", value: input.amount + s.totalInterest }], steps, tips, totalInterest: s.totalInterest, firstMonthly: s.firstMonthly, rows: s.rows };
}
exports.EMPTY_REFINANCE = { balance: 3 * won_1.억, currentRate: 0.052, remainingYears: 25, newRate: 0.042, newYears: 25, prepayFee: 0, costs: 500_000, repay: "annuity" };
function calcRefinance(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isFiniteNumber)(input.currentRate, 0, 10) || !(0, validation_1.isFiniteNumber)(input.newRate, 0, 10) || (0, validation_1.loanMonths)(input.remainingYears) === null || (0, validation_1.loanMonths)(input.newYears) === null || !(0, validation_1.isOneOf)(input.repay, Object.keys(exports.REPAY_LABEL)))
        return (0, validation_1.invalidCalculation)({ currentInterest: 0, newInterest: 0, saving: 0, breakEvenMonths: 0, monthlyDiff: 0 }, "대환 전·후 만기(1~1,200개월 정수), 금리(0~1,000%), 금액과 상환 방식을 확인해 주세요.");
    const steps = [];
    const tips = [];
    const cur = schedule(input.balance, input.currentRate, input.remainingYears * 12, input.repay);
    const nw = schedule(input.balance, input.newRate, input.newYears * 12, input.repay);
    const saving = cur.totalInterest - nw.totalInterest - input.prepayFee - input.costs;
    const monthlyDiff = cur.firstMonthly - nw.firstMonthly;
    const breakEvenMonths = monthlyDiff > 0 ? Math.ceil((input.prepayFee + input.costs) / monthlyDiff) : Infinity;
    steps.push({ label: `현재 대출 남은 이자 (${(input.currentRate * 100).toFixed(2)}%, ${input.remainingYears}년)`, value: cur.totalInterest, tone: "sub" });
    steps.push({ label: `대환 후 이자 (${(input.newRate * 100).toFixed(2)}%, ${input.newYears}년)`, value: nw.totalInterest, tone: "minus" });
    steps.push({ label: "− 중도상환수수료", value: input.prepayFee, tone: "minus" });
    steps.push({ label: "− 신규 비용 (설정·인지·감정)", value: input.costs, tone: "minus" });
    steps.push({ label: "순 절감액", value: saving, tone: "total" });
    steps.push({ label: "월 상환액 차이", value: monthlyDiff });
    steps.push({ label: "비용 회수 기간", value: Number.isFinite(breakEvenMonths) ? `${breakEvenMonths}개월` : "회수 불가" });
    if (saving <= 0)
        tips.push({ level: "must", title: "이 조건으로는 대환이 손해입니다", body: "수수료·비용이 이자 차이보다 큽니다. 중도상환수수료가 사라지는 시점(대출 3년 경과)까지 기다리거나 금리 차가 더 벌어질 때 다시 보세요." });
    if (input.newYears > input.remainingYears)
        tips.push({ level: "watch", title: "만기를 늘리면 월 부담은 줄고 총이자는 늘 수 있습니다", body: "순 절감액이 마이너스여도 월 상환액은 줄어드는 경우입니다. 총이자와 월 부담 중 무엇을 줄이려는지 정하세요." });
    tips.push({ level: "save", title: "온라인 대환대출 인프라로 비교하세요", body: "주담대·전세대출은 2024년부터 앱에서 여러 은행 금리를 한 번에 비교해 갈아탈 수 있고, 설정비·인지세를 은행이 부담하는 경우가 많습니다." });
    return { headline: [{ label: "순 절감액 (총 이자 기준)", value: saving, higherIsWorse: false }, { label: "월 상환액 차이", value: monthlyDiff }, { label: "회수 기간", value: 0, displayValue: Number.isFinite(breakEvenMonths) ? `${breakEvenMonths}개월` : "—" }], steps, tips, currentInterest: cur.totalInterest, newInterest: nw.totalInterest, saving, breakEvenMonths, monthlyDiff };
}
exports.EMPTY_PREPAY = { amount: 1 * won_1.억, feeRate: 0.012, elapsedMonths: 12, feeMonths: 36 };
function calcPrepay(input) {
    const steps = [];
    const tips = [];
    const remaining = Math.max(0, input.feeMonths - input.elapsedMonths);
    const remainingRatio = input.feeMonths > 0 ? remaining / input.feeMonths : 0;
    const fee = Math.floor(input.amount * input.feeRate * remainingRatio);
    steps.push({ label: "중도상환액", value: input.amount, tone: "sub" });
    steps.push({ label: `× 수수료율 ${(input.feeRate * 100).toFixed(2)}%`, value: Math.floor(input.amount * input.feeRate), law: "금융소비자보호법 제20조 · 시행령 제15조 (2025.1.13~ 실비 기준 상한)" });
    steps.push({ label: `× 잔여기간 비율 (${remaining}/${input.feeMonths}개월)`, value: fee, tone: "total", note: "슬라이딩 방식 — 3년이 지나면 0" });
    if (remaining === 0)
        tips.push({ level: "save", title: "수수료 부과 기간이 끝났습니다", body: "3년(부과 기간)이 지나면 중도상환수수료 없이 갚거나 갈아탈 수 있습니다." });
    tips.push({ level: "watch", title: "2025년부터 수수료율 상한이 낮아졌습니다", body: "주담대 고정 약 1.4%·변동 1.2%, 신용대출 0.6~0.7% 안팎으로 은행별로 다릅니다. 약정서의 요율을 넣으세요." });
    tips.push({ level: "save", title: "연 10% 이내 원금은 수수료 없이 갚게 해 주는 은행이 많습니다", body: "매년 대출 잔액의 일정 비율(보통 10%)까지는 면제 조항이 약정에 있는지 확인하세요." });
    return { headline: [{ label: "중도상환수수료", value: fee, hint: `잔여 ${remaining}개월` }, { label: "상환액", value: input.amount }, { label: "요율", value: 0, displayValue: `${(input.feeRate * 100).toFixed(2)}%` }], steps, tips, fee, remainingRatio };
}
exports.EMPTY_AUCTION_LOAN = { bid: 6 * won_1.억, appraisal: 8 * won_1.억, bidLtv: 0.8, appraisalLtv: 0.7, region: "seoul", rooms: 1, mci: false };
function calcAuctionLoan(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isOneOf)(input.region, Object.keys(exports.REGION_LABEL)) || !(0, validation_1.isIntegerInRange)(input.rooms, 1, 10000))
        return (0, validation_1.invalidCalculation)({ byBid: 0, byAppraisal: 0, deduction: 0, amount: 0 }, "낙찰·감정가, 적용 지역과 방 수(1~10,000실 정수)를 확인해 주세요.");
    const steps = [];
    const tips = [];
    const byBid = Math.floor(input.bid * input.bidLtv);
    const byAppraisal = Math.floor(input.appraisal * input.appraisalLtv);
    const deduction = input.mci ? 0 : exports.ROOM_DEDUCTION[input.region] * Math.max(1, input.rooms);
    const amount = Math.max(0, Math.min(byBid, byAppraisal) - deduction);
    steps.push({ label: `낙찰가 × ${(input.bidLtv * 100).toFixed(0)}%`, value: byBid });
    steps.push({ label: `감정가 × ${(input.appraisalLtv * 100).toFixed(0)}%`, value: byAppraisal });
    steps.push({ label: "둘 중 작은 값", value: Math.min(byBid, byAppraisal), tone: "sub" });
    steps.push({ label: input.mci ? "− 방공제 (MCI 가입)" : `− 방공제 ${(0, won_1.formatWon)(exports.ROOM_DEDUCTION[input.region])} × ${input.rooms}실`, value: deduction, tone: "minus", law: "주택임대차보호법 시행령 제10조" });
    steps.push({ label: "경락잔금대출 한도", value: amount, tone: "total" });
    steps.push({ label: "필요한 자기자금 (낙찰가 − 대출)", value: Math.max(0, input.bid - amount) });
    tips.push({ level: "must", title: "잔금은 낙찰 후 약 한 달 안에 내야 합니다", body: "대금지급기한을 넘기면 입찰보증금(10%)을 몰수당합니다. 입찰 전에 경락대출 가능 여부와 한도를 은행·대출상담사에게 확인하세요." });
    tips.push({ level: "watch", title: "규제지역 주택은 일반 주담대 LTV·DSR이 그대로 적용됩니다", body: "경매라고 규제가 느슨하지 않습니다. 다주택·규제지역이면 낙찰가 80%가 아니라 40%가 될 수 있습니다." });
    tips.push({ level: "save", title: "낙찰가 기준 취득세도 준비하세요", body: "취득세는 낙찰가 기준(주택 1~3%, 상가 4.6%)이고 잔금과 같이 듭니다. 등기비용 계산기에 낙찰가를 넣으세요." });
    return { headline: [{ label: "경락잔금대출 한도", value: amount }, { label: "필요 자기자금", value: Math.max(0, input.bid - amount) }, { label: "방공제", value: deduction }], steps, tips, byBid, byAppraisal, deduction, amount };
}
exports.EMPTY_SAVINGS = { kind: "deposit", amount: 5000 * won_1.만, monthly: 100 * won_1.만, rate: 0.03, months: 12, compound: false, taxRate: 0.154 };
function calcSavings(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isIntegerInRange)(input.months, 1, 1200) || !(0, validation_1.isOneOf)(input.kind, ["deposit", "installment"]) || !(0, validation_1.isFiniteNumber)(input.rate, 0, 1) || !(0, validation_1.isFiniteNumber)(input.taxRate, 0, 1))
        return (0, validation_1.invalidCalculation)({ principal: 0, interest: 0, tax: 0, net: 0 }, "예적금 종류와 기간(1~1,200개월 정수), 금리 및 세율(0~100%)을 확인해 주세요.");
    const steps = [];
    const tips = [];
    const r = input.rate / 12;
    let principal = 0;
    let interest = 0;
    if (input.kind === "deposit") {
        principal = input.amount;
        interest = input.compound ? input.amount * (Math.pow(1 + r, input.months) - 1) : input.amount * input.rate * (input.months / 12);
        steps.push({ label: "예치금", value: principal, tone: "sub" });
        steps.push({ label: `${input.compound ? "월복리" : "단리"} 이자 (연 ${(input.rate * 100).toFixed(2)}%, ${input.months}개월)`, value: Math.floor(interest) });
    }
    else {
        principal = input.monthly * input.months;
        if (input.compound) {
            let bal = 0;
            for (let m = 1; m <= input.months; m++)
                bal = (bal + input.monthly) * (1 + r);
            interest = bal - principal;
        }
        else
            interest = input.monthly * r * ((input.months * (input.months + 1)) / 2);
        steps.push({ label: `월 ${(0, won_1.formatWon)(input.monthly)} × ${input.months}회 납입 원금`, value: principal, tone: "sub" });
        steps.push({ label: `${input.compound ? "월복리" : "단리"} 이자 (연 ${(input.rate * 100).toFixed(2)}%)`, value: Math.floor(interest), note: "적금은 매달 넣은 돈이 남은 개월만큼만 이자를 받는다 — 표시 금리의 절반쯤이 실제 수익" });
    }
    interest = Math.floor(interest);
    const tax = Math.floor(interest * input.taxRate / 10) * 10;
    const net = interest - tax;
    steps.push({ label: `− 이자소득세 ${(input.taxRate * 100).toFixed(1)}%`, value: tax, tone: "minus", law: "소득세법 제129조 (14%) + 지방소득세 1.4%" });
    steps.push({ label: "세후 이자", value: net, tone: "total" });
    steps.push({ label: "만기 수령액", value: principal + net });
    if (input.kind === "installment" && principal > 0)
        tips.push({ level: "watch", title: `적금 실효수익률은 연 ${((net / principal) * (12 / input.months) * 100).toFixed(2)}%`, body: "표시 금리와 다릅니다. 첫 달 납입금만 12개월 이자를 받고 마지막 달은 1개월치라서, 단리 12개월 적금의 실제 수익은 표시 금리의 약 54%입니다." });
    tips.push({ level: "save", title: "이자소득 2천만원이 넘으면 종합과세입니다", body: "금융소득(이자+배당)이 연 2천만원을 넘으면 다른 소득과 합산해 누진세율로 과세됩니다. 만기를 연도별로 나누면 피할 수 있습니다.", law: "소득세법 제14조 제3항 제6호" });
    return { headline: [{ label: "세후 이자", value: net, higherIsWorse: false }, { label: "세전 이자", value: interest }, { label: "만기 수령액", value: principal + net }], steps, tips, principal, interest, tax, net };
}
