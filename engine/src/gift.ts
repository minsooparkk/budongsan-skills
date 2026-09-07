/**
 * 증여세 계산 — 상속세 및 증여세법.
 *
 * 조문 값은 Graph DB(현행 법령)에서 확인했다:
 *   §47 과세가액(동일인 10년 합산) · §53 증여재산공제 · §53의2 혼인·출산공제 1억
 *   §55 과세표준(50만원 미만 부과 제외) · §56 세율(제26조 준용) · §57 세대생략 할증
 *   §58 납부세액공제 · §69② 신고세액공제 3%
 *
 * 들어가지 않은 것: 창업자금·가업승계 과세특례(조특법 §30의5·§30의6), 저가양수·
 * 고가양도 등 증여의제, 명의신탁, 비거주자 증여.
 */

import { applyBands, BANDS_INHERITANCE } from "./progressive";
import type { Headline, Step, Tip } from "./trace";
import { hasInvalidNumbers, invalidCalculation, isIntegerInRange, isOneOf, type CalculationValidation } from "./validation";
import { decimalProduct, floorProduct, formatWon, pct, 억, 만 } from "./won";

export const RELATIONS = ["spouse", "lineal-desc", "lineal-asc", "kin", "other"] as const;
export type Relation = (typeof RELATIONS)[number];

export const RELATION_LABEL: Record<Relation, string> = {
  spouse: "배우자",
  "lineal-desc": "부모 → 자녀 (직계존속에게서)",
  "lineal-asc": "자녀 → 부모 (직계비속에게서)",
  kin: "친족 (4촌 이내 혈족·3촌 이내 인척)",
  other: "그 밖의 사람",
};

/** 증여재산공제 한도 (§53) — 10년 통산 */
export function relationDeductionCap(relation: Relation, minor: boolean): number {
  switch (relation) {
    case "spouse":
      return 6 * 억;
    case "lineal-desc":
      return minor ? 2000 * 만 : 5000 * 만;
    case "lineal-asc":
      return 5000 * 만;
    case "kin":
      return 1000 * 만;
    case "other":
      return 0;
  }
}

export interface GiftInput {
  year: number;
  month: number;
  relation: Relation;
  /** 수증자가 미성년자(19세 미만) */
  minor: boolean;
  /** 증여재산 (원) */
  realEstate: number;
  cash: number;
  stock: number;
  etc: number;
  /** 부담부증여 — 수증자가 떠안는 채무 */
  assumedDebt: number;
  /** 같은 사람에게서 10년 이내에 받은 증여재산가액 (합산) */
  priorGift: number;
  /** @deprecated Legacy actual-payment input; do not treat as pre-credit assessed tax. */
  priorGiftTaxPaid: number;
  /** 합산하는 사전증여의 산출세액 (신고세액공제 전, 가산세·세대생략 할증 제외) */
  priorGiftGrossTax?: number;
  /** 이전 신고서에서 0원인 항목까지 확인했는지; 미확인과 정당한 0원을 구분한다. */
  priorDetailsConfirmed?: boolean;
  /** 합산하는 사전증여의 과세표준 */
  priorTaxBase?: number;
  /** usedDeduction 중 이번에 합산하는 사전증여에 적용한 공제 */
  priorIncludedDeduction?: number;
  /** usedMarriageBirth 중 이번에 합산하는 사전증여에 적용한 공제 */
  priorIncludedMarriageBirth?: number;
  /** 10년 이내에 이미 쓴 증여재산공제액 */
  usedDeduction: number;
  /** 혼인·출산 증여재산공제 대상 (§53의2) */
  marriageBirth: boolean;
  /** 이미 쓴 혼인·출산 공제액 */
  usedMarriageBirth: number;
  /** 세대를 건너뛴 증여 — 조부모 → 손주 */
  generationSkip: boolean;
}

export interface GiftResult extends CalculationValidation {
  headline: Headline[];
  steps: Step[];
  tips: Tip[];
  payable: number;
  taxBase: number;
  grossTax: number;
  effectiveRate: number;
  deadline: string;
  belowMinimum: boolean;
  /** 부담부증여로 양도세가 따로 생기는 금액 */
  transferPortion: number;
  priorCredit: number;
  relationDeduction: number;
  marriageDeduction: number;
}

