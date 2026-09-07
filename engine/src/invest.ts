/**
 * 투자·평가 — 적정 매수가, 종합소득세, 리모델링 수익, 건물 기준시가, 잔존가치, 건물 부가세,
 * 감정평가 8방식.
 *
 * 법정 숫자: 종합소득세는 소득세법 §50(기본공제 150만)·§55(세율)·§59의4(표준세액공제 7만, 근로자 13만),
 * 건물 부가세 안분은 부가세법 시행령 §64(기준시가 비율). 나머지는 부동산 실무 산식이며 입력값이 답을 정한다.
 */

import { INCOME_BANDS } from "./bands";
import { applyStatute } from "./property";
import type { Headline, Step, Tip } from "./trace";
import { hasInvalidNumbers, invalidCalculation, isFiniteNumber, isIntegerInRange, isOneOf, type CalculationValidation } from "./validation";
import { formatWon, truncate10, 만, 억 } from "./won";

/* ═══════════ 적정 매수가 · 적정 입찰가 ═══════════ */
export interface FairPriceInput { monthly: number; deposit: number; /** 목표 순수익률 (소수) */ targetYield: number; annualExpenses: number; vacancy: number; /** 취득비용률 (취득세·중개보수 등, 소수) */ acquisitionRate: number; /** 명도·수리 등 추가비용 (경매용) */ extraCost: number; }
export const EMPTY_FAIR: FairPriceInput = { monthly: 200 * 만, deposit: 5000 * 만, targetYield: 0.05, annualExpenses: 300 * 만, vacancy: 0.05, acquisitionRate: 0.05, extraCost: 0 };
export interface FairPriceResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; noi: number; price: number; }
export function calcFairPrice(input: FairPriceInput): FairPriceResult {
  if (hasInvalidNumbers(input) || input.targetYield <= 0 || !isFiniteNumber(input.vacancy, 0, 1)) return invalidCalculation({ noi: 0, price: 0 }, "목표수익률은 0보다 커야 하며, 비용은 0 이상, 공실률은 0~100%여야 합니다.");
  const steps: Step[] = []; const tips: Tip[] = [];
  const rent = Math.floor(input.monthly * 12 * (1 - input.vacancy));
  const noi = rent - input.annualExpenses;
  // NOI / y = 실투자금 = price × (1 + a) + extra − deposit → price = (NOI/y + deposit − extra) / (1 + a)
  const invested = input.targetYield > 0 ? noi / input.targetYield : 0;
  const price = Math.max(0, Math.floor((invested + input.deposit - input.extraCost) / (1 + input.acquisitionRate)));
  steps.push({ label: `연 임대수입 (공실 ${(input.vacancy * 100).toFixed(0)}% 반영)`, value: rent });
  steps.push({ label: "− 연 경비", value: input.annualExpenses, tone: "minus" });
  steps.push({ label: "순영업소득 NOI", value: noi, tone: "sub" });
  steps.push({ label: `÷ 목표 수익률 ${(input.targetYield * 100).toFixed(2)}% = 허용 실투자금`, value: Math.floor(invested), tone: "sub" });
  steps.push({ label: "+ 보증금 (돌려받는 돈)", value: input.deposit, tone: "plus" });
  if (input.extraCost) steps.push({ label: "− 명도·수리 등 추가비용", value: input.extraCost, tone: "minus" });
  steps.push({ label: `÷ (1 + 취득비용률 ${(input.acquisitionRate * 100).toFixed(1)}%) = 적정 매수가`, value: price, tone: "total" });
  tips.push({ level: "watch", title: "수익환원법의 단순형입니다", body: "NOI를 목표수익률로 나눈 값입니다. 목표수익률 1%p 차이가 가격을 20% 움직이니, 같은 지역 거래 사례의 수익률로 검증하세요." });
  tips.push({ level: "save", title: "경매라면 취득세는 낙찰가 기준입니다", body: "취득비용률에 낙찰가 기준 취득세(4.6%)와 명도비·미납관리비를 넣으면 이 값이 곧 상한 입찰가입니다." });
  return { headline: [{ label: "적정 매수가 (상한)", value: price, hint: `목표 수익률 ${(input.targetYield * 100).toFixed(1)}%` }, { label: "NOI (연)", value: noi }, { label: "허용 실투자금", value: Math.floor(invested) }], steps, tips, noi, price };
}

