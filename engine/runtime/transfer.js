"use strict";
/**
 * 양도소득세 4개년 시뮬레이터 — 현행 vs 2026년 세제개편 정부안(9·1 국무회의 확정).
 *
 * 보유세 계산기와 같은 구조다. "지금 팔면 얼마"가 아니라 **"언제 파느냐로 얼마나
 * 달라지느냐"**를 본다. 개편안은 2027년부터 단계적으로 들어오고, 같은 집·같은
 * 차익이라도 양도 연도에 따라 세액이 몇 배로 벌어진다.
 *
 * 현행 조문(Graph DB 확인):
 *   소득세법 §55 기본세율 · §89① 1세대1주택 비과세 · §95② 표1·표2 장기보유특별공제
 *   §103 양도소득 기본공제 250만원 · §104⑦ 조정대상지역 다주택 중과
 *   지방세법 §103의3 개인지방소득세 10%
 *
 * 개편안 수치 — 2026. 8. 3. 발표, 2026. 9. 1. 국무회의에서 정부안으로 확정(양도세 항목은 8·3안과 같다).
 * 출처: 기획재정부 「2026년 세제개편안 상세본」 56~59·68·72쪽, 문답자료 36~38·48·53쪽. 아직 법이 아니다.
 *   장기보유특별공제 → 장기거주 소득공제로 이원화, '28.1.1. 이후 양도분부터 (상세본 56쪽)
 *   1세대1주택(3년 보유 + 2년 거주): 2028년 거주 6%(최대 60%)·보유 2%(최대 20%) / 2029년 거주 8%(최대 80%)
 *   그 밖의 주택(거주 2년 미만 1주택 포함): 2028년 보유 1%(최대 15%)와 거주 2%(최대 30%) 중 높은 쪽 / 2029년 거주 2%만
 *   공제금액 한도: 2028년 20억원 · 2029년 이후 10억원 — 인별 연간·양도물건별 각각 (현행·2027년은 한도 없음)
 *   다주택 중과 한시 완화(보유 2년 이상): '27년 +5%p·+10%p / '28년 +10%p·+15%p / '29년 원상복귀.
 *     특례규정 — 중과세율이 적용된 '26년 양도분도 '27.1.1. 이후 신고 시 +5%p·+10%p 적용 (상세본 72쪽).
 *     한시 완화 기간 중에도 현행과 같이 장기보유특별공제 미적용 (문답자료 53쪽).
 *   양도소득 기본공제: 10년 이상 거주한 양도가액 30억원 이하 1세대1주택 2,500만원 ('27.1.1. 이후 양도분)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_TRANSFER = exports.고가주택기준 = exports.YEARS = void 0;
exports.table1 = table1;
exports.table2 = table2;
exports.deductionRateOf = deductionRateOf;
exports.deductionCapOf = deductionCapOf;
exports.surchargeOf = surchargeOf;
exports.basicDeductionOf = basicDeductionOf;
exports.calcYear = calcYear;
exports.calcTransfer = calcTransfer;
const progressive_1 = require("./progressive");
const won_1 = require("./won");
exports.YEARS = [2026, 2027, 2028, 2029];
/** 1세대 1주택 고가주택 기준 — 소득세법 §89①3 (실지거래가액 12억 초과). 범위·안분은 시행령 §156·§160 */
exports.고가주택기준 = 12 * won_1.억;
exports.EMPTY_TRANSFER = {
    single: true,
    houses: 1,
    regulated: true,
    salePrice: 30 * won_1.억,
    buyPrice: 10 * won_1.억,
    expense: 0,
    resident: true,
    liveYears: 8,
    holdYears: 10,
};
/* ── 공제율 ─────────────────────────────────────────────────── */
/** 표1 — 보유기간별 (3년 6% … 15년 30%). 소득세법 §95② 표1 */
function table1(hold) {
    if (hold < 3)
        return 0;
    return Math.min(hold, 15) * 0.02;
}
/** 표2 — 1세대1주택 보유 + 거주. 각 최대 40%, 합 최대 80%. §95② 표2 */
function table2(hold, live) {
    if (hold < 3)
        return 0;
    // 시행령 §159의4 — 표2는 「보유기간 중 거주기간이 2년 이상인」 1세대1주택에만. 거주 2년 미만은 표1
    if (live < 2)
        return table1(hold);
    const byHold = Math.min(Math.min(hold, 10) * 0.04, 0.4);
    const byLive = live >= 2 ? Math.min(Math.min(live, 10) * 0.04, 0.4) : 0;
    return Math.min(byHold + byLive, 0.8);
}
/**
 * 그해에 실제로 적용되는 공제율.
 * 개편안이 시행되지 않은 연도(2026)와 유예 연도(2027)는 현행과 같다.
 */
