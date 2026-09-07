"use strict";
/**
 * 부동산 중개보수(복비) — 공인중개사법 제32조, 같은 법 시행규칙 제20조 [별표 1].
 *
 * 요율은 **상한**이다. 조문은 "거래금액의 1천분의 N **이내**에서 협의"라고 적고, 시·도
 * 조례가 그 상한을 그대로 받는다(서울시 주택 중개보수 조례 2021.12.). 여기 계산은
 * 상한액이고, 실제 보수는 그 안에서 중개사와 정한다. 매도인·매수인(임대인·임차인)이
 * **각각** 이 금액을 낸다.
 *
 * 요율표 확인일 2026-09-03 — 2021-10-19 개정 이후 바뀌지 않았다. 바뀌면 이 파일 하나만
 * 고친다. 세법이 아니라 Tax DB에 조문이 없으므로 출처는 국가법령정보센터
 * (공인중개사법 시행규칙 별표 1).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTHER_MAX_RATE = exports.OFFICETEL_RATE = exports.HOUSE_LEASE = exports.HOUSE_SALE = exports.EMPTY_BROKERAGE = exports.DEAL_LABEL = exports.DEALS = exports.BROKERAGE_KIND_LABEL = exports.BROKERAGE_KINDS = void 0;
exports.leaseDealAmount = leaseDealAmount;
exports.calcBrokerage = calcBrokerage;
const validation_1 = require("./validation");
const won_1 = require("./won");
exports.BROKERAGE_KINDS = ["house", "officetel-home", "other"];
exports.BROKERAGE_KIND_LABEL = {
    house: "주택 (부속토지 포함)",
    "officetel-home": "주거용 오피스텔",
    other: "그 밖의 부동산 (상가·토지·일반 오피스텔)",
};
exports.DEALS = ["sale", "lease"];
exports.DEAL_LABEL = { sale: "매매·교환", lease: "임대차" };
exports.EMPTY_BROKERAGE = {
    kind: "house",
    deal: "sale",
    price: 9 * won_1.억,
    monthly: 0,
    vat: true,
    agreedRate: 0,
};
/** 주택 매매·교환 — 별표 1 제1호 가목 */
exports.HOUSE_SALE = [
    { below: 5000 * won_1.만, rate: 0.006, cap: 25 * won_1.만 },
    { below: 2 * won_1.억, rate: 0.005, cap: 80 * won_1.만 },
    { below: 9 * won_1.억, rate: 0.004, cap: Infinity },
    { below: 12 * won_1.억, rate: 0.005, cap: Infinity },
    { below: 15 * won_1.억, rate: 0.006, cap: Infinity },
    { below: Infinity, rate: 0.007, cap: Infinity },
];
/** 주택 임대차 — 별표 1 제1호 나목 */
exports.HOUSE_LEASE = [
    { below: 5000 * won_1.만, rate: 0.005, cap: 20 * won_1.만 },
    { below: 1 * won_1.억, rate: 0.004, cap: 30 * won_1.만 },
    { below: 6 * won_1.억, rate: 0.003, cap: Infinity },
    { below: 12 * won_1.억, rate: 0.004, cap: Infinity },
    { below: 15 * won_1.억, rate: 0.005, cap: Infinity },
    { below: Infinity, rate: 0.006, cap: Infinity },
];
/** 주거용 오피스텔(전용 85㎡ 이하, 부엌·화장실·목욕시설) — 별표 1 제2호 */
exports.OFFICETEL_RATE = { sale: 0.005, lease: 0.004 };
/** 그 밖의 부동산 — 별표 1 제3호. 0.9% 이내 협의 */
exports.OTHER_MAX_RATE = 0.009;
/**
 * 임대차 거래금액 — 시행규칙 제20조 제5항.
 * 보증금 + 월세 × 100. 그 합이 5천만원 미만이면 보증금 + 월세 × 70 으로 다시 계산한다.
 */
