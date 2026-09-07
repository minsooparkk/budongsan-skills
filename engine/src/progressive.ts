/**
 * 누진세율 구간 — 상속·증여·양도가 전부 같은 모양을 쓴다.
 *
 * 세법 조문은 "1억원 초과 5억원 이하: 1천만원 + (1억원을 초과하는 금액의 20%)"처럼
 * 적혀 있지만, 계산은 "과세표준 × 세율 − 누진공제"가 같은 값을 더 적게 틀린다.
 * 두 표기가 같은 값인지는 `sameAsStatute`가 검사한다 (검증 스크립트에서 돌린다).
 */

import { decimalProduct } from "./won";

export interface Band {
  /** 이 구간의 상한 (이하). 마지막 구간은 Infinity */
  upTo: number;
  rate: number;
  /** 누진공제 */
  quick: number;
}

export interface Applied {
  band: Band;
  rate: number;
  quick: number;
  tax: number;
}

/** 과세표준에 누진세율표를 적용한다. 과세표준이 0 이하면 세액도 0. */
export function applyBands(taxBase: number, bands: Band[]): Applied {
  const base = Math.max(0, taxBase);
  const band = bands.find((b) => base <= b.upTo) ?? bands[bands.length - 1];
  return {
    band,
    rate: band.rate,
    quick: band.quick,
    tax: Math.max(0, decimalProduct(base, band.rate) - band.quick),
  };
}

/**
 * 상속세·증여세 세율 (상증세법 제26조 · 제56조).
 * 1억 이하 10% / 5억 이하 20% / 10억 이하 30% / 30억 이하 40% / 30억 초과 50%
 */
export const BANDS_INHERITANCE: Band[] = [
  { upTo: 100_000_000, rate: 0.1, quick: 0 },
  { upTo: 500_000_000, rate: 0.2, quick: 10_000_000 },
  { upTo: 1_000_000_000, rate: 0.3, quick: 60_000_000 },
  { upTo: 3_000_000_000, rate: 0.4, quick: 160_000_000 },
  { upTo: Infinity, rate: 0.5, quick: 460_000_000 },
];

/** 소득세 기본세율 (소득세법 제55조) — 양도소득세도 이 표를 쓴다 */
export const BANDS_INCOME: Band[] = [
  { upTo: 14_000_000, rate: 0.06, quick: 0 },
  { upTo: 50_000_000, rate: 0.15, quick: 1_260_000 },
  { upTo: 88_000_000, rate: 0.24, quick: 5_760_000 },
  { upTo: 150_000_000, rate: 0.35, quick: 15_440_000 },
  { upTo: 300_000_000, rate: 0.38, quick: 19_940_000 },
  { upTo: 500_000_000, rate: 0.4, quick: 25_940_000 },
  { upTo: 1_000_000_000, rate: 0.42, quick: 35_940_000 },
  { upTo: Infinity, rate: 0.45, quick: 65_940_000 },
];

/**
 * 조문 표기(구간 시작 세액 + 초과분 × 세율)와 누진공제 표기가 같은 값인지.
 * 누진공제를 손으로 옮겨 적다 한 자리 틀리는 사고를 막는 검사다.
 */
export function sameAsStatute(bands: Band[], statuteBase: number[]): boolean {
  return bands.every((b, i) => {
    if (i === 0) return b.quick === 0;
    const lower = bands[i - 1].upTo;
    // 구간 하한에서 두 방식의 세액이 같아야 한다
    const byQuick = lower * b.rate - b.quick;
    return Math.abs(byQuick - statuteBase[i]) < 1;
  });
}
