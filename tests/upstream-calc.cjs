#!/usr/bin/env node
/** Upstream calculation regressions, adapted only to use the shipped runtime.
 * Run: node tests/upstream-calc.cjs
 * Source hashes and adaptation scope: docs/source-provenance.md
 */
const path = require('node:path');
const out = path.join(__dirname, '..', 'engine', 'runtime');

const { 억, 만, pct, formatWon, truncate10, truncate1000 } = require(path.join(out, "won.js"));
const { BANDS_INHERITANCE, BANDS_INCOME, applyBands } = require(path.join(out, "progressive.js"));
const inh = require(path.join(out, "inheritance.js"));
const gift = require(path.join(out, "gift.js"));
const acq = require(path.join(out, "acquisition.js"));
const tr = require(path.join(out, "transfer.js"));

let failures = 0;
let checks = 0;

function ok(name, cond, detail = "") {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n── ${title}`);
}

const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";

/** 값을 훑으며 결과가 줄어드는 지점을 찾는다 */
function monotonic(name, values, f) {
  let prev = -Infinity;
  let broke = null;
  for (const v of values) {
    const y = f(v);
    if (y < prev - 1) {
      broke = { at: v, prev, y };
      break;
    }
    prev = y;
  }
  ok(name, broke === null, broke ? `${broke.at} 에서 ${won(broke.prev)} → ${won(broke.y)} 로 역전` : "");
}

/* ══ 0. 서식 ═══════════════════════════════════════════════ */
section("금액·백분율 서식");
{
  /* 화면에 찍히는 숫자를 바꾸는 함수라 계산식만큼 중요하다.
     실제로 pct(0.2, 0)이 "2%"로 찍히는 버그가 여기 없어서 화면까지 나갔다. */
  ok('pct(0.2, 0) = "20%"', pct(0.2, 0) === "20%", pct(0.2, 0));
  ok('pct(0.3, 0) = "30%"', pct(0.3, 0) === "30%", pct(0.3, 0));
  ok('pct(0.8, 0) = "80%"', pct(0.8, 0) === "80%", pct(0.8, 0));
  ok('pct(0, 0) = "0%"', pct(0, 0) === "0%", pct(0, 0));
  ok('pct(0.05, 0) = "5%"', pct(0.05, 0) === "5%", pct(0.05, 0));
  ok('pct(0.01) = "1%"', pct(0.01) === "1%", pct(0.01));
  ok('pct(0.008) = "0.8%"', pct(0.008) === "0.8%", pct(0.008));
  ok('pct(0.035) = "3.5%"', pct(0.035) === "3.5%", pct(0.035));
  ok('pct(0.12) = "12%"', pct(0.12) === "12%", pct(0.12));
  ok('pct(0.1234, 2) = "12.34%"', pct(0.1234, 2) === "12.34%", pct(0.1234, 2));
  ok('pct(0.005, 1) = "0.5%"', pct(0.005, 1) === "0.5%", pct(0.005, 1));

  ok('formatWon(0) = "0원"', formatWon(0) === "0원", formatWon(0));
  ok('formatWon(1억) = "1억원"', formatWon(억) === "1억원", formatWon(억));
  ok('formatWon(1억2345만) = "1억 2,345만원"',
    formatWon(억 + 2345 * 만) === "1억 2,345만원", formatWon(억 + 2345 * 만));
  ok('formatWon(12345) = "1만 2,345원"', formatWon(12345) === "1만 2,345원", formatWon(12345));
  ok('formatWon(-5000) = "−5,000원"', formatWon(-5000) === "−5,000원", formatWon(-5000));
  ok("formatWon은 소수를 반올림한다", formatWon(9999.6) === "1만원", formatWon(9999.6));

  ok("10원 절사", truncate10(12345) === 12340, String(truncate10(12345)));
  ok("1,000원 절사", truncate1000(1234567) === 1234000, String(truncate1000(1234567)));
  ok("절사는 음수를 0으로", truncate10(-5) === 0 && truncate1000(-5) === 0);
}

/* ══ 0. 누진세율표가 조문과 같은가 ═════════════════════════ */
section("누진세율표 ↔ 조문 대조");
{
  // 상증세법 §26 — 구간 하한에서의 세액 (1천만 / 9천만 / 2억4천만 / 10억4천만)
  const statute = [0, 10_000_000, 90_000_000, 240_000_000, 1_040_000_000];
  BANDS_INHERITANCE.forEach((b, i) => {
    if (i === 0) return;
    const lower = BANDS_INHERITANCE[i - 1].upTo;
    const byQuick = lower * b.rate - b.quick;
    ok(`상증세법 §26 구간 ${i} 하한 세액`, Math.abs(byQuick - statute[i]) < 1,
      `누진공제식 ${won(byQuick)} ≠ 조문 ${won(statute[i])}`);
  });

  // 소득세법 §55 — 84만 / 624만 / 1,536만 / 3,706만 / 9,406만 / 1억7,406만 / 3억8,406만
  const inc = [0, 840_000, 6_240_000, 15_360_000, 37_060_000, 94_060_000, 174_060_000, 384_060_000];
  BANDS_INCOME.forEach((b, i) => {
    if (i === 0) return;
    const lower = BANDS_INCOME[i - 1].upTo;
    const byQuick = lower * b.rate - b.quick;
    ok(`소득세법 §55 구간 ${i} 하한 세액`, Math.abs(byQuick - inc[i]) < 1,
      `누진공제식 ${won(byQuick)} ≠ 조문 ${won(inc[i])}`);
  });

  // 구간 경계에서 두 구간의 세액이 이어지는가 (불연속이면 세액이 튄다)
  for (const [label, bands] of [["상증세", BANDS_INHERITANCE], ["소득세", BANDS_INCOME]]) {
    bands.forEach((b, i) => {
      if (!Number.isFinite(b.upTo)) return;
      const a = applyBands(b.upTo, bands).tax;
      const c = applyBands(b.upTo + 1, bands).tax;
      ok(`${label} 구간 경계 ${won(b.upTo)} 연속성`, Math.abs(c - a) < 2, `${won(a)} → ${won(c)}`);
    });
  }
}

/* ══ 1. 상속세 ═════════════════════════════════════════════ */
section("상속세");
{
  const base = { ...inh.EMPTY_INHERITANCE, debt: 0, financialDebt: 0, deposit: 0, house: 0 };
  const at = (etc) => inh.calcInheritance({ ...base, etc }).payable;

  // 재산이 늘면 세금이 는다 — 1억 단위로 30억까지
  monotonic("재산 증가 시 세액 단조증가", Array.from({ length: 40 }, (_, i) => (i + 1) * 억), at);
  // 잘게 훑기 — 공제 경계 주변
  monotonic("공제 경계 근처 단조증가",
    Array.from({ length: 60 }, (_, i) => 8 * 억 + i * 2000 * 만), at);

  // 배우자 + 자녀 2 → 일괄공제 5억 + 배우자 최소 5억 = 10억까지 세금 0
  ok("배우자+자녀2, 재산 10억 → 세금 0", at(10 * 억) === 0, won(at(10 * 억)));
  ok("배우자+자녀2, 재산 10.5억 → 세금 발생", at(10.5 * 억) > 0);

  // 자녀만 2명(배우자 없음) → 일괄공제 5억
  const noSpouse = (etc) =>
    inh.calcInheritance({ ...base, etc, hasSpouse: false, spouseActual: null }).payable;
  ok("배우자 없이 자녀2, 재산 5억 → 세금 0", noSpouse(5 * 억) === 0, won(noSpouse(5 * 억)));
  ok("배우자 없이 자녀2, 재산 5.5억 → 세금 발생", noSpouse(5.5 * 억) > 0);
  monotonic("배우자 없는 경우 단조증가",
    Array.from({ length: 40 }, (_, i) => (i + 1) * 억), noSpouse);

  // 일괄공제 vs 인적공제 — 자녀가 많아지면 인적공제가 이긴다
  const many = inh.calcInheritance({ ...base, etc: 30 * 억, children: 8 });
  ok("자녀 8명이면 인적공제(2억+4억)가 일괄공제 5억을 넘는다", many.lumpSumUsed === false,
    `personalSum=${won(many.personalSum)}`);
  const few = inh.calcInheritance({ ...base, etc: 30 * 억, children: 2 });
  ok("자녀 2명이면 일괄공제 5억", few.lumpSumUsed === true);

  // 자녀가 늘면 인적공제가 늘어 세금이 줄거나 같다 — **배우자가 없을 때** 성립한다.
  let prev = Infinity;
  for (let c = 1; c <= 12; c++) {
    const t = inh.calcInheritance({
      ...base, etc: 40 * 억, children: c, hasSpouse: false,
    }).payable;
    ok(`자녀 ${c}명 (배우자 없음) — 세액이 늘지 않는다`, t <= prev + 1, `${won(prev)} → ${won(t)}`);
    prev = t;
  }

  /* 배우자가 있으면 반대로 움직인다 — 버그가 아니라 §19①1 의 구조다.
     한도 = (상속재산 − 채무 + 사전증여) × **배우자 법정상속분**. 자녀가 늘수록
     그 분모가 커져 한도가 줄고, 자녀공제 5천만원이 그 감소를 못 따라간다.
     계산기 화면에도 이 방향을 그대로 보여 줘야 사용자가 오해하지 않는다. */
  const withSpouse = [0, 1, 2, 4, 6].map(
    (c) => inh.calcInheritance({ ...base, etc: 40 * 억, children: c }).payable,
  );
  ok("법정상속분 가정에서는 자녀가 늘수록 세액이 는다",
    withSpouse.every((v, i) => i === 0 || v > withSpouse[i - 1]),
    withSpouse.map(won).join(" → "));
  ok("배우자 법정상속분 — 자녀 0명이면 전부", inh.spouseLegalShare(0) === 1);
  ok("배우자 법정상속분 — 자녀 2명이면 1.5/3.5",
    Math.abs(inh.spouseLegalShare(2) - 1.5 / 3.5) < 1e-12);
  // 배우자 몫을 늘리면 세금은 줄거나 같다 (한도에 닿기 전까지)
  let ps = Infinity;
  for (let a = 0; a <= 20; a++) {
    const t = inh.calcInheritance({ ...base, etc: 40 * 억, spouseActual: a * 억 }).payable;
    ok(`배우자 실제 상속 ${a}억 — 세액이 늘지 않는다`, t <= ps + 1, `${won(ps)} → ${won(t)}`);
    ps = t;
  }
  // 배우자공제는 30억에서 잘린다
  const huge = inh.calcInheritance({
    ...base, etc: 200 * 억, children: 0, hasSpouse: true, spouseActual: 200 * 억,
  });
  const spouseStep = huge.steps.find((x) => x.label === "배우자 상속공제");
  ok("배우자 상속공제 30억 한도", spouseStep && spouseStep.value === 30 * 억,
    won(spouseStep?.value ?? 0));

  // 장례비 공제는 500만~1,000만 사이에서만 움직인다
  ok("장례비 0원 → 500만원 공제", inh.funeralDeduction(0) === 500 * 만);
  ok("장례비 300만원 → 500만원 공제", inh.funeralDeduction(300 * 만) === 500 * 만);
  ok("장례비 700만원 → 700만원 공제", inh.funeralDeduction(700 * 만) === 700 * 만);
  ok("장례비 5,000만원 → 1,000만원 공제", inh.funeralDeduction(5000 * 만) === 1000 * 만);

  // 금융재산 공제 경계 — 2천만원 / 2억원 한도
  const fin = (deposit) =>
    inh.calcInheritance({ ...base, etc: 30 * 억, deposit }).steps
      .find((s) => s.label === "금융재산 상속공제")?.value ?? 0;
  ok("순금융재산 2,000만원 → 전액 공제", fin(2000 * 만) === 2000 * 만, won(fin(2000 * 만)));
  ok("순금융재산 2,001만원 → 2,000만원 공제(20%보다 큼)",
    Math.abs(fin(2001 * 만) - 2000 * 만) < 1, won(fin(2001 * 만)));
  ok("순금융재산 10억 → 2억 한도", fin(10 * 억) === 2 * 억, won(fin(10 * 억)));
  monotonic("금융재산 공제 단조증가",
    Array.from({ length: 60 }, (_, i) => i * 2000 * 만), (d) => fin(d));

  // 동거주택 공제는 6억 한도
  const co = inh.calcInheritance({ ...base, house: 20 * 억, etc: 0, coResidence: true });
  const coStep = co.steps.find((s) => s.label === "동거주택 상속공제");
  ok("동거주택 공제 6억 한도", coStep && coStep.value === 6 * 억, won(coStep?.value ?? 0));

  // 채무가 늘면 세금이 줄어든다
  let pd = Infinity;
  for (let d = 0; d <= 20; d++) {
    const t = inh.calcInheritance({ ...base, etc: 40 * 억, debt: d * 억, financialDebt: 0 }).payable;
    ok(`채무 ${d}억 — 세액이 늘지 않는다`, t <= pd + 1, `${won(pd)} → ${won(t)}`);
    pd = t;
  }

  // 신고기한 — 2026년 8월 상속개시 → 2027년 2월 말일
  ok("신고기한 계산", inh.filingDeadline(2026, 8) === "2027년 2월 28일", inh.filingDeadline(2026, 8));
  ok("신고기한 계산(12월)", inh.filingDeadline(2026, 12) === "2027년 6월 30일", inh.filingDeadline(2026, 12));
}

/* ══ 2. 증여세 ═════════════════════════════════════════════ */
section("증여세");
{
  const base = { ...gift.EMPTY_GIFT, realEstate: 0 };
  const at = (cash, over = {}) => gift.calcGift({ ...base, cash, ...over }).payable;

  monotonic("증여재산 증가 시 세액 단조증가",
    Array.from({ length: 80 }, (_, i) => i * 5000 * 만), at);

  // 성인 자녀 5천만원 공제 경계
  ok("성인 자녀 5,000만원 → 세금 0", at(5000 * 만) === 0, won(at(5000 * 만)));
  ok("성인 자녀 5,100만원 → 세금 발생", at(5100 * 만) > 0);
  // 미성년 2천만원
  ok("미성년 2,000만원 → 세금 0", at(2000 * 만, { minor: true }) === 0);
  ok("미성년 2,100만원 → 세금 발생", at(2100 * 만, { minor: true }) > 0);
  // 배우자 6억
  ok("배우자 6억 → 세금 0", at(6 * 억, { relation: "spouse" }) === 0);
  ok("배우자 6억 100만 → 세금 발생", at(6 * 억 + 100 * 만, { relation: "spouse" }) > 0);
  // 기타 친족 1천만
  ok("친족 1,000만원 → 세금 0", at(1000 * 만, { relation: "kin" }) === 0);
  // 타인 — 공제 없음
  ok("타인 100만원도 과세표준은 생기지만 과세최저한 아래",
    gift.calcGift({ ...base, cash: 40 * 만, relation: "other" }).belowMinimum === true);
  ok("타인 1,000만원 → 세금 발생", at(1000 * 만, { relation: "other" }) > 0);

  // 혼인·출산 공제 1억이 더 붙는다
  ok("혼인·출산 공제 시 1.5억까지 무세",
    at(1.5 * 억, { marriageBirth: true }) === 0, won(at(1.5 * 억, { marriageBirth: true })));
  ok("혼인·출산 공제 시 1.51억 → 세금 발생", at(1.51 * 억, { marriageBirth: true }) > 0);

  // 세대생략 할증 30%
  const plain = gift.calcGift({ ...base, cash: 10 * 억 });
  const skip = gift.calcGift({ ...base, cash: 10 * 억, generationSkip: true });
  ok("세대생략 할증으로 세액이 커진다", skip.payable > plain.payable);
  ok("세대생략 할증이 정확히 30%", Math.abs(skip.grossTax / plain.grossTax - 1.3) < 1e-9,
    `${skip.grossTax / plain.grossTax}`);

  // 10년 합산 — 사전증여를 더하면 누진 구간이 올라간다
  const split = gift.calcGift({ ...base, cash: 5 * 억 });
  // Confirmed prior 5억원 gift: 5천만원 deduction, 4.5억원 base, 8천만원 pre-credit tax.
  const merged = gift.calcGift({ ...base, cash: 5 * 억, priorGift: 5 * 억,
    priorDetailsConfirmed: true, priorTaxBase: 4.5 * 억, priorGiftGrossTax: 8000 * 만,
    usedDeduction: 5000 * 만, priorIncludedDeduction: 5000 * 만 });
  ok("사전증여 합산 시 세액이 커진다", merged.payable > split.payable);

  // 부담부증여 — 채무만큼 과세가액이 준다
  const nodebt = gift.calcGift({ ...base, cash: 10 * 억 });
  const withdebt = gift.calcGift({ ...base, cash: 10 * 억, assumedDebt: 3 * 억 });
  ok("부담부증여로 증여세가 준다", withdebt.payable < nodebt.payable);
  ok("부담부증여 양도분이 기록된다", withdebt.transferPortion === 3 * 억);

  // 신고기한 3개월
  ok("증여 신고기한", gift.giftDeadline(2026, 8) === "2026년 11월 30일", gift.giftDeadline(2026, 8));

  // 상속세와 세율이 같아야 한다 (§56 은 §26 을 준용)
  const g = gift.calcGift({ ...base, cash: 30 * 억 + 5000 * 만, relation: "other" });
  const applied = applyBands(g.taxBase, BANDS_INHERITANCE);
  ok("증여세 산출세액 = 상속세 세율표", Math.abs(g.grossTax - applied.tax) < 1);
}

/* ══ 3. 취득세 ═════════════════════════════════════════════ */
section("취득세");
{
  const base = { ...acq.EMPTY_ACQUISITION, regulated: false, houses: 1, area: 84 };
  const total = (price, over = {}) => acq.calcAcquisition({ ...base, price, ...over }).total;

  monotonic("취득가액 증가 시 총세액 단조증가",
    Array.from({ length: 120 }, (_, i) => (i + 1) * 1000 * 만), (p) => total(p));

  // 6억 / 9억 경계 (지방세법 §11①8)
  ok("6억 이하 1%", acq.houseRate(6 * 억) === 0.01);
  // 백분율의 소수 넷째자리 반올림(§11①8 나목): 바로 위의 작은 증가분은 1.0000%다.
  ok("6억 + 1,000만원 → 1%를 넘는다", acq.houseRate(6 * 억 + 1000 * 만) > 0.01,
    String(acq.houseRate(6 * 억 + 1000 * 만)));
  // Official Yechon example: percentage four decimals, 7억원 → 1.6667%.
  // https://www.ycg.kr/open.content/ko/section/taxation/do/acquisition/
  ok("7억원 취득세율은 1.6667% (백분율 소수 넷째자리)",
    acq.houseRate(7 * 억) === 0.016667);
  ok("9억 이하 구간 상한이 3%에 닿는다", Math.abs(acq.houseRate(9 * 억) - 0.03) < 1e-9,
    String(acq.houseRate(9 * 억)));
  ok("9억 초과 3%", acq.houseRate(9 * 억 + 만) === 0.03);
  ok("7.5억은 2%", Math.abs(acq.houseRate(7.5 * 억) - 0.02) < 1e-9, String(acq.houseRate(7.5 * 억)));
  // 구간 경계에서 세액이 튀지 않는다
  const justUnder = total(6 * 억);
  const justOver = total(6 * 억 + 10 * 만);
  ok("6억 경계에서 세액이 급등하지 않는다", justOver - justUnder < 100 * 만,
    `${won(justUnder)} → ${won(justOver)}`);

  // 중과 판정 (지방세법 §13의2)
  const heavy = (over) => acq.heavyMultiple({ ...base, ...over });
  ok("조정 1주택 → 중과 없음", heavy({ regulated: true, houses: 1 }) === 0);
  ok("조정 2주택 → 200%", heavy({ regulated: true, houses: 2 }) === 2);
  ok("조정 2주택 일시적 → 중과 없음", heavy({ regulated: true, houses: 2, temporaryTwo: true }) === 0);
  ok("조정 3주택 → 400%", heavy({ regulated: true, houses: 3 }) === 4);
  ok("비조정 2주택 → 중과 없음", heavy({ regulated: false, houses: 2 }) === 0);
  ok("비조정 3주택 → 200%", heavy({ regulated: false, houses: 3 }) === 2);
  ok("비조정 4주택 → 400%", heavy({ regulated: false, houses: 4 }) === 4);
  ok("법인 → 400%", heavy({ corporate: true, houses: 1 }) === 4);

  // 중과 세율 8% / 12%
  const r8 = acq.calcAcquisition({ ...base, price: 10 * 억, regulated: true, houses: 2 });
  ok("조정 2주택 세율 8%", Math.abs(r8.rate - 0.08) < 1e-9, String(r8.rate));
  ok("조정 2주택 지방교육세 0.4%", Math.abs(r8.eduTax / (10 * 억) - 0.004) < 1e-4,
    String(r8.eduTax / (10 * 억)));
  const r12 = acq.calcAcquisition({ ...base, price: 10 * 억, regulated: true, houses: 3, area: 100 });
  ok("조정 3주택 세율 12%", Math.abs(r12.rate - 0.12) < 1e-9, String(r12.rate));
  ok("조정 3주택 농특세 1.0%", Math.abs(r12.ruralTax / (10 * 억) - 0.01) < 1e-4,
    String(r12.ruralTax / (10 * 억)));
  const r8big = acq.calcAcquisition({ ...base, price: 10 * 억, regulated: true, houses: 2, area: 100 });
  ok("조정 2주택 농특세 0.6%", Math.abs(r8big.ruralTax / (10 * 억) - 0.006) < 1e-4,
    String(r8big.ruralTax / (10 * 억)));

  // 2026-09-04 감사 회귀 — 증여 중과 농특세·법인 생애최초·상속 특례 교육세
  const g12 = acq.calcAcquisition({ ...base, cause: "gift", price: 5 * 억, regulated: true, houses: 2, area: 100 });
  ok("조정 3억 이상 증여 12% 농특세 1.0%", Math.abs(g12.ruralTax / (5 * 억) - 0.01) < 1e-4, String(g12.ruralTax / (5 * 억)));
  const corpFirst = acq.calcAcquisition({ ...base, price: 5 * 억, corporate: true, firstHome: true, houses: 1 });
  ok("법인은 생애최초 감면 없이 12%", Math.abs(corpFirst.rate - 0.12) < 1e-9 && corpFirst.discount === 0, String(corpFirst.rate));
  const heir = acq.calcAcquisition({ ...base, cause: "inherit", price: 5 * 억, soleHeirHouse: true, area: 100 });
  ok("1가구1주택 상속 0.8% — 지방교육세 0.16%", Math.abs(heir.eduTax / (5 * 억) - 0.0016) < 1e-4, String(heir.eduTax / (5 * 억)));
  ok("1가구1주택 상속 — 85㎡ 초과라도 농특세 비과세", heir.ruralTax === 0, String(heir.ruralTax));

  // 세무통 예시 대조 — 서울 9억 아파트 1주택 84㎡: 취득세 2,700만 + 지방교육세 270만 = 2,970만
  const semutong = acq.calcAcquisition({
    ...base, price: 9 * 억, area: 84, regulated: true, houses: 1,
  });
  ok("9억 1주택 84㎡ 취득세 2,700만원", semutong.acquisitionTax === 2700 * 만, won(semutong.acquisitionTax));
  ok("9억 1주택 84㎡ 지방교육세 270만원", semutong.eduTax === 270 * 만, won(semutong.eduTax));
  ok("9억 1주택 84㎡ 농특세 비과세", semutong.ruralTax === 0);
  ok("9억 1주택 84㎡ 총 2,970만원", semutong.total === 2970 * 만, won(semutong.total));

  // 85㎡ 경계 — 농특세
  const under85 = acq.calcAcquisition({ ...base, price: 10 * 억, area: 85 });
  const over85 = acq.calcAcquisition({ ...base, price: 10 * 억, area: 85.1 });
  ok("85㎡ 이하 농특세 0", under85.ruralTax === 0);
  ok("85㎡ 초과 농특세 0.2%", Math.abs(over85.ruralTax - 10 * 억 * 0.002) < 1000,
    won(over85.ruralTax));

  // 상속 세율
  const inheritHouse = acq.calcAcquisition({ ...base, cause: "inherit", price: 5 * 억 });
  ok("주택 상속 2.8%", Math.abs(inheritHouse.rate - 0.028) < 1e-9);
  const soleHeir = acq.calcAcquisition({ ...base, cause: "inherit", price: 5 * 억, soleHeirHouse: true });
  ok("1가구1주택 상속 0.8%", Math.abs(soleHeir.rate - 0.008) < 1e-9, String(soleHeir.rate));
  ok("1가구1주택 상속이 더 싸다", soleHeir.total < inheritHouse.total);

  // 증여 세율
  const giftPlain = acq.calcAcquisition({ ...base, cause: "gift", price: 5 * 억 });
  ok("증여 3.5%", Math.abs(giftPlain.rate - 0.035) < 1e-9);
  const giftHeavy = acq.calcAcquisition({ ...base, cause: "gift", price: 5 * 억, regulated: true });
  ok("조정 3억 이상 증여 12%", Math.abs(giftHeavy.rate - 0.12) < 1e-9);
  const giftSmall = acq.calcAcquisition({ ...base, cause: "gift", price: 2 * 억, regulated: true });
  ok("조정이어도 3억 미만 증여는 3.5%", Math.abs(giftSmall.rate - 0.035) < 1e-9);

  // 생애최초 감면 — 200만원 한도, 12억 경계, 중과 배제
  const first = acq.calcAcquisition({ ...base, price: 8 * 억, firstHome: true });
  const noFirst = acq.calcAcquisition({ ...base, price: 8 * 억 });
  ok("생애최초 감면 200만원", first.discount === 200 * 만, won(first.discount));
  ok("생애최초가 더 싸다", first.total < noFirst.total);
  const firstOver = acq.calcAcquisition({ ...base, price: 12 * 억 + 만, firstHome: true });
  ok("12억 초과는 생애최초 감면 없음", firstOver.discount === 0);
  const firstHeavy = acq.calcAcquisition({
    ...base, price: 8 * 억, firstHome: true, regulated: true, houses: 2,
  });
  ok("생애최초는 중과세율을 적용하지 않는다", firstHeavy.rate < 0.08, String(firstHeavy.rate));
  const firstSmall = acq.calcAcquisition({ ...base, price: 3 * 억, firstHome: true, firstHomeSmall: true });
  ok("소형 생애최초 감면 300만원 한도", firstSmall.discount === 300 * 만, won(firstSmall.discount));
  const tiny = acq.calcAcquisition({ ...base, price: 1.5 * 억, firstHome: true });
  ok("산출세액 200만원 이하면 전액 면제", tiny.acquisitionTax === 0, won(tiny.acquisitionTax));

  // 주택 외
  const shop = acq.calcAcquisition({ ...base, kind: "building", price: 10 * 억 });
  ok("상가 4%", Math.abs(shop.rate - 0.04) < 1e-9);
  ok("상가 지방교육세 0.4%", Math.abs(shop.eduTax / (10 * 억) - 0.004) < 1e-4);
  ok("상가 농특세 0.2%", Math.abs(shop.ruralTax / (10 * 억) - 0.002) < 1e-4);
}

/* ══ 4. 양도세 시뮬레이터 ══════════════════════════════════ */
section("양도세 시뮬레이터");
{
  const base = tr.EMPTY_TRANSFER;

  // 양도가액이 오르면 세금이 오른다 (취득가액 고정)
  monotonic("양도가액 증가 시 세액 단조증가",
    Array.from({ length: 60 }, (_, i) => 12 * 억 + i * 억),
    (salePrice) => tr.calcYear({ ...base, salePrice }, 2026, "current").total);

  // 12억 경계 — 1세대1주택 비과세
  const at12 = tr.calcYear({ ...base, salePrice: 12 * 억 }, 2026, "current");
  const over12 = tr.calcYear({ ...base, salePrice: 12 * 억 + 1000 * 만 }, 2026, "current");
  ok("양도가액 12억 → 비과세", at12.exempt === true && at12.total === 0, won(at12.total));
  ok("12억 초과 → 과세 시작", over12.exempt === false);
  ok("12억 경계에서 세액이 급등하지 않는다", over12.total < 500 * 만, won(over12.total));

  // 표1 / 표2 공제율
  ok("표1 3년 6%", Math.abs(tr.table1(3) - 0.06) < 1e-9);
  ok("표1 15년 30%", Math.abs(tr.table1(15) - 0.3) < 1e-9);
  ok("표1 20년도 30%에서 멈춘다", Math.abs(tr.table1(20) - 0.3) < 1e-9);
  ok("표1 2년 0%", tr.table1(2) === 0);
  ok("표2 보유10·거주10 → 80%", Math.abs(tr.table2(10, 10) - 0.8) < 1e-9);
  ok("표2 보유10·거주0 → 거주 2년 미만이라 표1 20%", Math.abs(tr.table2(10, 0) - 0.2) < 1e-9);
  ok("표2 보유10·거주1 → 표1 20%", Math.abs(tr.table2(10, 1) - 0.2) < 1e-9);
  ok("표2 보유10·거주2 → 48%", Math.abs(tr.table2(10, 2) - 0.48) < 1e-9);
  ok("표2 보유20·거주20 → 80%(상한)", Math.abs(tr.table2(20, 20) - 0.8) < 1e-9);
  ok("표2 보유2년 → 0", tr.table2(2, 2) === 0);

  // 개편안 공제율 스케줄
  const rate = (y, single, hold, live) => tr.deductionRateOf(y, "reform", single, hold, live);
  ok("2026년은 현행과 같다", Math.abs(rate(2026, true, 10, 10) - 0.8) < 1e-9);
  ok("2027년도 현행과 같다", Math.abs(rate(2027, true, 10, 10) - 0.8) < 1e-9);
  // 조정대상지역 다주택 중과 대상은 현행 규정에서 장특공제 0 (§95②)
  {
    const multi = { ...tr.EMPTY_TRANSFER, single: false, houses: 2, regulated: true, holdYears: 10, liveYears: 0, resident: false };
    const y26 = tr.calcYear(multi, 2026, "current");
    ok("다주택 중과 2026 현행 — 장특공제 0", y26.deduction === 0 && y26.surcharge > 0, `${y26.deduction} / ${y26.surcharge}`);
    const y29 = tr.calcYear(multi, 2029, "reform");
    ok("다주택 중과 2029 원상복귀 — 장특공제 0", y29.deduction === 0, String(y29.deduction));
    const y27 = tr.calcYear(multi, 2027, "reform");
    ok("2027 한시완화 연도에도 장특공제 0 (문답자료 53쪽)", y27.deduction === 0 && Math.abs(y27.surcharge - 0.05) < 1e-9, `${y27.deduction} / ${y27.surcharge}`);
    const y26r = tr.calcYear(multi, 2026, "reform");
    ok("2026 양도분도 개편안에선 +5%p (신고 시 소급 특례)", Math.abs(y26r.surcharge - 0.05) < 1e-9, String(y26r.surcharge));
    ok("보유 2년 미만은 완화 없음", Math.abs(tr.surchargeOf(2027, "reform", 2, 1) - 0.2) < 1e-9);
    ok("2028 비거주 1주택은 그 밖의 주택 표 — 보유 10년 10%", Math.abs(rate(2028, true, 10, 0) - 0.1) < 1e-9, String(rate(2028, true, 10, 0)));
    ok("2028 비거주 1주택 보유 20년 → 15% 상한", Math.abs(rate(2028, true, 20, 0) - 0.15) < 1e-9);
    ok("2029 비거주 1주택 → 0", rate(2029, true, 10, 1) === 0);
    const nonReg = tr.calcYear({ ...multi, regulated: false }, 2026, "current");
    ok("비조정 다주택은 표1 공제 그대로", nonReg.deduction > 0 && nonReg.surcharge === 0);
  }
  ok("2028년 1주택 거주10·보유10 → 80%", Math.abs(rate(2028, true, 10, 10) - 0.8) < 1e-9);
  ok("2028년 1주택 거주0·보유10 → 거주 2년 미만이라 그 밖의 주택 표 10%", Math.abs(rate(2028, true, 10, 0) - 0.1) < 1e-9, String(rate(2028, true, 10, 0)));
  ok("2029년 1주택 거주0 → 0%", rate(2029, true, 20, 0) === 0);
  ok("2029년 1주택 거주10 → 80%", Math.abs(rate(2029, true, 10, 10) - 0.8) < 1e-9);
  ok("2029년 다주택 거주15 → 30%", Math.abs(rate(2029, false, 20, 15) - 0.3) < 1e-9);
  ok("2028년 다주택 보유15 → 15%", Math.abs(rate(2028, false, 15, 0) - 0.15) < 1e-9);

  // 공제한도
  ok("현행 한도 없음", tr.deductionCapOf(2029, "current") === null);
  ok("2027년 한도 없음", tr.deductionCapOf(2027, "reform") === null);
  ok("2028년 20억", tr.deductionCapOf(2028, "reform") === 20 * 억);
  ok("2029년 10억", tr.deductionCapOf(2029, "reform") === 10 * 억);

  // 중과 가산율 스케줄
  ok("현행 2주택 +20%p", Math.abs(tr.surchargeOf(2026, "current", 2) - 0.2) < 1e-9);
  ok("2027년 2주택 +5%p", Math.abs(tr.surchargeOf(2027, "reform", 2) - 0.05) < 1e-9);
  ok("2028년 3주택 +15%p", Math.abs(tr.surchargeOf(2028, "reform", 3) - 0.15) < 1e-9);
  ok("2029년 3주택 원상복귀 +30%p", Math.abs(tr.surchargeOf(2029, "reform", 3) - 0.3) < 1e-9);

  // 개편안이 현행보다 불리해야 한다 (차익이 큰 집)
  const big = tr.calcTransfer({ ...base, salePrice: 65 * 억, buyPrice: 17 * 억 });
  ok("2026년은 현행과 개편안이 같다",
    big.actual[0].total === big.current[0].total,
    `${won(big.actual[0].total)} vs ${won(big.current[0].total)}`);
  ok("2028년 개편안이 현행보다 무겁다", big.actual[2].total > big.current[2].total);
  ok("2029년이 2028년보다 무겁다", big.actual[3].total > big.actual[2].total);
  ok("2028년 공제한도가 실제로 걸린다", big.actual[2].capApplied === true);

  // 거주하지 않으면 2029년에 공제가 사라진다
  const away = tr.calcTransfer({ ...base, resident: false, liveYears: 0 });
  ok("비거주 2029년 공제율 0", away.actual[3].deductionRate === 0);
  ok("비거주가 실거주보다 세금이 많다",
    away.actual[3].total > tr.calcTransfer(base).actual[3].total,
    `비거주 ${won(away.actual[3].total)} vs 실거주 ${won(tr.calcTransfer(base).actual[3].total)}`);

  // 각 연도 안에서 양도가액 단조성
  for (const y of tr.YEARS) {
    monotonic(`${y}년 개편안 — 양도가액 단조증가`,
      Array.from({ length: 40 }, (_, i) => 12 * 억 + i * 2 * 억),
      (salePrice) => tr.calcYear({ ...base, salePrice }, y, "reform").total);
  }

  // 취득가액이 오르면 세금이 준다
  let pt = Infinity;
  for (let b = 1; b <= 25; b++) {
    const t = tr.calcYear({ ...base, buyPrice: b * 억 }, 2028, "reform").total;
    ok(`취득가액 ${b}억 — 세액이 늘지 않는다`, t <= pt + 1, `${won(pt)} → ${won(t)}`);
    pt = t;
  }

  // 지방소득세는 양도세의 10%
  const one = tr.calcYear({ ...base, salePrice: 40 * 억 }, 2028, "reform");
  ok("개인지방소득세 = 양도소득세의 10%",
    Math.abs(one.localTax - Math.floor(one.transferTax * 0.1 / 10) * 10) < 10,
    `${won(one.localTax)} vs ${won(one.transferTax * 0.1)}`);
}

/* ══ 결과 ══════════════════════════════════════════════════ */
console.log(`\n${failures === 0 ? "✓" : "✗"} 검사 ${checks}건 중 ${failures}건 실패`);
process.exit(failures === 0 ? 0 : 1);