export const EMPTY_GIFT: GiftInput = {
  year: 2026,
  month: 8,
  relation: "lineal-desc",
  minor: false,
  realEstate: 5 * 억,
  cash: 0,
  stock: 0,
  etc: 0,
  assumedDebt: 0,
  priorGift: 0,
  priorGiftTaxPaid: 0,
  priorGiftGrossTax: 0,
  priorDetailsConfirmed: false,
  priorTaxBase: 0,
  priorIncludedDeduction: 0,
  priorIncludedMarriageBirth: 0,
  usedDeduction: 0,
  marriageBirth: false,
  usedMarriageBirth: 0,
  generationSkip: false,
};

export function calcGift(input: GiftInput): GiftResult {
  const invalid = (message: string) => invalidCalculation({ payable: 0, taxBase: 0, grossTax: 0, effectiveRate: 0, deadline: "", belowMinimum: false, transferPortion: 0, priorCredit: 0, relationDeduction: 0, marriageDeduction: 0 }, message);
  if (hasInvalidNumbers(input) || !isOneOf(input.relation, RELATIONS) || !isIntegerInRange(input.month, 1, 12) || !isIntegerInRange(input.year, 2024, 2026)) return invalid("현재 검증된 2024~2026년 증여만 지원합니다. 증여 연·월, 관계와 금액을 확인해 주세요.");
  if (input.priorGiftTaxPaid > 0) return invalid("이전 링크의 실납부액은 납부세액공제 기준과 다릅니다. 이전 실납부액을 지우고 사전증여의 산출세액(신고세액공제 전)과 과세표준을 다시 입력해 주세요.");
  const priorGift = input.priorGift >= 1000 * 만 ? input.priorGift : 0;
  if (priorGift > 0 && input.priorDetailsConfirmed !== true) return invalid("합산할 과거 증여의 과세표준·산출세액·공제 사용액을 신고서에서 확인해 주세요. 0원인 항목도 확인해야 합니다.");
  const priorBase = input.priorTaxBase ?? 0;
  const priorGrossTax = input.priorGiftGrossTax ?? 0;
  const includedDeduction = input.priorIncludedDeduction ?? 0;
  const includedMarriage = input.priorIncludedMarriageBirth ?? 0;
  const relationCap = relationDeductionCap(input.relation, input.minor);
  if (input.usedDeduction > relationCap || input.usedMarriageBirth > 억 || (includedMarriage > 0 && input.relation !== "lineal-desc")) return invalid("선택한 증여 관계·미성년 여부와 과거 공제 이력이 맞지 않습니다. 혼인·출산 공제는 직계존속에게 받은 증여에만 적용되며, 관계를 바꾸면 이전 공제 이력도 다시 확인해 주세요.");
  if (input.generationSkip && input.relation !== "lineal-desc") return invalid("세대생략 할증은 조부모 등 직계존속에게서 받은 증여만 선택할 수 있습니다.");
  if (includedDeduction > input.usedDeduction || includedMarriage > input.usedMarriageBirth || includedDeduction + includedMarriage > priorGift || priorBase > priorGift || (priorGrossTax > 0 && priorBase <= 0)) return invalid("합산 증여분의 공제액은 전체 사용 공제 이내여야 합니다. 사전증여의 과세표준·산출세액도 확인해 주세요.");
  if (input.generationSkip && priorGift > 0) return invalid("세대생략 증여를 합산할 때는 종전 할증세액과 증여자별 배분을 추가로 확인해야 합니다. 현재 간편 계산의 지원 범위를 벗어납니다.");
  const steps: Step[] = [];
  const push = (s: Step) => steps.push(s);

  /* ── 1. 증여재산 ─────────────────────────────────────────── */
  const gross = input.realEstate + input.cash + input.stock + input.etc;
  if (!Number.isSafeInteger(gross) || input.assumedDebt > gross) return invalid("증여재산·채무는 원 단위 정수여야 하고 인수 채무는 증여재산 합계를 넘을 수 없습니다.");
  push({ label: "증여재산가액", value: gross, tone: "sub", law: "상증세법 제60조" });
  if (input.realEstate) push({ label: "부동산", value: input.realEstate, depth: 1 });
  if (input.cash) push({ label: "현금", value: input.cash, depth: 1 });
  if (input.stock) push({ label: "주식", value: input.stock, depth: 1 });
  if (input.etc) push({ label: "기타", value: input.etc, depth: 1 });

  /* ── 2. 과세가액 (§47) ───────────────────────────────────── */
  const assumedDebt = Math.min(input.assumedDebt, gross);
  if (assumedDebt > 0) {
    push({
      label: "− 인수한 채무 (부담부증여)",
      value: assumedDebt,
      tone: "minus",
      law: "상증세법 제47조 제1항",
      note: "채무를 떠안은 부분은 증여가 아니라 유상양도다 — 증여자에게 양도세가 붙는다",
    });
  }
  push({
    label: "＋ 10년 이내 동일인 증여재산",
    value: priorGift,
    tone: "plus",
    law: "상증세법 제47조 제2항",
    note: priorGift
      ? "같은 사람(부모는 한 사람으로 본다)에게서 10년 안에 받은 것은 합쳐서 누진세율을 매긴다"
      : input.priorGift > 0 ? "동일인 사전증여 과세가액 합계 1천만원 미만은 과세가액에 가산하지 않는다. 공제 사용 이력은 별도 반영한다" : undefined,
  });

  const taxableGift = gross - assumedDebt + priorGift;
  push({ label: "증여세 과세가액", value: taxableGift, tone: "sub" });

  /* ── 3. 증여재산공제 (§53·§53의2) ────────────────────────── */
  const cap = relationDeductionCap(input.relation, input.minor);
  // Deduct the cumulative allowance from the cumulative tax base. Only allowance
  // consumed by gifts outside this aggregation reduces the available deduction.
  // NTS flow: cntntsId=7728; §47(2), §53.
  const outsideDeduction = input.usedDeduction - includedDeduction;
  const relationDeduction = Math.max(0, Math.min(cap - outsideDeduction, taxableGift));
  push({
    label: "증여재산공제",
    value: relationDeduction,
    tone: "minus",
    law: "상증세법 제53조",
    note:
      cap === 0
        ? "친족이 아닌 사람에게서 받으면 증여재산공제가 없다"
        : `${RELATION_LABEL[input.relation]} 한도 ${formatWon(cap)}${
            outsideDeduction ? ` 중 합산하지 않는 증여에 ${formatWon(outsideDeduction)}을 사용했다` : ""
          } — 10년 통산`,
  });

  let marriageDeduction = Math.min(includedMarriage, Math.max(0, taxableGift - relationDeduction));
  if (input.marriageBirth && input.relation === "lineal-desc") {
    marriageDeduction = Math.max(
      0,
      Math.min(1 * 억 - input.usedMarriageBirth + includedMarriage, taxableGift - relationDeduction),
    );
  }
  if (marriageDeduction > 0) {
    push({
      label: "혼인·출산 증여재산공제",
      value: marriageDeduction,
      tone: "minus",
      law: "상증세법 제53조의2",
      note: "혼인신고 전후 2년 또는 출생·입양일부터 2년 이내, 평생 1억원 한도",
    });
  }

  const deduction = relationDeduction + marriageDeduction;

  /* ── 4. 과세표준·산출세액 ────────────────────────────────── */
  const taxBase = Math.max(0, taxableGift - deduction);
  push({ label: "과세표준", value: taxBase, tone: "sub", law: "상증세법 제55조" });

  const belowMinimum = taxBase < 500_000;
  const applied = applyBands(taxBase, BANDS_INHERITANCE);
  const baseTax = belowMinimum ? 0 : applied.tax;
  push({ label: "적용세율", value: pct(applied.rate, 0), law: "상증세법 제56조" });
  push({ label: "누진공제", value: applied.quick, tone: "minus" });
  push({ label: "산출세액", value: baseTax, tone: "sub" });
  if (belowMinimum) {
    push({
      label: "과세최저한",
      value: "과세표준 50만원 미만 → 부과하지 않음",
      law: "상증세법 제55조 제2항",
    });
  }

  /* ── 5. 세대생략 할증 (§57) ──────────────────────────────── */
  let surcharge = 0;
  if (input.generationSkip && baseTax > 0) {
    const rate = input.minor && gross > 20 * 억 ? 0.4 : 0.3;
    surcharge = decimalProduct(baseTax, rate);
    push({
      label: `＋ 세대생략 할증 ${pct(rate, 0)}`,
      value: surcharge,
      tone: "plus",
      law: "상증세법 제57조",
      note:
        rate === 0.4
          ? "미성년 손주에게 20억원을 넘겨 증여하면 40%로 올라간다"
          : "부모를 건너뛰고 손주에게 바로 주면 30%가 더 붙는다",
    });
  }
  const grossTax = baseTax + surcharge;

  /* ── 6. 세액공제 ─────────────────────────────────────────── */
  let priorCredit = 0;
  if (priorGrossTax > 0 && baseTax > 0 && taxBase > 0) {
    // 한도 = 산출세액 × (가산한 증여재산 과세표준 / 총 과세표준) — §58①
    const cap2 = baseTax * Math.min(priorBase, taxBase) / taxBase;
    priorCredit = Math.min(priorGrossTax, cap2);
    push({
      label: "− 납부세액공제",
      value: priorCredit,
      tone: "minus",
      law: "상증세법 제58조",
      note: "합산 사전증여의 산출세액(신고세액공제 전). 이번 산출세액 × 사전증여 과세표준 ÷ 합산 과세표준이 공제 한도",
    });
  }

  const afterCredit = Math.max(0, grossTax - priorCredit);
  const filingCredit = decimalProduct(afterCredit, 0.03);
  push({
    label: "− 신고세액공제 3%",
    value: filingCredit,
    tone: "minus",
    law: "상증세법 제69조 제2항",
  });

  const payable = floorProduct([afterCredit, 0.97], 10);
  push({ label: "납부할 증여세", value: payable, tone: "total" });

  const deadline = giftDeadline(input.year, input.month);
  const effectiveRate = gross > 0 ? payable / gross : 0;

  const headline: Headline[] = [
    { label: "납부할 증여세", value: payable, hint: `실효세율 ${pct(effectiveRate, 1)}` },
    { label: "과세표준", value: taxBase, hint: `적용세율 ${pct(applied.rate, 0)}` },
    { label: "증여재산공제", value: deduction, hint: `한도 ${formatWon(cap)}` },
  ];

  return {
    headline,
    steps,
    tips: giftTips(input, { payable, cap, relationDeduction, deadline, assumedDebt }),
    payable,
    taxBase,
    grossTax,
    effectiveRate,
    deadline,
    belowMinimum,
    transferPortion: assumedDebt,
    priorCredit,
    relationDeduction,
    marriageDeduction,
  };
}

