/**
 * 취득세 계산 — 지방세법 + 농어촌특별세법 + 지방세특례제한법.
 *
 * 취득세는 세 개가 한 덩어리로 붙는다: 취득세 본세 · 지방교육세 · 농어촌특별세.
 * 세 세목의 과세표준이 서로 달라서(특히 중과·감면일 때) 여기서 자주 틀린다.
 *
 * 조문 값은 Graph DB(현행 법령)에서 확인했다:
 *   지방세법 §6(19) 중과기준세율 2% · §11① 표준세율 · §13의2 주택 중과
 *   §15① 세율 특례(1가구1주택 상속) · §151①1 지방교육세
 *   농특세법 §4·§5①6 · 지특법 §36의3 생애최초 감면
 */

import type { Headline, Step, Tip } from "./trace";
import { hasInvalidNumbers, invalidCalculation, isFiniteNumber, isIntegerInRange, isOneOf, type CalculationValidation } from "./validation";
import { decimalProduct, floorProduct, formatWon, pct, truncate10, 억, 만 } from "./won";

/** 중과기준세율 — 지방세법 제6조 제19호 */
export const 중과기준세율 = 0.02;
/** 국민주택규모 — 농특세 비과세 경계 */
export const 국민주택규모 = 85;

export const CAUSES = ["purchase", "gift", "inherit", "original"] as const;
export type Cause = (typeof CAUSES)[number];
export const CAUSE_LABEL: Record<Cause, string> = {
  purchase: "매매 (유상)",
  gift: "증여 (무상)",
  inherit: "상속",
  original: "신축 (원시취득)",
};

export const KINDS = ["house", "land-farm", "building"] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABEL: Record<Kind, string> = {
  house: "주택",
  building: "주택 외 건물·토지 (상가·오피스텔 등)",
  "land-farm": "농지",
};

export interface AcquisitionInput {
  cause: Cause;
  kind: Kind;
  /** 취득가액 (원) */
  price: number;
  /** 전용면적 (㎡) — 농특세 비과세 판정 */
  area: number;
  /** 조정대상지역 소재 */
  regulated: boolean;
  /** 취득 후 세대 보유 주택 수 (이 주택 포함) */
  houses: number;
  /** 법인이 취득 */
  corporate: boolean;
  /** 일시적 2주택 — 중과에서 빠진다 */
  temporaryTwo: boolean;
  /** 생애최초 주택 구입 (지특법 §36의3) */
  firstHome: boolean;
  /** 감면 300만원 구간 — 60㎡ 이하 소형·다가구·인구감소지역 */
  firstHomeSmall: boolean;
  /** 상속인이 1가구 1주택 (지방세법 §15①2가) */
  soleHeirHouse: boolean;
}

export interface AcquisitionResult extends CalculationValidation {
  headline: Headline[];
  steps: Step[];
  tips: Tip[];
  /** 세율 */
  rate: number;
  /** 중과 적용 여부와 이유 */
  heavy: string | null;
  acquisitionTax: number;
  eduTax: number;
  ruralTax: number;
  discount: number;
  total: number;
  /** 취득가액 대비 총부담 */
  effectiveRate: number;
  deadlineLabel: string;
}

export const EMPTY_ACQUISITION: AcquisitionInput = {
  cause: "purchase",
  kind: "house",
  price: 9 * 억,
  area: 84,
  regulated: true,
  houses: 1,
  corporate: false,
  temporaryTwo: false,
  firstHome: false,
  firstHomeSmall: false,
  soleHeirHouse: false,
};

/**
 * 유상거래 주택의 표준세율 — 지방세법 제11조 제1항 제8호.
 * 6~9억 구간은 계산식이 조문에 그대로 있다: (가액 × 2/3억 − 3) × 1/100.
 * 백분율의 소수점 다섯째자리에서 반올림한다 (7억원 → 1.6667%).
 * 공식 계산 예: https://www.ycg.kr/open.content/ko/section/taxation/do/acquisition/
 */
export function houseRate(price: number): number {
  if (!isFiniteNumber(price)) return 0;
  if (price <= 6 * 억) return 0.01;
  if (price > 9 * 억) return 0.03;
  const numerator = (BigInt(Math.round(price)) * BigInt(2) - BigInt(9 * 억)) * BigInt(10_000);
  return Number((numerator + BigInt(1.5 * 억)) / BigInt(3 * 억)) / 1_000_000;
}

/** 중과 판정 — 지방세법 제13조의2 제1항. 반환값은 중과기준세율의 배수(200% / 400%) */
export function heavyMultiple(input: AcquisitionInput): 0 | 2 | 4 {
  if (input.kind !== "house" || input.cause !== "purchase") return 0;
  if (input.corporate) return 4;
  const n = input.houses;
  if (input.regulated) {
    if (n >= 3) return 4;
    if (n === 2) return input.temporaryTwo ? 0 : 2;
    return 0;
  }
  if (n >= 4) return 4;
  if (n === 3) return 2;
  return 0;
}

