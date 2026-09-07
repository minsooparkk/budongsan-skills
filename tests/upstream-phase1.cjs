#!/usr/bin/env node
/** Upstream calculation regressions, adapted only to use the shipped runtime.
 * Run: node tests/upstream-phase1.cjs
 * Source hashes and adaptation scope: docs/source-provenance.md
 */
const path = require('node:path');
const out = path.join(__dirname, '..', 'engine', 'runtime');

const { 억, 만 } = require(path.join(out, "won.js"));
const prop = require(path.join(out, "property.js"));
const brk = require(path.join(out, "brokerage.js"));
const reg = require(path.join(out, "registration.js"));

let failures = 0, checks = 0;
const ok = (name, cond, detail = "") => { checks++; if (!cond) { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); } };
const section = (t) => console.log(`\n── ${t}`);
const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
function monotonic(name, values, f) {
  let prev = -Infinity, broke = null;
  for (const v of values) { const y = f(v); if (y < prev - 1) { broke = { at: v, prev, y }; break; } prev = y; }
  ok(name, broke === null, broke ? `${broke.at} 에서 ${won(broke.prev)} → ${won(broke.y)} 로 역전` : "");
}
/** 조문 표기 구간표: 각 구간 하한에서 앞 구간 식으로 계산한 값 == base */
function continuous(name, bands) {
  for (let i = 1; i < bands.length; i++) {
    const p = bands[i - 1], b = bands[i];
    const fromPrev = p.base + (b.start - p.start) * p.rate;
    ok(`${name} 구간 ${i} 연속`, Math.abs(fromPrev - b.base) < 1, `${won(fromPrev)} vs ${won(b.base)}`);
  }
}
const range = (a, b, step) => { const r = []; for (let v = a; v <= b; v += step) r.push(v); return r; };

/* ══ 재산세 ═══════════════════════════════════════════════ */
section("재산세 — 세율표 조문 대조");
continuous("주택 표준세율", prop.HOUSE_BANDS);
continuous("1주택 특례세율", prop.HOUSE_SPECIAL_BANDS);
continuous("종합합산 토지", prop.LAND_GENERAL_BANDS);
continuous("별도합산 토지", prop.LAND_SEPARATE_BANDS);
continuous("소방분 지역자원시설세", prop.FIRE_BANDS);

section("재산세 — 단조성·불변식");
const P = (over) => prop.calcProperty({ ...prop.EMPTY_PROPERTY, ...over });
monotonic("주택(1주택) 공시가격↑ → 합계↑", range(1 * 억, 30 * 억, 1000 * 만), (p) => P({ price: p }).total);
monotonic("주택(다주택) 공시가격↑ → 합계↑", range(1 * 억, 30 * 억, 1000 * 만), (p) => P({ price: p, oneHouse: false }).total);
monotonic("건축물", range(1000 * 만, 50 * 억, 5000 * 만), (p) => P({ kind: "building", price: p }).total);
monotonic("종합합산 토지", range(1000 * 만, 50 * 억, 5000 * 만), (p) => P({ kind: "land-general", price: p }).total);
for (const p of [3 * 억, 5 * 억, 8 * 억, 9 * 억, 12 * 억, 20 * 억]) {
  const one = P({ price: p }), multi = P({ price: p, oneHouse: false });
  ok(`1주택 ≤ 다주택 @${won(p)}`, one.total <= multi.total, `${won(one.total)} vs ${won(multi.total)}`);
  ok(`도시지역 밖이 더 싸다 @${won(p)}`, P({ price: p, urban: false }).total < one.total);
  ok(`지방교육세 = 본세 20% @${won(p)}`, Math.abs(one.eduTax - Math.floor(one.mainTax * 0.2 / 10) * 10) <= 10);
  ok(`도시지역분 = 과표 0.14% @${won(p)}`, Math.abs(one.urbanTax - Math.floor(one.taxBase * 0.0014 / 10) * 10) <= 10);
}
ok("9억 이하는 특례세율", P({ price: 9 * 억 }).specialRate === true);
ok("9억 초과는 표준세율", P({ price: 9 * 억 + 1 }).specialRate === false);
{ // 공시가격 9억 → 과표 9억×45%=4.05억 → 특례 42만 + 1.05억×0.35% = 787,500
  const r = P({ price: 9 * 억 });
  ok("공시 9억 1주택 본세 787,500", r.mainTax === 787_500, won(r.mainTax));
  ok("과표 4.05억", r.taxBase === 405_000_000, won(r.taxBase));
}
{ // 다주택 공시 5억: 과표 3억 → 57만원 정확히 경계
  const r = P({ price: 5 * 억, oneHouse: false });
  ok("다주택 공시 5억 과표 3억 본세 570,000", r.mainTax === 570_000, won(r.mainTax));
}
{ // 과세표준상한: 작년 5억 → 올해 8억 (1주택) : 상한 = 5억×0.45 + 3.6억×5% = 2.43억
  const r = P({ price: 8 * 억, prevPrice: 5 * 억 });
  ok("과표상한 적용", r.capped && r.taxBase === 243_000_000, won(r.taxBase));
  ok("상한이 세액을 낮춘다", r.total < P({ price: 8 * 억 }).total);
  ok("작년이 더 비쌌으면 상한 안 걸림", !P({ price: 8 * 억, prevPrice: 9 * 억 }).capped);
}
ok("20만원 이하 7월 일괄", P({ price: 1 * 억 }).september === 0 && P({ price: 1 * 억 }).july > 0);
{ const r = P({ price: 8 * 억 }); ok("반씩 납부 합계 일치", r.july + r.september === r.total); }
ok("건물분 없으면 소방세 0", P({ price: 8 * 억 }).fireTax === 0);
ok("건물분 있으면 소방세 > 0", P({ price: 8 * 억, buildingValue: 2 * 억 }).fireTax > 0);

