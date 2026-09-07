#!/usr/bin/env node
/** Upstream calculation regressions, adapted only to use the shipped runtime.
 * Run: node tests/upstream-phase3.cjs
 * Source hashes and adaptation scope: docs/source-provenance.md
 */
const path = require('node:path');
const out = path.join(__dirname, '..', 'engine', 'runtime');

const { 억, 만 } = require(path.join(out, "won.js"));
const L = require(path.join(out, "lease.js"));
let failures = 0, checks = 0;
const ok = (n, c, d = "") => { checks++; if (!c) { failures++; console.error(`  ✗ ${n}${d ? ` — ${d}` : ""}`); } };
const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";

console.log("\n── 전월세 전환");
ok("기준금리 2.5% → 4.5%", L.legalConversionRate(0.025) === 0.045);
ok("기준금리 9% → 상한 10%", L.legalConversionRate(0.09) === 0.1);
{ const r = L.calcConversion({ ...L.EMPTY_CONVERSION, deposit: 3 * 억, monthly: 0, amount: 1 * 억, baseRate: 0.025 });
  ok("1억 → 월 375,000", r.newMonthly === 375_000, won(r.newMonthly)); ok("보증금 2억", r.newDeposit === 2 * 억); }
{ const r = L.calcConversion({ ...L.EMPTY_CONVERSION, deposit: 2 * 억, monthly: 50 * 만, amount: 37.5 * 만, direction: "toDeposit", baseRate: 0.025 });
  ok("월세 37.5만 → 보증금 +1억", r.newDeposit === 3 * 억, won(r.newDeposit)); ok("월세 12.5만", r.newMonthly === 125_000); }
ok("합의율이 상한 초과면 상한", L.calcConversion({ ...L.EMPTY_CONVERSION, agreedRate: 0.2 }).rate === 0.045);

console.log("\n── 임대료 상승분");
{ const r = L.calcIncrease({ deposit: 5 * 억, monthly: 0, localCap: 0, monthsSince: 24 }); ok("5억 → 5.25억", r.maxDeposit === 525_000_000); ok("1년 경과 가능", r.allowed); }
ok("11개월은 불가", !L.calcIncrease({ deposit: 1 * 억, monthly: 0, localCap: 0, monthsSince: 11 }).allowed);
ok("조례 3% 적용", L.calcIncrease({ deposit: 1 * 억, monthly: 0, localCap: 0.03, monthsSince: 12 }).maxDeposit === 103_000_000);
ok("조례가 5% 넘으면 5%", L.calcIncrease({ deposit: 1 * 억, monthly: 0, localCap: 0.08, monthsSince: 12 }).cap === 0.05);

console.log("\n── 임대수익률");
{ const r = L.calcYield({ price: 5 * 억, deposit: 5000 * 만, monthly: 150 * 만, loan: 2 * 억, loanRate: 0.045, expenses: 300 * 만, vacancy: 0.05, acquisitionCost: 0 });
  ok("표면 4%", Math.abs(r.grossYield - 0.04) < 1e-9, r.grossYield);
  ok("NOI 1,410만", r.cashflow + 900 * 만 === 14_100_000, won(r.cashflow));
  ok("현금흐름 510만", r.cashflow === 5_100_000);
  ok("자기자본 2.5억", r.equity === 250_000_000); }
ok("대출 없으면 자기자본=실투자금", (() => { const r = L.calcYield({ ...L.EMPTY_YIELD, loan: 0 }); return r.equity === 5 * 억 - 5000 * 만; })());

console.log("\n── 전세 vs 월세");
{ const r = L.calcCompare(L.EMPTY_COMPARE);
  ok("전세 월비용 = 3억×4%/12 + 2억×3%/12 = 150만", r.jeonseMonthly === 1_500_000, won(r.jeonseMonthly));
  ok("월세 월비용 = 120만 + 1억×3%/12 = 145만", r.wolseMonthly === 1_450_000, won(r.wolseMonthly));
  ok("손익분기 월세 125만", r.breakEvenMonthly === 1_250_000, won(r.breakEvenMonthly)); }

console.log("\n── 전세보증보험");
{ const r = L.calcInsurance(L.EMPTY_INSURANCE); ok("6억×90% = 5.4억 상한", r.maxDeposit === 540_000_000); ok("4억 가입 가능", r.eligible); ok("보증료 4억×0.122%×2 = 976,000", r.fee === 976_000, won(r.fee)); }
ok("선순위 2억이면 3.4억 상한 → 4억 불가", !L.calcInsurance({ ...L.EMPTY_INSURANCE, seniorDebt: 2 * 억 }).eligible);
ok("지방 5억 한도", !L.calcInsurance({ ...L.EMPTY_INSURANCE, deposit: 6 * 억, homePrice: 10 * 억, metro: false }).eligible);
ok("수도권 7억 한도 안", L.calcInsurance({ ...L.EMPTY_INSURANCE, deposit: 6 * 억, homePrice: 10 * 억, metro: true }).eligible);