export function calcAcquisition(input: AcquisitionInput): AcquisitionResult {
  if (hasInvalidNumbers(input) || !isOneOf(input.cause, CAUSES) || !isOneOf(input.kind, KINDS) || !isIntegerInRange(input.houses, 1, 10000)) return invalidCalculation({ rate: 0, heavy: null, acquisitionTax: 0, eduTax: 0, ruralTax: 0, discount: 0, total: 0, effectiveRate: 0, deadlineLabel: "" }, "취득 원인·종류와 금액, 주택 수(1~10,000채 정수)를 확인해 주세요.");
  const steps: Step[] = [];
  const push = (s: Step) => steps.push(s);
  const price = Math.max(0, input.price);

  push({ label: "취득가액 (과세표준)", value: price, tone: "sub", law: "지방세법 제10조의3" });

  /* ── 1. 취득세율 ─────────────────────────────────────────── */
  let rate = 0;
  let rateLaw = "";
  let rateNote = "";
  let heavy: string | null = null;
  let soleHeirHouse = false;

  const multiple = heavyMultiple(input);
  // 생애최초 감면 대상이면 중과세율을 적용하지 않는다 (지특법 §36의3① 괄호)
  // 법인은 「본인 및 배우자가 주택을 소유한 사실이 없는」 개인만 대상인 감면에서 빠진다
  const firstHomeEligible =
    input.firstHome &&
    !input.corporate &&
    input.cause === "purchase" &&
    input.kind === "house" &&
    price <= 12 * 억;
  const heavyApplies = multiple > 0 && !firstHomeEligible;

  if (input.cause === "purchase") {
    if (input.kind === "house") {
      if (heavyApplies) {
        rate = 0.04 + 중과기준세율 * multiple;
        rateLaw = "지방세법 제13조의2 제1항";
        heavy = input.corporate
          ? "법인이 주택을 취득 → 12%"
          : multiple === 4
            ? input.regulated
              ? "조정대상지역 3주택 이상 → 12%"
              : "비조정대상지역 4주택 이상 → 12%"
            : input.regulated
              ? "조정대상지역 2주택 → 8%"
              : "비조정대상지역 3주택 → 8%";
        rateNote = `표준세율 4%에 중과기준세율 2%의 ${multiple * 100}%를 더한다`;
      } else {
        rate = houseRate(price);
        rateLaw = "지방세법 제11조 제1항 제8호";
        rateNote =
          price <= 6 * 억
            ? "6억원 이하 1%"
            : price <= 9 * 억
              ? "6~9억원 구간은 (취득가액 × 2 ÷ 3억 − 3) ÷ 100 — 가액에 따라 매끄럽게 오른다"
              : "9억원 초과 3%";
      }
    } else if (input.kind === "land-farm") {
      rate = 0.03;
      rateLaw = "지방세법 제11조 제1항 제7호 가목";
    } else {
      rate = 0.04;
      rateLaw = "지방세법 제11조 제1항 제7호 나목";
    }
  } else if (input.cause === "gift") {
    const giftHeavy =
      input.kind === "house" && input.regulated && price >= 3 * 억;
    if (giftHeavy) {
      rate = 0.12;
      rateLaw = "지방세법 제13조의2 제2항";
      heavy = "조정대상지역 3억원 이상 주택 무상취득 → 12%";
      rateNote =
        "다만 1세대 1주택자가 가진 집을 배우자·직계존비속이 받는 경우는 중과에서 빠진다";
    } else {
      rate = 0.035;
      rateLaw = "지방세법 제11조 제1항 제2호";
    }
  } else if (input.cause === "inherit") {
    if (input.kind === "land-farm") {
      rate = 0.023;
      rateLaw = "지방세법 제11조 제1항 제1호 가목";
    } else if (input.kind === "house" && input.soleHeirHouse) {
      soleHeirHouse = true;
      rate = 0.008;
      rateLaw = "지방세법 제15조 제1항 제2호 가목";
      rateNote = "1가구 1주택 상속은 표준세율 2.8%에서 중과기준세율 2%를 뺀다";
    } else {
      rate = 0.028;
      rateLaw = "지방세법 제11조 제1항 제1호 나목";
    }
  } else {
    rate = 0.028;
    rateLaw = "지방세법 제11조 제1항 제3호";
  }

  push({
    label: "적용 취득세율",
    value: pct(rate, 4),
    law: rateLaw,
    note: rateNote || undefined,
  });

  const grossAcquisition = decimalProduct(price, rate);
  push({ label: "취득세 산출세액", value: grossAcquisition, tone: "sub" });

  /* ── 2. 생애최초 감면 (지특법 §36의3) ───────────────────── */
  let discount = 0;
  if (firstHomeEligible) {
    const cap = input.firstHomeSmall ? 300 * 만 : 200 * 만;
    discount = Math.min(grossAcquisition, cap);
    push({
      label: "− 생애최초 감면",
      value: discount,
      tone: "minus",
      law: "지방세특례제한법 제36조의3",
      note: `산출세액이 ${formatWon(cap)} 이하면 전액 면제, 넘으면 ${formatWon(
        cap,
      )}을 뺀다 (2028년 말까지)`,
    });
  }

  const acquisitionTax = discount >= grossAcquisition ? 0 : Math.max(0, floorProduct([price, rate], 10) - discount);
  push({ label: "취득세", value: acquisitionTax, tone: "sub" });

  /* ── 3. 지방교육세 (§151①1) ─────────────────────────────── */
  //  · 주택 유상거래(§11①8): 해당 세율 × 50% 로 산출한 금액의 20%
  //  · 그 밖(§11①1~7): 세율에서 2%를 뺀 세율로 산출한 금액의 20%
  //  · 중과(§13의2): 4%에서 중과기준세율을 뺀 세율(=2%)로 산출한 금액의 20% → 0.4% 고정
  let eduBaseRate: number;
  let eduLaw = "지방세법 제151조 제1항 제1호";
  if (heavyApplies || (input.cause === "gift" && heavy)) {
    eduBaseRate = 0.004;
    eduLaw += " 나목";
  } else if (input.cause === "purchase" && input.kind === "house") {
    eduBaseRate = decimalProduct(rate, 0.1);
  } else if (soleHeirHouse) {
    // §15① 특례세율(표준세율 − 2%)을 적용해도 지방교육세는 표준세율 2.8% 기준으로 센다 → 0.16%
    eduBaseRate = 0.0016;
  } else {
    eduBaseRate = Math.max(0, Math.round(rate * 1_000_000) - 20_000) * 2 / 10_000_000;
  }
  let eduTax = floorProduct([price, eduBaseRate], 10);
  // 감면을 받으면 지방교육세도 같은 비율로 깎인다 (§151①1 다목 1))
  if (discount > 0 && grossAcquisition > 0) {
    // 생애최초 주택 감면: 같은 비율로 교육세 감면 → 남은 본세의 10%.
    eduTax = floorProduct([Math.max(0, grossAcquisition - discount), 0.1], 10);
  }
  push({
    label: "지방교육세",
    value: eduTax,
    law: eduLaw,
    note: `${pct(eduBaseRate, 5)} — ${
      input.cause === "purchase" && input.kind === "house" && !heavyApplies
        ? "주택 유상거래는 취득세율의 10%"
        : "세율에서 중과기준세율 2%를 뺀 뒤 20%"
    }`,
  });

  /* ── 4. 농어촌특별세 (농특세법 §4·§5①6) ───────────────── */
  //  · 표준세율 2%로 산출한 취득세액의 10% (= 취득가액의 0.2%)
  //  · 중과분은 중과기준세율의 배수만큼 얹힌다 → 8% 중과 0.6% · 12% 중과 1.0%
  //  · 전용 85㎡ 이하 서민주택은 비과세
  //  · §15①1~3 특례세율 취득(1가구 1주택 상속 등)은 면적과 무관하게 비과세 (농특세법 §4 10의4)
  const exemptSmallHouse = input.kind === "house" && input.area > 0 && input.area <= 국민주택규모;
  const exemptRural = exemptSmallHouse || soleHeirHouse;
  let ruralRate = 0;
  if (!exemptRural) {
    // 무상취득 12% 중과(§13의2②)도 중과기준세율의 400%가 얹힌 것이라 같은 배수로 센다
    const heavyMult = heavyApplies ? multiple : input.cause === "gift" && heavy ? 4 : 0;
    ruralRate = (2 + 2 * heavyMult) / 1000;
  }
  // 감면분에 대한 농특세 20% (§5①1) — 85㎡ 초과라 서민주택 비과세가 안 될 때만
  const ruralOnDiscount = !exemptRural && discount > 0 ? decimalProduct(discount, 0.2) : 0;
  const ruralTax = truncate10(floorProduct([price, ruralRate]) + ruralOnDiscount);
  push({
    label: "농어촌특별세",
    value: exemptRural
      ? soleHeirHouse && !exemptSmallHouse
        ? "비과세 (1가구 1주택 상속 특례세율)"
        : "비과세 (전용 85㎡ 이하)"
      : ruralTax,
    law: exemptRural
      ? soleHeirHouse && !exemptSmallHouse
        ? "농특세법 제4조 제10호의4"
        : "농특세법 제4조 제11호"
      : "농특세법 제5조 제1항 제6호",
    note: exemptRural
      ? undefined
      : `${pct(ruralRate)}${ruralOnDiscount ? " + 감면세액의 20%" : ""}`,
  });

  const total = acquisitionTax + eduTax + (exemptRural ? 0 : ruralTax);
  push({ label: "총 납부세액", value: total, tone: "total" });

  const effectiveRate = price > 0 ? total / price : 0;
  const deadlineLabel =
    input.cause === "inherit"
      ? "상속개시일이 속하는 달의 말일부터 6개월"
      : input.cause === "gift"
        ? "취득일이 속하는 달의 말일부터 3개월"
        : "취득일부터 60일";

  const headline: Headline[] = [
    { label: "총 납부세액", value: total, hint: `실효세율 ${pct(effectiveRate)}` },
    { label: "취득세", value: acquisitionTax, hint: `세율 ${pct(rate, 4)}` },
    { label: "지방교육세 + 농특세", value: eduTax + (exemptRural ? 0 : ruralTax) },
  ];

  return {
    headline,
    steps,
    tips: acquisitionTips(input, {
      total,
      rate,
      heavy,
      discount,
      firstHomeEligible,
      exemptRural,
      deadlineLabel,
      price,
    }),
    rate,
    heavy,
    acquisitionTax,
    eduTax,
    ruralTax: exemptRural ? 0 : ruralTax,
    discount,
    total,
    effectiveRate,
    deadlineLabel,
  };
}

