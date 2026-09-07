#!/usr/bin/env node
/** Upstream calculation regressions, adapted only to use the shipped runtime.
 * Run: node tests/upstream-phase4.cjs
 * Source hashes and adaptation scope: docs/source-provenance.md
 */
const path = require('node:path');
const out = path.join(__dirname, '..', 'engine', 'runtime');

const { 억, 만 } = require(path.join(out, "won.js"));
const F = require(path.join(out, "fees.js")), I = require(path.join(out, "invest.js")), N = require(path.join(out, "finance.js")), A = require(path.join(out, "auction.js")), U = require(path.join(out, "units.js"));
let failures = 0, checks = 0;
const ok = (n, c, d = "") => { checks++; if (!c) { failures++; console.error(`  ✗ ${n}${d ? ` — ${d}` : ""}`); } };
const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
function continuous(name, b) { for (let i = 1; i < b.length; i++) { const p = b[i - 1], q = b[i]; const v = p.base + (q.start - p.start) * p.rate; ok(`${name} 구간 ${i} 연속`, Math.abs(v - q.base) < 1, `${won(v)} vs ${won(q.base)}`); } }

console.log("\n── 보수·수수료");
continuous("감정평가수수료", F.APPRAISAL_FEE_BANDS.slice(1));
{ const r = F.calcAppraisalFee({ value: 10 * 억, factor: 1, expenses: 0, vat: false }); ok("감정 10억 기준 1,195,000", r.fee === 1_195_000, won(r.fee)); }
{ const r = F.calcAppraisalFee({ value: 3 * 억, factor: 1, expenses: 0, vat: false }); ok("감정 3억 = 25만 + 2.5억×0.11% = 525,000", r.fee === 525_000, won(r.fee)); }
ok("5천만 이하 정액 25만", F.calcAppraisalFee({ value: 3000 * 만, factor: 1.2, expenses: 0, vat: false }).fee === 250_000);
ok("하한 0.8배", F.calcAppraisalFee({ value: 10 * 억, factor: 0.8, expenses: 0, vat: false }).fee === 956_000);
continuous("법무사 보수표", F.JUDICIAL_BANDS.slice(1));
ok("인지세 단독 9억 주택 15만", F.calcStamp({ amount: 9 * 억, isHouse: true, buyerShare: 0.5 }).stamp === 150_000);
ok("채권 단독 주택 5억 서울 2.6% = 1,300만", F.calcBond({ kind: "house", standardValue: 5 * 억, metro: true, discountRate: 10, couponRate: 1.3 }).amount === 13_000_000);
{ const r = F.calcFireTax({ buildingValue: 2 * 억, kind: "house", oneHouse: true, riskMultiple: 1 }); ok("소방세 과표 2억×43%=8,600만 → 49,100+(8600−6400)만×0.12%=75,500", r.tax === 75_500, won(r.tax)); }
ok("소방세 2배", F.calcFireTax({ buildingValue: 2 * 억, kind: "house", oneHouse: true, riskMultiple: 2 }).tax === 151_000);

console.log("\n── 투자·평가");
{ const r = I.calcFairPrice({ monthly: 200 * 만, deposit: 5000 * 만, targetYield: 0.05, annualExpenses: 300 * 만, vacancy: 0.05, acquisitionRate: 0.05, extraCost: 0 });
  // NOI = 2400만×0.95 − 300만 = 1,980만 → /0.05 = 3.96억 + 0.5억 = 4.46억 / 1.05 = 424,761,904
  ok("적정 매수가 4.2476억", near(r.price, 424_761_904, 2), won(r.price)); }
{ const r = I.calcTotalIncome({ earned: 5000 * 만, business: 0, rental: 1500 * 만, other: 0, dependents: 1, deductions: 300 * 만, credits: 0, prepaid: 0, hasEarned: true });
  // 과표 6,200만 → 15%: 6200×0.15−126 = 804만 → −13만 = 791만 + 79.1만 = 870.1만
  // 과표 6,050만 → 24% 구간: 6050×0.24 − 576 = 876만 − 표준 13만 = 863만, 지방 86.3만
  ok("종합소득세 결정세액 863만", r.determined === 8_630_000, won(r.determined)); ok("납부 949.3만", r.due === 9_493_000, won(r.due)); }
{ const r = I.calcBuildingVat({ price: 10 * 억, landStd: 5 * 억, buildingStd: 2 * 억, contractBuilding: 0, buyerBusiness: true });
  ok("건물 안분 10억×2/7", r.buildingPrice === Math.floor(10 * 억 * 2 / 7), won(r.buildingPrice)); ok("부가세 10%", r.vat === Math.floor(r.buildingPrice * 0.1)); }