function deductionRateOf(year, regime, single, hold, live) {
    const reformed = regime === "reform" && year >= 2028;
    if (!reformed) {
        return single ? table2(hold, live) : table1(hold);
    }
    // 1세대1주택 표의 기본요건은 「3년 이상 보유 + 2년 이상 거주」 — 거주 2년 미만이면 그 밖의 주택 표
    const singleResident = single && live >= 2;
    if (year === 2028) {
        if (singleResident) {
            if (hold < 3)
                return 0;
            const byLive = live >= 2 ? Math.min(Math.min(live, 10) * 0.06, 0.6) : 0;
            const byHold = Math.min(Math.min(hold, 10) * 0.02, 0.2);
            return Math.min(byLive + byHold, 0.8);
        }
        // 다주택 — 보유 연1%(최대 15%)와 거주 연2%(최대 30%) 중 큰 쪽
        const byHold = hold >= 3 ? Math.min(Math.min(hold, 15) * 0.01, 0.15) : 0;
        const byLive = live >= 2 ? Math.min(Math.min(live, 15) * 0.02, 0.3) : 0;
        return Math.max(byHold, byLive);
    }
    // 2029년 이후 — 거주만 남는다
    if (singleResident) {
        if (hold < 3)
            return 0;
        return Math.min(Math.min(live, 10) * 0.08, 0.8);
    }
    return live >= 2 ? Math.min(Math.min(live, 15) * 0.02, 0.3) : 0;
}
/** 공제금액 한도 — 개편안만. 현행은 한도가 없다 */
function deductionCapOf(year, regime) {
    if (regime !== "reform")
        return null;
    if (year === 2028)
        return 20 * won_1.억;
    if (year >= 2029)
        return 10 * won_1.억;
    return null;
}
/**
 * 조정대상지역 다주택 중과 가산율 (%p).
 * 한시 완화는 보유 2년 이상 주택에만 붙고, 중과세율이 적용된 2026년 양도분도 2027.1.1. 이후
 * 예정·확정신고 때 2027년 완화율(+5%p·+10%p)을 적용받는다(개정안 특례규정).
 */
