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
export declare const EMPTY_HEIRS: HeirsInput;
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
export declare function calcHeirs(input: HeirsInput): HeirsResult;