/* ══ 중개보수 ═════════════════════════════════════════════ */
section("중개보수");
const B = (over) => brk.calcBrokerage({ ...brk.EMPTY_BROKERAGE, ...over });
monotonic("주택 매매 금액↑ → 보수↑", range(1000 * 만, 30 * 억, 500 * 만), (p) => B({ price: p, vat: false }).fee);
monotonic("주택 임대 보증금↑ → 보수↑", range(1000 * 만, 20 * 억, 500 * 만), (p) => B({ deal: "lease", price: p, vat: false }).fee);
const cases = [
  ["매매 4천만 → 0.6% 24만 (한도 25만)", { price: 4000 * 만 }, 240_000],
  ["매매 4,900만 → 한도 25만", { price: 4900 * 만 }, 250_000],
  ["매매 1억 → 0.5% 50만", { price: 1 * 억 }, 500_000],
  ["매매 1.9억 → 한도 80만", { price: 1.9 * 억 }, 800_000],
  ["매매 5억 → 0.4% 200만", { price: 5 * 억 }, 2_000_000],
  ["매매 9억 → 0.5% 450만", { price: 9 * 억 }, 4_500_000],
  ["매매 12억 → 0.6% 720만", { price: 12 * 억 }, 7_200_000],
  ["매매 15억 → 0.7% 1,050만", { price: 15 * 억 }, 10_500_000],
  ["전세 3억 → 0.3% 90만", { deal: "lease", price: 3 * 억 }, 900_000],
  ["전세 4천만 → 0.5% 20만 한도", { deal: "lease", price: 4500 * 만 }, 200_000],
  ["월세 보증금 1천만 월 50만 → 6천만 → 0.4% 24만", { deal: "lease", price: 1000 * 만, monthly: 50 * 만 }, 240_000],
  ["월세 보증금 1천만 월 30만 → 100배 4천만 <5천만 → 70배 3,100만 → 0.5% 15.5만", { deal: "lease", price: 1000 * 만, monthly: 30 * 만 }, 155_000],
  ["주거용 오피스텔 매매 3억 → 0.5% 150만", { kind: "officetel-home", price: 3 * 억 }, 1_500_000],
  ["상가 10억 → 0.9% 900만", { kind: "other", price: 10 * 억 }, 9_000_000],
  ["상가 10억 협의 0.5% → 500만", { kind: "other", price: 10 * 억, agreedRate: 0.005 }, 5_000_000],
];
for (const [name, over, expect] of cases) { const r = B({ vat: false, ...over }); ok(name, r.fee === expect, won(r.fee)); }
ok("부가세 10%", B({ price: 5 * 억, vat: true }).vat === 200_000);
ok("협의 요율이 상한을 넘으면 상한", B({ price: 5 * 억, agreedRate: 0.02, vat: false }).fee === 2_000_000);