/* ═══════════ 종합소득세 ═══════════ */
export interface TotalIncomeInput { earned: number; business: number; rental: number; other: number; /** 기본공제 인원 (본인 포함) */ dependents: number; /** 그 밖의 소득공제 (연금보험료·주택자금 등) */ deductions: number; /** 세액공제·감면 합계 */ credits: number; /** 기납부세액 (원천징수·중간예납) */ prepaid: number; hasEarned: boolean; }
export const EMPTY_TOTAL_INCOME: TotalIncomeInput = { earned: 5000 * 만, business: 0, rental: 1500 * 만, other: 0, dependents: 1, deductions: 300 * 만, credits: 0, prepaid: 0, hasEarned: true };
export interface TotalIncomeResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; income: number; taxBase: number; tax: number; determined: number; due: number; marginal: number; }
export function calcTotalIncome(input: TotalIncomeInput): TotalIncomeResult {
  const steps: Step[] = []; const tips: Tip[] = [];
  const income = Math.max(0, input.earned) + Math.max(0, input.business) + Math.max(0, input.rental) + Math.max(0, input.other);
  const basic = Math.max(1, input.dependents) * 150 * 만;
  const taxBase = Math.max(0, income - basic - input.deductions);
  const { tax: raw, band } = applyStatute(taxBase, INCOME_BANDS);
  const tax = truncate10(raw);
  const standard = input.credits > 0 ? 0 : input.hasEarned ? 13 * 만 : 7 * 만;
  const determined = Math.max(0, tax - input.credits - standard);
  const local = truncate10(determined * 0.1);
  const due = determined + local - input.prepaid;
  steps.push({ label: "종합소득금액 (근로+사업+임대+기타)", value: income, tone: "sub", law: "소득세법 제14조" });
  steps.push({ label: `− 기본공제 ${Math.max(1, input.dependents)}명 × 150만`, value: basic, tone: "minus", law: "소득세법 제50조" });
  steps.push({ label: "− 그 밖의 소득공제", value: input.deductions, tone: "minus" });
  steps.push({ label: "과세표준", value: taxBase, tone: "sub" });
  steps.push({ label: `산출세액 (한계세율 ${(band.rate * 100).toFixed(0)}%)`, value: tax, law: "소득세법 제55조" });
  steps.push({ label: input.credits > 0 ? "− 세액공제·감면" : `− 표준세액공제 ${formatWon(standard)}`, value: input.credits > 0 ? input.credits : standard, tone: "minus", law: "소득세법 제59조의4 제9항" });
  steps.push({ label: "결정세액", value: determined, tone: "sub" });
  steps.push({ label: "+ 지방소득세 10%", value: local, tone: "plus", law: "지방세법 제92조" });
  steps.push({ label: "− 기납부세액", value: input.prepaid, tone: "minus" });
  steps.push({ label: due >= 0 ? "납부할 세액" : "환급받을 세액", value: Math.abs(due), tone: "total" });
  tips.push({ level: "watch", title: "소득금액은 총수입이 아닙니다", body: "근로소득은 총급여에서 근로소득공제를 뺀 금액, 사업·임대는 수입에서 필요경비를 뺀 금액입니다. 원천징수영수증·장부의 '소득금액' 칸을 넣으세요.", law: "소득세법 제19조 · 제47조" });
  if (input.rental > 0 && input.rental <= 2000 * 만 * 0.5) tips.push({ level: "save", title: "주택임대 총수입 2천만 이하면 분리과세와 비교하세요", body: "종합과세에 넣지 않고 14% 분리과세를 고를 수 있습니다. 주택임대소득세 계산기에서 둘을 비교합니다.", law: "소득세법 제64조의2" });
  tips.push({ level: "must", title: "5월 31일까지 신고합니다", body: "성실신고확인 대상자는 6월 30일. 근로소득만 있으면 연말정산으로 끝나지만, 임대·사업 소득이 있으면 합산 신고입니다.", law: "소득세법 제70조" });
  return { headline: [{ label: due >= 0 ? "납부할 세액 (지방소득세 포함)" : "환급세액", value: Math.abs(due), hint: `실효세율 ${income > 0 ? ((determined / income) * 100).toFixed(1) : "0"}%` }, { label: "결정세액", value: determined }, { label: "과세표준", value: taxBase }], steps, tips, income, taxBase, tax, determined, due, marginal: band.rate };
}

