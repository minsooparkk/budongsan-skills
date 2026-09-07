"use strict";
/**
 * 상속세 계산 — 상속세 및 증여세법.
 *
 * 조문 값은 Graph DB(현행 법령)에서 직접 확인한 것이다:
 *   §13 과세가액 · §14 공과금·장례비·채무 · §18 기초공제 2억 · §19 배우자상속공제
 *   §20 그 밖의 인적공제 · §21 일괄공제 5억 · §22 금융재산공제 · §23의2 동거주택공제 6억
 *   §24 공제적용 한도 · §25 과세표준(50만원 미만 부과 제외) · §26 세율 · §69 신고세액공제 3%
 *
 * 들어가지 않은 것(화면에도 같은 문구로 밝힌다): 가업·영농상속공제, 세대생략 할증,
 * 재해손실공제, 감정평가수수료, 단기재상속 세액공제, 비거주자 상속.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_INHERITANCE = void 0;
exports.funeralDeduction = funeralDeduction;
exports.spouseLegalShare = spouseLegalShare;
exports.calcInheritance = calcInheritance;
exports.filingDeadline = filingDeadline;
const progressive_1 = require("./progressive");
const won_1 = require("./won");
exports.EMPTY_INHERITANCE = {
    year: 2026,
    month: 8,
    house: 12 * won_1.억,
    land: 0,
    deposit: 3 * won_1.억,
    stock: 0,
    etc: 0,
    debt: 2 * won_1.억,
    financialDebt: 2 * won_1.억,
    funeral: 1000 * won_1.만,
    priorGift: 0,
    priorGiftTaxPaid: 0,
    hasSpouse: true,
    children: 2,
    minors: 0,
    elders: 0,
    disabledYears: 0,
    spouseActual: null,
    coResidence: false,
    houseSecuredDebt: 0,
};
/**
 * 장례비용 공제 (시행령 §9②).
 * 봉안시설 몫을 뺀 일반 장례비는 500만원 미만이어도 500만원, 1천만원을 넘으면
 * 1천만원에서 자른다. 즉 실제로 얼마를 썼든 공제는 500만~1,000만 사이다.
 */
