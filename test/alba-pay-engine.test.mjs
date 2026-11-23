// 날셈에 복사한 급여 엔진(docs/assets/alba-pay-engine.js)이 원본과 같은 답을 내는지 확인한다. `npm test`
// 원본: 본부 저장소 ventures/payroll-template/template/engine.test.mjs (T1~T19 + 요율표 + 장기요양 반올림). 기대값을 바꾸지 않고 import 경로만 바꿨다.
// 엔진을 다시 복사할 때 이 파일도 원본 테스트로 다시 덮어쓴다.
// rules-2027.md 8장 테스트 T1~T19. 기대값은 규칙표 숫자를 그대로 쓴다.
// 규칙표와 다르게 판단한 부분은 NOTES.md에 적었다(규칙표 값을 바꾸지 않음).
// 실행: node --test test/alba-pay-engine.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RATES_2027, weeklyHolidayAllowance, monthlySalaryForWeeklyHours, dayPay, socialInsurance,
  ownerCostForGross, dailyWorkerWithholding, eligibility, severanceEstimate, monthlyPayroll,
  pensionBase, monthlySeveranceAccrual,
} from '../docs/assets/alba-pay-engine.js';

const W = 10700;
const ALL = { pension: true, health: true, employment: true, accident: true, severance: true };

test('T1 5일제 주 20h(월8·수8·금4) 시급 10,000 개근 → 주휴 4h 40,000원', () => {
  const r = weeklyHolidayAllowance({ weeklyHours: 20, wage: 10000, shopDays: 5 });
  assert.equal(r.hours, 4);
  assert.equal(r.amount, 40000);
});

test('T2 6일제 6일×6h 시급 10,000 → 주휴 6h 60,000원 (40 비례식 72,000원은 틀림)', () => {
  const r = weeklyHolidayAllowance({ weeklyHours: 36, wage: 10000, shopDays: 6 });
  assert.equal(r.hours, 6);
  assert.equal(r.amount, 60000);
  const wrong = weeklyHolidayAllowance({ weeklyHours: 36, wage: 10000, shopDays: 6, irregular: true });
  assert.equal(wrong.amount, 72000); // 40 비례식 결과가 다르다는 것만 확인
});

test('T3 5일제 월·수·금 6h(주 18h) 시급 10,000 → 3.6h 36,000원', () => {
  const r = weeklyHolidayAllowance({ weeklyHours: 18, wage: 10000, shopDays: 5 });
  assert.equal(r.hours, 3.6);
  assert.equal(r.amount, 36000);
});

test('T4 불규칙 근로 주 32h → (32÷40)×8 = 6.4h, 2027 68,480원', () => {
  const r = weeklyHolidayAllowance({ weeklyHours: 32, wage: W, irregular: true });
  assert.equal(r.hours, 6.4);
  assert.equal(r.amount, 68480);
});

test('T5 주 40h 월급제 → 209h × 10,700 = 2,236,300원', () => {
  const r = monthlySalaryForWeeklyHours(40, W);
  assert.equal(r.hours, 209);
  assert.equal(r.amount, 2236300);
  assert.equal(RATES_2027.monthlyStandardHours.value * RATES_2027.minimumWage.value, 2236300);
});

test('T6 주 15h → 3h 32,100원 / 주 14h → 0원', () => {
  assert.equal(weeklyHolidayAllowance({ weeklyHours: 15, wage: W }).amount, 32100);
  assert.equal(weeklyHolidayAllowance({ weeklyHours: 15, wage: W }).hours, 3);
  assert.equal(weeklyHolidayAllowance({ weeklyHours: 14, wage: W }).amount, 0);
});

test('T7 주 20h: 1일 결근 주 → 0원 / 지각만 2회 → 42,800원 (함수 + 월 급여대장)', () => {
  assert.equal(weeklyHolidayAllowance({ weeklyHours: 20, wage: W, fullAttendance: false }).amount, 0);
  assert.equal(weeklyHolidayAllowance({ weeklyHours: 20, wage: W, fullAttendance: true }).amount, 42800);

  // 월 급여대장 경로: 2027-01-04(월) ~ 01-10(일) 주, 월~금 4h
  const days = ['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08'];
  const late = days.map((date, i) => ({ name: 'A', date, start: i < 2 ? '09:10' : '09:00', end: '13:00', breakMin: 0 }));
  const absent = days.map((date, i) => (i === 4 ? { name: 'A', date, absent: true } : { name: 'A', date, start: '09:00', end: '13:00' }));
  const emp = [{ name: 'A', wage: W, weeklyHours: 20 }];
  const settings = { scale: '5인 미만', shopDays: 5 };
  assert.equal(monthlyPayroll({ month: '2027-01', settings, employees: emp, records: late }).rows[0].weeklyHolidayPay, 42800);
  assert.equal(monthlyPayroll({ month: '2027-01', settings, employees: emp, records: absent }).rows[0].weeklyHolidayPay, 0);
});

