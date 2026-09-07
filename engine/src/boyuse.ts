/**
 * 주택분 보유세(종합부동산세 + 농특세 + 재산세 + 지방교육세) 계산.
 *
 * 계산 순서와 산식은 회계사님이 주신 「종부세 계산기」 시트를 그대로 따랐고,
 * 시트의 네 경우(실거주/비거주 × 단독/공동명의) 숫자를 전부 재현하는 것을
 * 확인했다. 개편안 수치의 출처는 기획재정부 「2026년 세제개편안 문답자료」
 * (2026. 8. 3.) 39~44쪽이고, 기본공제는 2026. 9. 1. 국무회의에서 확정된
 * 정부안(기재부 보도자료 「2026년 세제개편안 정부안 확정」 첨부 수정사항)으로
 * 갱신했다 — 비거주 기본공제와 세부담상한이 당초안에서 되돌려졌다.
 *
 * 정부안이 확정됐을 뿐 아직 법률은 아니다. 국회 심의에서 다시 바뀔 수 있다.
 */

const 억 = 100_000_000;

export type Regime = "current" | "y2027" | "y2028";

export const REGIME_LABEL: Record<Regime, string> = {
  current: "현행",
  y2027: "2027년 (중간)",
  y2028: "2028년~ (최종)",
};

/** 누진공제 방식 구간 — 과세표준 × 세율 − 누진공제 */
interface Band {
  upTo: number;
  rate: number;
  quick: number; // 누진공제
}

/** 현행 1·2주택 세율 */
const BANDS_CURRENT: Band[] = [
  { upTo: 3 * 억, rate: 0.005, quick: 0 },
  { upTo: 6 * 억, rate: 0.007, quick: 600_000 },
  { upTo: 12 * 억, rate: 0.01, quick: 2_400_000 },
  { upTo: 25 * 억, rate: 0.013, quick: 6_000_000 },
  { upTo: 50 * 억, rate: 0.015, quick: 11_000_000 },
  { upTo: 94 * 억, rate: 0.02, quick: 36_000_000 },
  { upTo: Infinity, rate: 0.027, quick: 101_800_000 },
];

/** 개편안 중간(2027) — 문답자료 42쪽 */
const BANDS_2027: Band[] = [
  { upTo: 3 * 억, rate: 0.005, quick: 0 },
  { upTo: 6 * 억, rate: 0.007, quick: 600_000 },
  { upTo: 12 * 억, rate: 0.013, quick: 4_200_000 },
  { upTo: 25 * 억, rate: 0.015, quick: 6_600_000 },
  { upTo: 50 * 억, rate: 0.02, quick: 19_100_000 },
  { upTo: 94 * 억, rate: 0.027, quick: 54_100_000 },
  { upTo: Infinity, rate: 0.035, quick: 129_300_000 },
];

/** 개편안 최종(2028~) — 모든 주택 동일 */
const BANDS_2028: Band[] = [
  { upTo: 3 * 억, rate: 0.005, quick: 0 },
  { upTo: 6 * 억, rate: 0.007, quick: 600_000 },
  { upTo: 12 * 억, rate: 0.013, quick: 4_200_000 },
  { upTo: 25 * 억, rate: 0.02, quick: 12_600_000 },
  { upTo: 50 * 억, rate: 0.03, quick: 37_600_000 },
  { upTo: 94 * 억, rate: 0.04, quick: 87_600_000 },
  { upTo: Infinity, rate: 0.05, quick: 181_600_000 },
];

function bandOf(base: number, regime: Regime): Band {
  const bands =
    regime === "current" ? BANDS_CURRENT : regime === "y2027" ? BANDS_2027 : BANDS_2028;
  return bands.find((b) => base <= b.upTo) ?? bands[bands.length - 1];
}

/**
 * 재산세 본세 — 표준세율(지방세법 제111조), 누진공제 방식.
 * 종부세에서 공제할 재산세액도 이 표준세율로 계산한다 (시행령 제4조의3).
 */