function funeralDeduction(spent) {
    return Math.min(Math.max(spent, 500 * won_1.만), 1000 * won_1.만);
}
/** 배우자 법정상속분 — 민법 §1009 (배우자 1.5 : 자녀 각 1) */
function spouseLegalShare(children) {
    if (children <= 0)
        return 1; // 자녀가 없으면 배우자가 사실상 전부 (직계존속 유무는 묻지 않는다)
    return 1.5 / (1.5 + children);
}
function calcInheritance(input) {
    const steps = [];
    const push = (s) => steps.push(s);
    /* ── 1. 상속재산 ─────────────────────────────────────────── */
    const gross = input.house + input.land + input.deposit + input.stock + input.etc;
    push({ label: "총 상속재산", value: gross, tone: "sub", law: "상증세법 제7조" });
    if (input.house)
        push({ label: "주택", value: input.house, depth: 1 });
    if (input.land)
        push({ label: "토지", value: input.land, depth: 1 });
    if (input.deposit)
        push({ label: "예금·적금", value: input.deposit, depth: 1 });
    if (input.stock)
        push({ label: "주식", value: input.stock, depth: 1 });
    if (input.etc)
        push({ label: "기타", value: input.etc, depth: 1 });
    /* ── 2. 과세가액 (§13·§14) ───────────────────────────────── */
    const funeral = funeralDeduction(input.funeral);
    // §14① 단서 — 빼는 금액이 상속재산을 넘으면 그 초과분은 없는 것으로 본다
    const subtractRaw = input.debt + funeral;
    const subtract = Math.min(subtractRaw, gross);
    push({
        label: "− 채무",
        value: input.debt,
        tone: "minus",
        law: "상증세법 제14조",
    });
    push({
        label: "− 장례비용",
        value: funeral,
        tone: "minus",
        law: "시행령 제9조",
        note: input.funeral < 500 * won_1.만
            ? "실제 지출이 적어도 500만원까지는 공제된다"
            : input.funeral > 1000 * won_1.만
                ? `실제 ${(0, won_1.formatWon)(input.funeral)}을 썼어도 1,000만원에서 잘린다`
                : undefined,
    });
    if (subtractRaw > gross) {
        push({
            label: "차감 한도 적용",
            value: `${(0, won_1.formatWon)(subtractRaw)} → ${(0, won_1.formatWon)(subtract)}`,
            tone: "plain",
            law: "상증세법 제14조 제1항",
            note: "빼는 금액이 상속재산을 넘으면 그 초과분은 없는 것으로 본다",
        });
    }
    push({
        label: "＋ 사전증여재산",
        value: input.priorGift,
        tone: "plus",
        law: "상증세법 제13조",
        note: input.priorGift ? "상속개시일 전 10년 이내 상속인에게 증여한 재산" : undefined,
    });
    const taxableEstate = gross - subtract + input.priorGift;
    push({ label: "상속세 과세가액", value: taxableEstate, tone: "sub" });
    /* ── 3. 상속공제 ─────────────────────────────────────────── */
    // 일괄공제 vs 기초공제 + 그 밖의 인적공제 (§21①)
    const basic = 2 * won_1.억;
    const childDed = input.children * 5000 * won_1.만;
    const minorDed = input.minors * 1000 * won_1.만 * 10; // 평균 잔여 10년으로 가정 — 화면에 밝힌다
    const elderDed = input.elders * 5000 * won_1.만;
    const disabledDed = Math.max(0, input.disabledYears) * 1000 * won_1.만;
    const personalSum = basic + childDed + minorDed + elderDed + disabledDed;
    // 배우자 단독상속이면 일괄공제를 쓸 수 없다 (§21②)
    const spouseOnly = input.hasSpouse && input.children === 0;
    const lumpSum = 5 * won_1.억;
    const lumpSumUsed = !spouseOnly && lumpSum > personalSum;
    const baseDeduction = lumpSumUsed ? lumpSum : personalSum;
    push({
        label: lumpSumUsed ? "일괄공제" : "기초공제 + 그 밖의 인적공제",
        value: baseDeduction,
        tone: "minus",
        law: lumpSumUsed ? "상증세법 제21조" : "상증세법 제18조·제20조",
        note: spouseOnly
            ? "배우자 단독상속이라 일괄공제를 쓸 수 없다 (제21조 제2항)"
            : lumpSumUsed
                ? `인적공제 합계 ${(0, won_1.formatWon)(personalSum)}보다 5억원이 커서 일괄공제를 택했다`
                : `일괄공제 5억원보다 인적공제 합계가 커서 이쪽을 택했다`,
    });
    // 배우자 상속공제 (§19)
    let spouseDeduction = 0;
    let spouseLimit = 0;
    let spouseActual = 0;
    if (input.hasSpouse) {
        const share = spouseLegalShare(input.children);
        // 한도금액 = (A − B + C) × D − E (§19①1).
        // A는 시행령 §17①이 정한 값 — 공과금·채무는 빼지만 **장례비용은 빼지 않는다**.
        // B(상속인 아닌 수유자의 유증)와 E(배우자 사전증여 과세표준)는 0으로 두고,
        // 그 전제를 화면 하단 문구에 그대로 적는다.
        const spouseBase = gross - Math.min(input.debt, gross) + input.priorGift;
        spouseLimit = Math.min(spouseBase * share, 30 * won_1.억);
        spouseActual = input.spouseActual ?? (gross - Math.min(input.debt, gross)) * share;
        spouseDeduction = Math.max(Math.min(spouseActual, spouseLimit), 5 * won_1.억);
        push({
            label: "배우자 상속공제",
            value: spouseDeduction,
            tone: "minus",
            law: "상증세법 제19조",
            note: spouseDeduction === 5 * won_1.억
                ? "실제 상속분이 5억원에 못 미쳐도 5억원은 공제된다 (제19조 제4항)"
                : `법정상속분 ${(0, won_1.pct)(share, 1)} 한도 ${(0, won_1.formatWon)(spouseLimit)} 이내`,
        });
    }
    // 금융재산 상속공제 (§22)
    const netFinancial = Math.max(0, input.deposit + input.stock - input.financialDebt);
    let financialDeduction = 0;
    if (netFinancial > 2000 * won_1.만) {
        financialDeduction = Math.min(Math.max(netFinancial * 0.2, 2000 * won_1.만), 2 * won_1.억);
    }
    else {
        financialDeduction = netFinancial;
    }
    if (financialDeduction > 0) {
        push({
            label: "금융재산 상속공제",
            value: financialDeduction,
            tone: "minus",
            law: "상증세법 제22조",
            note: `순금융재산 ${(0, won_1.formatWon)(netFinancial)}의 20%${financialDeduction === 2 * won_1.억 ? " — 2억원 한도에서 잘림" : ""}`,
        });
    }
    // 동거주택 상속공제 (§23의2)
    let coResidenceDeduction = 0;
    if (input.coResidence && input.house > 0) {
        coResidenceDeduction = Math.min(Math.max(0, input.house - input.houseSecuredDebt), 6 * won_1.억);
        push({
            label: "동거주택 상속공제",
            value: coResidenceDeduction,
            tone: "minus",
            law: "상증세법 제23조의2",
            note: "10년 이상 동거·1세대1주택·무주택 상속인 요건을 모두 갖춘 경우",
        });
    }
    const deductionRaw = baseDeduction + spouseDeduction + financialDeduction + coResidenceDeduction;
    // 공제 적용의 한도 (§24) — 과세가액에 가산한 사전증여재산은 공제 밑천이 되지 않는다
    const limitCut = taxableEstate > 5 * won_1.억 ? Math.max(0, input.priorGift) : 0;
    const deductionLimit = Math.max(0, taxableEstate - limitCut);
    const deduction = Math.min(deductionRaw, deductionLimit);
    if (deduction < deductionRaw) {
        push({
            label: "공제 적용의 한도",
            value: `${(0, won_1.formatWon)(deductionRaw)} → ${(0, won_1.formatWon)(deduction)}`,
            tone: "plain",
            law: "상증세법 제24조",
            note: "과세가액에 가산한 사전증여재산만큼은 공제 한도에서 빠진다",
        });
    }
    push({ label: "상속공제 합계", value: deduction, tone: "sub" });
    /* ── 4. 과세표준·산출세액 ────────────────────────────────── */
    const taxBase = Math.max(0, taxableEstate - deduction);
    push({ label: "과세표준", value: taxBase, tone: "sub", law: "상증세법 제25조" });
    const belowMinimum = taxBase < 500_000;
    const applied = (0, progressive_1.applyBands)(taxBase, progressive_1.BANDS_INHERITANCE);
    const grossTax = belowMinimum ? 0 : applied.tax;
    push({ label: "적용세율", value: (0, won_1.pct)(applied.rate, 0), law: "상증세법 제26조" });
    push({ label: "누진공제", value: applied.quick, tone: "minus" });
    push({ label: "산출세액", value: grossTax, tone: "sub" });
    if (belowMinimum) {
        push({
            label: "과세최저한",
            value: "과세표준 50만원 미만 → 부과하지 않음",
            law: "상증세법 제25조 제2항",
        });
    }
    /* ── 5. 세액공제 ─────────────────────────────────────────── */
    // 증여세액공제 (§28) — 한도는 산출세액 중 사전증여재산이 차지하는 비율
    let giftCredit = 0;
    if (input.priorGiftTaxPaid > 0 && grossTax > 0 && taxableEstate > 0) {
        const cap = grossTax * (Math.min(input.priorGift, taxBase) / Math.max(taxBase, 1));
        giftCredit = Math.min(input.priorGiftTaxPaid, Math.max(0, cap));
        push({
            label: "− 증여세액공제",
            value: giftCredit,
            tone: "minus",
            law: "상증세법 제28조",
            note: giftCredit < input.priorGiftTaxPaid
                ? "산출세액 중 사전증여분이 차지하는 비율이 한도라서 일부만 공제된다"
                : undefined,
        });
    }
    const afterCredit = Math.max(0, grossTax - giftCredit);
    const filingCredit = afterCredit * 0.03;
    push({
        label: "− 신고세액공제 3%",
        value: filingCredit,
        tone: "minus",
        law: "상증세법 제69조",
        note: "기한 내에 신고해야 받는다. 하루만 늦어도 사라진다",
    });
    const payable = (0, won_1.truncate10)(afterCredit - filingCredit);
    push({ label: "납부할 상속세", value: payable, tone: "total" });
    /* ── 6. 결론 카드 ────────────────────────────────────────── */
    const deadline = filingDeadline(input.year, input.month);
    const effectiveRate = gross > 0 ? payable / gross : 0;
    const headline = [
        { label: "납부할 상속세", value: payable, hint: `실효세율 ${(0, won_1.pct)(effectiveRate, 1)}` },
        { label: "과세표준", value: taxBase, hint: `적용세율 ${(0, won_1.pct)(applied.rate, 0)}` },
        { label: "상속공제 합계", value: deduction, hint: lumpSumUsed ? "일괄공제 적용" : "인적공제 적용" },
    ];
    return {
        headline,
        steps,
        tips: inheritanceTips(input, {
            payable,
            taxBase,
            deduction,
            spouseDeduction,
            lumpSumUsed,
            deadline,
            netFinancial,
            coResidenceDeduction,
        }),
        payable,
        taxBase,
        grossTax,
        effectiveRate,
        lumpSumUsed,
        personalSum,
        deadline,
        belowMinimum,
    };
}
/** 신고기한 — 상속개시일이 속하는 달의 말일부터 6개월 (§67) */
function filingDeadline(year, month) {
    const end = new Date(year, month - 1 + 7, 0); // 그 달 말일 + 6개월
    return `${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`;
}
function inheritanceTips(input, r) {
    const tips = [];
    tips.push({
        level: "must",
        title: `신고·납부 기한 ${r.deadline}`,
        body: "상속개시일이 속하는 달의 말일부터 6개월. 이 날짜를 넘기면 신고세액공제 3%가 사라지고 무신고가산세 20%가 붙는다.",
        law: "상증세법 제67조·제69조",
    });
    if (r.payable > 20_000_000) {
        tips.push({
            level: "save",
            title: "연부연납 — 최장 10년에 나눠 낼 수 있다",
            body: `납부세액이 2천만원을 넘으면 담보를 제공하고 연부연납을 신청할 수 있다. 지금 세액 ${(0, won_1.formatWon)(r.payable)}이면 대상이다. 다만 연부연납 가산금(이자)이 붙는다.`,
            law: "상증세법 제71조·제72조",
        });
    }
    if (input.hasSpouse && input.spouseActual === null) {
        tips.push({
            level: "watch",
            title: "배우자 상속분을 어떻게 나누느냐가 세액을 바꾼다",
            body: `지금은 법정상속분대로 나눈다고 보고 ${(0, won_1.formatWon)(r.spouseDeduction)}을 공제했다. 배우자가 실제로 더 받으면 공제가 늘지만, 그 재산은 나중에 2차 상속으로 다시 과세된다. 두 번의 상속을 함께 봐야 답이 나온다.`,
            law: "상증세법 제19조",
        });
    }
    if (input.hasSpouse) {
        tips.push({
            level: "must",
            title: "배우자상속공제는 '분할 신고'를 해야 받는다",
            body: "신고기한 다음 날부터 9개월 안에 배우자 몫으로 실제 분할하고 등기까지 마쳐야 한다. 협의만 하고 등기를 미루면 공제가 5억원으로 내려앉는다.",
            law: "상증세법 제19조 제2항",
        });
    }
    if (!input.coResidence && input.house > 0) {
        tips.push({
            level: "save",
            title: "동거주택 상속공제 — 최대 6억원",
            body: "10년 이상 한집에서 같이 살았고, 그 기간 1세대 1주택이었으며, 상속인이 무주택이면 주택가액을 6억원까지 통째로 뺀다. 요건이 까다롭지만 금액이 커서 확인할 값어치가 있다.",
            law: "상증세법 제23조의2",
        });
    }
    if (r.netFinancial > 0 && r.netFinancial <= 1_000_000_000) {
        tips.push({
            level: "save",
            title: "금융재산은 20%를 더 빼준다 (최대 2억원)",
            body: "부동산에는 없는 공제다. 예금·상장주식처럼 금융기관이 확인해 주는 재산에만 붙는다. 최대주주가 보유한 주식과 신고하지 않은 차명 금융재산은 빠진다.",
            law: "상증세법 제22조",
        });
    }
    if (input.priorGift > 0 && input.priorGiftTaxPaid === 0) {
        tips.push({
            level: "watch",
            title: "사전증여에 낸 증여세를 입력하지 않았다",
            body: "사전증여재산을 상속재산에 다시 더하면서 그때 낸 증여세를 빼지 않으면 같은 재산에 세금이 두 번 붙는다. 납부한 증여세액을 넣으면 한도 안에서 공제된다.",
            law: "상증세법 제28조",
        });
    }
    tips.push({
        level: "watch",
        title: "추정상속재산 — 2년 안의 인출·처분을 본다",
        body: "상속개시일 전 1년 안에 2억원, 2년 안에 5억원 넘게 재산을 처분하거나 예금을 빼면 용도를 소명해야 한다. 소명하지 못하면 상속재산에 다시 들어온다.",
        law: "상증세법 제15조",
    });
    return tips;
}
