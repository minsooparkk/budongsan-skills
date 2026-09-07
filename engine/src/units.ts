/**
 * 면적·단위·날짜·건축 기본 도구. 법정 숫자: 평 = 400/121 ㎡(계량법 부칙), 재건축 연한 30년
 * (도시정비법 시행령 §2·조례), 건폐율·용적률 상한(국토계획법 §77·§78 — 조례로 정한다).
 */

import type { Headline, Step, Tip } from "./trace";
import { hasInvalidNumbers, invalidCalculation, isOneOf, parseDateOnly, type CalculationValidation } from "./validation";
import { formatWon } from "./won";

export const PYEONG = 400 / 121; // 3.3058㎡

/* ═══════════ 날짜·기간 ═══════════ */
export interface DateInput { from: string; to: string; }
export const EMPTY_DATE: DateInput = { from: "2024-03-15", to: "2026-09-03" };
export interface DateResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; days: number; years: number; months: number; rest: number; }
export function calcDate(input: DateInput): DateResult {
  const steps: Step[] = []; const tips: Tip[] = [];
  const a = parseDateOnly(input.from); const b = parseDateOnly(input.to);
  if (!a || !b || b.getTime() < a.getTime()) return invalidCalculation({ days: 0, years: 0, months: 0, rest: 0 }, "유효한 시작일·종료일을 입력해 주세요. 종료일은 시작일보다 빠를 수 없습니다.");
  const days = (b.getTime() - a.getTime()) / 86_400_000;
  // Calendar months clamp to month-end, entirely in UTC (date-only semantics).
  const addMonths = (n: number) => {
    const date = new Date(a.getTime());
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + n);
    const last = new Date(date.getTime());
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(a.getUTCDate(), last.getUTCDate()));
    return date;
  };
  let total = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  if (addMonths(total).getTime() > b.getTime()) total--;
  const years = Math.floor(total / 12), months = total % 12;
  const rest = (b.getTime() - addMonths(total).getTime()) / 86_400_000;
  steps.push({ label: "시작일", value: input.from, tone: "sub" });
  steps.push({ label: "종료일", value: input.to, tone: "sub" });
  steps.push({ label: "일수 (종료일 − 시작일)", value: `${Math.abs(days).toLocaleString()}일`, tone: "total", note: "초일 불산입. 초일을 넣으려면 +1" });
  steps.push({ label: "연·월·일", value: `${years}년 ${months}개월 ${rest}일` });
  steps.push({ label: "주 수", value: `${Math.floor(Math.abs(days) / 7)}주 ${Math.abs(days) % 7}일` });
  tips.push({ level: "watch", title: "세법의 보유기간은 취득일부터 양도일까지입니다", body: "취득일은 잔금일과 등기일 중 빠른 날, 양도일도 같습니다. 2년 비과세·장기보유특별공제는 이 기간을 초일 산입해 셉니다.", law: "소득세법 제95조 제4항 · 제98조" });
  tips.push({ level: "save", title: "신고기한은 「속하는 달의 말일부터 N개월」이 많습니다", body: "양도세 예정신고는 양도일이 속하는 달 말일부터 2개월, 상속세는 6개월, 증여세는 3개월. 날짜가 아니라 달 말일 기준입니다." });
  return { headline: [{ label: "기간", value: 0, displayValue: `${Math.abs(days).toLocaleString()}일 = ${years}년 ${months}개월 ${rest}일` }], steps, tips, days, years, months, rest };
}

