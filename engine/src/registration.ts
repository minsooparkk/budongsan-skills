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

import { calcAcquisition, type AcquisitionResult } from "./acquisition";
import type { Headline, Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
import { formatWon, truncate10, 만, 억 } from "./won";

export const REG_KINDS = ["house", "officetel", "building", "land"] as const;
export type RegKind = (typeof REG_KINDS)[number];
export const REG_KIND_LABEL: Record<RegKind, string> = {
  house: "주택 (아파트·단독·다세대)",
  officetel: "오피스텔",
  building: "상가·건물",
  land: "토지",
};

export interface RegistrationInput {
  kind: RegKind;
  /** 거래금액 (원) */
  price: number;
  /** 시가표준액 (원). 0이면 거래금액의 70%로 추정한다 — 채권 매입액의 기준 */
  standardValue: number;
  /** 특별시·광역시 소재 (채권 매입률이 다르다) */
  metro: boolean;
  /** 전용면적 (㎡) — 주택 농특세 판정 */
  area: number;
  /** 조정대상지역 */
  regulated: boolean;
  /** 취득 후 세대 보유 주택 수 (이 주택 포함) */
  houses: number;
  /** 생애최초 주택 구입 */
  firstHome: boolean;
  /** 법인 취득 */
  corporate: boolean;
  /** 조정대상지역 일시적 2주택 — 중과 제외 (§13의2①1 괄호) */
  temporaryTwo: boolean;
  /** 셀프등기 — 법무사 보수 0 */
  selfRegistration: boolean;
  /** 법무사 보수 (원, 협의액) */
  legalFee: number;
  /** 채권 할인율 (%) — 매입 즉시 매도할 때 은행이 떼는 비율 */
  discountRate: number;
  /** 대출 채권최고액 (원). 0이면 근저당 설정 없음 */
  mortgageMax: number;
  /** e-Form(전자표준양식) 신청 여부 — 서면 15,000원 → 13,000원. 완전 전자신청은 10,000원이지만 매매 등기에서는 드물다 */
  eForm: boolean;
}

export const EMPTY_REGISTRATION: RegistrationInput = {
  kind: "house",
  price: 9 * 억,
  standardValue: 0,
  metro: true,
  area: 84,
  regulated: true,
  houses: 1,
  firstHome: false,
  corporate: false,
  temporaryTwo: false,
  selfRegistration: false,
  legalFee: 30 * 만,
  discountRate: 10,
  mortgageMax: 0,
  eForm: false,
};

/**
 * 제1종 국민주택채권 매입률 — 주택도시기금법 시행령 [별표] 부표 제15호 가목
 * "소유권의 보존 또는 이전" (매매 등 유상). 구간은 시가표준액 기준, 특별시·광역시 / 그 밖의 지역.
 * 상속·증여(나목)는 요율이 다르며 이 계산기(매매 전용)에서는 쓰지 않는다.
 */
interface BondBand {
  /** 이 구간의 하한 (이상) */
  from: number;
  metro: number;
  other: number;
}
export const BOND_TABLE: Record<"house" | "land" | "building", BondBand[]> = {
  house: [
    { from: 2000 * 만, metro: 0.013, other: 0.013 },
    { from: 5000 * 만, metro: 0.019, other: 0.014 },
    { from: 1 * 억, metro: 0.021, other: 0.016 },
    { from: 1.6 * 억, metro: 0.023, other: 0.018 },
    { from: 2.6 * 억, metro: 0.026, other: 0.021 },
    { from: 6 * 억, metro: 0.031, other: 0.026 },
  ],
  land: [
    { from: 500 * 만, metro: 0.025, other: 0.02 },
    { from: 5000 * 만, metro: 0.04, other: 0.035 },
    { from: 1 * 억, metro: 0.05, other: 0.045 },
  ],
  building: [
    { from: 1000 * 만, metro: 0.01, other: 0.008 },
    { from: 1.3 * 억, metro: 0.016, other: 0.014 },
    { from: 2.5 * 억, metro: 0.02, other: 0.018 },
  ],
};

export function bondRate(kind: RegKind, standardValue: number, metro: boolean): number {
  const table = BOND_TABLE[kind === "house" ? "house" : kind === "land" ? "land" : "building"];
  let rate = 0;
  for (const b of table) if (standardValue >= b.from) rate = metro ? b.metro : b.other;
  return rate;
}

/** 인지세 — 인지세법 제3조 제1항 제1호. 주택 1억원 이하는 비과세(제6조 제5호) */
export function stampDuty(price: number, isHouse: boolean): number {
  if (isHouse && price <= 1 * 억) return 0;
  if (price <= 1000 * 만) return 0;
  if (price <= 3000 * 만) return 2 * 만;
  if (price <= 5000 * 만) return 4 * 만;
  if (price <= 1 * 억) return 7 * 만;
  if (price <= 10 * 억) return 15 * 만;
  return 35 * 만;
}

/** 등기신청수수료 — 소유권이전 서면 15,000원, e-Form 13,000원 (완전 전자신청 10,000원) */
export const REG_FEE = { paper: 15_000, eForm: 13_000 } as const;
/** 근저당권 설정 등록면허세 — 지방세법 제28조 제1항 제1호 다목 (채권금액의 0.2%) */
export const MORTGAGE_TAX_RATE = 0.002;
/** 근저당 설정 시 채권 매입률 — [별표] 부표 제15호 다목: 설정금액 2천만원 이상일 때 1%, 매입액 상한 10억원 */
export const MORTGAGE_BOND_RATE = 0.01;
export const MORTGAGE_BOND_MIN = 2000 * 만;
export const MORTGAGE_BOND_CAP = 10 * 억;

/** 채권 매입금액 단수 — [별표] 제4호: 1만원 단위, 5천원 이상은 올리고 미만은 버린다. 최저 1만원 */
export function roundBond(amount: number): number {
  if (amount <= 0) return 0;
  return Math.max(만, Math.round(amount / 만) * 만);
}

export interface RegistrationResult extends CalculationValidation {
  headline: Headline[];
  steps: Step[];
  tips: Tip[];
  acquisition: AcquisitionResult;
  standardValue: number;
  bondRate: number;
  bondAmount: number;
  bondCost: number;
  stamp: number;
  regFee: number;
  legalFee: number;
  mortgageTax: number;
  mortgageBondCost: number;
  /** 세금 (취득세 3종 + 인지세 + 등록면허세) */
  taxes: number;
  /** 비용 (채권 할인 + 수수료 + 법무사) */
  costs: number;
  total: number;
  effectiveRate: number;
}

export function calcRegistration(input: RegistrationInput): RegistrationResult {
  const steps: Step[] = [];
  const tips: Tip[] = [];
  const price = Math.max(0, input.price);
  const isHouse = input.kind === "house";

  /* ── 1. 취득세 3종 — acquisition.ts 에 맡긴다 ───────────── */
  const acquisition = calcAcquisition({
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
    note: `세율 ${(acquisition.rate * 100).toFixed(2)}%${acquisition.heavy ? ` — ${acquisition.heavy}` : ""}${
      acquisition.discount > 0 ? ` · 생애최초 감면 ${formatWon(acquisition.discount)}` : ""
    }`,
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
    note: `시가표준액 ${formatWon(standardValue)}${input.standardValue > 0 ? "" : " (미입력 — 거래금액의 70%로 추정)"} · ${
      input.metro ? "특별시·광역시" : "그 밖의 지역"
    } 요율. 매입액은 1만원 단위(5천원 이상 올림)`,
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
    note:
      stamp === 0 && isHouse
        ? "주택 1억원 이하 비과세 (제6조 제5호)"
        : "매매계약서 1통 기준. 관행상 매도·매수가 절반씩 부담하지만 여기서는 전액을 잡는다",
  });

  /* ── 4. 등기신청수수료 ───────────────────────────────────── */
  const regFee = input.eForm ? REG_FEE.eForm : REG_FEE.paper;
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
    const regTax = Math.max(6_000, truncate10(input.mortgageMax * MORTGAGE_TAX_RATE));
    const regEdu = truncate10(regTax * 0.2);
    mortgageTax = regTax + regEdu;
    const mBond =
      input.mortgageMax >= MORTGAGE_BOND_MIN
        ? Math.min(MORTGAGE_BOND_CAP, roundBond(input.mortgageMax * MORTGAGE_BOND_RATE))
        : 0;
    mortgageBondCost = Math.floor(mBond * discount);
    steps.push({
      label: "근저당권 설정 등록면허세 + 지방교육세",
      value: mortgageTax,
      tone: "plus",
      law: "지방세법 제28조 제1항 제1호 다목 · 제151조",
      note: `채권최고액 ${formatWon(input.mortgageMax)} × 0.2% + 그 20%. 채권최고액은 보통 대출액의 110~120%`,
    });
    steps.push({
      label: "근저당 설정 채권 할인비용",
      value: mortgageBondCost,
      tone: "plus",
      law: "주택도시기금법 시행령 [별표]",
      note:
        input.mortgageMax >= MORTGAGE_BOND_MIN
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
      title: `셀프등기하면 ${formatWon(legalFee)} 아낍니다`,
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

  const headline: Headline[] = [
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