test('T8 5인 이상 하루 10h: 시급 10,030 → 110,330원, 2027 → 117,700원', () => {
  const rec = { start: '09:00', end: '20:00', breakMin: 60 };
  assert.equal(dayPay(rec, 10030, '5인 이상').total, 110330);
  assert.equal(dayPay(rec, W, '5인 이상').total, 117700);
  assert.equal(dayPay(rec, W, '5인 이상').overtime, 32100 - 21400); // 2h × 0.5 × 10,700
});

test('T9 T8과 같은 근무, 5인 미만 → 107,000원 (가산 없음)', () => {
  const r = dayPay({ start: '09:00', end: '20:00', breakMin: 60 }, W, '5인 미만');
  assert.equal(r.total, 107000);
  assert.equal(r.overtime + r.night + r.holiday, 0);
});

test('T10 5인 이상 단시간(월~금 4h)이 주휴일에 2h 근무 → 시급 3배분 32,100원', () => {
  const sunday = { start: '10:00', end: '12:00', holiday: true };
  assert.equal(dayPay(sunday, W, '5인 이상').total, 32100);

  // 월 급여대장 경로: 휴일 2h는 단시간 초과(주 20h 계약)로 다시 가산하지 않는다
  const recs = ['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08']
    .map((date) => ({ name: 'B', date, start: '09:00', end: '13:00' }))
    .concat([{ name: 'B', date: '2027-01-10', ...sunday }]);
  const r = monthlyPayroll({ month: '2027-01', settings: { scale: '5인 이상', shopDays: 5 }, employees: [{ name: 'B', wage: W, weeklyHours: 20 }], records: recs }).rows[0];
  assert.equal(r.shortExcessMin, 0);
  assert.equal(r.holidayPremium, 10700);
  assert.equal(r.overtimePremium, 0);
  assert.equal(r.basePay, 22 * W);
});

test('T11 5인 이상 휴일 10h → (10×1.5 + 2×0.5) × 10,700 = 171,200원', () => {
  const r = dayPay({ start: '09:00', end: '20:00', breakMin: 60, holiday: true }, W, '5인 이상');
  assert.equal(r.total, 171200);
  assert.equal(r.overtime, 0); // 휴일 8h 초과는 연장으로 중복 가산하지 않음
});

test('T12 18:00~03:00 휴게 23~24시 → 실근로 8h, 야간 4h: 5인 이상 107,000원 / 5인 미만 85,600원', () => {
  const rec = { start: '18:00', end: '03:00', breakMin: 60, breakStart: '23:00' };
  const five = dayPay(rec, W, '5인 이상');
  assert.equal(five.metrics.workedMin, 480);
  assert.equal(five.metrics.nightMin, 240);
  assert.equal(five.base, 85600);
  assert.equal(five.night, 21400);
  assert.equal(five.total, 107000);
  assert.equal(dayPay(rec, W, '5인 미만').total, 85600);
});

test('T13 5인 이상 14:00~02:00 휴게 18~19시 → 117,700 + 16,050 + 21,400 = 155,150원', () => {
  const r = dayPay({ start: '14:00', end: '02:00', breakMin: 60, breakStart: '18:00' }, W, '5인 이상');
  assert.equal(r.metrics.workedMin, 660);
  assert.equal(r.metrics.dailyOTMin, 180);
  assert.equal(r.metrics.nightMin, 240);
  assert.equal(r.base, 117700);
  assert.equal(r.overtime, 16050);
  assert.equal(r.night, 21400);
  assert.equal(r.total, 155150);
});

test('T14 4대보험 월 보수 2,236,300원 (150인 미만)', () => {
  assert.equal(pensionBase(2236300), 2236000);
  const cur = socialInsurance(2236300, ALL, { employmentRate: RATES_2027.employmentCurrent.value });
  assert.deepEqual(
    { p: cur.employee.pension, h: cur.employee.health, l: cur.employee.ltc, e: cur.employee.employment },
    { p: 111800, h: 80390, l: 11170, e: 20120 },
  );
  assert.deepEqual(
    { p: cur.employer.pension, h: cur.employer.health, l: cur.employer.ltc, e: cur.employer.employment },
    { p: 111800, h: 80390, l: 11170, e: 25710 },
  );
  const prop = socialInsurance(2236300, ALL, { employmentRate: RATES_2027.employmentProposal.value });
  assert.equal(prop.employee.employment, 22360);
  assert.equal(prop.employer.employment, 27950);
  // 산재 = 업종 요율 × 보수 (예: 1% → 22,363 → 22,360)
  assert.equal(socialInsurance(2236300, ALL, { accidentRate: 0.01 }).employer.accident, 22360);
});