/* ══ 등기비용 ═════════════════════════════════════════════ */
section("등기비용");
const R = (over) => reg.calcRegistration({ ...reg.EMPTY_REGISTRATION, ...over });
monotonic("주택 거래금액↑ → 합계↑", range(1 * 억, 30 * 억, 1000 * 만), (p) => R({ price: p }).total);
const stamps = [[5000 * 만, true, 0], [1 * 억, true, 0], [1 * 억 + 1, true, 150_000], [2000 * 만, false, 20_000], [4000 * 만, false, 40_000], [8000 * 만, false, 70_000], [5 * 억, false, 150_000], [10 * 억, false, 150_000], [10 * 억 + 1, false, 350_000]];
for (const [p, h, e] of stamps) ok(`인지세 ${won(p)} ${h ? "주택" : "기타"} = ${won(e)}`, reg.stampDuty(p, h) === e, won(reg.stampDuty(p, h)));
ok("채권 주택 시가표준 3억 서울 2.6%", reg.bondRate("house", 3 * 억, true) === 0.026);
ok("채권 주택 시가표준 3억 지방 2.1%", reg.bondRate("house", 3 * 억, false) === 0.021);
ok("채권 주택 2천만 미만 0", reg.bondRate("house", 1900 * 만, true) === 0);
ok("채권 주택 6억 이상 서울 3.1%", reg.bondRate("house", 6 * 억, true) === 0.031);
ok("채권 토지 7천만 지방 3.5%", reg.bondRate("land", 7000 * 만, false) === 0.035);
ok("채권 건물 2억 서울 1.6%", reg.bondRate("building", 2 * 억, true) === 0.016);
ok("채권 단수 5천원 이상 올림", reg.roundBond(1_234_999) === 1_230_000 && reg.roundBond(1_235_000) === 1_240_000);
ok("채권 최저 1만원", reg.roundBond(3_000) === 10_000);
ok("근저당 2천만 미만 채권 0", reg.calcRegistration({ ...reg.EMPTY_REGISTRATION, mortgageMax: 1500 * 만 }).mortgageBondCost === 0);
ok("토지 등기비용은 농지 3%가 아니라 4%", Math.abs(R({ kind: "land", price: 5 * 억, standardValue: 3 * 억 }).acquisition.rate - 0.04) < 1e-9);
ok("근저당 등록면허세 최저 6천원", R({ mortgageMax: 200 * 만 }).mortgageTax >= 6000);
ok("조정 2주택 일시적이면 8% 중과 없음", Math.abs(R({ regulated: true, houses: 2, temporaryTwo: true }).acquisition.rate - 0.03) < 1e-9);
ok("근저당 채권 매입 상한 10억", reg.calcRegistration({ ...reg.EMPTY_REGISTRATION, mortgageMax: 2000 * 억, discountRate: 10 }).mortgageBondCost === 100_000_000);
monotonic("채권 매입률 단조", range(0, 10 * 억, 1000 * 만), (v) => reg.bondRate("house", v, true));
{
  const r = R({ price: 9 * 억, standardValue: 6 * 억, discountRate: 10, legalFee: 30 * 만 });
  ok("채권 매입액 6억×3.1% = 1,860만", r.bondAmount === 18_600_000, won(r.bondAmount));
  ok("할인비용 10% = 186만", r.bondCost === 1_860_000, won(r.bondCost));
  ok("합계 = 세금+비용", r.total === r.taxes + r.costs);
  ok("취득세 3종 = 취득세 계산기와 동일", r.acquisition.total === 29_700_000, won(r.acquisition.total));
  ok("셀프등기면 법무사 0", R({ price: 9 * 억, selfRegistration: true }).legalFee === 0);
  ok("전자신청 13,000", R({ eForm: true }).regFee === 13_000);
  const m = R({ price: 9 * 억, mortgageMax: 6 * 억, discountRate: 10 });
  ok("근저당 등록면허세+교육세 6억×0.2%×1.2 = 144만", m.mortgageTax === 1_440_000, won(m.mortgageTax));
  ok("근저당 채권 6억×1%×10% = 60만", m.mortgageBondCost === 600_000, won(m.mortgageBondCost));
}
ok("시가표준액 미입력 시 70% 추정", R({ price: 10 * 억, standardValue: 0 }).standardValue === 7 * 억);

console.log(`\n${checks - failures}/${checks} 통과${failures ? ` — 실패 ${failures}` : ""}`);
process.exit(failures ? 1 : 0);