/* ═══════════ 리모델링 수익 ═══════════ */
export interface RemodelInput { cost: number; /** 리모델링 후 월세 증가분 */ rentIncrease: number; /** 리모델링 후 예상 가치 상승 */ valueIncrease: number; years: number; /** 자금 조달 금리 */ rate: number; }
export const EMPTY_REMODEL: RemodelInput = { cost: 5000 * 만, rentIncrease: 30 * 만, valueIncrease: 3000 * 만, years: 5, rate: 0.05 };
export interface RemodelResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; totalGain: number; net: number; payback: number; roi: number; }
export function calcRemodel(input: RemodelInput): RemodelResult {
  const steps: Step[] = []; const tips: Tip[] = [];
  const rentGain = input.rentIncrease * 12 * input.years;
  const financing = Math.floor(input.cost * input.rate * input.years);
  const totalGain = rentGain + input.valueIncrease;
  const net = totalGain - input.cost - financing;
  const payback = input.rentIncrease > 0 ? input.cost / (input.rentIncrease * 12) : Infinity;
  const roi = input.cost > 0 ? net / input.cost : 0;
  steps.push({ label: "리모델링 비용", value: input.cost, tone: "sub" });
  steps.push({ label: `월세 증가분 × 12 × ${input.years}년`, value: rentGain, tone: "plus" });
  steps.push({ label: "매각 시 가치 상승", value: input.valueIncrease, tone: "plus" });
  steps.push({ label: `− 자금비용 (${(input.rate * 100).toFixed(1)}% × ${input.years}년)`, value: financing, tone: "minus" });
  steps.push({ label: `${input.years}년 순이익`, value: net, tone: "total" });
  steps.push({ label: "월세만으로 회수하는 기간", value: Number.isFinite(payback) ? `${payback.toFixed(1)}년` : "회수 불가 (월세 증가 없음)" });
  if (net < 0) tips.push({ level: "must", title: "이 조건으로는 손해입니다", body: "월세 증가나 가치 상승 가정을 낮춰 보수적으로 넣었는데도 마이너스면, 리모델링보다 매각이나 현상 유지가 낫습니다." });
  tips.push({ level: "watch", title: "리모델링 비용은 자본적 지출로 양도세에서 빠집니다", body: "세금계산서·계좌이체 증빙이 있는 자본적 지출(새시·보일러·확장 등)은 양도차익에서 뺍니다. 벽지·장판 같은 수익적 지출은 안 됩니다.", law: "소득세법 시행령 제163조 제3항" });
  tips.push({ level: "save", title: "임대 중이면 월세 증가는 5% 상한에 걸립니다", body: "갱신 때 리모델링을 이유로 5% 넘게 올릴 수 없습니다. 공실 기간에 하고 새 계약으로 받는 게 보통입니다.", law: "주택임대차보호법 제7조" });
  return { headline: [{ label: `${input.years}년 순이익`, value: net, higherIsWorse: false, hint: `투자수익률 ${(roi * 100).toFixed(0)}%` }, { label: "총 이익", value: totalGain }, { label: "회수 기간", value: 0, displayValue: Number.isFinite(payback) ? `${payback.toFixed(1)}년` : "—" }], steps, tips, totalGain, net, payback, roi };
}

