/**
 * 법정상속분 — 민법 제1000조(순위)·제1003조(배우자)·제1009조(법정상속분)·제1112조(유류분).
 *
 * 규칙은 넷뿐이다. ① 같은 순위는 균분 ② 배우자는 직계비속·직계존속과 같은 순위로
 * 함께 받되 그들 몫의 1.5배 ③ 비속·존속이 없으면 배우자 단독 ④ 배우자도 없으면
 * 형제자매 → 4촌 이내 방계혈족. 조문은 2026-09-03 법제처 현행본(korean-law-mcp).
 *
 * 유류분(제1112조)은 비속·배우자가 법정상속분의 1/2, 직계존속이 1/3이다. 형제자매의
 * 유류분(옛 제4호)은 2024. 4. 25. 헌법재판소 위헌 결정으로 효력을 잃었다.
 */

import type { Headline, Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
import { formatWon, 억 } from "./won";

export interface HeirsInput {
  hasSpouse: boolean;
  /** 직계비속 (자녀. 손자녀 대습은 여기 포함하지 않는다) */
  children: number;
  /** 직계존속 (부모) — 자녀가 없을 때만 상속인 */
  parents: number;
  /** 형제자매 — 비속·존속·배우자가 모두 없을 때만 */
  siblings: number;
  /** 상속재산 (원). 0이면 비율만 */
  estate: number;
}

export const EMPTY_HEIRS: HeirsInput = { hasSpouse: true, children: 2, parents: 0, siblings: 0, estate: 10 * 억 };

export interface HeirShare {
  label: string;
  /** 지분 분자·분모 (기약분수) */
  num: number;
  den: number;
  amount: number;
  /** 유류분 비율 (법정상속분 대비) — 없으면 null */
  reserveRatio: number | null;
  reserveAmount: number | null;
}

export interface HeirsResult extends CalculationValidation {
  headline: Headline[];
  steps: Step[];
  tips: Tip[];
  shares: HeirShare[];
  /** 상속인 구성 설명 */
  rank: string;
  rankLaw: string;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function calcHeirs(input: HeirsInput): HeirsResult {
  const steps: Step[] = [];
  const tips: Tip[] = [];
  const estate = Math.max(0, input.estate);
  const children = Math.max(0, Math.floor(input.children));
  const parents = Math.max(0, Math.floor(input.parents));
  const siblings = Math.max(0, Math.floor(input.siblings));

  /* 상속인 확정 — 제1000조·제1003조 */
  // 가중치: 비속·존속 1, 배우자 1.5 → 2:3 정수로 (×2)
  type Unit = { label: string; weight: number; reserve: number | null };
  const units: Unit[] = [];
  let rank = "";
  let rankLaw = "민법 제1000조 제1항 · 제1003조 제1항";
  if (children > 0) {
    rank = `1순위 직계비속 ${children}명${input.hasSpouse ? " + 배우자" : ""}`;
    for (let i = 0; i < children; i++) units.push({ label: `자녀 ${i + 1}`, weight: 2, reserve: 0.5 });
    if (input.hasSpouse) units.push({ label: "배우자", weight: 3, reserve: 0.5 });
  } else if (parents > 0) {
    rank = `2순위 직계존속 ${parents}명${input.hasSpouse ? " + 배우자" : ""}`;
    for (let i = 0; i < parents; i++) units.push({ label: `직계존속 ${i + 1}`, weight: 2, reserve: 1 / 3 });
    if (input.hasSpouse) units.push({ label: "배우자", weight: 3, reserve: 0.5 });
  } else if (input.hasSpouse) {
    rank = "배우자 단독상속";
    rankLaw = "민법 제1003조 제1항 후단";
    units.push({ label: "배우자", weight: 1, reserve: 0.5 });
  } else if (siblings > 0) {
    rank = `3순위 형제자매 ${siblings}명`;
    rankLaw = "민법 제1000조 제1항 제3호";
    for (let i = 0; i < siblings; i++) units.push({ label: `형제자매 ${i + 1}`, weight: 1, reserve: null });
  } else {
    rank = "4순위 4촌 이내 방계혈족 — 여기서는 계산하지 않습니다";
    rankLaw = "민법 제1000조 제1항 제4호";
  }

  const totalWeight = units.reduce((s, u) => s + u.weight, 0);
  const shares: HeirShare[] = units.map((u) => {
    const g = gcd(u.weight, totalWeight);
    const amount = totalWeight > 0 ? Math.floor((estate * u.weight) / totalWeight) : 0;
    return {
      label: u.label,
      num: u.weight / g,
      den: totalWeight / g,
      amount,
      reserveRatio: u.reserve,
      reserveAmount: u.reserve !== null ? Math.floor(amount * u.reserve) : null,
    };
  });

  steps.push({ label: "상속인", value: rank, law: rankLaw });
  if (estate > 0) steps.push({ label: "상속재산 (채무 공제 후)", value: estate, tone: "sub" });
  for (const s of shares) {
    steps.push({
      label: `${s.label} — ${s.num}/${s.den}`,
      value: estate > 0 ? s.amount : `${((s.num / s.den) * 100).toFixed(1)}%`,
      law: s.label === "배우자" && units.length > 1 ? "민법 제1009조 제2항" : "민법 제1009조 제1항",
      note: s.label === "배우자" && units.length > 1 ? "직계비속·존속 몫의 1.5배" : undefined,
      depth: 1,
    });
  }
  if (shares.length > 0 && estate > 0) {
    const sum = shares.reduce((a, s) => a + s.amount, 0);
    steps.push({ label: "합계", value: sum, tone: "total", note: sum !== estate ? "원 단위 절사로 재산과 몇 원 차이가 날 수 있다" : undefined });
  }

  /* 팁 */
  if (input.hasSpouse && (children > 0 || parents > 0)) {
    const sp = shares.find((s) => s.label === "배우자");
    if (sp)
      tips.push({
        level: "save",
        title: `배우자 법정상속분 ${sp.num}/${sp.den} — 상속세 배우자공제의 상한선`,
        body: `배우자상속공제는 실제 상속받은 금액을 공제하되, 법정상속분 상당액(최대 30억원)이 상한입니다. 협의분할로 배우자 몫을 늘려도 이 선을 넘는 부분은 공제되지 않습니다.${estate > 0 ? ` 지금 재산 기준 ${formatWon(sp.amount)}.` : ""}`,
        law: "상속세 및 증여세법 제19조",
      });
  }
  tips.push({
    level: "watch",
    title: "법정상속분은 '정하지 않았을 때'의 기본값입니다",
    body: "유언(유증)이나 상속인 전원의 협의분할이 있으면 그대로 따릅니다. 등기·예금 인출은 협의분할서에 전원 인감이 있어야 진행됩니다.",
    law: "민법 제1013조",
  });
  tips.push({
    level: "watch",
    title: "유류분은 법정상속분의 절반(직계존속은 1/3)입니다",
    body: "유언으로 한 사람에게 몰아줘도 다른 상속인은 이 몫까지는 되찾을 수 있습니다. 형제자매의 유류분은 2024년 4월 헌재 위헌 결정으로 사라졌습니다.",
    law: "민법 제1112조 · 헌재 2020헌가4",
  });
  if (children > 0) {
    tips.push({
      level: "watch",
      title: "먼저 사망한 자녀가 있으면 그 자녀의 배우자·자녀가 대신 받습니다",
      body: "대습상속입니다. 사망한 자녀 몫을 그 배우자(1.5)와 자녀들(각 1)이 같은 비율로 나눕니다. 이 계산기는 대습을 넣지 않았으니 해당하면 상담이 필요합니다.",
      law: "민법 제1001조 · 제1010조",
    });
  }
  tips.push({
    level: "save",
    title: "기여분·특별수익이 있으면 지분이 달라집니다",
    body: "생전에 증여받은 상속인은 그만큼 덜 받고(특별수익), 부양·재산 유지에 특별히 기여한 상속인은 더 받습니다(기여분). 분쟁의 대부분이 여기서 납니다.",
    law: "민법 제1008조 · 제1008조의2",
  });

  const first = shares[0];
  const headline: Headline[] = estate > 0 && first
    ? [
        { label: input.hasSpouse && units.length > 1 ? "배우자 몫" : `${first.label} 몫`, value: (shares.find((s) => s.label === "배우자") ?? first).amount, hint: `${rank}` },
        ...(children > 0 ? [{ label: "자녀 1인당", value: shares[0].amount }] : parents > 0 ? [{ label: "직계존속 1인당", value: shares[0].amount }] : []),
        { label: "상속재산", value: estate },
      ]
    : [{ label: "상속재산을 넣으면 금액으로 보여줍니다", value: 0, displayValue: rank }];

  return { headline, steps, tips, shares, rank, rankLaw };
}
