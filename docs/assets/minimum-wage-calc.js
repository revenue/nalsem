// 날셈 2027 최저임금 계산기: 시급 → 주급·월급(주휴 포함)·연봉, 또는 월급 → 환산 시급과 최저임금 미달 여부.
// 월 유급시간은 급여 엔진(alba-pay-engine.js) monthlyPaidHours: (주 소정 + 주휴) × 365 ÷ 7 ÷ 12, 반올림. 주 40시간이면 209시간.
// 2027 최저임금 10,700원(고용노동부 고시 제2026-60호), 2026년 10,320원(고용노동부 고시 제2025-39호).
// 브라우저(minimum-wage-ui.js)와 Node 테스트(test/minimum-wage.test.mjs)가 같이 쓴다. 입력값은 어디로도 보내지 않는다.
import { monthlyPaidHours, weeklyHolidayHours, LIMITS, RATES_2027 } from "./alba-pay-engine.js";

export const MIN_2027 = RATES_2027.minimumWage.value; // 10,700
export const MIN_2026 = 10320;
export const EXAMPLE = { mode: "wage", wage: MIN_2027, weeklyHours: 40, shopDays: 5, monthly: 2200000 };

/**
 * h: { mode:'wage'|'check', wage, weeklyHours, shopDays:5|6, monthly }
 * mode 'wage'  → { hours, holidayHours, weekly, monthly, yearly, belowMin, vs2026 }
 * mode 'check' → { hours, hourly, min, ok, shortfall(월 부족액), need(최저 월급) }
 */
export function minimumWage(h) {
  const wh = Number(h.weeklyHours);
  if (!(wh > 0) || wh > 52) return { error: "1주 근무시간을 1~52시간으로 넣어 주세요." };
  const shopDays = Number(h.shopDays) === 6 ? 6 : 5;
  const hours = monthlyPaidHours(wh, { shopDays });
  const holidayHours = wh >= LIMITS.weeklyThresholdHours ? weeklyHolidayHours({ weeklyHours: wh, shopDays }) : 0;
  if (h.mode === "check") {
    const monthly = Number(h.monthly);
    if (!(monthly > 0)) return { error: "월급을 넣어 주세요." };
    const hourly = monthly / hours, need = hours * MIN_2027;
    return { mode: "check", hours, holidayHours, hourly, min: MIN_2027, ok: monthly >= need, shortfall: Math.max(0, need - monthly), need };
  }
  const wage = Number(h.wage);
  if (!(wage > 0)) return { error: "시급을 넣어 주세요." };
  const weekly = Math.round((wh + holidayHours) * wage);
  const monthly = hours * wage;
  return {
    mode: "wage", hours, holidayHours, wage, weekly, monthly, yearly: monthly * 12,
    belowMin: wage < MIN_2027,
    vs2026: { monthly2026: hours * MIN_2026, diff: hours * (MIN_2027 - MIN_2026) },
  };
}
