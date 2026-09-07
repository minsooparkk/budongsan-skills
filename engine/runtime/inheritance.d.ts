/**
 * 상속세 계산 — 상속세 및 증여세법.
 *
 * 조문 값은 Graph DB(현행 법령)에서 직접 확인한 것이다:
 *   §13 과세가액 · §14 공과금·장례비·채무 · §18 기초공제 2억 · §19 배우자상속공제
 *   §20 그 밖의 인적공제 · §21 일괄공제 5억 · §22 금융재산공제 · §23의2 동거주택공제 6억
 *   §24 공제적용 한도 · §25 과세표준(50만원 미만 부과 제외) · §26 세율 · §69 신고세액공제 3%
 *
 * 들어가지 않은 것(화면에도 같은 문구로 밝힌다): 가업·영농상속공제, 세대생략 할증,
 * 재해손실공제, 감정평가수수료, 단기재상속 세액공제, 비거주자 상속.
 */
import type { Headline, Step, Tip } from "./trace";
import type { CalculationValidation } from "./validation";
export interface InheritanceInput {
    /** 상속개시일 — 신고기한 안내에만 쓴다 (세액 계산은 현행 법령 고정) */
    year: number;
    month: number;
    /** 재산 (원) */
    house: number;
    land: number;
    deposit: number;
    stock: number;
    etc: number;
    /** 채무·비용 (원) */
    debt: number;
    /** 채무 중 금융기관 채무 — 금융재산 상속공제의 순금융재산에서 뺀다 */
    financialDebt: number;
    funeral: number;
    /** 상속개시일 전 10년 이내 상속인에게 증여한 재산 */
    priorGift: number;
    /** 그 사전증여에 대해 이미 낸 증여세 (증여세액공제, §28) */
    priorGiftTaxPaid: number;
    /** 상속인 */
    hasSpouse: boolean;
    children: number;
    minors: number;
    /** 65세 이상 동거가족 */
    elders: number;
    /** 장애인 상속인·동거가족의 기대여명 연수 합계 (§20①4 — 1천만원 × 연수) */
    disabledYears: number;
    /** 배우자가 실제 상속받는 금액. null이면 법정상속분대로 받는다고 본다 */
    spouseActual: number | null;
    /** 동거주택 상속공제 요건 충족 */
    coResidence: boolean;
    /** 상속주택에 담보된 피상속인 채무 — 동거주택공제 대상가액에서 뺀다 */
    houseSecuredDebt: number;
}
export interface InheritanceResult extends CalculationValidation {
    headline: Headline[];
    steps: Step[];
    tips: Tip[];
    /** 최종 납부세액 */
    payable: number;
    taxBase: number;
    grossTax: number;
    /** 실효세율 — 총 상속재산 대비 */
    effectiveRate: number;
    /** 일괄공제와 인적공제 중 어느 쪽을 썼는지 */
    lumpSumUsed: boolean;
    personalSum: number;
    deadline: string;
    /** 과세최저한(§25②)에 걸려 부과되지 않는 경우 */
    belowMinimum: boolean;
}
export declare const EMPTY_INHERITANCE: InheritanceInput;
/**
 * 장례비용 공제 (시행령 §9②).
 * 봉안시설 몫을 뺀 일반 장례비는 500만원 미만이어도 500만원, 1천만원을 넘으면
 * 1천만원에서 자른다. 즉 실제로 얼마를 썼든 공제는 500만~1,000만 사이다.
 */
export declare function funeralDeduction(spent: number): number;
/** 배우자 법정상속분 — 민법 §1009 (배우자 1.5 : 자녀 각 1) */
export declare function spouseLegalShare(children: number): number;
export declare function calcInheritance(input: InheritanceInput): InheritanceResult;
/** 신고기한 — 상속개시일이 속하는 달의 말일부터 6개월 (§67) */
export declare function filingDeadline(year: number, month: number): string;
