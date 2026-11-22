// 날셈 2027 알바 인건비 계산기: 화면 입력 → 급여 엔진(alba-pay-engine.js) 입력 변환과 결과 정리.
// 계산 규칙은 엔진에만 있다. 이 파일은 "주 N일 × 하루 H시간" 같은 간단한 입력을 엔진이 받는
// 하루 근무기록으로 펼치고, 엔진의 monthlyPayroll(한 달 급여대장) 결과를 화면용으로 묶기만 한다.
// 브라우저(alba-pay-ui.js)와 Node 테스트(test/alba-pay.test.mjs)가 같이 쓴다. 입력값은 어디로도 보내지 않는다.
import { monthlyPayroll, edate, RATES_2027 } from "./alba-pay-engine.js";

export const MIN_WAGE = RATES_2027.minimumWage.value;
export const EMPLOYMENT = { current: RATES_2027.employmentCurrent.value, proposal: RATES_2027.employmentProposal.value };
export const LIMIT_HINT = { maxDays: 6, maxHours: 12, maxNight: 8, holidayPerDay: 8 };

const DAY_MS = 86400000;
const pad = (n) => String(n).padStart(2, "0");
const iso = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const dayNum = (y, m, d) => Date.UTC(y, m - 1, d) / DAY_MS;
const weekdayMon1 = (n) => { const js = new Date(n * DAY_MS).getUTCDay(); return js === 0 ? 7 : js; };

/** 그 달의 일요일(엔진 규칙: 주휴·주 단위 가산은 일요일이 그 달에 있는 주에 넣는다) */
export function sundaysOf(month) {
  const [y, m] = month.split("-").map(Number);
  const start = dayNum(y, m, 1), end = dayNum(y, m + 1, 0);
  const out = [];
  for (let s = start + ((7 - weekdayMon1(start)) % 7); s <= end; s += 7) out.push(s);
  return { start, end, sundays: out };
}

/**
 * 입력 확인. 문제가 있으면 { error } 를 돌려준다.
 * h = { scale:'5인 미만'|'5인 이상', wage, days, hours, night, holidayHours, absentWeeks,
 *       employment:'current'|'proposal', accidentPct (예: 0.9 = 0.9%) | null, month:'YYYY-MM',
 *       shopDays:5|6, tenure:'3plus'|'new' }
 */
export function check(h) {
  if (!(h.wage > 0)) return { error: "시급을 넣어 주세요." };
  if (!(h.days >= 1 && h.days <= LIMIT_HINT.maxDays)) return { error: "주 근무일은 1~6일로 넣어 주세요. 하루는 쉬는 날(주휴일)로 둬요." };
  if (!(h.hours > 0 && h.hours <= LIMIT_HINT.maxHours)) return { error: "하루 근무시간은 휴게를 뺀 시간으로 0.5~12시간 사이에서 넣어 주세요." };
  if (!(h.night >= 0) || h.night > h.hours || h.night > LIMIT_HINT.maxNight) return { error: "야간 시간은 하루 근무시간 안에서 8시간까지 넣어 주세요." };
  const { sundays } = sundaysOf(h.month);
  if (!(h.holidayHours >= 0) || h.holidayHours > sundays.length * LIMIT_HINT.holidayPerDay) return { error: `휴일근무는 이 달 일요일 ${sundays.length}번 × 8시간 = ${sundays.length * 8}시간까지 넣을 수 있어요.` };
  if (!(h.accidentPct === null || (h.accidentPct >= 0 && h.accidentPct < 20))) return { error: "산재보험 요율은 % 숫자로 넣어 주세요. 예: 0.9" };
  return null;
}

/**
 * 간단한 입력 → 엔진 근무기록.
 * - 근무일: 월요일부터 주 N일. 하루 H시간, 휴게는 이미 뺀 시간으로 보고 breakMin 0
 * - 야간 n시간: 퇴근을 22시 + n시간에 둔다(출근 = 퇴근 − H). 야간 0이면 10시 출근
 * - 휴일근무: 그 달 일요일에 하루 8시간까지 나눠 넣는다(엔진이 휴일로 계산)
 * - 결근 k주: 그 달 마지막 k주의 마지막 근무일을 결근으로 둔다(그 주 주휴 없음, 그날 임금 없음)
 * - 주 단위 계산을 위해 그 달 첫 일요일이 있는 주의 앞 며칠(지난달)도 기록에 넣는다. 기본급은 엔진이 그 달 날짜만 센다.
 */
export function toRecords(h) {
  const { start, end, sundays } = sundaysOf(h.month);
  const from = Math.min(start, sundays.length ? sundays[0] - 6 : start);
  const workMin = Math.round(h.hours * 60);
  const nightMin = Math.round(h.night * 60);
  const endMin = nightMin > 0 ? 1320 + nightMin : 600 + workMin;
  const startMin = endMin - workMin;
  const recs = [];
  for (let d = from; d <= end; d++) {
    if (weekdayMon1(d) <= h.days) recs.push({ name: "A", date: iso(d), start: startMin, end: endMin, breakMin: 0 });
  }
  // 결근: 마지막 주부터
  const absent = Math.min(h.absentWeeks || 0, sundays.length);
  for (let i = 0; i < absent; i++) {
    const sun = sundays[sundays.length - 1 - i];
    const inWeek = recs.filter((r) => { const n = Date.parse(r.date) / DAY_MS; return n >= sun - 6 && n <= sun; });
    const last = inWeek[inWeek.length - 1];
    if (last) { delete last.start; delete last.end; last.absent = true; }
  }
  // 휴일근무: 일요일마다 8시간까지
  let left = Math.round((h.holidayHours || 0) * 60);
  for (const sun of sundays) {
    if (left <= 0) break;
    const m = Math.min(left, LIMIT_HINT.holidayPerDay * 60);
    recs.push({ name: "A", date: iso(sun), start: 600, end: 600 + m, breakMin: 0, holiday: true });
    left -= m;
  }
  return recs;
}

/** 엔진 실행. 결과 한 줄(rows[0])과 화면에 필요한 값을 묶는다. */
export function calc(h, scaleOverride) {
  const err = check(h);
  if (err) return err;
  const scale = scaleOverride || h.scale;
  const [y, m] = h.month.split("-").map(Number);
  const hireDate = h.tenure === "new" ? `${y}-${pad(m)}-01` : edate(`${y}-${pad(m)}-01`, -3);
  const weeklyHours = h.days * h.hours;
  const out = monthlyPayroll({
    month: h.month,
    settings: { scale, shopDays: h.shopDays || 5, employmentRate: EMPLOYMENT[h.employment] ?? EMPLOYMENT.current, accidentRate: (h.accidentPct || 0) / 100 },
    employees: [{ name: "A", wage: h.wage, weeklyHours, hireDate }],
    records: toRecords(h),
  });
  const r = out.rows[0];
  return {
    row: r,
    weeklyHours,
    weeks: sundaysOf(h.month).sundays.length,
    premium: r.overtimePremium + r.nightPremium + r.holidayPremium,
    under15: weeklyHours < 15,
    underMin: h.wage < MIN_WAGE,
    accidentBlank: h.accidentPct === null,
  };
}

/** 예시 입력 (페이지 "예시로 채우기"와 설명 카드, 테스트가 같은 값을 쓴다) */
export const EXAMPLE = Object.freeze({
  scale: "5인 이상", wage: 10700, days: 5, hours: 6, night: 2, holidayHours: 0, absentWeeks: 0,
  employment: "current", accidentPct: null, month: "2027-01", shopDays: 5, tenure: "3plus",
});