/* ═══════════ 건물 기준시가 (국세청 산식) ═══════════ */
export interface BuildingValueInput { area: number; /** ㎡당 금액 (국세청 고시, 2026년 신축 기준) */ unitPrice: number; structureIndex: number; useIndex: number; locationIndex: number; /** 경과연수별 잔가율 */ residualRate: number; }
export const EMPTY_BUILDING_VALUE: BuildingValueInput = { area: 100, unitPrice: 830_000, structureIndex: 1, useIndex: 1, locationIndex: 1, residualRate: 0.8 };
export interface BuildingValueResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; perSqm: number; value: number; }
export function calcBuildingValue(input: BuildingValueInput): BuildingValueResult {
  const steps: Step[] = []; const tips: Tip[] = [];
  const perSqm = Math.floor(input.unitPrice * input.structureIndex * input.useIndex * input.locationIndex * input.residualRate / 1000) * 1000;
  const value = perSqm * input.area;
  steps.push({ label: "㎡당 금액 (국세청 고시)", value: input.unitPrice, law: "소득세법 제99조 제1항 제1호 나목 · 국세청 건물 기준시가 계산방법 고시", note: "해마다 1월 1일 고시" });
  steps.push({ label: `× 구조지수 ${input.structureIndex} × 용도지수 ${input.useIndex} × 위치지수 ${input.locationIndex}`, value: Math.floor(input.unitPrice * input.structureIndex * input.useIndex * input.locationIndex) });
  steps.push({ label: `× 경과연수별 잔가율 ${input.residualRate}`, value: perSqm, tone: "sub", note: "1,000원 미만 절사" });
  steps.push({ label: `× 면적 ${input.area}㎡ = 건물 기준시가`, value: value, tone: "total" });
  tips.push({ level: "watch", title: "지수는 국세청 고시 표에서 찾습니다", body: "구조(철근콘크리트 1.0, 벽돌 0.8 등)·용도(주거 1.0, 상업 등)·위치(개별공시지가 구간)·경과연수(구조별 내용연수 잔가) 네 표입니다. 홈택스 기준시가 조회로 바로 계산할 수 있습니다." });
  tips.push({ level: "save", title: "쓰는 곳: 상속·증여 평가, 부가세 안분, 양도 환산취득가", body: "시가를 모를 때의 보충 평가액이고, 오피스텔·상업용 건물은 별도 고시 기준시가가 우선입니다.", law: "상속세 및 증여세법 제61조" });
  return { headline: [{ label: "건물 기준시가", value: value }, { label: "㎡당", value: perSqm }, { label: "면적", value: 0, displayValue: `${input.area}㎡` }], steps, tips, perSqm, value };
}

/* ═══════════ 건물 잔존가치 ═══════════ */
export interface ResidualInput { newCost: number; age: number; /** 내용연수 */ life: number; /** 최종 잔가율 */ salvage: number; method: "straight" | "declining"; }
export const EMPTY_RESIDUAL: ResidualInput = { newCost: 5 * 억, age: 15, life: 40, salvage: 0.1, method: "straight" };
export interface ResidualResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; rate: number; value: number; depreciation: number; }
export function calcResidual(input: ResidualInput): ResidualResult {
  if (hasInvalidNumbers(input) || !isIntegerInRange(input.life, 1, 500) || !isFiniteNumber(input.salvage, 0, 1) || !isOneOf(input.method, ["straight", "declining"])) return invalidCalculation({ rate: 0, value: 0, depreciation: 0 }, "내용연수는 1~500년 정수, 잔가율은 0~100%여야 합니다. 감가 방식을 확인해 주세요.");
  const steps: Step[] = []; const tips: Tip[] = [];
  const t = Math.min(input.life, Math.max(0, input.age));
  let rate: number;
  if (input.method === "straight") rate = 1 - (1 - input.salvage) * (t / input.life);
  else rate = Math.pow(input.salvage, t / input.life);
  const value = Math.floor(input.newCost * rate);
  steps.push({ label: "신축 재조달원가", value: input.newCost, tone: "sub" });
  steps.push({ label: `경과 ${t}년 / 내용연수 ${input.life}년 · ${input.method === "straight" ? "정액법" : "정률법"} · 최종 잔가 ${(input.salvage * 100).toFixed(0)}%`, value: `${(rate * 100).toFixed(1)}%` });
  steps.push({ label: "− 감가누계", value: input.newCost - value, tone: "minus" });
  steps.push({ label: "잔존가치", value, tone: "total" });
  tips.push({ level: "watch", title: "내용연수는 구조가 정합니다", body: "철근콘크리트 40~50년, 벽돌 30~40년, 목조 20~30년이 감정평가·기준시가 실무의 기준입니다." });
  tips.push({ level: "save", title: "감정평가는 관찰감가를 더합니다", body: "연수만으로 깎는 건 기계적 계산이고, 실제 평가는 수선 상태를 보고 더 깎거나 덜 깎습니다(관찰감가). 원가법 계산기와 같이 보세요." });
  return { headline: [{ label: "건물 잔존가치", value, hint: `신축 대비 ${(rate * 100).toFixed(1)}%` }, { label: "감가누계", value: input.newCost - value }, { label: "잔가율", value: 0, displayValue: `${(rate * 100).toFixed(1)}%` }], steps, tips, rate, value, depreciation: input.newCost - value };
}