function acquisitionTips(
  input: AcquisitionInput,
  r: {
    total: number;
    rate: number;
    heavy: string | null;
    discount: number;
    firstHomeEligible: boolean;
    exemptRural: boolean;
    deadlineLabel: string;
    price: number;
  },
): Tip[] {
  const tips: Tip[] = [];

  tips.push({
    level: "must",
    title: `신고·납부 기한 — ${r.deadlineLabel}`,
    body: "취득일은 잔금지급일과 등기일 중 빠른 날이다. 기한을 넘기면 무신고가산세 20%와 납부지연가산세가 붙는다.",
    law: "지방세법 제20조",
  });

  if (r.heavy) {
    tips.push({
      level: "watch",
      title: `중과세가 적용됐다 — ${r.heavy}`,
      body: "주택 수는 세대 기준이고 분양권·입주권·주택으로 과세하는 오피스텔도 들어간다. 세대 분리나 처분 순서를 바꾸면 결과가 달라질 수 있으니 계약 전에 따져야 한다.",
      law: "지방세법 제13조의2·제13조의3",
    });
  }

  if (
    input.cause === "purchase" &&
    input.kind === "house" &&
    input.houses === 2 &&
    input.regulated &&
    !input.temporaryTwo
  ) {
    tips.push({
      level: "save",
      title: "일시적 2주택이면 중과를 피한다",
      body: "종전 주택을 정해진 기간 안에 처분하면 1주택 세율로 신고할 수 있다. 처분하지 못하면 차액이 추징되니 기간을 반드시 확인할 것.",
      law: "지방세법 시행령 제28조의5",
    });
  }

  if (!input.firstHome && input.cause === "purchase" && input.kind === "house" && r.price <= 12 * 억) {
    tips.push({
      level: "save",
      title: "생애최초 주택이면 최대 200만원을 깎는다",
      body: "본인과 배우자가 주택을 가진 적이 없고, 12억원 이하 집을 본인이 살 목적으로 사면 산출세액에서 200만원(소형·인구감소지역은 300만원)을 뺀다. 2028년 말까지다. 다만 3년 안에 팔거나 임대하면 추징된다.",
      law: "지방세특례제한법 제36조의3",
    });
  }

  if (r.firstHomeEligible) {
    tips.push({
      level: "must",
      title: "생애최초 감면은 3년을 버텨야 한다",
      body: "취득일부터 3년 안에 팔거나, 증여하거나, 임대로 돌리면 감면세액을 그대로 토해낸다.",
      law: "지방세특례제한법 제36조의3 제4항",
    });
  }

  if (input.kind === "house" && input.area > 국민주택규모) {
    tips.push({
      level: "watch",
      title: "전용 85㎡를 넘어 농어촌특별세가 붙었다",
      body: "국민주택규모(전용 85㎡) 이하면 농특세가 통째로 비과세다. 84㎡와 85.1㎡ 사이에 세금 차이가 생기는 이유가 이것이다.",
      law: "농어촌특별세법 제4조 제11호",
    });
  }

  tips.push({
    level: "watch",
    title: "취득가액에는 부대비용도 들어간다",
    body: "중개보수·법무사 비용처럼 취득에 든 간접비용이 과세표준에 포함될 수 있다. 법인은 특히 넓게 본다.",
    law: "지방세법 제10조의3",
  });

  return tips;
}