/* ═══════════ 평수·면적 환산 ═══════════ */
export interface AreaInput { value: number; unit: "sqm" | "pyeong" | "sqft"; }
export const EMPTY_AREA: AreaInput = { value: 84, unit: "sqm" };
export interface AreaResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; sqm: number; pyeong: number; sqft: number; }
export function calcArea(input: AreaInput): AreaResult {
  if (hasInvalidNumbers(input) || !isOneOf(input.unit, ["sqm", "pyeong", "sqft"])) return invalidCalculation({ sqm: 0, pyeong: 0, sqft: 0 }, "면적과 변환 단위를 확인해 주세요.");
  const sqm = input.unit === "sqm" ? input.value : input.unit === "pyeong" ? input.value * PYEONG : input.value * 0.09290304;
  const pyeong = sqm / PYEONG; const sqft = sqm / 0.09290304;
  const steps: Step[] = [
    { label: "제곱미터", value: `${sqm.toFixed(2)}㎡`, tone: input.unit === "sqm" ? "sub" : undefined },
    { label: "평 (1평 = 400/121㎡ = 3.3058㎡)", value: `${pyeong.toFixed(2)}평`, tone: input.unit === "pyeong" ? "sub" : undefined, law: "계량에 관한 법률" },
    { label: "제곱피트 (1ft² = 0.0929㎡)", value: `${sqft.toFixed(1)}ft²`, tone: input.unit === "sqft" ? "sub" : undefined },
    { label: "에이커 · 헥타르", value: `${(sqm / 4046.856).toFixed(4)}ac · ${(sqm / 10000).toFixed(4)}ha` },
  ];
  const tips: Tip[] = [
    { level: "watch", title: "전용 84㎡가 「34평」인 이유", body: "84㎡는 25.4평이지만 분양 관행은 공급면적(전용 + 주거공용) 112㎡ ≈ 34평으로 부릅니다. 광고의 평수는 공급면적, 등기의 면적은 전용면적입니다." },
    { level: "save", title: "세법 경계는 전용면적 85㎡", body: "국민주택규모(전용 85㎡, 수도권 밖 읍·면 100㎡)를 넘으면 취득세 농특세·부가세 면세가 달라집니다. 25.7평이 그 선입니다.", law: "주택법 제2조 제6호" },
  ];
  return { headline: [{ label: "㎡", value: 0, displayValue: `${sqm.toFixed(2)}㎡` }, { label: "평", value: 0, displayValue: `${pyeong.toFixed(2)}평` }, { label: "ft²", value: 0, displayValue: `${sqft.toFixed(1)}` }], steps, tips, sqm, pyeong, sqft };
}

/* ═══════════ 길이 환산 ═══════════ */
export const LENGTH_UNITS = { m: 1, km: 1000, cm: 0.01, mm: 0.001, inch: 0.0254, ft: 0.3048, yd: 0.9144, mile: 1609.344, ja: 10 / 33, ri: 392.727 } as const;
export type LengthUnit = keyof typeof LENGTH_UNITS;
export const LENGTH_LABEL: Record<LengthUnit, string> = { m: "미터 m", km: "킬로미터 km", cm: "센티미터 cm", mm: "밀리미터 mm", inch: "인치 in", ft: "피트 ft", yd: "야드 yd", mile: "마일 mi", ja: "자 (尺)", ri: "리 (里)" };
export interface LengthInput { value: number; unit: LengthUnit; }
export const EMPTY_LENGTH: LengthInput = { value: 100, unit: "m" };
export interface LengthResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; meters: number; }
export function calcLength(input: LengthInput): LengthResult {
  if (hasInvalidNumbers(input) || !isOneOf(input.unit, Object.keys(LENGTH_UNITS))) return invalidCalculation({ meters: 0 }, "길이와 변환 단위를 확인해 주세요.");
  const meters = input.value * LENGTH_UNITS[input.unit];
  const fmt = (u: LengthUnit) => { const v = meters / LENGTH_UNITS[u]; return v >= 1000 ? v.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : v.toLocaleString("ko-KR", { maximumFractionDigits: 4 }); };
  const steps: Step[] = (Object.keys(LENGTH_UNITS) as LengthUnit[]).map((u) => ({ label: LENGTH_LABEL[u], value: fmt(u), tone: u === input.unit ? "sub" : undefined }));
  const tips: Tip[] = [{ level: "watch", title: "1자 = 10/33m, 1리 ≈ 393m", body: "옛 도면·등기의 척관법 단위입니다. 1평 = 6자 × 6자 = 36자² = 400/121㎡가 여기서 나옵니다." }];
  return { headline: [{ label: "미터", value: 0, displayValue: `${fmt("m")} m` }, { label: "피트", value: 0, displayValue: `${fmt("ft")} ft` }, { label: "자", value: 0, displayValue: `${fmt("ja")} 자` }], steps, tips, meters };
}

