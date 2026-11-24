// 날셈 2027 퇴직금 계산기: 화면 입력 → 급여 엔진(alba-pay-engine.js)의 severanceEstimate 호출과 결과 정리.
// 규칙(본부 ventures/payroll-template/rules-2027.md 6장): 계속근로 1년 이상 + 4주 평균 주 15시간 이상이면
// 퇴직금 = 1일 평균임금 × 30 × (재직일수 ÷ 365). 1일 평균임금 = 퇴직 전 3개월 임금 총액 ÷ 그 기간 총 일수.
// 퇴직일 = 마지막 근무일 다음 날. 상여금·연차수당은 1년 지급액의 3/12 를 3개월 임금에 더한다.
// 브라우저(severance-ui.js)와 Node 테스트(test/severance.test.mjs)가 같이 쓴다. 입력값은 어디로도 보내지 않는다.
import { severanceEstimate, dayNumber, edate } from "./alba-pay-engine.js";

export const EXAMPLE = { hireDate: "2024-03-02", lastDay: "2027-03-01", monthly: 3000000, threeMonthTotal: 0, bonusYear: 0, leaveYear: 0, over15: true };

const DAY_MS = 86400000;
const iso = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const valid = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && iso(dayNumber(s)) === s;

/**
 * h: { hireDate, lastDay: 'YYYY-MM-DD', monthly: 월 급여(세전), threeMonthTotal: 3개월 임금 직접 입력(0이면 월 급여 × 3),
 *      bonusYear: 1년 상여금, leaveYear: 1년 연차수당, over15: 4주 평균 주 15시간 이상 }
 * 반환: { error } 또는 { eligible, reason, retireDate, serviceDays, years, periodStart, periodDays, wages3, bonusPart, leavePart, total3, avgDaily, amount }
 */
export function severance(h) {
  if (!valid(h.hireDate)) return { error: "입사일을 넣어 주세요." };
  if (!valid(h.lastDay)) return { error: "마지막 근무일을 넣어 주세요." };
  const retire = dayNumber(h.lastDay) + 1;
  const serviceDays = retire - dayNumber(h.hireDate);
  if (serviceDays <= 0) return { error: "마지막 근무일이 입사일보다 앞서요." };
  const monthly = Number(h.monthly) || 0, direct = Number(h.threeMonthTotal) || 0;
  const wages3 = direct > 0 ? direct : monthly * 3;
  if (!(wages3 > 0)) return { error: "월 급여를 넣어 주세요." };
  const bonusYear = Math.max(0, Number(h.bonusYear) || 0), leaveYear = Math.max(0, Number(h.leaveYear) || 0);
  const bonusPart = (bonusYear * 3) / 12, leavePart = (leaveYear * 3) / 12;
  const retireDate = iso(retire);
  const periodStart = edate(retireDate, -3);
  const periodDays = retire - dayNumber(periodStart);
  const total3 = wages3 + bonusPart + leavePart;
  const r = severanceEstimate({ wagesLast3Months: total3, daysLast3Months: periodDays, serviceDays, weeklyHours: h.over15 === false ? 10 : 40 });
  const reason = r.eligible ? "" : serviceDays < 365 ? "under1y" : "under15h";
  return {
    eligible: r.eligible, reason, retireDate, serviceDays, years: serviceDays / 365,
    periodStart, periodDays, wages3, bonusPart, leavePart, total3,
    avgDaily: r.avgDailyWage, amount: r.amount,
  };
}