ok("계약서 건물가액 30% 이내 인정", I.calcBuildingVat({ price: 10 * 억, landStd: 5 * 억, buildingStd: 2 * 억, contractBuilding: 3 * 억, buyerBusiness: true }).contractOk === true);
ok("계약서 건물가액 30% 이상 차이 부인", I.calcBuildingVat({ price: 10 * 억, landStd: 5 * 억, buildingStd: 2 * 억, contractBuilding: 1 * 억, buyerBusiness: true }).contractOk === false);
ok("잔존가치 정액 15/40 잔가 10% = 66.25%", near(I.calcResidual({ newCost: 1 * 억, age: 15, life: 40, salvage: 0.1, method: "straight" }).rate, 0.6625, 1e-9));
ok("수익환원 4천만/5% = 8억", I.calcAppraisal({ ...I.EMPTY_APPRAISAL, method: "income", noi: 4000 * 만, capRate: 0.05 }).value === 8 * 억);
ok("원가법 5억 + 3억×0.7 = 7.1억", I.calcAppraisal({ ...I.EMPTY_APPRAISAL, method: "cost" }).value === 710_000_000);
ok("적산법 8억×4%+500만 = 3,700만", I.calcAppraisal({ ...I.EMPTY_APPRAISAL, method: "rent-cost" }).value === 37_000_000);
{ const r = I.calcAppraisal({ ...I.EMPTY_APPRAISAL, method: "dcf", noi: 1 * 억, growth: 0, discountRate: 0.1, exitCap: 0.1, years: 1 }); ok("DCF 1년: 1억/1.1 + (1억/0.1)/1.1 = 10억", near(r.value, 1_000_000_000, 2), won(r.value)); }

console.log("\n── 금융");
{ const m = N.annuityPayment(4 * 억, 0.042, 360); ok("4억 4.2% 30년 원리금균등 월 1,956,069", near(m, 1_956_069, 5), won(m)); }
{ const s = N.schedule(1 * 억, 0.05, 12, "annuity"); ok("1억 5% 1년 총이자 ≈ 272.9만", near(s.totalInterest, 2_729_000, 2000), won(s.totalInterest)); }
{ const s = N.schedule(1 * 억, 0.05, 12, "principal"); ok("원금균등 1억 5% 1년 총이자 = 5%×(12+1)/24 = 270.8만", near(s.totalInterest, 2_708_333, 5), won(s.totalInterest)); }
{ const s = N.schedule(1 * 억, 0.05, 12, "bullet"); ok("만기일시 총이자 500만", near(s.totalInterest, 5_000_000, 5)); ok("만기일시 첫 달 = 이자만", s.firstMonthly === Math.floor(1 * 억 * 0.05 / 12)); }
{ const r = N.calcDsr(N.EMPTY_DSR); ok("DSR 결과 ≤ 한도면 ok 플래그 일치", r.ok === (r.dsr <= 0.4)); ok("최대액으로 다시 넣으면 한도 근처", (() => { const t = N.calcDsr({ ...N.EMPTY_DSR, amount: r.maxAmount }); return near(t.dsr, 0.4, 0.002); })()); }
ok("DSR 소득 0 → 불가", N.calcDsr({ ...N.EMPTY_DSR, income: 0 }).ok === false);
{ const r = N.calcRti(N.EMPTY_RTI); ok("RTI 3600만/2500만 = 1.44", near(r.rti, 1.44, 1e-9)); ok("비주택 1.5 미달", !r.ok); ok("최대 = 2400만/5% = 4.8억", r.maxAmount === 480_000_000, won(r.maxAmount)); }
{ const r = N.calcLtv({ price: 10 * 억, ltv: 0.7, senior: 0, region: "seoul", rooms: 1, mci: false, cap: 0 }); ok("LTV 7억 − 방공제 5,500만 = 6.45억", r.amount === 645_000_000, won(r.amount)); }
ok("LTV 6억 한도", N.calcLtv({ ...N.EMPTY_LTV, price: 15 * 억 }).amount === 6 * 억);
ok("MCI 가입 방공제 0", N.calcLtv({ ...N.EMPTY_LTV, mci: true, cap: 0 }).deduction === 0);
{ const r = N.calcLoanLimit(N.EMPTY_LOAN_LIMIT); ok("대출가능액 = min(담보, 소득)", r.amount === Math.min(r.byCollateral, r.byIncome)); }
ok("건보료 15만/3.595%×12 = 5,007만 → 95% → 4,757만", N.calcImputedIncome(N.EMPTY_IMPUTED).income === Math.min(5000 * 만, Math.floor(Math.floor(150_000 / 0.03595 * 12) * 0.95)));
ok("장래소득 28세 +31.4%", N.calcFutureIncome(N.EMPTY_FUTURE).income === Math.floor(4000 * 만 * 1.314));
ok("장래소득 35세 미적용", N.calcFutureIncome({ ...N.EMPTY_FUTURE, age: 35 }).income === 4000 * 만);
ok("장래소득 만기 5년 미적용", N.calcFutureIncome({ ...N.EMPTY_FUTURE, years: 5 }).income === 4000 * 만);
{ const r = N.calcRefinance({ balance: 1 * 억, currentRate: 0.06, remainingYears: 1, newRate: 0.04, newYears: 1, prepayFee: 0, costs: 0, repay: "bullet" }); ok("대환 만기일시 1년: 600만 − 400만 = 200만", near(r.saving, 2_000_000, 10), won(r.saving)); }
ok("중도상환 1억×1.2%×24/36 = 80만", N.calcPrepay(N.EMPTY_PREPAY).fee === 800_000);
ok("중도상환 36개월 경과 0", N.calcPrepay({ ...N.EMPTY_PREPAY, elapsedMonths: 36 }).fee === 0);
{ const r = N.calcAuctionLoan(N.EMPTY_AUCTION_LOAN); ok("경락 min(4.8억, 5.6억) − 5,500만 = 4.25억", r.amount === 425_000_000, won(r.amount)); }
{ const r = N.calcSavings({ kind: "deposit", amount: 1 * 억, monthly: 0, rate: 0.03, months: 12, compound: false, taxRate: 0.154 }); ok("예금 1억 3% 1년 세전 300만 세후 253.8만", r.interest === 3_000_000 && r.net === 2_538_000, won(r.net)); }
{ const r = N.calcSavings({ kind: "installment", amount: 0, monthly: 100 * 만, rate: 0.03, months: 12, compound: false, taxRate: 0 }); ok("적금 월 100만 3% 12개월 단리 이자 19.5만", r.interest === 195_000, won(r.interest)); }