/* ═══════════ 단위가격 ═══════════ */
export interface UnitPriceInput { price: number; area: number; unit: "sqm" | "pyeong"; }
export const EMPTY_UNIT_PRICE: UnitPriceInput = { price: 12 * 10 ** 8, area: 84, unit: "sqm" };
export interface UnitPriceResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; perSqm: number; perPyeong: number; }
export function calcUnitPrice(input: UnitPriceInput): UnitPriceResult {
  if (hasInvalidNumbers(input) || input.area <= 0 || !isOneOf(input.unit, ["sqm", "pyeong"])) return invalidCalculation({ perSqm: 0, perPyeong: 0 }, "0보다 큰 면적과 유효한 면적 단위를 입력해 주세요.");
  const sqm = input.unit === "sqm" ? input.area : input.area * PYEONG;
  const perSqm = sqm > 0 ? input.price / sqm : 0; const perPyeong = perSqm * PYEONG;
  const steps: Step[] = [
    { label: "가격", value: input.price, tone: "sub" },
    { label: "면적", value: `${sqm.toFixed(2)}㎡ = ${(sqm / PYEONG).toFixed(2)}평` },
    { label: "㎡당", value: Math.floor(perSqm) },
    { label: "평당", value: Math.floor(perPyeong), tone: "total" },
  ];
  const tips: Tip[] = [
    { level: "watch", title: "평당가는 어느 면적으로 나눴는지가 전부입니다", body: "분양가 평당가는 공급면적, 실거래 비교는 전용면적으로 나누는 게 보통입니다. 전용 기준 평당가가 공급 기준보다 30%쯤 높게 나옵니다." },
    { level: "save", title: "공시지가는 ㎡당으로 고시됩니다", body: "개별공시지가(㎡당) × 면적 = 토지 시가표준액. 채권 매입액·재산세의 기준입니다." },
  ];
  return { headline: [{ label: "평당 가격", value: Math.floor(perPyeong) }, { label: "㎡당", value: Math.floor(perSqm) }, { label: "면적", value: 0, displayValue: `${(sqm / PYEONG).toFixed(1)}평` }], steps, tips, perSqm, perPyeong };
}

/* ═══════════ 대지지분 ═══════════ */
export interface LandShareInput { siteArea: number; myExclusive: number; totalExclusive: number; /** ㎡당 공시지가 */ landPrice: number; }
export const EMPTY_LAND_SHARE: LandShareInput = { siteArea: 12000, myExclusive: 84, totalExclusive: 40000, landPrice: 10_000_000 };
export interface LandShareResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; share: number; shareRatio: number; value: number; }
export function calcLandShare(input: LandShareInput): LandShareResult {
  if (hasInvalidNumbers(input) || input.totalExclusive <= 0 || input.myExclusive > input.totalExclusive) return invalidCalculation({ share: 0, shareRatio: 0, value: 0 }, "전체 전용면적은 0보다 커야 하고 내 전용면적 이상이어야 합니다.");
  const shareRatio = input.totalExclusive > 0 ? input.myExclusive / input.totalExclusive : 0;
  const share = input.siteArea * shareRatio;
  const value = Math.floor(share * input.landPrice);
  const steps: Step[] = [
    { label: "단지 대지면적", value: `${input.siteArea.toLocaleString()}㎡`, tone: "sub" },
    { label: `× 내 전용면적 ÷ 전체 전용면적 (${input.myExclusive} ÷ ${input.totalExclusive.toLocaleString()} = ${(shareRatio * 100).toFixed(4)}%)`, value: `${share.toFixed(2)}㎡ = ${(share / PYEONG).toFixed(2)}평`, tone: "total", law: "집합건물법 제12조 (전유부분 면적 비율)" },
    { label: `× 공시지가 ${formatWon(input.landPrice)}/㎡ = 대지지분 가액`, value },
    { label: "전용면적 대비 대지지분 비율", value: `${input.myExclusive > 0 ? ((share / input.myExclusive) * 100).toFixed(1) : 0}%` },
  ];
  const tips: Tip[] = [
    { level: "watch", title: "등기부의 대지권 비율이 정답입니다", body: "여기 값은 전용면적 비율로 계산한 추정입니다. 실제 대지권은 등기부 표제부 「대지권 비율」(예: 12000분의 25.3)에 적혀 있고, 옛 단지는 분양 당시 규약으로 달리 정한 곳도 있습니다." },
    { level: "save", title: "재건축 사업성은 대지지분이 정합니다", body: "전용면적 대비 대지지분 비율이 높을수록(저층·용적률 낮은 단지) 재건축 때 받는 몫이 큽니다. 15평 아파트의 대지지분이 30평보다 클 수도 있습니다." },
  ];
  return { headline: [{ label: "대지지분", value: 0, displayValue: `${share.toFixed(2)}㎡ = ${(share / PYEONG).toFixed(2)}평` }, { label: "대지지분 가액 (공시지가)", value }, { label: "지분 비율", value: 0, displayValue: `${(shareRatio * 100).toFixed(4)}%` }], steps, tips, share, shareRatio, value };
}