/* ═══════════ 건물 부가세 ═══════════ */
export interface BuildingVatInput { /** 총 거래가 (부가세 별도) */ price: number; landStd: number; buildingStd: number; /** 계약서에 건물가액을 따로 적었는가 */ contractBuilding: number; /** 매수인이 사업자 (매입세액공제) */ buyerBusiness: boolean; }
export const EMPTY_BUILDING_VAT: BuildingVatInput = { price: 10 * 억, landStd: 5 * 억, buildingStd: 2 * 억, contractBuilding: 0, buyerBusiness: true };
export interface BuildingVatResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; buildingPrice: number; vat: number; landPrice: number; contractOk: boolean; }
export function calcBuildingVat(input: BuildingVatInput): BuildingVatResult {
  const steps: Step[] = []; const tips: Tip[] = [];
  const stdTotal = input.landStd + input.buildingStd;
  const apportioned = stdTotal > 0 ? Math.floor((input.price * input.buildingStd) / stdTotal) : 0;
  // 계약서 구분가액이 기준시가 안분과 30% 이상 차이나면 안분가액을 쓴다 (부가세법 §29⑨)
  const contractOk = input.contractBuilding > 0 && apportioned > 0 && Math.abs(input.contractBuilding - apportioned) / apportioned < 0.3;
  const buildingPrice = contractOk ? input.contractBuilding : apportioned;
  const landPrice = input.price - buildingPrice;
  const vat = Math.floor(buildingPrice * 0.1);
  steps.push({ label: "총 거래가액 (부가세 별도)", value: input.price, tone: "sub" });
  steps.push({ label: `기준시가 비율 안분 — 건물 ${stdTotal > 0 ? ((input.buildingStd / stdTotal) * 100).toFixed(1) : 0}%`, value: apportioned, law: "부가가치세법 시행령 제64조 제1항 제1호", note: "토지·건물 기준시가에 비례" });
  if (input.contractBuilding > 0) steps.push({ label: contractOk ? "계약서 건물가액 (안분가액과 30% 이내 — 인정)" : "계약서 건물가액 (안분가액과 30% 이상 차이 — 부인, 안분가액 적용)", value: input.contractBuilding, law: "부가가치세법 제29조 제9항" });
  steps.push({ label: "건물 공급가액", value: buildingPrice, tone: "sub" });
  steps.push({ label: "토지 공급가액 (면세)", value: landPrice, law: "부가가치세법 제26조 제1항 제14호" });
  steps.push({ label: "건물 부가가치세 10%", value: vat, tone: "total" });
  tips.push({ level: input.buyerBusiness ? "save" : "must", title: input.buyerBusiness ? "매수인이 사업자면 매입세액으로 돌려받습니다" : "매수인이 비사업자면 부가세가 그대로 비용입니다", body: input.buyerBusiness ? "세금계산서를 받아 신고하면 환급됩니다. 잔금 때 부가세를 먼저 내고 다음 신고 때 돌려받는 자금 계획이 필요합니다." : "주택 외 건물을 개인이 사면 10%를 더 냅니다. 포괄양수도(사업 전체 인수)면 부가세 없이 거래할 수 있습니다.", law: "부가가치세법 제10조 제9항 제2호" });
  tips.push({ level: "watch", title: "계약서에 건물가액을 낮게 쓰면 부인됩니다", body: "안분가액과 30% 이상 차이 나면 세무서가 기준시가 비율로 다시 계산합니다. 감정평가액이 있으면 그 비율이 우선합니다.", law: "부가가치세법 제29조 제9항 · 시행령 제64조" });
  return { headline: [{ label: "건물 부가가치세", value: vat }, { label: "건물 공급가액", value: buildingPrice }, { label: "토지 (면세)", value: landPrice }], steps, tips, buildingPrice, vat, landPrice, contractOk };
}