/** Two gifts more than ten years apart, applying the selected current law to both.
 * Asset/debt won are conserved; only the first gift assumes marriage/birth eligibility.
 * The second event's tax law and recipient age must be checked when it actually occurs.
 */
export function calcGiftSplit(input: GiftInput): { firstInput: GiftInput; secondInput: GiftInput; first: GiftResult; second: GiftResult; total: number } {
  const firstInput: GiftInput = { ...input };
  const secondInput: GiftInput = { ...input, priorGift: 0, priorGiftTaxPaid: 0, priorGiftGrossTax: 0, priorDetailsConfirmed: false, priorTaxBase: 0, priorIncludedDeduction: 0, priorIncludedMarriageBirth: 0, usedDeduction: 0, marriageBirth: false };
  for (const key of ["realEstate", "cash", "stock", "etc"] as const) {
    firstInput[key] = Math.floor(input[key] / 2);
    secondInput[key] = input[key] - firstInput[key];
  }
  const gross = input.realEstate + input.cash + input.stock + input.etc;
  const firstGross = firstInput.realEstate + firstInput.cash + firstInput.stock + firstInput.etc;
  firstInput.assumedDebt = gross > 0 ? Math.floor(input.assumedDebt * firstGross / gross) : 0;
  secondInput.assumedDebt = input.assumedDebt - firstInput.assumedDebt;
  const first = calcGift(firstInput);
  secondInput.usedMarriageBirth = Math.min(억, input.usedMarriageBirth + Math.max(0, first.marriageDeduction - (input.priorIncludedMarriageBirth ?? 0)));
  const second = calcGift(secondInput);
  return { firstInput, secondInput, first, second, total: first.payable + second.payable };
}

