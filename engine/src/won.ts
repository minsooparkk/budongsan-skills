/**
 * 계산기 공통 — 금액 단위와 서식.
 *
 * 한국 사람은 세금을 "원"이 아니라 "억·만원"으로 생각한다. 그래서 입력은 만원,
 * 계산은 원, 표시는 다시 억·만원으로 오간다. 그 세 축을 여기 한 곳에 모아 둔다.
 * (보유세 계산기의 formatWon과 같은 어법을 쓰되, 만원 입력을 다루는 함수가 더 있다)
 */

export const 만 = 10_000;
export const 억 = 100_000_000;

/** 숫자만 남긴다 — 입력창에 "3,000만" 같은 걸 붙여 넣어도 3000이 된다 */
export function digitsOnly(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

/** 입력창에 보여줄 천단위 구분 표기 */
export function grouped(raw: string): string {
  const normalized = raw.replace(/,/g, "").trim();
  if (!normalized) return "";
  if (!/^\d*(?:\.\d{0,4})?$/.test(normalized)) return raw;
  const [whole, fraction] = normalized.split(".");
  if (!Number.isSafeInteger(Number(whole || 0))) return raw;
  return `${Number(whole || 0).toLocaleString("ko-KR")}${fraction === undefined ? "" : `.${fraction}`}`;
}

/** 만원 문자열 → 원 */
export function manToWon(raw: string | number): number {
  const normalized = (typeof raw === "number" ? String(raw) : raw.replace(/,/g, "").replace(/만원?$/, "").trim()).replace(/^\./, "0.");
  if (!normalized) return 0;
  if (!/^\d+(?:\.\d{0,4})?$/.test(normalized)) return NaN;
  const [whole, fraction = ""] = normalized.split(".");
  const won = BigInt(whole) * BigInt(만) + BigInt(fraction.padEnd(4, "0"));
  return won <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(won) : NaN;
}

/** 원 → 만원(반올림) — 사례 표에서 다시 입력칸으로 넣을 때 쓴다 */
export function wonToMan(won: number): number {
  return won / 만;
}

/** Lossless editable 만원 text, including values near Number.MAX_SAFE_INTEGER won. */
export function wonToManText(won: number): string {
  if (!Number.isSafeInteger(won) || won < 0) return "";
  const amount = BigInt(won);
  const whole = amount / BigInt(만);
  const fraction = String(amount % BigInt(만)).padStart(4, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}

/**
 * "12억 3,456만원" — 세액·재산가액을 사람이 읽는 단위로.
 * 1억 미만은 만원까지, 1만원 미만은 원까지 내려간다. 0은 "0원".
 */
export function formatWon(value: number): string {
  if (!Number.isFinite(value)) return "계산 불가";
  const n = Math.round(value);
  if (n === 0) return "0원";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);

  const eok = Math.floor(abs / 억);
  const man = Math.floor((abs % 억) / 만);
  const won = abs % 만;

  const parts: string[] = [];
  if (eok) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (won || parts.length === 0) parts.push(`${won.toLocaleString("ko-KR")}`);
  return `${sign}${parts.join(" ")}원`;
}

/** "12.3억" — 막대 그래프 눈금처럼 자리가 좁을 때 */
export function formatEok(value: number): string {
  if (!Number.isFinite(value)) return "계산 불가";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 억) {
    const v = abs / 억;
    return `${sign}${v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}억`;
  }
  if (abs >= 만) return `${sign}${Math.round(abs / 만).toLocaleString("ko-KR")}만`;
  return `${sign}${Math.round(abs).toLocaleString("ko-KR")}`;
}

/** 만원 입력값 옆에 붙는 안내 — "= 9억 5,000만원" */
export function manHint(raw: string): string {
  const won = manToWon(raw);
  return won ? formatWon(won) : "";
}

/**
 * 백분율 — "3%" / "2.7%" / "20%".
 *
 * 소수점 **뒤쪽의** 0만 지운다. 소수점이 없는 값에서 끝의 0을 지우면 20%가 2%가
 * 된다 — 실제로 그렇게 찍혔었다. 정수부는 건드리지 않는다.
 */
export function pct(rate: number, digits = 2): string {
  const s = (rate * 100)
    .toFixed(digits)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
  return `${s}%`;
}

/**
 * 국고금 단수계산 — 10원 미만 절사.
 * 국고금관리법 제47조 소관이라 세법 Graph DB에는 없다. taxcore도 같은 잠정치를 쓴다.
 */
export function truncate10(value: number): number {
  return Math.floor(Math.max(0, value) / 10) * 10;
}

/**
 * 1,000원 미만 절사 — 지방세 세액 계산에는 쓰지 않는다. 취득세·등록면허세도 고지·신고 단위는
 * 10원(truncate10)이다. 예전 주석이 인용한 지방세기본법 제52조는 가산세 조문이라 근거가 아니다.
 */
export function truncate1000(value: number): number {
  return Math.floor(Math.max(0, value) / 1000) * 1000;
}

/** Multiply decimal input literals as integer fractions, then truncate once in won. */
export function decimalProduct(...values: number[]): number {
  let numerator = BigInt(1);
  let denominator = BigInt(1);
  for (const value of values) {
    if (!Number.isFinite(value)) return NaN;
    const [mantissa, exponent = "0"] = String(value).toLowerCase().split("e");
    const decimals = (mantissa.split(".")[1] || "").length - Number(exponent);
    numerator *= BigInt(mantissa.replace(".", ""));
    if (decimals > 0) denominator *= BigInt(10) ** BigInt(decimals);
    else numerator *= BigInt(10) ** BigInt(-decimals);
  }
  return Number(numerator) / Number(denominator);
}

/** Exact decimal multiplication followed by a single floor to a currency unit. */
export function floorProduct(values: readonly number[], unit = 1): number {
  if (!Number.isSafeInteger(unit) || unit <= 0) return NaN;
  let numerator = BigInt(1);
  let denominator = BigInt(unit);
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) return NaN;
    const [mantissa, exponent = "0"] = String(value).toLowerCase().split("e");
    const decimals = (mantissa.split(".")[1] || "").length - Number(exponent);
    numerator *= BigInt(mantissa.replace(".", ""));
    if (decimals > 0) denominator *= BigInt(10) ** BigInt(decimals);
    else numerator *= BigInt(10) ** BigInt(-decimals);
  }
  return Number(numerator / denominator) * unit;
}

/**
 * 증감액 — "＋1억 2,673만원" / "−28만원".
 *
 * 같은 줄에 "2억 2,484만원"과 "12,673만원"이 나란히 서면 사람이 암산을 해야 한다.
 * 증감도 본액과 같은 억·만 어법으로 적는다.
 */
export function formatDelta(value: number): string {
  const n = Math.round(value);
  if (n === 0) return "변동 없음";
  return `${n > 0 ? "＋" : "−"}${formatWon(Math.abs(n))}`;
}

/** 증감률 — "＋129%" / "−3.6%". 기준이 0이면 빈 문자열 */
export function formatDeltaPct(value: number, base: number): string {
  if (!base) return "";
  const r = (value / base) * 100;
  const abs = Math.abs(r);
  const digits = abs >= 10 ? 0 : 1;
  return `${r > 0 ? "＋" : "−"}${abs.toFixed(digits).replace(/\.0$/, "")}%`;
}