function propertyTax(taxBase: number): number {
  if (taxBase <= 60_000_000) return taxBase * 0.001;
  if (taxBase <= 1.5 * 억) return taxBase * 0.0015 - 30_000;
  if (taxBase <= 3 * 억) return taxBase * 0.0025 - 180_000;
  return taxBase * 0.004 - 630_000;
}

/** 재산세 공정시장가액비율 — 1세대 1주택 특례 45% */
export const PROPERTY_FMV = 0.45;

/**
 * 재산세 도시지역분 세율 — 지방세법 제112조 제1항 제2호.
 * 제110조 과세표준(= 공시가격 × 공정시장가액비율)에 1천분의 1.4를 곱한다.
 * 조례로 1천분의 2.3까지 올릴 수 있으나 서울시는 표준세율을 쓴다.
 * 도시지역분에는 지방교육세가 붙지 않고(제151조 제1항 제6호 괄호),
 * 종부세에서 공제되지도 않는다(공제 대상은 표준세율 상당액뿐).
 */
export const URBAN_AREA_RATE = 0.0014;

export interface Case {
  key: string;
  label: string;
  resident: boolean;
  joint: boolean;
  /** 부부공동명의 1세대1주택자 특례를 신청한 경우 (종부세법 제10조의2) */
  special?: boolean;
}

export const CASES: Case[] = [
  { key: "sole-live", label: "실거주 1주택 (단독명의)", resident: true, joint: false },
  { key: "sole-away", label: "비거주 1주택 (단독명의)", resident: false, joint: false },
  { key: "joint-live", label: "실거주 1주택 (공동명의·개별납부)", resident: true, joint: true },
  { key: "joint-away", label: "비거주 1주택 (공동명의·개별납부)", resident: false, joint: true },
  {
    key: "joint-live-special",
    label: "실거주 1주택 (공동명의·특례신청)",
    resident: true,
    joint: true,
    special: true,
  },
  {
    key: "joint-away-special",
    label: "비거주 1주택 (공동명의·특례신청)",
    resident: false,
    joint: true,
    special: true,
  },
];

/**
 * 1세대 1주택자로 과세되는가.
 * 단독명의이거나, 부부공동명의라도 1세대1주택자 특례를 신청하면 한 사람이 주택
 * 전체에 대해 1세대 1주택자로 과세된다 — 기본공제도 세액공제도 단독명의와 같다.
 */
function asSingleHouseholder(c: Case): boolean {
  return !c.joint || Boolean(c.special);
}

/**
 * 과세대상 문턱 — 공제액과 별개다 (문답자료 39쪽).
 *
 *   "1세대1주택자는 보유주택 공시가격 합계액이 14억원 초과시 과세대상으로 하되,
 *    거주하는 경우 기본공제금액을 12→14억원, 거주하지 않는 경우 12→9억원"
 *   "그 외는 보유주택 공시가격 합계액이 9억원 초과시 과세대상"
 *
 * 9·1 확정안이 비거주 공제를 12억으로 되돌렸지만 문턱은 손대지 않았다. 그래서
 * 비거주 1세대1주택자가 공시 13억이면 공제(12억)보다는 크지만 문턱(14억) 이하라
 * 과세되지 않는다. 문턱을 빼먹으면 없는 세금이 잡힌다.
 */
function taxableThreshold(c: Case, regime: Regime): number {
  // 현행은 별도 문턱 없이 기본공제가 곧 경계다
  if (regime === "current") return deduction(c, regime);
  return asSingleHouseholder(c) ? 14 * 억 : 9 * 억;
}

/**
 * 기본공제(종부세 비과세) — 문답자료 39·40쪽, 9·1 확정 정부안 반영.
 *
 * 입법예고에서 비거주 공제 축소가 과하다는 지적이 나와 확정 단계에서 되돌아갔다.
 *
 *   1세대1주택자    거주 12억 → 14억 (당초안과 같음)
 *                   비거주 12억 → (당초안 9억) → 12억 현행 유지
 *   부부공동명의    거주 각 9억 유지 (당초안과 같음)
 *   (특례 미신청)   비거주 각 9억 → (당초안 4억+안분) → 6억 정액
 *
 * 당초안의 비거주 공동명의는 "4억원+(5억원×거주주택 공시가격/합계액)" 안분식이었고
 * 여기서는 4억으로 구현했었다. 확정안은 안분 없이 6억 정액이라 식 자체가 사라졌다.
 */