/* ═══════════ 건폐율·용적률 ═══════════ */
export interface CoverageInput { siteArea: number; buildingArea: number; floorArea: number; /** 법정 상한 (소수) */ maxCoverage: number; maxFar: number; }
export const EMPTY_COVERAGE: CoverageInput = { siteArea: 300, buildingArea: 170, floorArea: 600, maxCoverage: 0.6, maxFar: 2.0 };
export interface CoverageResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; coverage: number; far: number; maxBuildingArea: number; maxFloorArea: number; }
export function calcCoverage(input: CoverageInput): CoverageResult {
  if (hasInvalidNumbers(input) || input.siteArea <= 0) return invalidCalculation({ coverage: 0, far: 0, maxBuildingArea: 0, maxFloorArea: 0 }, "0보다 큰 대지면적과 유효한 건축면적을 입력해 주세요.");
  const coverage = input.siteArea > 0 ? input.buildingArea / input.siteArea : 0;
  const far = input.siteArea > 0 ? input.floorArea / input.siteArea : 0;
  const maxBuildingArea = input.siteArea * input.maxCoverage; const maxFloorArea = input.siteArea * input.maxFar;
  const steps: Step[] = [
    { label: "대지면적", value: `${input.siteArea}㎡`, tone: "sub" },
    { label: "건폐율 = 건축면적 ÷ 대지면적", value: `${(coverage * 100).toFixed(1)}% (상한 ${(input.maxCoverage * 100).toFixed(0)}%)`, tone: coverage > input.maxCoverage ? "minus" : "plain", law: "국토의 계획 및 이용에 관한 법률 제77조 · 건축법 제55조" },
    { label: "용적률 = 지상 연면적 ÷ 대지면적", value: `${(far * 100).toFixed(1)}% (상한 ${(input.maxFar * 100).toFixed(0)}%)`, tone: far > input.maxFar ? "minus" : "plain", law: "국토의 계획 및 이용에 관한 법률 제78조 · 건축법 제56조" },
    { label: "지을 수 있는 최대 건축면적", value: `${maxBuildingArea.toFixed(1)}㎡`, tone: "sub" },
    { label: "지을 수 있는 최대 지상 연면적", value: `${maxFloorArea.toFixed(1)}㎡`, tone: "total" },
    { label: "최대 층수 (연면적 ÷ 건축면적)", value: `약 ${Math.floor(maxFloorArea / Math.max(1, Math.min(input.buildingArea, maxBuildingArea)))}층` },
  ];
  const tips: Tip[] = [
    { level: "watch", title: "상한은 용도지역 + 지자체 조례로 정합니다", body: "국토계획법은 범위(예: 제2종일반주거 건폐율 60% 이하, 용적률 150~250%)만 정하고 실제 숫자는 시·군 조례입니다. 토지이용계획확인원의 용도지역으로 조례표를 찾으세요.", law: "국토의 계획 및 이용에 관한 법률 시행령 제84조·제85조" },
    { level: "save", title: "용적률에 안 들어가는 면적", body: "지하층, 지상 주차장(부속), 피난안전구역, 경사지붕 아래 다락은 용적률 산정 연면적에서 빠집니다. 같은 땅에 더 지을 수 있는 여지입니다.", law: "건축법 시행령 제119조 제1항 제4호" },
  ];
  if (coverage > input.maxCoverage || far > input.maxFar) tips.unshift({ level: "must", title: "법정 상한을 넘습니다", body: "건축허가가 나지 않습니다. 건축면적이나 연면적을 줄이거나, 용적률 인센티브(공개공지·임대주택)를 검토하세요." });
  return { headline: [{ label: "용적률", value: 0, displayValue: `${(far * 100).toFixed(1)}% / 상한 ${(input.maxFar * 100).toFixed(0)}%` }, { label: "건폐율", value: 0, displayValue: `${(coverage * 100).toFixed(1)}% / 상한 ${(input.maxCoverage * 100).toFixed(0)}%` }, { label: "최대 연면적", value: 0, displayValue: `${maxFloorArea.toFixed(0)}㎡` }], steps, tips, coverage, far, maxBuildingArea, maxFloorArea };
}

