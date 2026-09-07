/**
 * 재산세 — 지방세법 제110조(과세표준)·제111조(세율)·제111조의2(1세대 1주택 특례)·
 * 제112조(도시지역분)·제146조 제3항(소방분 지역자원시설세)·제151조 제1항 제6호(지방교육세).
 * 공정시장가액비율은 시행령 제109조, 과세표준상한액은 제109조의2.
 *
 * 조문은 2026-09-03 Tax DB(현행 시행 버전)에서 그대로 옮겼다. 세율표는 조문 표기
 * (구간 시작 세액 + 초과분 × 세율)를 그대로 쓰고, 검증 스크립트가 누진공제 표기와
 * 같은 값인지 대조한다.
 *
 * 한 고지서에 붙는 다섯 줄 — 재산세 본세 · 도시지역분 · 지방교육세 · 지역자원시설세
 * (소방분) 를 전부 계산한다. 사람들이 "재산세"라고 부르는 금액은 이 합계다.
 */

import type { Headline, Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
import { formatWon, truncate10, 만, 억 } from "./won";

export const PROPERTY_KINDS = ["house", "building", "land-general", "land-separate"] as const;
export type PropertyKind = (typeof PROPERTY_KINDS)[number];
export const PROPERTY_KIND_LABEL: Record<PropertyKind, string> = {
  house: "주택 (아파트·단독·다세대)",
  building: "건축물 (상가·오피스텔·공장)",
  "land-general": "토지 — 종합합산 (나대지·잡종지)",
  "land-separate": "토지 — 별도합산 (상가 부속토지 등)",
};

export interface PropertyInput {
  kind: PropertyKind;
  /** 시가표준액 — 주택은 공시가격, 건축물·토지는 지방자치단체 시가표준액 (원) */
  price: number;
  /** 1세대 1주택 (시행령 제110조의2) — 세율 특례·공정시장가액비율 특례 */
  oneHouse: boolean;
  /** 도시지역분 적용 지역 (도시지역 안 대부분) */
  urban: boolean;
  /** 직전 연도 공시가격 (원). 0이면 과세표준상한 계산을 건너뛴다 */
  prevPrice: number;
  /** 주택의 건물분 시가표준액 (원) — 소방분 지역자원시설세용. 0이면 계산하지 않는다 */
  buildingValue: number;
}

export const EMPTY_PROPERTY: PropertyInput = {
  kind: "house",
  price: 8 * 억,
  oneHouse: true,
  urban: true,
  prevPrice: 0,
  buildingValue: 0,
};

/** 구간 표 — 조문 표기 그대로 (start: 구간 하한, base: 하한에서의 세액, rate: 초과분 세율) */
export interface StatuteBand {
  start: number;
  base: number;
  rate: number;
}

export function applyStatute(taxBase: number, bands: StatuteBand[]): { tax: number; band: StatuteBand } {
  const x = Math.max(0, taxBase);
  let band = bands[0];
  for (const b of bands) if (x > b.start) band = b;
  return { tax: band.base + (x - band.start) * band.rate, band };
}

/** 주택 표준세율 — 제111조 제1항 제3호 나목 */
export const HOUSE_BANDS: StatuteBand[] = [
  { start: 0, base: 0, rate: 0.001 },
  { start: 6000 * 만, base: 60_000, rate: 0.0015 },
  { start: 1.5 * 억, base: 195_000, rate: 0.0025 },
  { start: 3 * 억, base: 570_000, rate: 0.004 },
];

/** 1세대 1주택 특례세율 (공시가격 9억원 이하) — 제111조의2 제1항 */
export const HOUSE_SPECIAL_BANDS: StatuteBand[] = [
  { start: 0, base: 0, rate: 0.0005 },
  { start: 6000 * 만, base: 30_000, rate: 0.001 },
  { start: 1.5 * 억, base: 120_000, rate: 0.002 },
  { start: 3 * 억, base: 420_000, rate: 0.0035 },
];

/** 토지 종합합산 — 제111조 제1항 제1호 가목 */
export const LAND_GENERAL_BANDS: StatuteBand[] = [
  { start: 0, base: 0, rate: 0.002 },
  { start: 5000 * 만, base: 100_000, rate: 0.003 },
  { start: 1 * 억, base: 250_000, rate: 0.005 },
];

/** 토지 별도합산 — 제111조 제1항 제1호 나목 */
export const LAND_SEPARATE_BANDS: StatuteBand[] = [
  { start: 0, base: 0, rate: 0.002 },
  { start: 2 * 억, base: 400_000, rate: 0.003 },
  { start: 10 * 억, base: 2_800_000, rate: 0.004 },
];

/** 소방분 지역자원시설세 — 제146조 제3항 제1호 */
export const FIRE_BANDS: StatuteBand[] = [
  { start: 0, base: 0, rate: 0.0004 },
  { start: 600 * 만, base: 2_400, rate: 0.0005 },
  { start: 1300 * 만, base: 5_900, rate: 0.0006 },
  { start: 2600 * 만, base: 13_700, rate: 0.0008 },
  { start: 3900 * 만, base: 24_100, rate: 0.001 },
  { start: 6400 * 만, base: 49_100, rate: 0.0012 },
];

/** 그 밖의 건축물 — 제111조 제1항 제2호 다목 */
export const BUILDING_RATE = 0.0025;
/** 도시지역분 — 제112조 제1항 제2호 */
export const URBAN_RATE = 0.0014;
/** 지방교육세 — 제151조 제1항 제6호 (도시지역분은 제외한 재산세액의 20%) */
export const EDU_RATE = 0.2;
/** 과세표준상한율 — 시행령 제109조의2 제2항 */
export const CAP_RATE = 0.05;
/** 1세대 1주택 특례세율 상한 공시가격 — 제111조의2 제1항 */
export const SPECIAL_RATE_LIMIT = 9 * 억;
/** 주택 세액 20만원 이하는 7월에 한꺼번에 — 제115조 제1항 제3호 */
export const SINGLE_PAYMENT_LIMIT = 20 * 만;

/**
 * 공정시장가액비율 — 시행령 제109조 제1항 (2026년 납세의무 성립분).
 * 1세대 1주택은 공시가격 9억 초과분까지 43~45%. 그 외 주택 60%, 토지·건축물 70%.
 */
export function fairMarketRatio(input: Pick<PropertyInput, "kind" | "price" | "oneHouse">): number {
  if (input.kind !== "house") return 0.7;
  if (!input.oneHouse) return 0.6;
  if (input.price <= 3 * 억) return 0.43;
  if (input.price <= 6 * 억) return 0.44;
  return 0.45;
}

export interface PropertyResult extends CalculationValidation {
  headline: Headline[];
  steps: Step[];
  tips: Tip[];
  ratio: number;
  taxBase: number;
  /** 과세표준상한이 실제로 걸렸는가 */
  capped: boolean;
  specialRate: boolean;
  mainTax: number;
  urbanTax: number;
  eduTax: number;
  fireTax: number;
  total: number;
  /** 납부 일정 */
  july: number;
  september: number;
  scheduleLabel: string;
  /** 1세대 1주택 특례가 없었다면 (특례 적용 시에만) */
  withoutSpecial: number | null;
}

export function calcProperty(input: PropertyInput): PropertyResult {
  const steps: Step[] = [];
  const tips: Tip[] = [];
  const price = Math.max(0, input.price);
  const isHouse = input.kind === "house";

  /* ── 1. 과세표준 ─────────────────────────────────────────── */
  const ratio = fairMarketRatio({ ...input, price });
  steps.push({
    label: isHouse ? "공시가격 (시가표준액)" : "시가표준액",
    value: price,
    tone: "sub",
    law: "지방세법 제4조",
  });
  let taxBase = Math.floor(price * ratio);
  steps.push({
    label: `× 공정시장가액비율 ${Math.round(ratio * 100)}%`,
    value: taxBase,
    law: "지방세법 시행령 제109조",
    note: isHouse
      ? input.oneHouse
        ? "1세대 1주택 특례 비율 — 3억 이하 43%, 6억 이하 44%, 6억 초과 45% (2026년분)"
        : "주택 60%"
      : "토지·건축물 70%",
  });

  let capped = false;
  if (isHouse && input.prevPrice > 0) {
    const capAmount = Math.floor(input.prevPrice * ratio + taxBase * CAP_RATE);
    if (taxBase > capAmount) {
      capped = true;
      steps.push({
        label: "과세표준상한액 적용",
        value: capAmount,
        tone: "sub",
        law: "지방세법 제110조 제3항 · 시행령 제109조의2",
        note: `직전 연도 공시가격 ${formatWon(input.prevPrice)} × ${Math.round(ratio * 100)}% + 올해 과세표준 × 5%. 공시가격이 크게 올라도 과세표준은 이만큼만 오른다`,
      });
      taxBase = capAmount;
    }
  }
  steps.push({ label: "과세표준", value: taxBase, tone: "sub", law: "지방세법 제110조" });

  /* ── 2. 재산세 본세 ──────────────────────────────────────── */
  let mainRaw = 0;
  let specialRate = false;
  let withoutSpecial: number | null = null;
  if (isHouse) {
    specialRate = input.oneHouse && price <= SPECIAL_RATE_LIMIT;
    const bands = specialRate ? HOUSE_SPECIAL_BANDS : HOUSE_BANDS;
    const { tax, band } = applyStatute(taxBase, bands);
    mainRaw = tax;
    steps.push({
      label: specialRate ? "재산세 (1세대 1주택 특례세율)" : "재산세 (주택 표준세율)",
      value: truncate10(tax),
      law: specialRate ? "지방세법 제111조의2 제1항" : "지방세법 제111조 제1항 제3호",
      note:
        band.start === 0
          ? `${(band.rate * 100).toFixed(2)}%`
          : `${formatWon(band.base)} + ${formatWon(band.start)} 초과분 × ${(band.rate * 100).toFixed(2)}%`,
    });
    if (specialRate) withoutSpecial = applyStatute(taxBase, HOUSE_BANDS).tax;
  } else if (input.kind === "building") {
    mainRaw = taxBase * BUILDING_RATE;
    steps.push({
      label: "재산세 (건축물 0.25%)",
      value: truncate10(mainRaw),
      law: "지방세법 제111조 제1항 제2호 다목",
      note: "골프장·고급오락장 4%, 주거지역 안 공장 0.5%는 여기서 다루지 않는다",
    });
  } else {
    const bands = input.kind === "land-general" ? LAND_GENERAL_BANDS : LAND_SEPARATE_BANDS;
    const { tax, band } = applyStatute(taxBase, bands);
    mainRaw = tax;
    steps.push({
      label: input.kind === "land-general" ? "재산세 (종합합산 토지)" : "재산세 (별도합산 토지)",
      value: truncate10(tax),
      law: input.kind === "land-general" ? "지방세법 제111조 제1항 제1호 가목" : "지방세법 제111조 제1항 제1호 나목",
      note:
        band.start === 0
          ? `${(band.rate * 100).toFixed(1)}%`
          : `${formatWon(band.base)} + ${formatWon(band.start)} 초과분 × ${(band.rate * 100).toFixed(1)}%`,
    });
  }
  const mainTax = truncate10(mainRaw);

  /* ── 3. 도시지역분 ───────────────────────────────────────── */
  const urbanTax = input.urban ? truncate10(taxBase * URBAN_RATE) : 0;
  steps.push({
    label: "+ 재산세 도시지역분 (과세표준 × 0.14%)",
    value: urbanTax,
    tone: "plus",
    law: "지방세법 제112조 제1항 제2호",
    note: input.urban ? "도시지역 안 부동산에 조례로 부과. 지방교육세 계산에서는 뺀다" : "도시지역 밖 — 부과되지 않는다",
  });

  /* ── 4. 지방교육세 ───────────────────────────────────────── */
  const eduTax = truncate10(mainTax * EDU_RATE);
  steps.push({
    label: "+ 지방교육세 (재산세 본세 × 20%)",
    value: eduTax,
    tone: "plus",
    law: "지방세법 제151조 제1항 제6호",
  });

  /* ── 5. 소방분 지역자원시설세 ────────────────────────────── */
  let fireTax = 0;
  let fireBase = 0;
  if (isHouse) {
    if (input.buildingValue > 0) fireBase = Math.floor(input.buildingValue * ratio);
  } else if (input.kind === "building") {
    fireBase = taxBase;
  }
  if (fireBase > 0) {
    const { tax, band } = applyStatute(fireBase, FIRE_BANDS);
    fireTax = truncate10(tax);
    steps.push({
      label: "+ 지역자원시설세 (소방분)",
      value: fireTax,
      tone: "plus",
      law: "지방세법 제146조 제3항",
      note: `건물분 과세표준 ${formatWon(fireBase)} — ${
        band.start === 0
          ? `${(band.rate * 100).toFixed(2)}%`
          : `${formatWon(band.base)} + ${formatWon(band.start)} 초과분 × ${(band.rate * 100).toFixed(2)}%`
      }. 4층 이상 등 화재위험 건축물은 2배·3배`,
    });
  } else if (isHouse) {
    steps.push({
      label: "+ 지역자원시설세 (소방분)",
      value: "건물분 시가표준액 미입력 — 계산 생략",
      law: "지방세법 제146조 제3항",
      note: "주택은 건물 부분 가액에만 붙는다. 고지서의 '건물 시가표준액'을 넣으면 함께 계산한다",
    });
  }

  const total = mainTax + urbanTax + eduTax + fireTax;
  steps.push({ label: "연간 재산세 합계 (고지서 기준)", value: total, tone: "total" });

  /* ── 6. 납부 일정 — 제115조 ──────────────────────────────── */
  let july = 0;
  let september = 0;
  let scheduleLabel = "";
  if (isHouse) {
    if (total <= SINGLE_PAYMENT_LIMIT) {
      july = total;
      scheduleLabel = "7월 16~31일 한 번에 (세액 20만원 이하)";
    } else {
      july = truncate10(total / 2);
      september = total - july;
      scheduleLabel = "7월 16~31일 ½ · 9월 16~30일 ½";
    }
  } else if (input.kind === "building") {
    july = total;
    scheduleLabel = "7월 16~31일";
  } else {
    september = total;
    scheduleLabel = "9월 16~30일";
  }

  /* ── 7. 팁 ───────────────────────────────────────────────── */
  if (isHouse && input.oneHouse && price > SPECIAL_RATE_LIMIT && price <= SPECIAL_RATE_LIMIT * 1.1) {
    tips.push({
      level: "watch",
      title: "공시가격이 9억원을 조금 넘어 특례세율에서 빠졌습니다",
      body: `9억원 이하였다면 특례세율(0.05~0.35%)이 적용됩니다. 지금 세액과 특례 적용 세액의 차이가 큽니다 — 공시가격 이의신청(매년 3~4월) 기간을 확인하세요.`,
      law: "지방세법 제111조의2",
    });
  }
  if (specialRate && withoutSpecial !== null) {
    tips.push({
      level: "save",
      title: `1세대 1주택 특례로 ${formatWon(truncate10(withoutSpecial) - mainTax)} 덜 냅니다`,
      body: "특례는 세대 기준 1주택에만 적용됩니다. 분양권·입주권·상속주택·오피스텔이 세대 안에 있으면 요건을 다시 확인하세요.",
      law: "지방세법 시행령 제110조의2",
    });
  }
  if (isHouse && !input.oneHouse) {
    tips.push({
      level: "watch",
      title: "1세대 1주택이면 세율과 공정시장가액비율이 모두 낮아집니다",
      body: "왼쪽에서 1세대 1주택을 켜서 차이를 보세요. 공시가격 9억 이하는 세율 특례까지 붙어 절반 가까이 줄기도 합니다.",
      law: "지방세법 제111조의2 · 시행령 제109조",
    });
  }
  if (capped) {
    tips.push({
      level: "save",
      title: "과세표준상한이 걸려 세금이 덜 오릅니다",
      body: "공시가격이 많이 올라도 과세표준은 '직전 연도 과세표준 + 5%'까지만 오릅니다(2024년 도입). 고지서 과세표준이 이 계산과 다르면 구청 세무과에 직전 연도 과세표준을 확인하세요.",
      law: "지방세법 제110조 제3항",
    });
  }
  if (isHouse && ((input.oneHouse && price > 12 * 억) || (!input.oneHouse && price > 9 * 억))) {
    tips.push({
      level: "must",
      title: "종합부동산세 대상입니다",
      body: `재산세와 별도로 12월에 종부세가 붙습니다(1세대 1주택 공시가격 12억 초과, 그 외 인별 합산 9억 초과). 보유세 계산기에서 둘을 합쳐 보세요.`,
      law: "종합부동산세법 제8조",
    });
  }
  tips.push({
    level: "watch",
    title: "세율은 조례로 ±50% 안에서 달라질 수 있습니다",
    body: "여기 숫자는 표준세율입니다. 도시지역분 요율(0.14%)도 조례로 0.23%까지 올릴 수 있습니다. 고지서와 다르면 그 차이가 조례입니다.",
    law: "지방세법 제111조 제3항 · 제112조 제2항",
  });
  tips.push({
    level: "save",
    title: "6월 1일이 기준일입니다",
    body: "과세기준일(6월 1일) 현재 소유자가 1년치를 냅니다. 5월 31일에 잔금을 치르면 매수인이, 6월 2일이면 매도인이 그해 재산세를 냅니다.",
    law: "지방세법 제114조",
  });

  const headline: Headline[] = [
    {
      label: "연간 재산세 (고지서 합계)",
      value: total,
      hint: scheduleLabel,
    },
    { label: "재산세 본세", value: mainTax, hint: specialRate ? "1세대 1주택 특례세율" : undefined },
    {
      label: isHouse ? "7월 납부액" : input.kind === "building" ? "7월 납부액" : "9월 납부액",
      value: isHouse ? july : input.kind === "building" ? july : september,
      hint: isHouse && september > 0 ? `9월 ${formatWon(september)}` : undefined,
    },
  ];

  return {
    headline,
    steps,
    tips,
    ratio,
    taxBase,
    capped,
    specialRate,
    mainTax,
    urbanTax,
    eduTax,
    fireTax,
    total,
    july,
    september,
    scheduleLabel,
    withoutSpecial,
  };
}
