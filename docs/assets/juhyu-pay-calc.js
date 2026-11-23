// 날셈 2027 주휴수당 계산기: 화면 입력 → 급여 엔진(alba-pay-engine.js)의 주휴 함수 호출과 결과 정리.
// 규칙은 엔진에만 있다(본부 ventures/payroll-template/rules-2027.md 2장, T1~T4·T18 검사).
// 브라우저(juhyu-pay-ui.js)와 Node 테스트(test/juhyu-pay.test.mjs)가 같이 쓴다. 입력값은 어디로도 보내지 않는다.
import { weeklyHolidayAllowance, monthlySalaryForWeeklyHours, LIMITS, RATES_2027 } from "./alba-pay-engine.js";
import { sundaysOf } from "./alba-pay-input.js";

export const MIN_WAGE = RATES_2027.minimumWage.value;
export const THRESHOLD = LIMITS.weeklyThresholdHours; // 15
export const EXAMPLE = { wage: MIN_WAGE, weeklyHours: 20, shopDays: 5, irregular: false, month: "2027-01" };

/**
 * h: { wage, weeklyHours, shopDays: 5|6, irregular: bool, month: 'YYYY-MM' }
 * 반환: { error } 또는 { eligible, dayHours, weekly, sundays, monthly, monthlyPaidHours, monthlySalary, belowMin }
 * - weekly: 개근한 한 주의 주휴수당
 * - monthly: 그 달 일요일 수 × weekly (매주 개근 가정)
 * - monthlySalary: 주휴 포함 월 환산(주 40시간이면 209시간 방식)
 */
export function juhyu(h) {
  const wage = Number(h.wage), wh = Number(h.weeklyHours);
  if (!(wage > 0)) return { error: "시급을 넣어 주세요." };
  if (!(wh > 0)) return { error: "1주 근무시간을 넣어 주세요." };
  if (wh > 52) return { error: "1주 근무시간은 52시간까지 넣을 수 있어요." };
  const shopDays = h.shopDays === 6 ? 6 : 5;
  const irregular = Boolean(h.irregular);
  const w = weeklyHolidayAllowance({ weeklyHours: wh, wage, shopDays, irregular, fullAttendance: true });
  const sundays = sundaysOf(h.month).sundays.length;
  const ms = monthlySalaryForWeeklyHours(wh, wage, { shopDays, irregular });
  return {
    eligible: w.eligible,
    dayHours: w.hours,
    weekly: w.amount,
    sundays,
    monthly: w.amount * sundays,
    monthlyPaidHours: ms.hours,
    monthlySalary: ms.amount,
    belowMin: wage < MIN_WAGE,
  };
}