function deduction(c: Case, regime: Regime): number {
  if (regime === "current") {
    // 현행: 1세대1주택(특례 포함) 12억, 부부 개별 납부는 각 9억 (거주 무관)
    return asSingleHouseholder(c) ? 12 * 억 : 9 * 억;
  }
  if (asSingleHouseholder(c)) return c.resident ? 14 * 억 : 12 * 억;
  return c.resident ? 9 * 억 : 6 * 억;
}

/**
 * 공정시장가액비율.
 * 1세대 1주택자(단독명의 또는 특례 신청)는 70%, 공동명의 개별 납부자는 1세대
 * 1주택자가 아니어서 조정대상지역 주택 보유자 기준 80%가 적용된다 (시트와 동일).
 */
function fmvRatio(c: Case, regime: Regime): number {
  if (regime === "current") return 0.6;
  return asSingleHouseholder(c) ? 0.7 : 0.8;
}

/* ── 1세대 1주택자 세액공제 (문답자료 43쪽) ────────────────────────── */

/** 연령별 공제 — 현행·개편안 동일 */
export function ageCreditRate(age: number): number {
  if (age >= 70) return 0.4;
  if (age >= 65) return 0.3;
  if (age >= 60) return 0.2;
  return 0;
}

/** 기간 구간을 20/40/50 → 0.2/0.4/0.5 로 (현행 보유공제·개편 거주공제 공통) */
function periodRateFull(years: number): number {
  if (years >= 15) return 0.5;
  if (years >= 10) return 0.4;
  if (years >= 5) return 0.2;
  return 0;
}

/** '27년 중간단계의 보유공제 — 거주공제의 절반 수준 (10/20/25%) */
function periodRateHalf(years: number): number {
  if (years >= 15) return 0.25;
  if (years >= 10) return 0.2;
  if (years >= 5) return 0.1;
  return 0;
}

/**
 * 기간별 공제율.
 * 현행은 보유기간 기준, '28년부터는 거주기간 기준, '27년은 전환기라
 * 보유공제(절반)와 거주공제 중 큰 쪽을 적용한다.
 */
export function periodCreditRate(
  holdYears: number,
  liveYears: number,
  regime: Regime,
): number {
  if (regime === "current") return periodRateFull(holdYears);
  if (regime === "y2027") {
    return Math.max(periodRateHalf(holdYears), periodRateFull(liveYears));
  }
  return periodRateFull(liveYears);
}

/** 연령+기간 합계 상한 80% */
const CREDIT_RATE_CAP = 0.8;

/** 세액공제 금액 한도 — 현행 없음, '27년 800만원, '28년~ 600만원 */
const CREDIT_AMOUNT_CAP: Record<Regime, number> = {
  current: Infinity,
  y2027: 8_000_000,
  y2028: 6_000_000,
};

export function creditRateOf(p: Params, regime: Regime): number {
  return Math.min(
    CREDIT_RATE_CAP,
    ageCreditRate(p.age) + periodCreditRate(p.holdYears, p.liveYears, regime),
  );
}

export interface Params {
  /** 주택 전체 공시가격 (원) */
  price: number;
  /** 만 나이 */
  age: number;
  /** 보유기간 (년) */
  holdYears: number;
  /** 거주기간 (년) */
  liveYears: number;
}

export interface CaseResult {
  /** 이 납세의무자 몫의 공시가격 */
  price: number;
  /** 과세대상 문턱을 넘었는가 */
  taxable: boolean;
  threshold: number;
  deduction: number;
  fmv: number;
  taxBase: number;
  rate: number;
  quick: number;
  grossTax: number; // 과세기준금액
  propertyOverlap: number; // 재산세 중복분 차감액 (표준세율 상당액)
  creditRate: number; // 적용된 공제율
  creditCapped: boolean; // 금액 한도에 걸렸는가
  credit: number; // 거주/연령 세액공제
  taxPerPerson: number; // 종부세 (1인분)
  taxHousehold: number; // 종부세 (공동명의는 ×2)
  ruralTax: number; // 농특세
  jongbuTotal: number; // 종부세 + 농특세
  propertyTax: number;
  urbanTax: number; // 재산세 도시지역분
  eduTax: number;
  holdingTotal: number; // 보유세 합산
}