console.log("\n── 경매");
{ const r = A.calcAuctionCost(A.EMPTY_AUCTION_COST); ok("등록면허세 3억×0.2% = 60만", r.regTax === 600_000, won(r.regTax)); ok("합계 > 등록면허세", r.total > r.regTax); }
{ const r = A.calcMinBid(A.EMPTY_MIN_BID); ok("2회 유찰 20% → 64%", near(r.current.ratio, 0.64, 1e-9)); ok("최저가 5.12억", r.current.minPrice === 512_000_000); ok("보증금 5,120만", r.current.deposit === 51_200_000); }
ok("30% 저감 1회 → 70%", near(A.calcMinBid({ ...A.EMPTY_MIN_BID, failures: 1, reduction: 0.3 }).current.ratio, 0.7, 1e-9));
{ const r = A.calcPayout(A.EMPTY_PAYOUT);
  // 6억 − 300만 → 소액임차 5,500만 → 근저당1 3억 → 임차 나머지 4,500만 → 근저당2 1억 → 잉여 0.97억
  ok("배당 잉여 0.97억", r.remainder === 97_000_000, won(r.remainder)); ok("임차인 전액 회수", r.tenantLoss === 0); }
{ const r = A.calcPayout({ ...A.EMPTY_PAYOUT, price: 3.5 * 억, mortgage1: 3 * 억 });
  // 3.5억 − 300만 → 5,500만 → 3억 → 남은 −300만? pool = 3.5억−300만−5500만 = 2.92억 → 근저당1 2.92억 (부족) → 임차 0
  ok("낙찰가 낮으면 임차인 후순위 미회수 4,500만", r.tenantLoss === 45_000_000, won(r.tenantLoss)); }
ok("보증금이 소액 상한 초과면 최우선변제 없음", A.calcPayout({ ...A.EMPTY_PAYOUT, tenant: 2 * 억, tenantSenior: false, mortgage1: 6 * 억 }).lines.every((l) => !l.label.startsWith("1.")));

console.log("\n── 단위");
{ const r = U.calcDate({ from: "2024-01-01", to: "2025-01-01" }); ok("1년 = 366일 (윤년)", r.days === 366); ok("1년 0개월 0일", r.years === 1 && r.months === 0 && r.rest === 0); }
{ const r = U.calcDate({ from: "2024-01-31", to: "2024-03-01" }); ok("월말 처리 1개월 1일", r.months === 1 && r.rest === 1, `${r.months}/${r.rest}`); }
ok("84㎡ = 25.41평", near(U.calcArea({ value: 84, unit: "sqm" }).pyeong, 25.41, 0.01));
ok("34평 = 112.4㎡", near(U.calcArea({ value: 34, unit: "pyeong" }).sqm, 112.4, 0.01));
ok("1마일 = 1609.344m", U.calcLength({ value: 1, unit: "mile" }).meters === 1609.344);
ok("1평 = 36자²: 6자 = 60/33 m → ² = 3.3058", near(Math.pow(6 * U.LENGTH_UNITS.ja, 2), U.PYEONG, 1e-9));
ok("12억/84㎡ 평당 4,722만", near(U.calcUnitPrice(U.EMPTY_UNIT_PRICE).perPyeong, 47_226_000, 1000));
{ const r = U.calcLandShare(U.EMPTY_LAND_SHARE); ok("대지지분 12000×84/40000 = 25.2㎡", near(r.share, 25.2, 1e-9)); ok("가액 2.52억", r.value === 252_000_000); }
{ const r = U.calcCoverage(U.EMPTY_COVERAGE); ok("건폐율 56.7%", near(r.coverage, 170 / 300, 1e-9)); ok("용적률 200%", near(r.far, 2, 1e-9)); ok("최대 연면적 600", r.maxFloorArea === 600); }
ok("재건축 1998+30 = 2028", U.calcRebuild(U.EMPTY_REBUILD).eligibleYear === 2028);

console.log(`\n${checks - failures}/${checks} 통과${failures ? ` — 실패 ${failures}` : ""}`);
process.exit(failures ? 1 : 0);