test('T15 T14 직원의 사장님 월 비용 (고용 0.9%안, 산재 제외) → 2,465,370원, 퇴직금 적립 약 186,358원', () => {
  const r = ownerCostForGross(2236300, ALL, { employmentRate: 0.009, accidentRate: 0 });
  assert.equal(r.ownerCost, 2465370);
  assert.equal(r.accrual, 186358);
  assert.equal(monthlySeveranceAccrual(2236300), 186358);
});

test('T16 일용 일당 200,000원 × 5일 한 번에 지급 → 소득세 6,750원, 지방소득세 670원', () => {
  const r = dailyWorkerWithholding({ dailyWage: 200000, days: 5 });
  assert.equal(r.perDay, 1350);
  assert.equal(r.incomeTax, 6750);
  assert.equal(r.localTax, 670);
});

test('T17 일용 일당 187,000원 이하(1일 지급) → 원천징수 0원', () => {
  for (const w of [187000, 150000, 120000]) {
    const r = dailyWorkerWithholding({ dailyWage: w, days: 1 });
    assert.equal(r.incomeTax, 0, `일당 ${w}`);
    assert.equal(r.localTax, 0);
  }
  // 경계: 187,100원이면 1,002.6원 → 1,000원 징수
  assert.equal(dailyWorkerWithholding({ dailyWage: 187100, days: 1 }).incomeTax, 1000);
  // NOTES.md 1번: 소액부징수는 지급 건 단위라, 187,000원 × 5일을 한 번에 주면 4,990원
  assert.equal(dailyWorkerWithholding({ dailyWage: 187000, days: 5 }).incomeTax, 4990);
});

test('T18 주 14h 알바 4개월 근무 → 주휴 0, 퇴직금 대상 아님, 연금·건강 제외, 고용·산재 적용', () => {
  const e = eligibility({ weeklyHours: 14, monthsEmployed: 4 });
  assert.equal(weeklyHolidayAllowance({ weeklyHours: 14, wage: W }).amount, 0);
  assert.equal(e.weeklyHoliday, false);
  assert.equal(e.severance, false);
  assert.equal(e.pension, false);
  assert.equal(e.health, false);
  assert.equal(e.employment, true);
  assert.equal(e.accident, true);
  // 입사일로 판정해도 같다: 2026-09-01 입사, 2027-01 급여
  const e2 = eligibility({ weeklyHours: 14, hireDate: '2026-09-01', monthEnd: '2027-01-31' });
  assert.equal(e2.employment, true);
  // 3개월이 안 됐으면 고용도 제외
  assert.equal(eligibility({ weeklyHours: 14, hireDate: '2026-11-15', monthEnd: '2027-01-31' }).employment, false);
});

test('T19 주 40h 1년 근무 후 퇴사, 3개월 임금 2,236,300×3, 92일 → 평균임금 72,922.8원 × 30 ≈ 2,187,685원', () => {
  const r = severanceEstimate({ wagesLast3Months: 2236300 * 3, daysLast3Months: 92, serviceDays: 365, weeklyHours: 40 });
  assert.equal(Math.round(r.avgDailyWage * 10) / 10, 72922.8);
  assert.equal(r.amount, 2187685);
  assert.equal(severanceEstimate({ wagesLast3Months: 1, daysLast3Months: 92, serviceDays: 364 }).amount, 0);
});

test('요율표: 미확정 값은 confirmed:false', () => {
  for (const k of ['employmentCurrent', 'employmentProposal', 'industrialAccident', 'healthPremiumMaxTotal', 'healthPremiumMinTotal']) {
    assert.equal(RATES_2027[k].confirmed, false, k);
  }
  assert.equal(RATES_2027.minimumWage.confirmed, true);
});

test('장기요양: 비율을 소수 넷째 자리로 반올림(13.90%)해 곱한다 — 공단 공지 2026-11-12', () => {
  // 보수 556,400원 → 건강 20,000원. 반올림 비율이면 20,000 × 13.90% = 2,780원, 무한소수 비율이면 2,770원.
  const r = socialInsurance(556400, { pension: true, health: true, employment: true }, { employmentRate: 0.009 });
  assert.equal(r.employee.health, 20000);
  assert.equal(r.employee.ltc, 2780);
});
