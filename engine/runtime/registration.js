"use strict";
/**
 * 등기비용 종합 — 매매로 집·건물·땅을 사서 소유권이전등기를 마칠 때까지 드는 돈 전부.
 *
 *   취득세·지방교육세·농어촌특별세     acquisition.ts (지방세법)
 *   국민주택채권 매입 → 즉시 매도 할인비용  주택도시기금법 제8조 · 시행령 [별표]
 *   인지세                             인지세법 제3조 · 제6조
 *   등기신청수수료                     등기사항증명서 등 수수료규칙 제5조의2
 *   법무사 보수                        협의 (대한법무사협회 보수표가 상한)
 *   근저당권 설정 (대출 시)            등록면허세 0.2% + 지방교육세 20% + 채권 1%
 *
 * 채권 매입률표는 세법이 아니라 Tax DB에 없다. 주택도시기금법 시행령 [별표] 부표
 * 제15호(개정 2025.8.26)를 korean-law-mcp(법제처 API)로 2026-09-03 대조했다 — 바뀌면
 * `BOND_TABLE` 하나만 고친다. 매입금액은 별표 제4호대로 1만원 단위(5천원 이상 올림,
 * 미만 버림, 최저 1만원). 할인율은 매일 은행이 고시하므로 입력값으로 둔다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MORTGAGE_BOND_CAP = exports.MORTGAGE_BOND_MIN = exports.MORTGAGE_BOND_RATE = exports.MORTGAGE_TAX_RATE = exports.REG_FEE = exports.BOND_TABLE = exports.EMPTY_REGISTRATION = exports.REG_KIND_LABEL = exports.REG_KINDS = void 0;
exports.bondRate = bondRate;
exports.stampDuty = stampDuty;
exports.roundBond = roundBond;
exports.calcRegistration = calcRegistration;
const acquisition_1 = require("./acquisition");
const won_1 = require("./won");
exports.REG_KINDS = ["house", "officetel", "building", "land"];
exports.REG_KIND_LABEL = {
    house: "주택 (아파트·단독·다세대)",
    officetel: "오피스텔",
    building: "상가·건물",
    land: "토지",
};
exports.EMPTY_REGISTRATION = {
    kind: "house",
    price: 9 * won_1.억,
    standardValue: 0,
    metro: true,
    area: 84,
    regulated: true,
    houses: 1,
    firstHome: false,
    corporate: false,
    temporaryTwo: false,
    selfRegistration: false,
    legalFee: 30 * won_1.만,
    discountRate: 10,
    mortgageMax: 0,
    eForm: false,
};
exports.BOND_TABLE = {
    house: [
        { from: 2000 * won_1.만, metro: 0.013, other: 0.013 },
        { from: 5000 * won_1.만, metro: 0.019, other: 0.014 },
        { from: 1 * won_1.억, metro: 0.021, other: 0.016 },
        { from: 1.6 * won_1.억, metro: 0.023, other: 0.018 },
        { from: 2.6 * won_1.억, metro: 0.026, other: 0.021 },
        { from: 6 * won_1.억, metro: 0.031, other: 0.026 },
    ],
    land: [
        { from: 500 * won_1.만, metro: 0.025, other: 0.02 },
        { from: 5000 * won_1.만, metro: 0.04, other: 0.035 },
        { from: 1 * won_1.억, metro: 0.05, other: 0.045 },
    ],
    building: [
        { from: 1000 * won_1.만, metro: 0.01, other: 0.008 },
        { from: 1.3 * won_1.억, metro: 0.016, other: 0.014 },
        { from: 2.5 * won_1.억, metro: 0.02, other: 0.018 },
    ],
};
function bondRate(kind, standardValue, metro) {
    const table = exports.BOND_TABLE[kind === "house" ? "house" : kind === "land" ? "land" : "building"];
    let rate = 0;
    for (const b of table)
        if (standardValue >= b.from)
            rate = metro ? b.metro : b.other;
    return rate;
}
/** 인지세 — 인지세법 제3조 제1항 제1호. 주택 1억원 이하는 비과세(제6조 제5호) */
function stampDuty(price, isHouse) {
    if (isHouse && price <= 1 * won_1.억)
        return 0;
    if (price <= 1000 * won_1.만)
        return 0;
    if (price <= 3000 * won_1.만)
        return 2 * won_1.만;
    if (price <= 5000 * won_1.만)
        return 4 * won_1.만;
    if (price <= 1 * won_1.억)
        return 7 * won_1.만;
    if (price <= 10 * won_1.억)
        return 15 * won_1.만;
    return 35 * won_1.만;
}
/** 등기신청수수료 — 소유권이전 서면 15,000원, e-Form 13,000원 (완전 전자신청 10,000원) */
exports.REG_FEE = { paper: 15_000, eForm: 13_000 };
/** 근저당권 설정 등록면허세 — 지방세법 제28조 제1항 제1호 다목 (채권금액의 0.2%) */
exports.MORTGAGE_TAX_RATE = 0.002;
/** 근저당 설정 시 채권 매입률 — [별표] 부표 제15호 다목: 설정금액 2천만원 이상일 때 1%, 매입액 상한 10억원 */
exports.MORTGAGE_BOND_RATE = 0.01;
exports.MORTGAGE_BOND_MIN = 2000 * won_1.만;
exports.MORTGAGE_BOND_CAP = 10 * won_1.억;
/** 채권 매입금액 단수 — [별표] 제4호: 1만원 단위, 5천원 이상은 올리고 미만은 버린다. 최저 1만원 */
function roundBond(amount) {
    if (amount <= 0)
        return 0;
    return Math.max(won_1.만, Math.round(amount / won_1.만) * won_1.만);
}
function calcRegistration(input) {
    const steps = [];
    const tips = [];
    const price = Math.max(0, input.price);
    const isHouse = input.kind === "house";
    /* ── 1. 취득세 3종 — acquisition.ts 에 맡긴다 ───────────── */
    const acquisition = (0, acquisition_1.calcAcquisition)({
        cause: "purchase",
        // 일반 토지(농지 외)는 4% — §11①7나. 농지 3%는 등기비용 계산기가 다루지 않는다
        kind: isHouse ? "house" : "building",
        price,
        area: input.area,
        regulated: input.regulated,
        houses: input.houses,
        corporate: input.corporate,
        temporaryTwo: input.temporaryTwo,
        firstHome: input.firstHome,
        firstHomeSmall: false,
        soleHeirHouse: false,
    });
    steps.push({ label: "거래금액", value: price, tone: "sub" });
    steps.push({
        label: "취득세",
        value: acquisition.acquisitionTax,
        tone: "plus",
        law: "지방세법 제11조",
        note: `세율 ${(acquisition.rate * 100).toFixed(2)}%${acquisition.heavy ? ` — ${acquisition.heavy}` : ""}${acquisition.discount > 0 ? ` · 생애최초 감면 ${(0, won_1.formatWon)(acquisition.discount)}` : ""}`,
    });
    steps.push({ label: "지방교육세", value: acquisition.eduTax, tone: "plus", depth: 1, law: "지방세법 제151조" });
    steps.push({ label: "농어촌특별세", value: acquisition.ruralTax, tone: "plus", depth: 1, law: "농어촌특별세법 제5조" });
    /* ── 2. 국민주택채권 ─────────────────────────────────────── */
    const standardValue = input.standardValue > 0 ? input.standardValue : Math.floor(price * 0.7);
    const rate = bondRate(input.kind, standardValue, input.metro);
    const bondAmount = rate > 0 ? roundBond(standardValue * rate) : 0;
    const discount = Math.min(100, Math.max(0, input.discountRate)) / 100;
    const bondCost = Math.floor(bondAmount * discount);
    steps.push({
        label: `국민주택채권 매입액 (시가표준액 × ${(rate * 100).toFixed(1)}%)`,
        value: bondAmount,
        law: "주택도시기금법 제8조 · 시행령 [별표]",
        note: `시가표준액 ${(0, won_1.formatWon)(standardValue)}${input.standardValue > 0 ? "" : " (미입력 — 거래금액의 70%로 추정)"} · ${input.metro ? "특별시·광역시" : "그 밖의 지역"} 요율. 매입액은 1만원 단위(5천원 이상 올림)`,
    });
    steps.push({
        label: `채권 즉시매도 할인비용 (할인율 ${input.discountRate}%)`,
        value: bondCost,
        tone: "plus",
        note: "채권을 사서 5년 들고 있지 않고 그 자리에서 되파는 비용. 할인율은 그날 은행 고시값",
    });
    /* ── 3. 인지세 ───────────────────────────────────────────── */
    const stamp = stampDuty(price, isHouse);
    steps.push({
        label: "인지세",
        value: stamp,
        tone: "plus",
        law: "인지세법 제3조 제1항 제1호",
        note: stamp === 0 && isHouse
            ? "주택 1억원 이하 비과세 (제6조 제5호)"
            : "매매계약서 1통 기준. 관행상 매도·매수가 절반씩 부담하지만 여기서는 전액을 잡는다",
    });
    /* ── 4. 등기신청수수료 ───────────────────────────────────── */
    const regFee = input.eForm ? exports.REG_FEE.eForm : exports.REG_FEE.paper;
    steps.push({
        label: "등기신청수수료",
        value: regFee,
        tone: "plus",
        law: "등기사항증명서 등 수수료규칙 제5조의2",
        note: input.eForm ? "e-Form 전자표준양식 13,000원 (완전 전자신청은 10,000원)" : "서면신청 15,000원 (e-Form은 13,000원)",
    });
    /* ── 5. 법무사 보수 ──────────────────────────────────────── */
    const legalFee = input.selfRegistration ? 0 : Math.max(0, input.legalFee);
    steps.push({
        label: input.selfRegistration ? "법무사 보수 (셀프등기)" : "법무사 보수 (협의액)",
        value: legalFee,
        tone: "plus",
        note: input.selfRegistration
            ? "직접 등기하면 0원. 대신 하루 반나절과 서류 준비가 든다"
            : "대한법무사협회 보수표가 상한이고 실제로는 견적으로 정한다. 은행 대출이 끼면 은행 지정 법무사가 근저당까지 같이 처리하는 경우가 많다",
    });
    /* ── 6. 근저당 설정 (대출) ───────────────────────────────── */
    let mortgageTax = 0;
    let mortgageBondCost = 0;
    if (input.mortgageMax > 0) {
        // §28① 단서 — 세율로 계산한 세액이 6천원에 못 미치면 6천원
        const regTax = Math.max(6_000, (0, won_1.truncate10)(input.mortgageMax * exports.MORTGAGE_TAX_RATE));
        const regEdu = (0, won_1.truncate10)(regTax * 0.2);
        mortgageTax = regTax + regEdu;
        const mBond = input.mortgageMax >= exports.MORTGAGE_BOND_MIN
            ? Math.min(exports.MORTGAGE_BOND_CAP, roundBond(input.mortgageMax * exports.MORTGAGE_BOND_RATE))
            : 0;
        mortgageBondCost = Math.floor(mBond * discount);
        steps.push({
            label: "근저당권 설정 등록면허세 + 지방교육세",
            value: mortgageTax,
            tone: "plus",
            law: "지방세법 제28조 제1항 제1호 다목 · 제151조",
            note: `채권최고액 ${(0, won_1.formatWon)(input.mortgageMax)} × 0.2% + 그 20%. 채권최고액은 보통 대출액의 110~120%`,
        });
        steps.push({
            label: "근저당 설정 채권 할인비용",
            value: mortgageBondCost,
            tone: "plus",
            law: "주택도시기금법 시행령 [별표]",
            note: input.mortgageMax >= exports.MORTGAGE_BOND_MIN
                ? `채권최고액 × 1% 매입 후 즉시 매도 (할인율 ${input.discountRate}%). 매입액 상한 10억원`
                : "설정금액 2천만원 미만은 채권 매입 의무가 없다",
        });
    }
    const taxes = acquisition.total + stamp + mortgageTax;
    const costs = bondCost + regFee + legalFee + mortgageBondCost;
    const total = taxes + costs;
    steps.push({ label: "세금 소계 (취득세 3종 + 인지세 + 등록면허세)", value: taxes, tone: "sub" });
    steps.push({ label: "비용 소계 (채권 할인 + 수수료 + 법무사)", value: costs, tone: "sub" });
    steps.push({ label: "등기비용 합계", value: total, tone: "total" });
    /* ── 7. 팁 ───────────────────────────────────────────────── */
    tips.push(...acquisition.tips);
    if (!input.selfRegistration && legalFee > 0) {
        tips.push({
            level: "save",
            title: `셀프등기하면 ${(0, won_1.formatWon)(legalFee)} 아낍니다`,
            body: "대출 없이 사는 집이면 해볼 만합니다. 인터넷등기소에서 e-Form으로 신청하면 수수료도 2천원 줄어듭니다. 대출이 끼면 은행이 법무사를 요구하는 경우가 많습니다.",
        });
    }
    if (input.standardValue === 0) {
        tips.push({
            level: "watch",
            title: "채권 매입액은 시가표준액으로 정해집니다",
            body: "지금은 거래금액의 70%로 추정했습니다. 부동산공시가격알리미(주택)나 위택스(건물·토지)에서 실제 시가표준액을 넣으면 채권액이 정확해집니다.",
            law: "주택도시기금법 시행령 [별표]",
        });
    }
    if (bondCost > 0) {
        tips.push({
            level: "watch",
            title: "채권 할인율은 매일 다릅니다",
            body: `오늘 할인율 ${input.discountRate}%로 계산했습니다. 등기 당일 은행 창구의 고시 할인율로 다시 계산되며, 금리가 오르면 할인율도 오릅니다.`,
        });
    }
    if (stamp > 0) {
        tips.push({
            level: "save",
            title: "인지세는 전자수입인지로 미리 사 둡니다",
            body: "계약서 작성 시점에 붙여야 하고, 나중에 붙이면 가산세가 있습니다. 매도·매수 절반씩 부담이 관행이라 실제 내 몫은 절반일 수 있습니다.",
            law: "인지세법 제8조",
        });
    }
    const headline = [
        {
            label: "등기비용 합계 (세금 + 비용)",
            value: total,
            hint: `거래금액의 ${((total / Math.max(1, price)) * 100).toFixed(2)}%`,
        },
        { label: "세금", value: taxes, hint: "취득세 3종 · 인지세" },
        { label: "비용", value: costs, hint: "채권 할인 · 수수료 · 법무사" },
    ];
    return {
        headline,
        steps,
        tips,
        acquisition,
        standardValue,
        bondRate: rate,
        bondAmount,
        bondCost,
        stamp,
        regFee,
        legalFee,
        mortgageTax,
        mortgageBondCost,
        taxes,
        costs,
        total,
        effectiveRate: total / Math.max(1, price),
    };
}