export function calculateCase(c: Case, p: Params, regime: Regime): CaseResult {
  // 특례를 신청하면 지분과 무관하게 한 사람이 주택 전체에 대해 납세의무를 진다
  const owners = asSingleHouseholder(c) ? 1 : 2;
  const price = p.price / owners;
  const ded = deduction(c, regime);
  const fmv = fmvRatio(c, regime);
  // 문턱 이하면 과세대상 자체가 아니다 — 공제보다 크더라도 종부세가 붙지 않는다
  const taxable = price > taxableThreshold(c, regime);
  const taxBase = taxable ? Math.max(0, (price - ded) * fmv) : 0;

  const band = bandOf(taxBase, regime);
  const grossTax = Math.max(0, taxBase * band.rate - band.quick);

  // 재산세 중복분 (종부세법 시행령 제4조의3) — 종부세 과세표준을 재산세 과세표준으로
  // 환산한 뒤 재산세 표준세율을 그대로 적용한다. 주택이 하나면 안분식의 분모와
  // 부과세액이 같아 약분되므로 이 분자가 곧 공제액이다.
  //
  // 한계세율만 곱하면 재산세 구간 경계(과세표준 3억)에서 공제액이 튀어, 집값이
  // 올랐는데 세금이 줄어드는 역전이 생긴다. 누진공제를 빼야 연속이 된다.
  const overlapBase = taxBase * PROPERTY_FMV;
  const propertyOverlap = propertyTax(overlapBase);

  const afterOverlap = Math.max(0, grossTax - propertyOverlap);
  // 연령·기간 세액공제는 1세대 1주택자에게만 — 개별 납부는 받지 못한다
  const creditRate = asSingleHouseholder(c) ? creditRateOf(p, regime) : 0;
  // 개편안은 공제 금액에도 상한이 있다 ('27년 800만원, '28년~ 600만원)
  const credit = Math.min(afterOverlap * creditRate, CREDIT_AMOUNT_CAP[regime]);

  const taxPerPerson = Math.max(0, afterOverlap - credit);
  const taxHousehold = taxPerPerson * owners;
  const ruralTax = taxHousehold * 0.2;

  const propBase = p.price * PROPERTY_FMV; // 재산세는 주택 전체 기준
  const prop = propertyTax(propBase);
  const urban = propBase * URBAN_AREA_RATE;
  const edu = prop * 0.2; // 도시지역분은 지방교육세 과세대상이 아니다

  return {
    price,
    taxable,
    threshold: taxableThreshold(c, regime),
    deduction: ded,
    fmv,
    taxBase,
    rate: band.rate,
    quick: band.quick,
    grossTax,
    propertyOverlap,
    creditRate,
    creditCapped: afterOverlap * creditRate > CREDIT_AMOUNT_CAP[regime],
    credit,
    taxPerPerson,
    taxHousehold,
    ruralTax,
    jongbuTotal: taxHousehold + ruralTax,
    propertyTax: prop,
    urbanTax: urban,
    eduTax: edu,
    holdingTotal: taxHousehold + ruralTax + prop + urban + edu,
  };
}

export function calculateAll(p: Params, regime: Regime): Record<string, CaseResult> {
  return Object.fromEntries(CASES.map((c) => [c.key, calculateCase(c, p, regime)]));
}

/** 같은 명의에서 비거주가 실거주보다 얼마나 더 내는지 */
export function awayPenalty(
  results: Record<string, CaseResult>,
  joint: boolean,
): number {
  const live = results[joint ? "joint-live" : "sole-live"].holdingTotal;
  const away = results[joint ? "joint-away" : "sole-away"].holdingTotal;
  return away - live;
}

export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export function formatEok(value: number): string {
  if (value === 0) return "0원";
  const eok = value / 억;
  return Number.isInteger(eok) ? `${eok}억원` : `${eok.toFixed(2)}억원`;
}