function surchargeOf(year, regime, houses, hold = 2) {
    if (houses < 2)
        return 0;
    const three = houses >= 3;
    const full = three ? 0.3 : 0.2;
    if (regime !== "reform" || hold < 2)
        return full;
    if (year === 2026 || year === 2027)
        return three ? 0.1 : 0.05;
    if (year === 2028)
        return three ? 0.15 : 0.1;
    return full; // 2029년 원상복귀
}
/** 양도소득 기본공제 — 개편안은 2027년부터 장기거주 1주택에 2,500만원 */
function basicDeductionOf(year, regime, single, live, salePrice) {
    if (regime === "reform" && year >= 2027 && single && live >= 10 && salePrice <= 30 * won_1.억) {
        return 2500 * won_1.만;
    }
    return 250 * won_1.만;
}
/* ── 한 해 계산 ────────────────────────────────────────────── */
function calcYear(input, year, regime) {
    const steps = [];
    const push = (s) => steps.push(s);
    const elapsed = year - 2026;
    const hold = input.holdYears + elapsed;
    const live = input.resident ? input.liveYears + elapsed : input.liveYears;
    const reformed = regime === "reform" && year >= 2027;
    const gain = Math.max(0, input.salePrice - input.buyPrice - input.expense);
    push({ label: "양도차익", value: gain, tone: "sub", law: "소득세법 제100조" });
    // 1세대 1주택 비과세 — 12억 이하 전액, 초과분만 과세 (§89①3, 시행령 §160)
    const exempt = input.single && input.salePrice <= exports.고가주택기준 && hold >= 2;
    let taxableGain = gain;
    if (input.single && hold >= 2) {
        if (exempt) {
            taxableGain = 0;
            push({
                label: "1세대 1주택 비과세",
                value: "양도가액 12억원 이하 → 전액 비과세",
                law: "소득세법 제89조 제1항 제3호",
            });
        }
        else {
            const ratio = (input.salePrice - exports.고가주택기준) / input.salePrice;
            taxableGain = gain * ratio;
            push({
                label: "고가주택 안분",
                value: taxableGain,
                tone: "sub",
                law: "소득세법 시행령 제160조",
                note: `양도차익 × (양도가액 − 12억) ÷ 양도가액 = ${(0, won_1.pct)(ratio, 1)}만 과세된다`,
            });
        }
    }
    // §95② — §104⑦ 중과 대상(조정대상지역 다주택)은 장기보유특별공제에서 빠진다. 시행령 §167의3①12의2
    // 유예는 2026.5.9 양도분까지라 현행 규정 연도에는 배제가 살아 있고, 개편안도 「한시 완화 기간 중
    // 현행 양도소득세 중과와 동일하게 장기보유특별공제 미적용」이라 적었다(문답자료 53쪽).
    const surchargeForDeduction = input.single || !input.regulated ? 0 : surchargeOf(year, regime, input.houses, hold);
    const deductionExcluded = surchargeForDeduction > 0;
    const deductionRate = deductionExcluded ? 0 : deductionRateOf(year, regime, input.single, hold, live);
    const deductionCap = deductionCapOf(year, regime);
    const rawDeduction = taxableGain * deductionRate;
    const deduction = deductionCap === null ? rawDeduction : Math.min(rawDeduction, deductionCap);
    const capApplied = deductionCap !== null && rawDeduction > deductionCap;
    push({
        label: reformed && year >= 2028 ? "장기거주 소득공제" : "장기보유 특별공제",
        value: deduction,
        tone: "minus",
        law: reformed && year >= 2028 ? "2026년 세제개편안" : "소득세법 제95조",
        note: deductionExcluded
            ? "조정대상지역 다주택 중과 대상은 장기보유특별공제를 받지 못한다 (제95조 제2항)"
            : `공제율 ${(0, won_1.pct)(deductionRate, 0)} (보유 ${hold}년 · 거주 ${live}년)${capApplied ? ` — ${(0, won_1.formatWon)(deductionCap)} 한도에서 잘림` : ""}`,
    });
    const income = Math.max(0, taxableGain - deduction);
    push({ label: "양도소득금액", value: income, tone: "sub" });
    const basicDeduction = basicDeductionOf(year, regime, input.single, live, input.salePrice);
    push({
        label: "− 양도소득 기본공제",
        value: basicDeduction,
        tone: "minus",
        law: basicDeduction > 250 * won_1.만 ? "2026년 세제개편안" : "소득세법 제103조",
        note: basicDeduction > 250 * won_1.만
            ? "10년 이상 거주한 30억원 이하 1세대1주택 — 개편안이 250만원을 2,500만원으로 올린다"
            : undefined,
    });
    const taxBase = Math.max(0, income - basicDeduction);
    push({ label: "과세표준", value: taxBase, tone: "sub" });
    const applied = (0, progressive_1.applyBands)(taxBase, progressive_1.BANDS_INCOME);
    const surcharge = input.single || !input.regulated ? 0 : surchargeOf(year, regime, input.houses, hold);
    const rate = applied.rate + surcharge;
    const relieved = surcharge > 0 && surcharge < surchargeOf(year, "current", input.houses);
    push({
        label: "적용세율",
        value: surcharge > 0 ? `${(0, won_1.pct)(applied.rate, 0)} ＋ ${(0, won_1.pct)(surcharge, 0)}p` : (0, won_1.pct)(applied.rate, 0),
        law: surcharge > 0 ? "소득세법 제104조 제7항" : "소득세법 제55조",
        note: relieved
            ? year === 2026
                ? "중과세율이 적용된 2026년 양도분도 2027.1.1. 이후 예정·확정신고 때 +5%p·+10%p로 완화된다 (개정안 특례규정, 보유 2년 이상)"
                : "다주택 중과 한시 완화 (개정안, 보유 2년 이상)"
            : surcharge > 0 && regime === "reform" && hold < 2
                ? "보유 2년 미만은 한시 완화 대상이 아니다"
                : undefined,
    });
    const transferTax = (0, won_1.truncate10)(Math.max(0, taxBase * rate - applied.quick));
    push({ label: "양도소득세", value: transferTax, tone: "sub" });
    const localTax = (0, won_1.truncate10)(transferTax * 0.1);
    push({
        label: "＋ 개인지방소득세 10%",
        value: localTax,
        tone: "plus",
        law: "지방세법 제103조의3",
    });
    const total = transferTax + localTax;
    push({ label: "총 부담세액", value: total, tone: "total" });
    return {
        year,
        regime,
        hold,
        live,
        reformed,
        exempt,
        gain,
        taxableGain,
        deductionRate,
        deductionCap,
        deduction,
        capApplied,
        basicDeduction,
        taxBase,
        rate,
        surcharge,
        transferTax,
        localTax,
        total,
        steps,
    };
}
function calcTransfer(input) {
    const actual = exports.YEARS.map((y) => calcYear(input, y, "reform"));
    const current = exports.YEARS.map((y) => calcYear(input, y, "current"));
    const cheapest = actual.reduce((a, b) => (b.total < a.total ? b : a));
    const worst = actual.reduce((a, b) => (b.total > a.total ? b : a));
    return { actual, current, cheapest, worst, tips: transferTips(input, actual) };
}
function transferTips(input, actual) {
    const tips = [];
    const y2026 = actual[0];
    const y2029 = actual[3];
    const gap = y2029.total - y2026.total;
    if (y2026.exempt) {
        tips.push({
            level: "save",
            title: "지금은 비과세다 — 12억원 선을 넘는 순간 달라진다",
            body: "1세대 1주택은 양도가액 12억원까지 세금이 없다. 집값이 12억원을 넘으면 넘은 비율만큼 과세로 넘어오고, 그때부터는 거주기간이 세액을 좌우한다.",
            law: "소득세법 제89조 제1항 제3호",
        });
    }
    if (gap > 0) {
        tips.push({
            level: "must",
            title: `2029년에 팔면 2026년보다 ${(0, won_1.formatWon)(gap)}을 더 낸다`,
            body: "개편안은 2028년부터 공제 방식을 바꾸고 공제금액에 한도(2028년 20억·2029년 10억)를 새로 둔다. 차익이 큰 집일수록 한도에서 잘리는 금액이 커진다.",
            law: "2026년 세제개편안",
        });
    }
    if (input.single && !input.resident) {
        tips.push({
            level: "must",
            title: "거주하지 않으면 2029년에 공제가 0이 된다",
            body: "개편안의 핵심은 '보유'가 아니라 '거주'다. 2029년부터 1세대 1주택 보유공제는 폐지되고 거주공제만 남는다. 지금 거주기간이 쌓이지 않는 집은 그해에 공제율이 통째로 사라진다.",
            law: "2026년 세제개편안",
        });
    }
    if (input.single && input.resident && input.liveYears < 10) {
        const need = 10 - input.liveYears;
        tips.push({
            level: "save",
            title: `거주 ${need}년을 더 채우면 거주공제가 상한에 닿는다`,
            body: `2029년 기준 거주공제는 연 8%, 10년이면 80%로 상한이다. 지금 거주 ${input.liveYears}년이라 ${need}년이 더 필요하다. 같은 해에 양도해도 거주 1년 차이로 공제율이 8%p씩 움직인다.`,
            law: "2026년 세제개편안",
        });
    }
    const capped = actual.find((r) => r.capApplied);
    if (capped) {
        tips.push({
            level: "watch",
            title: `${capped.year}년부터 공제금액 한도에 걸린다`,
            body: `공제율로는 ${(0, won_1.formatWon)(capped.taxableGain * capped.deductionRate)}이 빠져야 하지만 한도 ${(0, won_1.formatWon)(capped.deductionCap)}에서 잘린다. 한도는 사람별·연간·물건별로 각각 적용되므로, 물건을 나눠 여러 해에 걸쳐 파는 설계가 의미를 갖는다.`,
            law: "2026년 세제개편안",
        });
    }
    if (!input.single && input.regulated) {
        tips.push({
            level: "save",
            title: "중과 한시 완화는 2027~2028년 양도분, 2026년 양도분은 신고 때 소급",
            body: "조정대상지역 다주택 중과는 2027년 +5%p·+10%p, 2028년 +10%p·+15%p로 낮아졌다가 2029년에 원래대로(+20%p·+30%p) 돌아간다. 이미 중과로 판 2026년 양도분도 2027년 1월 1일 이후 신고하면 +5%p·+10%p를 적용받는다. 보유 2년 이상 주택만이고, 완화 기간에도 장기보유특별공제는 없다.",
            law: "2026년 세제개편 정부안 (소득세법 제104조 제7항 단서 신설안)",
        });
    }
    tips.push({
        level: "must",
        title: "예정신고는 양도일이 속하는 달의 말일부터 2개월",
        body: "같은 해에 두 번 이상 팔았다면 다음 해 5월에 확정신고로 합산해야 한다. 합산하면 누진세율이 올라가 세액이 더 나온다.",
        law: "소득세법 제105조·제110조",
    });
    tips.push({
        level: "watch",
        title: "이 시뮬레이션은 아직 법이 아니다",
        body: "2026년 8월 3일 발표돼 9월 1일 국무회의에서 확정된 정부안이며 정기국회 심의에서 바뀔 수 있다. 시행령으로 정할 부분(거주기간 산정 방법 등)도 아직 확정되지 않았다.",
    });
    return tips;
}