/* ═══════════ 감정평가 8방식 ═══════════ */
export const APPRAISAL_METHODS = ["cost", "sales", "land", "income", "dcf", "rent-sales", "rent-cost", "rent-income"] as const;
export type AppraisalMethod = (typeof APPRAISAL_METHODS)[number];
export const APPRAISAL_METHOD_LABEL: Record<AppraisalMethod, string> = { cost: "원가법 (재조달원가 − 감가)", sales: "거래사례비교법", land: "공시지가기준법", income: "수익환원법 (한 해 수익 ÷ 환원율)", dcf: "미래 수익의 현재가치 (DCF)", "rent-sales": "임대사례비교법", "rent-cost": "적산법 (기초가액 × 기대이율)", "rent-income": "수익분석법" };
export interface AppraisalInput {
  method: AppraisalMethod;
  // 원가법
  landValue: number; newCost: number; residualRate: number;
  // 거래사례·임대사례
  caseValue: number; timeFactor: number; areaFactor: number; conditionFactor: number; otherFactor: number;
  // 공시지가
  officialPrice: number; area: number; timeRate: number; regionFactor: number; itemFactor: number;
  // 수익환원
  noi: number; capRate: number;
  // DCF
  years: number; growth: number; discountRate: number; exitCap: number;
  // 적산법
  baseValue: number; expectedRate: number; expenses: number;
  // 수익분석법
  businessProfit: number; rentShare: number;
}
export const EMPTY_APPRAISAL: AppraisalInput = { method: "income", landValue: 5 * 억, newCost: 3 * 억, residualRate: 0.7, caseValue: 8 * 억, timeFactor: 1.03, areaFactor: 1, conditionFactor: 1, otherFactor: 1, officialPrice: 500 * 만, area: 200, timeRate: 1.02, regionFactor: 1, itemFactor: 1.1, noi: 4000 * 만, capRate: 0.05, years: 5, growth: 0.02, discountRate: 0.06, exitCap: 0.055, baseValue: 8 * 억, expectedRate: 0.04, expenses: 500 * 만, businessProfit: 1 * 억, rentShare: 0.3 };
export interface AppraisalResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; value: number; isRent: boolean; }
export function calcAppraisal(input: AppraisalInput): AppraisalResult {
  if (!isOneOf(input.method, APPRAISAL_METHODS) || Object.entries(input).some(([key, value]) => typeof value === "number" && !isFiniteNumber(value, key === "growth" ? -0.99 : 0)) || (input.method === "dcf" && (!isIntegerInRange(input.years, 1, 100) || input.exitCap <= 0 || input.discountRate > 1 || input.growth > 1)) || (input.method === "income" && input.capRate <= 0)) return invalidCalculation({ value: 0, isRent: false }, "평가 방식과 금액·요율을 확인해 주세요. DCF 기간은 1~100년 정수이며 환원율은 0보다 커야 합니다.");
  const steps: Step[] = []; const tips: Tip[] = [];
  let value = 0; let isRent = false;
  const m = input.method;
  if (m === "cost") {
    const building = Math.floor(input.newCost * input.residualRate);
    value = input.landValue + building;
    steps.push({ label: "토지가액", value: input.landValue, tone: "sub" });
    steps.push({ label: `건물 재조달원가 × 잔가율 ${(input.residualRate * 100).toFixed(0)}%`, value: building, tone: "plus" });
    steps.push({ label: "원가법 가액", value, tone: "total", law: "감정평가에 관한 규칙 제12조" });
  } else if (m === "sales" || m === "rent-sales") {
    isRent = m === "rent-sales";
    const f = input.timeFactor * input.areaFactor * input.conditionFactor * input.otherFactor;
    value = Math.floor(input.caseValue * f);
    steps.push({ label: isRent ? "임대사례 임료" : "거래사례 가격", value: input.caseValue, tone: "sub" });
    steps.push({ label: `× 시점수정 ${input.timeFactor} × 면적·규모 ${input.areaFactor} × 개별요인 ${input.conditionFactor} × 기타 ${input.otherFactor}`, value: `${f.toFixed(4)}` });
    steps.push({ label: isRent ? "비준임료" : "비준가액", value, tone: "total", law: isRent ? "감정평가에 관한 규칙 제22조" : "감정평가에 관한 규칙 제14조" });
  } else if (m === "land") {
    const unit = input.officialPrice * input.timeRate * input.regionFactor * input.itemFactor;
    value = Math.floor(unit * input.area);
    steps.push({ label: "표준지 공시지가 (㎡당)", value: input.officialPrice, tone: "sub" });
    steps.push({ label: `× 시점수정 ${input.timeRate} × 지역요인 ${input.regionFactor} × 개별요인 ${input.itemFactor}`, value: Math.floor(unit) });
    steps.push({ label: `× 면적 ${input.area}㎡`, value, tone: "total", law: "감정평가에 관한 규칙 제14조 · 부동산공시법 제3조" });
  } else if (m === "income") {
    value = input.capRate > 0 ? Math.floor(input.noi / input.capRate) : 0;
    steps.push({ label: "순영업소득 NOI (연)", value: input.noi, tone: "sub" });
    steps.push({ label: `÷ 환원율 ${(input.capRate * 100).toFixed(2)}%`, value, tone: "total", law: "감정평가에 관한 규칙 제11조 · 제16조" });
  } else if (m === "dcf") {
    let pv = 0; let cf = input.noi;
    for (let y = 1; y <= input.years; y++) { if (y > 1) cf = cf * (1 + input.growth); pv += cf / Math.pow(1 + input.discountRate, y); }
    const terminal = input.exitCap > 0 ? (cf * (1 + input.growth)) / input.exitCap : 0;
    const pvTerminal = terminal / Math.pow(1 + input.discountRate, input.years);
    value = Math.floor(pv + pvTerminal);
    steps.push({ label: `${input.years}년 현금흐름 현재가치 (성장 ${(input.growth * 100).toFixed(1)}%, 할인율 ${(input.discountRate * 100).toFixed(1)}%)`, value: Math.floor(pv) });
    steps.push({ label: `기말 복귀가치 (${input.years + 1}년차 NOI ÷ 최종환원율 ${(input.exitCap * 100).toFixed(2)}%) 의 현재가치`, value: Math.floor(pvTerminal), tone: "plus" });
    steps.push({ label: "DCF 수익가액", value, tone: "total", law: "감정평가에 관한 규칙 제11조 제2항" });
  } else if (m === "rent-cost") {
    isRent = true;
    value = Math.floor(input.baseValue * input.expectedRate + input.expenses);
    steps.push({ label: "기초가액", value: input.baseValue, tone: "sub" });
    steps.push({ label: `× 기대이율 ${(input.expectedRate * 100).toFixed(2)}%`, value: Math.floor(input.baseValue * input.expectedRate) });
    steps.push({ label: "+ 필요제경비 (세금·수선·관리)", value: input.expenses, tone: "plus" });
    steps.push({ label: "적산임료 (연)", value, tone: "total", law: "감정평가에 관한 규칙 제22조" });
  } else {
    isRent = true;
    value = Math.floor(input.businessProfit * input.rentShare + input.expenses);
    steps.push({ label: "순수익 (영업이익)", value: input.businessProfit, tone: "sub" });
    steps.push({ label: `× 부동산 귀속분 ${(input.rentShare * 100).toFixed(0)}%`, value: Math.floor(input.businessProfit * input.rentShare) });
    steps.push({ label: "+ 필요제경비", value: input.expenses, tone: "plus" });
    steps.push({ label: "수익임료 (연)", value, tone: "total", law: "감정평가에 관한 규칙 제22조" });
  }
  tips.push({ level: "watch", title: "감정평가는 세 방식을 함께 봅니다", body: "원가·비교·수익 방식으로 각각 구한 뒤 대상 물건의 성격에 맞는 방식에 무게를 둡니다(시산가액 조정). 한 방식만으로는 평가서가 되지 않습니다.", law: "감정평가에 관한 규칙 제12조 제2항" });
  tips.push({ level: "save", title: "세금에서는 감정평가액이 시가로 인정됩니다", body: "상속·증여 평가기간 안의 감정가액(둘 이상, 기준시가 10억 이하는 하나)은 시가로 봅니다. 기준시가보다 낮게 나오면 세금이 줄기도 합니다.", law: "상속세 및 증여세법 시행령 제49조" });
  if (!isFiniteNumber(value)) return invalidCalculation({ value: 0, isRent }, "계산 결과가 지원 범위를 넘습니다. 금액·배율·기간을 줄여 주세요.");
  return { headline: [{ label: `${APPRAISAL_METHOD_LABEL[m].split(" ")[0]} ${isRent ? "임료 (연)" : "가액"}`, value }, ...(isRent ? [{ label: "월 환산", value: Math.floor(value / 12) }] : [])], steps, tips, value, isRent };
}
