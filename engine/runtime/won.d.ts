/**
 * 계산기 공통 — 금액 단위와 서식.
 *
 * 한국 사람은 세금을 "원"이 아니라 "억·만원"으로 생각한다. 그래서 입력은 만원,
 * 계산은 원, 표시는 다시 억·만원으로 오간다. 그 세 축을 여기 한 곳에 모아 둔다.
 * (보유세 계산기의 formatWon과 같은 어법을 쓰되, 만원 입력을 다루는 함수가 더 있다)
 */
export declare const 만 = 10000;
export declare const 억 = 100000000;
/** 숫자만 남긴다 — 입력창에 "3,000만" 같은 걸 붙여 넣어도 3000이 된다 */
export declare function digitsOnly(raw: string): string;
/** 입력창에 보여줄 천단위 구분 표기 */
export declare function grouped(raw: string): string;
/** 만원 문자열 → 원 */
export declare function manToWon(raw: string | number): number;
/** 원 → 만원(반올림) — 사례 표에서 다시 입력칸으로 넣을 때 쓴다 */
export declare function wonToMan(won: number): number;
/** Lossless editable 만원 text, including values near Number.MAX_SAFE_INTEGER won. */
export declare function wonToManText(won: number): string;
/**
 * "12억 3,456만원" — 세액·재산가액을 사람이 읽는 단위로.
 * 1억 미만은 만원까지, 1만원 미만은 원까지 내려간다. 0은 "0원".
 */
export declare function formatWon(value: number): string;
/** "12.3억" — 막대 그래프 눈금처럼 자리가 좁을 때 */
export declare function formatEok(value: number): string;
/** 만원 입력값 옆에 붙는 안내 — "= 9억 5,000만원" */
export declare function manHint(raw: string): string;
/**
 * 백분율 — "3%" / "2.7%" / "20%".
 *
 * 소수점 **뒤쪽의** 0만 지운다. 소수점이 없는 값에서 끝의 0을 지우면 20%가 2%가
 * 된다 — 실제로 그렇게 찍혔었다. 정수부는 건드리지 않는다.
 */
export declare function pct(rate: number, digits?: number): string;
/**
 * 국고금 단수계산 — 10원 미만 절사.
 * 국고금관리법 제47조 소관이라 세법 Graph DB에는 없다. taxcore도 같은 잠정치를 쓴다.
 */
export declare function truncate10(value: number): number;
/**
 * 1,000원 미만 절사 — 지방세 세액 계산에는 쓰지 않는다. 취득세·등록면허세도 고지·신고 단위는
 * 10원(truncate10)이다. 예전 주석이 인용한 지방세기본법 제52조는 가산세 조문이라 근거가 아니다.
 */
export declare function truncate1000(value: number): number;
/** Multiply decimal input literals as integer fractions, then truncate once in won. */
export declare function decimalProduct(...values: number[]): number;
/** Exact decimal multiplication followed by a single floor to a currency unit. */
export declare function floorProduct(values: readonly number[], unit?: number): number;
/**
 * 증감액 — "＋1억 2,673만원" / "−28만원".
 *
 * 같은 줄에 "2억 2,484만원"과 "12,673만원"이 나란히 서면 사람이 암산을 해야 한다.
 * 증감도 본액과 같은 억·만 어법으로 적는다.
 */
export declare function formatDelta(value: number): string;
/** 증감률 — "＋129%" / "−3.6%". 기준이 0이면 빈 문자열 */
export declare function formatDeltaPct(value: number, base: number): string;