function leaseDealAmount(deposit, monthly) {
    const by100 = deposit + monthly * 100;
    if (by100 < 5000 * won_1.만)
        return { amount: deposit + monthly * 70, multiplier: 70 };
    return { amount: by100, multiplier: 100 };
}
function calcBrokerage(input) {
    if ((0, validation_1.hasInvalidNumbers)(input) || !(0, validation_1.isOneOf)(input.kind, exports.BROKERAGE_KINDS) || !(0, validation_1.isOneOf)(input.deal, exports.DEALS))
        return (0, validation_1.invalidCalculation)({ dealAmount: 0, rate: 0, cap: 0, fee: 0, vat: 0, total: 0, maxRate: 0 }, "부동산 종류·거래 방식과 금액을 확인해 주세요.");
    const steps = [];
    const tips = [];
    const price = Math.max(0, input.price);
    const monthly = Math.max(0, input.monthly);
    /* ── 1. 거래금액 ─────────────────────────────────────────── */
    let dealAmount = price;
    if (input.deal === "lease") {
        const { amount, multiplier } = leaseDealAmount(price, monthly);
        dealAmount = amount;
        steps.push({
            label: "거래금액 (보증금 + 월세 환산)",
            value: amount,
            tone: "sub",
            law: "공인중개사법 시행규칙 제20조 제5항",
            note: monthly > 0
                ? `보증금 ${(0, won_1.formatWon)(price)} + 월세 ${(0, won_1.formatWon)(monthly)} × ${multiplier}${multiplier === 70 ? " (100배 환산액이 5천만원 미만이라 70배로 다시 계산)" : ""}`
                : "월세가 없으면 보증금이 곧 거래금액",
        });
    }
    else {
        steps.push({ label: "거래금액", value: price, tone: "sub", law: "공인중개사법 시행규칙 제20조" });
    }
    /* ── 2. 상한 요율·한도 ───────────────────────────────────── */
    let maxRate;
    let cap = Infinity;
    let rateLaw = "공인중개사법 시행규칙 [별표 1]";
    let rateNote = "";
    if (input.kind === "house") {
        const table = input.deal === "sale" ? exports.HOUSE_SALE : exports.HOUSE_LEASE;
        const band = table.find((b) => dealAmount < b.below) ?? table[table.length - 1];
        maxRate = band.rate;
        cap = band.cap;
        rateNote = `주택 ${exports.DEAL_LABEL[input.deal]} 구간 요율${Number.isFinite(cap) ? ` · 한도 ${(0, won_1.formatWon)(cap)}` : ""}`;
    }
    else if (input.kind === "officetel-home") {
        maxRate = exports.OFFICETEL_RATE[input.deal];
        rateLaw = "공인중개사법 시행규칙 [별표 1] 제2호";
        rateNote = "전용 85㎡ 이하에 부엌·화장실·목욕시설을 갖춘 오피스텔 — 요건에 못 미치면 '그 밖의 부동산' 요율";
    }
    else {
        maxRate = exports.OTHER_MAX_RATE;
        rateLaw = "공인중개사법 시행규칙 [별표 1] 제3호";
        rateNote = "0.9% 이내에서 협의 — 상한을 그대로 받는 곳은 드물다";
    }
    const agreed = input.agreedRate > 0 ? Math.min(input.agreedRate, maxRate) : maxRate;
    steps.push({
        label: agreed < maxRate ? "협의 요율 (상한 안)" : "상한 요율",
        value: `${(agreed * 100).toFixed(2)}%${agreed < maxRate ? ` (상한 ${(maxRate * 100).toFixed(1)}%)` : ""}`,
        law: rateLaw,
        note: rateNote,
    });
    /* ── 3. 보수 ─────────────────────────────────────────────── */
    const raw = dealAmount * agreed;
    const capped = Math.min(raw, cap);
    if (capped < raw) {
        steps.push({ label: "요율 적용액", value: raw, depth: 1 });
        steps.push({ label: "한도액 적용", value: capped, tone: "sub", note: "요율로 계산한 금액이 한도를 넘어 한도액까지만" });
    }
    else {
        steps.push({ label: "중개보수 (한쪽 부담)", value: capped, tone: "sub" });
    }
    const fee = Math.floor(capped);
    /* ── 4. 부가가치세 ───────────────────────────────────────── */
    const vat = input.vat ? Math.floor(fee * 0.1) : 0;
    steps.push({
        label: "+ 부가가치세",
        value: vat,
        tone: "plus",
        law: "부가가치세법 제30조",
        note: input.vat
            ? "중개사가 일반과세자면 10%가 따로 붙는다. 사업자등록증으로 확인"
            : "간이과세자는 보수에 포함해 받거나 훨씬 낮게 붙는다 — 여기서는 0으로",
    });
    const total = fee + vat;
    steps.push({ label: "합계 (매도·매수 각각)", value: total, tone: "total" });
    /* ── 5. 팁 ───────────────────────────────────────────────── */
    if (input.kind === "house" && input.deal === "sale") {
        const edges = [9 * won_1.억, 12 * won_1.억, 15 * won_1.억];
        const near = edges.find((e) => dealAmount >= e && dealAmount < e * 1.03);
        if (near) {
            tips.push({
                level: "watch",
                title: `${(0, won_1.formatWon)(near)} 경계 바로 위입니다`,
                body: `${(0, won_1.formatWon)(near)} 미만이면 요율이 한 단계 낮습니다. 거래가액 조정 여지가 있다면 보수 차이를 같이 보세요.`,
                law: "공인중개사법 시행규칙 [별표 1]",
            });
        }
    }
    tips.push({
        level: "save",
        title: "요율은 상한이지 정가가 아닙니다",
        body: "조문이 '이내에서 협의'라고 적은 이유입니다. 계약서를 쓰기 전에 요율을 정하고, 중개대상물 확인·설명서에 적힌 보수를 확인하세요.",
        law: "공인중개사법 제32조 제4항",
    });
    if (input.deal === "sale") {
        tips.push({
            level: "watch",
            title: "매도할 때 낸 중개보수는 양도세 필요경비입니다",
            body: "영수증(현금영수증·세금계산서)을 챙기면 양도차익에서 뺄 수 있습니다. 매수 때 낸 보수는 취득가액에 더합니다.",
            law: "소득세법 시행령 제163조 제5항",
        });
    }
    if (input.kind === "other") {
        tips.push({
            level: "must",
            title: "0.9%는 상한일 뿐 — 견적을 두 곳 이상 받으세요",
            body: "상가·토지는 요율 협의 폭이 큽니다. 실제 시장은 0.3~0.9% 사이에서 갈립니다.",
        });
    }
    const headline = [
        { label: "중개보수 상한 (부가세 포함, 한쪽 부담)", value: total, hint: `요율 ${(agreed * 100).toFixed(2)}% · 거래금액 ${(0, won_1.formatWon)(dealAmount)}` },
        { label: "보수", value: fee },
        { label: "부가가치세", value: vat },
    ];
    return { headline, steps, tips, dealAmount, rate: agreed, cap, fee, vat, total, maxRate };
}
