/**
 * 계산 과정 한 줄.
 *
 * taxcore의 규칙 하나를 그대로 가져왔다 — **트레이스에 없는 숫자는 존재하지 않는
 * 숫자다.** 화면에 찍히는 모든 금액은 여기 한 줄로 남고, 어느 조문에서 나왔는지도
 * 같이 남는다. 그래야 "이 숫자 어디서 나왔냐"는 질문에 코드를 열지 않고 답한다.
 */
export interface Step {
  label: string;
  /** 금액. 문자열이면 그대로 표시한다 (세율·비율·판정처럼 금액이 아닌 값) */
  value: number | string;
  /** minus: 빼는 항목 / sub: 소계 / total: 최종 / plain: 보통 */
  tone?: "minus" | "plus" | "sub" | "total" | "plain";
  /** 근거 조문 — "상증세법 제19조" */
  law?: string;
  /** 한 줄 설명. 왜 이 값이 나왔는지 */
  note?: string;
  /** 들여쓰기 단계 — 소계 아래 세부 항목 */
  depth?: 0 | 1;
}

/** 결과 화면 위쪽의 "결론 먼저" 카드에 올라가는 값 */
export interface Headline {
  label: string;
  value: number;
  /** Explicit primary text for a ratio, duration, area or unavailable result. */
  displayValue?: string;
  hint?: string;
  /**
   * 비교 기준액. 주면 "현행 대비 −28만원 (−3.6%)"이 값 아래에 붙는다.
   *
   * 개편안 계산기에서 사람이 알고 싶은 건 절대액이 아니라 **차이**다.
   * 그 뺄셈을 사용자에게 시키지 않는다.
   */
  compareTo?: number;
  /** 비교 기준의 이름 — 기본 "현행" */
  compareLabel?: string;
  /** 올라가는 게 나쁜 값인가. 세액은 true(기본), 환급·공제액은 false */
  higherIsWorse?: boolean;
}

/** 절세·주의 포인트 — 코드에 박아 둔 결정론적 문구 (AI가 지어내지 않는다) */
export interface Tip {
  level: "must" | "watch" | "save";
  title: string;
  body: string;
  law?: string;
}
