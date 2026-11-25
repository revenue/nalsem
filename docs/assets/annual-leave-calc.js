// 날셈 2027 연차수당 계산기: 입사일·기준일 → 연차 발생표, 지금 쓸 수 있는 연차, 남은 연차 수당.
// 규칙(근로기준법 제60조·제18조③, 시행령 별표1):
// - 5인 이상 사업장만 적용. 4주 평균 1주 15시간 미만이면 없음.
// - 1년 미만(또는 1년간 80% 미만 출근): 1개월 개근마다 1일, 최대 11일. 입사일부터 한 달이 지난 날(같은 날짜)에 생긴다.
// - 1년 근로를 마친 다음 날(입사 기념일)까지 근로관계가 이어져야 15일이 생긴다(대법원 2021다227100, 2021-10-14).
//   그래서 1년만 일하고 마지막 근무일이 기념일 전날이면 15일은 생기지 않는다.
// - 3년 이상: 최초 1년을 넘는 2년마다 1일 가산, 총 25일 한도. n년 근속 때 15 + floor((n−1)/2).
// - 단시간 근로자(주 15~40시간): 연차 시간 = 일수 × 8 × (주 소정근로시간 ÷ 40) (고용노동부 단시간근로자 연차 산정).
// - 연차수당 = 남은 연차 시간 × 통상 시급. 월급이면 통상 시급 = 월급 ÷ 월 소정근로시간(주 40시간이면 209시간).
// 매월 개근·출근율 80% 이상을 가정한다. 브라우저(annual-leave-ui.js)와 Node 테스트가 같이 쓴다. 입력값은 어디로도 보내지 않는다.
import { dayNumber, edate, monthlyPaidHours, LIMITS, RATES_2027 } from "./alba-pay-engine.js";

export const MIN_WAGE = RATES_2027.minimumWage.value;
export const EXAMPLE = { hireDate: "2025-03-02", refDate: "2027-03-02", weeklyHours: 40, payType: "monthly", hourly: MIN_WAGE, monthly: 3000000, used: 0, fivePlus: true };

const DAY_MS = 86400000;
const iso = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const valid = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && iso(dayNumber(s)) === s;
export const daysForYear = (n) => Math.min(25, 15 + Math.floor((n - 1) / 2)); // n년 근속 때 생기는 연차

/**
 * h: { hireDate, refDate('YYYY-MM-DD', 오늘 또는 마지막 근무일), weeklyHours, payType:'hourly'|'monthly', hourly, monthly, used(지금 연차 중 쓴 날), fivePlus }
 * 반환: { error } 또는 { eligible, reason, years, firstYear:{days, dates}, schedule:[{n, date, days}], current:{kind, days, from, until},
 *         dayHours, hourly, unusedDays, unusedHours, pay, totalDays }
 */
export function annualLeave(h) {
  if (!valid(h.hireDate)) return { error: "입사일을 넣어 주세요." };
  if (!valid(h.refDate)) return { error: "기준일을 넣어 주세요." };
  const hire = dayNumber(h.hireDate), ref = dayNumber(h.refDate);
  if (ref < hire) return { error: "기준일이 입사일보다 앞서요." };
  const wh = Number(h.weeklyHours);
  if (!(wh > 0) || wh > 52) return { error: "1주 근무시간을 1~52시간으로 넣어 주세요." };
  const hourly = h.payType === "monthly" ? Number(h.monthly) / monthlyPaidHours(Math.min(wh, 40)) : Number(h.hourly);
  if (!(hourly > 0)) return { error: h.payType === "monthly" ? "월급을 넣어 주세요." : "시급을 넣어 주세요." };

  const dayHours = 8 * Math.min(wh, 40) / 40; // 연차 하루에 해당하는 시간
  const base = { dayHours, hourly, years: 0, firstYear: { days: 0, dates: [] }, schedule: [], current: { kind: "none", days: 0, from: null, until: null }, unusedDays: 0, unusedHours: 0, pay: 0, totalDays: 0 };
  if (!h.fivePlus) return { ...base, eligible: false, reason: "under5" };
  if (wh < LIMITS.weeklyThresholdHours) return { ...base, eligible: false, reason: "under15h" };

  // 1년 미만 월 단위 연차 (입사일 + m개월이 기준일 이하이면 생김, 최대 11일)
  const dates = [];
  for (let m = 1; m <= 11; m++) { const d = edate(h.hireDate, m); if (dayNumber(d) <= ref) dates.push(d); }
  // n년 근속 연차 (입사 기념일까지 근로관계가 이어져야 생김)
  const schedule = [];
  for (let n = 1; n <= 60; n++) { const d = edate(h.hireDate, 12 * n); if (dayNumber(d) > ref) break; schedule.push({ n, date: d, days: daysForYear(n) }); }
  const years = schedule.length;
  let current;
  if (years === 0) current = { kind: "first", days: dates.length, from: dates[0] || null, until: edate(h.hireDate, 12) };
  else { const last = schedule[years - 1]; current = { kind: "year", n: last.n, days: last.days, from: last.date, until: edate(h.hireDate, 12 * (last.n + 1)) }; }
  const used = Math.max(0, Number(h.used) || 0);
  const unusedDays = Math.max(0, current.days - used);
  const unusedHours = unusedDays * dayHours;
  return {
    ...base, eligible: true, reason: "", years, firstYear: { days: dates.length, dates }, schedule, current,
    unusedDays, unusedHours, pay: Math.round(unusedHours * hourly), totalDays: dates.length + schedule.reduce((s, x) => s + x.days, 0),
  };
}
