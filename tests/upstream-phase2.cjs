#!/usr/bin/env node
/** Upstream calculation regressions, adapted only to use the shipped runtime.
 * Run: node tests/upstream-phase2.cjs
 * Source hashes and adaptation scope: docs/source-provenance.md
 */
const path = require('node:path');
const out = path.join(__dirname, '..', 'engine', 'runtime');

const { 억, 만 } = require(path.join(out, "won.js"));
const corp = require(path.join(out, "corporate.js"));
const heirs = require(path.join(out, "heirs.js"));
const bands = require(path.join(out, "bands.js"));
const prog = require(path.join(out, "progressive.js"));
let failures = 0, checks = 0;
const ok = (n, c, d = "") => { checks++; if (!c) { failures++; console.error(`  ✗ ${n}${d ? ` — ${d}` : ""}`); } };
const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
function continuous(name, b) { for (let i = 1; i < b.length; i++) { const p = b[i - 1], q = b[i]; const v = p.base + (q.start - p.start) * p.rate; ok(`${name} 구간 ${i} 연속`, Math.abs(v - q.base) < 1, `${won(v)} vs ${won(q.base)}`); } }
function monotonic(name, values, f) { let prev = -Infinity, broke = null; for (const v of values) { const y = f(v); if (y < prev - 1) { broke = { at: v, prev, y }; break; } prev = y; } ok(name, broke === null, broke ? `${broke.at}: ${won(broke.prev)} → ${won(broke.y)}` : ""); }
const range = (a, b, s) => { const r = []; for (let v = a; v <= b; v += s) r.push(v); return r; };

console.log("\n── 누진세율표 — 조문 연속성");
for (const t of bands.BAND_TABLES) continuous(t.name, t.bands);
// progressive.ts 의 누진공제 표기와 bands.ts 조문 표기가 같은 값
for (const [i, b] of bands.INCOME_BANDS.entries()) ok(`소득세 누진공제 ${i}`, bands.quickDeduction(b) === prog.BANDS_INCOME[i].quick, `${bands.quickDeduction(b)} vs ${prog.BANDS_INCOME[i].quick}`);
for (const [i, b] of bands.ESTATE_BANDS.entries()) ok(`상증세 누진공제 ${i}`, bands.quickDeduction(b) === prog.BANDS_INHERITANCE[i].quick);
{ const t = bands.BAND_TABLES.find((x) => x.id === "income"); const r = bands.applyTable(1 * 억, t); ok("소득세 과표 1억 = 1,956만", Math.round(r.tax) === 19_560_000, won(r.tax)); ok("누진공제 1,544만", r.quick === 15_440_000); }
{ const t = bands.BAND_TABLES.find((x) => x.id === "corp"); ok("법인세 과표 5억 = 8천만", Math.round(bands.applyTable(5 * 억, t).tax) === 80_000_000); ok("법인세 과표 2억 = 2천만", Math.round(bands.applyTable(2 * 억, t).tax) === 20_000_000); }
{ const t = bands.BAND_TABLES.find((x) => x.id === "cpt2"); ok("종부세 2주택 과표 12억 = 960만", Math.round(bands.applyTable(12 * 억, t).tax) === 9_600_000); }

console.log("\n── 법인 양도세");
const C = (o) => corp.calcCorporate({ ...corp.EMPTY_CORPORATE, ...o });
continuous("법인세율", corp.CORP_BANDS); continuous("법인지방소득세율", corp.CORP_LOCAL_BANDS);
monotonic("양도가액↑ → 세금↑", range(10 * 억, 100 * 억, 1 * 억), (p) => C({ price: p }).total);
monotonic("다른 소득↑ → 세금 증분↑(감소 없음)", range(0, 300 * 억, 5 * 억), (o) => C({ otherIncome: o }).total);
{ // 주택 차익 5억, 다른 소득 1억: 법인세 (6억→2천만+4억×20%=1억) − (1억×10%=1천만) = 9천만; 추가과세 1억; 지방 900만+1천만
  const r = C({});
  ok("양도차익 5억", r.gain === 5 * 억);
  ok("법인세 증분 9천만", r.corpTaxDelta === 90_000_000, won(r.corpTaxDelta));
  ok("추가과세 1억", r.surtax === 100_000_000, won(r.surtax));
  ok("지방소득세 1,900만", r.localTax === 19_000_000, won(r.localTax));
  ok("합계 2억 900만", r.total === 209_000_000, won(r.total));
}
ok("사업용 건물 추가과세 0", C({ kind: "building" }).surtax === 0);
ok("비사업용 토지 10%", C({ kind: "land-nonbiz" }).surtax === 50_000_000);
ok("미등기 주택 40%", C({ unregistered: true }).surtax === 200_000_000);
ok("입주권 20%", C({ kind: "right" }).surtax === 100_000_000);
ok("손실이면 0", C({ price: 5 * 억, cost: 10 * 억 }).total === 0);

console.log("\n── 상속지분");
const H = (o) => heirs.calcHeirs({ ...heirs.EMPTY_HEIRS, ...o });
{ const r = H({}); // 배우자 + 자녀 2: 3/7, 2/7, 2/7
  const sp = r.shares.find((s) => s.label === "배우자");
  ok("배우자 3/7", sp.num === 3 && sp.den === 7, `${sp.num}/${sp.den}`);
  ok("자녀 2/7", r.shares[0].num === 2 && r.shares[0].den === 7);
  ok("10억 중 배우자 4.285억", Math.abs(sp.amount - 428_571_428) <= 1, won(sp.amount));
  ok("유류분 배우자 1/2", sp.reserveAmount === Math.floor(sp.amount * 0.5));
}
{ const r = H({ children: 1 }); ok("배우자+자녀1 → 3/5, 2/5", r.shares[1].num === 3 && r.shares[1].den === 5 && r.shares[0].num === 2 && r.shares[0].den === 5); }
{ const r = H({ children: 0, parents: 2 }); const sp = r.shares.find((s) => s.label === "배우자"); ok("배우자+부모2 → 배우자 3/7", sp.num === 3 && sp.den === 7); ok("존속 유류분 1/3", r.shares[0].reserveRatio === 1 / 3); }
{ const r = H({ children: 0, parents: 0 }); ok("배우자 단독 1/1", r.shares.length === 1 && r.shares[0].num === 1 && r.shares[0].den === 1); }
{ const r = H({ hasSpouse: false, children: 3 }); ok("자녀 3 균분 1/3", r.shares.every((s) => s.num === 1 && s.den === 3)); }
{ const r = H({ hasSpouse: false, children: 0, parents: 0, siblings: 4 }); ok("형제 4 균분 1/4, 유류분 없음", r.shares.every((s) => s.num === 1 && s.den === 4 && s.reserveRatio === null)); }
{ const r = H({ estate: 0 }); ok("재산 0 이면 금액 0", r.shares.every((s) => s.amount === 0)); }
{ const r = H({}); const sum = r.shares.reduce((a, s) => a + s.amount, 0); ok("합계 ≤ 재산, 차이 < 인원수", sum <= 10 * 억 && 10 * 억 - sum < r.shares.length); }

console.log(`\n${checks - failures}/${checks} 통과${failures ? ` — 실패 ${failures}` : ""}`);
process.exit(failures ? 1 : 0);