/* ═══════════ 재건축 연한 ═══════════ */
export interface RebuildInput { completedYear: number; /** 조례 연한 (년) */ limitYears: number; /** 안전진단 통과 여부 */ safetyPassed: boolean; }
export const EMPTY_REBUILD: RebuildInput = { completedYear: 1998, limitYears: 30, safetyPassed: false };
export interface RebuildResult extends CalculationValidation { headline: Headline[]; steps: Step[]; tips: Tip[]; eligibleYear: number; yearsLeft: number; }
export function calcRebuild(input: RebuildInput): RebuildResult {
  const now = new Date().getFullYear();
  const eligibleYear = input.completedYear + input.limitYears;
  const yearsLeft = eligibleYear - now;
  const steps: Step[] = [
    { label: "준공(사용승인) 연도", value: `${input.completedYear}년`, tone: "sub" },
    { label: `+ 재건축 연한 ${input.limitYears}년`, value: `${eligibleYear}년`, tone: "total", law: "도시 및 주거환경정비법 시행령 제2조 제2항 · 시·도 조례" },
    { label: "남은 기간", value: yearsLeft > 0 ? `${yearsLeft}년` : "연한 도래", },
    { label: "다음 관문", value: input.safetyPassed ? "안전진단 통과 — 정비구역 지정·조합 설립" : yearsLeft > 0 ? "연한 도래 후 안전진단 (2024년부터 연한 전 신청 가능)" : "안전진단 신청 가능" },
  ];
  const tips: Tip[] = [
    { level: "watch", title: "연한은 최대 30년이고 조례가 더 짧게 정할 수 있습니다", body: "2014년 개정으로 상한이 40년에서 30년으로 내려갔고, 서울·경기 등 대부분 조례가 30년입니다. 준공 연도는 건축물대장의 사용승인일입니다." },
    { level: "save", title: "연한이 됐다고 바로 재건축이 아닙니다", body: "안전진단(2024년부터 「재건축진단」, 연한 전 신청 가능) → 정비구역 지정 → 조합 설립 → 사업시행·관리처분까지 보통 10년 이상 걸립니다. 재건축부담금(초과이익환수)도 봅니다.", law: "도시 및 주거환경정비법 제12조 · 재건축초과이익 환수에 관한 법률" },
  ];
  return { headline: [{ label: "재건축 연한 도래", value: 0, displayValue: `${eligibleYear}년${yearsLeft > 0 ? ` (${yearsLeft}년 뒤)` : " — 도래"}` }, { label: "준공", value: 0, displayValue: `${input.completedYear}년` }, { label: "연한", value: 0, displayValue: `${input.limitYears}년` }], steps, tips, eligibleYear, yearsLeft };
}
