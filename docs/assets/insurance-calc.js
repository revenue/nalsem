// 날셈 2027 4대보험 계산기: 화면 입력 → 급여 엔진(alba-pay-engine.js)의 socialInsurance 호출과 결과 정리.
// 요율·끝수 규칙은 엔진에만 있다(본부 ventures/payroll-template/rules-2027.md 0·4장).
// 브라우저(insurance-ui.js)와 Node 테스트(test/insurance.test.mjs)가 같이 쓴다. 입력값은 어디로도 보내지 않는다.
import { socialInsurance, eligibility, RATES_2027, LIMITS } from "./alba-pay-engine.js";

export const R = Object.fromEntries(Object.entries(RATES_2027).map(([k, v]) => [k, v.value]));
export const THRESHOLD = LIMITS.weeklyThresholdHours; // 15
export const EXAMPLE = { pay: 3000000, nonTax: 0, over15: true, months3: true, emp: "current", accidentPct: 0 };

/**
 * h: { pay: 월 급여(세전), nonTax: 비과세(식대 등), over15: 1주 15시간 이상, months3: 3개월 이상 근무,
 *      emp: 'current'(0.9%)|'proposal'(1.0%), accidentPct: 산재 요율(%) }
 * 반환: { error } 또는 { base, elig, employee, employer, pensionBase, ownerCost, afterInsurance, pensionCapped, pensionFloored, empRate }
 * - base: 보험료를 매기는 보수 = 월 급여 − 비과세
 * - afterInsurance: 월 급여 − 근로자 4대보험 (소득세·지방소득세는 빼지 않음)
 * - ownerCost: 월 급여 + 사업주 4대보험
 */
export function insure(h) {
  const pay = Number(h.pay), nonTax = Number(h.nonTax) || 0, acc = Number(h.accidentPct) || 0;
  if (!(pay > 0)) return { error: "월 급여를 넣어 주세요." };
  if (pay > 100000000) return { error: "월 급여는 1억 원까지 넣을 수 있어요." };
  if (nonTax < 0 || nonTax >= pay) return { error: "비과세 금액은 월 급여보다 작아야 해요." };
  if (acc < 0 || acc > 20) return { error: "산재보험 요율은 0~20% 사이로 넣어 주세요." };
  const base = pay - nonTax;
  const elig = eligibility({ weeklyHours: h.over15 ? 40 : 10, monthsEmployed: h.months3 ? 3 : 0 });
  const empRate = h.emp === "proposal" ? R.employmentProposal : R.employmentCurrent;
  const ins = socialInsurance(base, elig, { employmentRate: empRate, accidentRate: acc / 100 });
  const floored = Math.floor(base / 1000) * 1000;
  return {
    base, elig, empRate,
    employee: ins.employee, employer: ins.employer, pensionBase: ins.pensionBase,
    afterInsurance: pay - ins.employee.total,
    ownerCost: pay + ins.employer.total,
    pensionCapped: elig.pension && floored > R.pensionBaseCeiling,
    pensionFloored: elig.pension && floored < R.pensionBaseFloor,
  };
}