/** 신고기한 — 증여일이 속하는 달의 말일부터 3개월 (§68) */
export function giftDeadline(year: number, month: number): string {
  const end = new Date(year, month - 1 + 4, 0);
  return `${end.getFullYear()}년 ${end.getMonth() + 1}월 ${end.getDate()}일`;
}

function giftTips(
  input: GiftInput,
  r: {
    payable: number;
    cap: number;
    relationDeduction: number;
    deadline: string;
    assumedDebt: number;
  },
): Tip[] {
  const tips: Tip[] = [];

  tips.push({
    level: "must",
    title: `신고·납부 기한 ${r.deadline}`,
    body: "증여일이 속하는 달의 말일부터 3개월. 상속세(6개월)보다 짧다. 넘기면 신고세액공제 3%가 사라지고 무신고가산세 20%가 붙는다.",
    law: "상증세법 제68조",
  });

  if (r.assumedDebt > 0) {
    tips.push({
      level: "must",
      title: "부담부증여는 세금이 둘로 갈린다",
      body: `채무 ${formatWon(
        r.assumedDebt,
      )}만큼은 증여가 아니라 판 것으로 본다. 받는 사람은 그만큼 증여세가 줄지만, 주는 사람에게 그 부분의 양도소득세가 새로 생긴다. 두 세금을 합쳐야 유·불리가 나온다.`,
      law: "상증세법 제47조, 소득세법 제88조",
    });
  }

  if (input.relation === "lineal-desc" && !input.marriageBirth) {
    tips.push({
      level: "save",
      title: "혼인·출산이면 1억원을 더 뺀다",
      body: "혼인신고 전후 2년, 또는 자녀 출생·입양일부터 2년 안에 부모에게서 받으면 기본 5천만원과 별도로 1억원이 더 공제된다. 부부가 각자 받으면 양가에서 총 3억원까지 무세로 넘어간다.",
      law: "상증세법 제53조의2",
    });
  }

  if (input.relation !== "other") {
    tips.push({
      level: "watch",
      title: "10년을 채우면 공제가 되살아난다",
      body: `증여재산공제 ${formatWon(
        r.cap,
      )}은 한 번 쓰면 10년이 지나야 다시 생긴다. 반대로 10년 간격을 두고 나눠 주면 낮은 누진 구간을 두 번 쓴다 — 증여를 일찍 시작할수록 유리한 이유다.`,
      law: "상증세법 제53조",
    });
  }

  if (input.relation === "spouse") {
    tips.push({
      level: "watch",
      title: "배우자에게 준 뒤 10년 안에 팔면 이월과세",
      body: "배우자·직계존비속에게 받은 부동산을 10년 안에 팔면, 취득가액을 준 사람의 취득가액으로 되돌려 양도세를 매긴다. 증여로 취득가액을 올려 양도세를 줄이려는 계획은 10년을 버텨야 한다.",
      law: "소득세법 제97조의2",
    });
  }

  if (r.payable > 20_000_000) {
    tips.push({
      level: "save",
      title: "연부연납 — 최장 5년",
      body: `납부세액이 2천만원을 넘으면 담보를 걸고 나눠 낼 수 있다. 지금 세액 ${formatWon(
        r.payable,
      )}이면 대상이다. 가산금(이자)이 붙는다.`,
      law: "상증세법 제71조",
    });
  }

  tips.push({
    level: "watch",
    title: "현금 증여도 자금출처조사의 대상이다",
    body: "받은 돈으로 부동산을 사면 자금출처를 소명해야 한다. 신고하지 않은 증여가 여기서 드러나는 경우가 가장 많다.",
    law: "상증세법 제45조",
  });

  return tips;
}