console.log("\n── 연체이자");
{ const r = L.calcOverdue({ monthly: 100 * 만, months: 2, days: 45, annualRate: 0.05 }); ok("이자 200만×5%×45/365 = 12,328", r.interest === 12_328, won(r.interest)); ok("2기 해지 가능", r.canTerminate); }
ok("1기는 불가", !L.calcOverdue({ monthly: 100 * 만, months: 1, days: 30, annualRate: 0.05 }).canTerminate);

console.log("\n── NOC");
{ const r = L.calcNoc(L.EMPTY_NOC); ok("NOC = 25만 + 300만 + 80만 = 405만", r.noc === 4_050_000, won(r.noc)); ok("전용 평당 ≈ 163,275", Math.abs(r.nocPerExclusivePyeong - 4_050_000 / (82 / 3.3058)) < 1); }
ok("렌트프리 2개월 → 월세 50만 차감", L.calcNoc({ ...L.EMPTY_NOC, rentFree: 2 }).effectiveMonthly === 2_500_000);

console.log("\n── 간주임대료");
{ const r = L.calcDeemed(L.EMPTY_DEEMED); ok("3주택 8억: (8−3)억×60%×3.1% = 930만", r.deemed === 9_300_000, won(r.deemed)); ok("과세 대상", r.taxable); }
ok("3주택 3억 이하 비과세", !L.calcDeemed({ ...L.EMPTY_DEEMED, deposits: 3 * 억 }).taxable);
ok("2주택 고가 2채 13억 과세", L.calcDeemed({ ...L.EMPTY_DEEMED, houses: 2, highValueHouses: 2, deposits: 13 * 억 }).taxable);
ok("2주택 고가 1채 13억 비과세", !L.calcDeemed({ ...L.EMPTY_DEEMED, houses: 2, highValueHouses: 1, deposits: 13 * 억 }).taxable);
ok("2주택 고가 2채 12억 비과세(초과 아님)", !L.calcDeemed({ ...L.EMPTY_DEEMED, houses: 2, highValueHouses: 2, deposits: 12 * 억 }).taxable);
ok("1주택 비과세", !L.calcDeemed({ ...L.EMPTY_DEEMED, houses: 1, deposits: 20 * 억 }).taxable);
ok("이자수입 차감", L.calcDeemed({ ...L.EMPTY_DEEMED, interestIncome: 100 * 만 }).deemed === 8_300_000);
ok("반년 임대는 절반", L.calcDeemed({ ...L.EMPTY_DEEMED, days: 182.5 }).deemed === 4_650_000);

console.log("\n── 주택임대소득세");
{ const r = L.calcRentalTax({ rent: 1800 * 만, deemed: 0, registered: false, otherIncome: 5000 * 만, actualExpenses: 0 });
  // 분리: 1800만 − 900만 − 0 = 900만 × 14% = 126만 + 12.6만 = 138.6만
  ok("미등록·다른소득 5천만 분리과세 1,386,000", r.separateTax === 1_386_000, won(r.separateTax)); ok("분리 가능", r.canSeparate); }
{ const r = L.calcRentalTax({ rent: 1800 * 만, deemed: 0, registered: false, otherIncome: 1000 * 만, actualExpenses: 0 });
  // 900만 − 200만 = 700만 × 14% = 98만 + 9.8만 = 107.8만
  ok("다른소득 1천만 → 공제 200만 → 1,078,000", r.separateTax === 1_078_000, won(r.separateTax)); }
{ const r = L.calcRentalTax({ rent: 1800 * 만, deemed: 0, registered: true, otherIncome: 1000 * 만, actualExpenses: 0 });
  // 1800 − 1080 − 400 = 320만 × 14% = 44.8만 + 4.48만 = 49.28만 → 492,800
  ok("등록 → 492,800", r.separateTax === 492_800, won(r.separateTax)); }
ok("2천만 초과 분리 불가", !L.calcRentalTax({ rent: 2100 * 만, deemed: 0, registered: false, otherIncome: 0, actualExpenses: 0 }).canSeparate);
ok("월세+간주 합산 판정", !L.calcRentalTax({ rent: 1500 * 만, deemed: 600 * 만, registered: false, otherIncome: 0, actualExpenses: 0 }).canSeparate);
{ const r = L.calcRentalTax({ rent: 1000 * 만, deemed: 0, registered: false, otherIncome: 0, actualExpenses: 0 });
  // 종합: 다른 소득 0 + 임대소득 500만 → 6% = 30만 +3만 = 33만 ; 분리: 500−200 = 300만×14% = 42만+4.2 = 46.2만 → 종합 유리
  ok("다른 소득 0 이면 종합과세 유리", r.better === "combined" && r.combinedTax === 330_000, `${r.better} ${won(r.combinedTax)}`); }

console.log("\n── 명도비용");
{ const r = L.calcEviction(L.EMPTY_EVICTION); ok("합계 = 소송 + 집행 + 보관 + 월세", r.total === 1_500_000 + r.execution + 900_000 + 6_000_000); ok("노무비 25.4평×12만", r.execution === Math.floor((84 / 3.3058) * 120_000) + 700_000); }

console.log(`\n${checks - failures}/${checks} 통과${failures ? ` — 실패 ${failures}` : ""}`);
process.exit(failures ? 1 : 0);
