/**
 * 법인의 부동산 양도 — 법인세법 제55조(세율) + 제55조의2(토지등 양도소득에 대한 과세특례)
 * + 지방세법 제103조의20(법인지방소득세).
 *
 * 개인과 달리 법인은 양도소득이 따로 없다. 양도차익이 그 사업연도 소득에 합쳐져 법인세율
 * (2026년부터 10·20·22·25%, 2025.12.23 개정)을 타고, 주택·비사업용토지·입주권·분양권이면
 * 그 위에 **추가과세**(20% / 10% / 미등기 40%)가 얹힌다. 조문은 2026-09-03 Tax DB 현행본.
 *
 * 그래서 "법인양도세"라는 세목은 없고, 이 계산기가 내는 값은 **이 양도로 늘어나는
 * 법인세·추가과세·지방소득세의 합**이다 — 그 해 다른 소득이 있으면 한계구간이 달라지므로
 * 다른 소득을 입력받아 증분으로 계산한다.
 */

import type { Headline, Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
import type { StatuteBand } from "./property";
import { applyStatute } from "./property";
import { formatWon, truncate10, 억 } from "./won";

export const CORP_KINDS = ["house", "land-nonbiz", "right", "building", "land-biz"] as const;
export type CorpKind = (typeof CORP_KINDS)[number];
export const CORP_KIND_LABEL: Record<CorpKind, string> = {
  house: "주택 (부수토지 포함) · 별장",
  "land-nonbiz": "비사업용 토지",
  right: "조합원입주권 · 분양권",
  building: "상가 · 공장 · 사업용 건물",
  "land-biz": "사업용 토지",
};

export interface CorporateInput {
  kind: CorpKind;
  /** 양도가액 */
  price: number;
  /** 취득가액 (장부가액) */
  cost: number;
  /** 양도비용·자본적지출 등 필요경비 */
  expenses: number;
  /** 미등기 양도 */
  unregistered: boolean;
  /** 이 양도를 빼고 그 사업연도 과세표준 (0 이상). 한계구간을 정한다 */
  otherIncome: number;
}

export const EMPTY_CORPORATE: CorporateInput = {
  kind: "house",
  price: 15 * 억,
  cost: 10 * 억,
  expenses: 0,
  unregistered: false,
  otherIncome: 1 * 억,
};

/** 법인세율 — 법인세법 제55조 제1항 제1호 (2026년 1월 1일 이후 개시 사업연도) */
export const CORP_BANDS: StatuteBand[] = [
  { start: 0, base: 0, rate: 0.1 },
  { start: 2 * 억, base: 20_000_000, rate: 0.2 },
  { start: 200 * 억, base: 3_980_000_000, rate: 0.22 },
  { start: 3000 * 억, base: 65_580_000_000, rate: 0.25 },
];

/** 법인지방소득세 — 지방세법 제103조의20 제1항 제1호 (법인세율의 1/10) */
export const CORP_LOCAL_BANDS: StatuteBand[] = [
  { start: 0, base: 0, rate: 0.01 },
  { start: 2 * 억, base: 2_000_000, rate: 0.02 },
  { start: 200 * 억, base: 398_000_000, rate: 0.022 },
  { start: 3000 * 억, base: 6_558_000_000, rate: 0.025 },
];

/** 추가과세율 — 법인세법 제55조의2 제1항 */
export function surtaxRate(kind: CorpKind, unregistered: boolean): { rate: number; law: string; label: string } {
  if (kind === "house") {
    return unregistered
      ? { rate: 0.4, law: "법인세법 제55조의2 제1항 제2호", label: "주택 미등기 양도 40%" }
      : { rate: 0.2, law: "법인세법 제55조의2 제1항 제2호", label: "주택·별장 20%" };
  }
  if (kind === "land-nonbiz") {
    return unregistered
      ? { rate: 0.4, law: "법인세법 제55조의2 제1항 제3호", label: "비사업용 토지 미등기 40%" }
      : { rate: 0.1, law: "법인세법 제55조의2 제1항 제3호", label: "비사업용 토지 10%" };
  }
  if (kind === "right") return { rate: 0.2, law: "법인세법 제55조의2 제1항 제4호", label: "입주권·분양권 20%" };
  return { rate: 0, law: "법인세법 제55조의2", label: "추가과세 없음" };
}

export interface CorporateResult extends CalculationValidation {
  headline: Headline[];
  steps: Step[];
  tips: Tip[];
  gain: number;
  /** 이 양도로 늘어난 법인세 (증분) */
  corpTaxDelta: number;
  surtax: number;
  localTax: number;
  total: number;
  effectiveRate: number;
  marginalRate: number;
}

export function calcCorporate(input: CorporateInput): CorporateResult {
  const steps: Step[] = [];
  const tips: Tip[] = [];
  const price = Math.max(0, input.price);
  const cost = Math.max(0, input.cost);
  const expenses = Math.max(0, input.expenses);
  const other = Math.max(0, input.otherIncome);

  /* ── 1. 양도차익 ─────────────────────────────────────────── */
  const gain = Math.max(0, price - cost - expenses);
  steps.push({ label: "양도가액", value: price, tone: "sub" });
  steps.push({ label: "− 취득가액 (장부가액)", value: cost, tone: "minus", law: "법인세법 제19조" });
  steps.push({ label: "− 필요경비 (양도비용 등)", value: expenses, tone: "minus" });
  steps.push({ label: "양도차익 (익금 산입)", value: gain, tone: "sub", law: "법인세법 제15조" });

  /* ── 2. 법인세 증분 ──────────────────────────────────────── */
  const withGain = applyStatute(other + gain, CORP_BANDS);
  const without = applyStatute(other, CORP_BANDS);
  const corpTaxDelta = truncate10(withGain.tax - without.tax);
  steps.push({
    label: "그 사업연도 다른 과세표준",
    value: other,
    note: "이 양도를 빼고 남는 과세표준. 결손이면 0",
  });
  steps.push({
    label: `법인세 증분 (한계세율 ${Math.round(withGain.band.rate * 100)}%)`,
    value: corpTaxDelta,
    tone: "plus",
    law: "법인세법 제55조 제1항",
    note: `과세표준 ${formatWon(other + gain)}에 대한 법인세 ${formatWon(truncate10(withGain.tax))} − 양도 전 ${formatWon(truncate10(without.tax))}. 2억 이하 10% · 200억 이하 20% · 3천억 이하 22% · 초과 25% (2026년~)`,
  });

  /* ── 3. 추가과세 ─────────────────────────────────────────── */
  const sr = surtaxRate(input.kind, input.unregistered);
  const surtax = truncate10(gain * sr.rate);
  steps.push({
    label: `+ 토지등 양도소득 추가과세 (${sr.label})`,
    value: surtax,
    tone: "plus",
    law: sr.law,
    note:
      sr.rate > 0
        ? "양도차익에 단일세율을 곱해 법인세에 더한다. 손실이 난 다른 토지등과 통산할 수 있다 (이 계산기는 통산을 넣지 않았다)"
        : "사업용 부동산은 법인세율만 탄다",
  });

  /* ── 4. 지방소득세 ───────────────────────────────────────── */
  const localDelta = truncate10(applyStatute(other + gain, CORP_LOCAL_BANDS).tax - applyStatute(other, CORP_LOCAL_BANDS).tax);
  const localSurtax = truncate10(surtax * 0.1);
  const localTax = localDelta + localSurtax;
  steps.push({
    label: "+ 법인지방소득세 (법인세 증분의 10% + 추가과세의 10%)",
    value: localTax,
    tone: "plus",
    law: "지방세법 제103조의20 · 제103조의31",
  });

  const total = corpTaxDelta + surtax + localTax;
  steps.push({ label: "이 양도로 늘어나는 세금 합계", value: total, tone: "total" });

  const effectiveRate = gain > 0 ? total / gain : 0;
  const marginalRate = (withGain.band.rate + sr.rate) * 1.1;

  /* ── 5. 팁 ───────────────────────────────────────────────── */
  if (input.kind === "house" || input.kind === "right") {
    tips.push({
      level: "must",
      title: "법인 주택은 양도 전에 보유세부터 보세요",
      body: "법인이 가진 주택은 종부세가 기본공제 없이 단일세율 2.7%(3주택 이상 5%)입니다. 양도 시점을 6월 1일 전으로 당기면 그해 종부세·재산세가 빠집니다.",
      law: "종합부동산세법 제9조 제2항",
    });
  }
  if (input.kind === "land-nonbiz") {
    tips.push({
      level: "watch",
      title: "비사업용 토지 판정이 10%를 가릅니다",
      body: "보유기간 중 정해진 기간(직전 3년 중 2년 이상 등) 사업에 썼으면 사업용입니다. 판정은 기간 요건이 복잡해 실무에서 가장 자주 다투는 자리입니다.",
      law: "법인세법 제55조의2 제2항 · 시행령 제92조의3",
    });
  }
  if (input.unregistered) {
    tips.push({
      level: "must",
      title: "미등기 양도는 40% 추가과세입니다",
      body: "등기를 마치고 양도하면 20%(주택)·10%(비사업용 토지)로 내려갑니다. 등기비용보다 세금 차이가 훨씬 큽니다.",
      law: "법인세법 제55조의2 제1항",
    });
  }
  if (other < 2 * 억 && other + gain > 2 * 억) {
    tips.push({
      level: "watch",
      title: "이 양도로 법인세 구간이 10%에서 20%로 넘어갑니다",
      body: `2억원까지는 10%, 넘는 부분은 20%입니다. 사업연도를 나눠 양도하거나 다른 손익 인식 시점을 조정할 여지가 있는지 보세요.`,
      law: "법인세법 제55조 제1항",
    });
  }
  tips.push({
    level: "save",
    title: "양도차손이 있는 토지등과 같은 해에 팔면 통산됩니다",
    body: "추가과세는 토지등 양도소득끼리 합산해 계산하므로, 손실 난 부동산을 같은 사업연도에 정리하면 추가과세가 줄어듭니다.",
    law: "법인세법 제55조의2 제6항",
  });
  tips.push({
    level: "watch",
    title: "개인과 비교할 때는 배당까지 보세요",
    body: "법인세를 내고 남은 이익을 주주가 가져가려면 배당소득세(15.4%, 종합과세 시 최고 49.5%)가 한 번 더 붙습니다. 법인이 유리한지는 그 두 단계를 합쳐 판단합니다.",
  });

  const headline: Headline[] = [
    { label: "이 양도로 늘어나는 세금", value: total, hint: `양도차익의 ${(effectiveRate * 100).toFixed(1)}% · 한계세율 ${(marginalRate * 100).toFixed(1)}%` },
    { label: "법인세 증분 + 지방소득세", value: corpTaxDelta + localTax },
    { label: "추가과세", value: surtax, hint: sr.label },
  ];

  return { headline, steps, tips, gain, corpTaxDelta, surtax, localTax, total, effectiveRate, marginalRate };
}
