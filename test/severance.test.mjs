// 2027 퇴직금 계산기(docs/assets/severance-calc.js) 검증. `npm test`
// 엔진 severanceEstimate 는 test/alba-pay-engine.test.mjs 가 검사한다. 여기서는 날짜 처리(퇴직일 = 마지막 근무일 다음 날,
// 3개월 기간 일수, 재직일수), 상여금·연차수당 3/12 가산, 1년·주 15시간 요건을 손계산과 대조한다.
// 기대값 T19: 본부 ventures/payroll-template/rules-2027.md 8장.
import test from "node:test";
import assert from "node:assert/strict";
import { severance, EXAMPLE } from "../docs/assets/severance-calc.js";

test("규칙표 T19: 1년 근무, 3개월 임금 2,236,300 × 3, 기간 92일 → 2,187,685원", () => {
  const r = severance({ hireDate: "2026-01-01", lastDay: "2026-12-31", monthly: 2236300 });
  assert.equal(r.retireDate, "2027-01-01");
  assert.equal(r.serviceDays, 365);
  assert.equal(r.periodStart, "2026-10-01");
  assert.equal(r.periodDays, 92);
  assert.equal(Math.round(r.avgDaily * 10) / 10, 72922.8);
  assert.equal(r.amount, 2187685);
});

test("예시: 3년(1,095일), 월 300만 원, 기간 90일 → 평균임금 100,000원, 퇴직금 900만 원", () => {
  const r = severance(EXAMPLE);
  assert.equal(r.retireDate, "2027-03-02");
  assert.equal(r.serviceDays, 1095);
  assert.equal(r.periodStart, "2026-12-02");
  assert.equal(r.periodDays, 90); // 12/2~12/31 30일 + 1월 31일 + 2월 28일 + 3/1 1일
  assert.equal(r.avgDaily, 100000);
  assert.equal(r.amount, 9000000);
});

test("상여금 360만 원·연차수당 60만 원은 3/12만 더한다", () => {
  const r = severance({ ...EXAMPLE, bonusYear: 3600000, leaveYear: 600000 });
  assert.equal(r.bonusPart, 900000);
  assert.equal(r.leavePart, 150000);
  assert.equal(r.total3, 10050000);
  assert.equal(r.amount, 10050000); // 111,666.67 × 30 × 1095/365
});

test("3개월 임금을 직접 넣으면 월 급여 × 3 대신 쓴다", () => {
  const r = severance({ ...EXAMPLE, threeMonthTotal: 8500000 });
  assert.equal(r.wages3, 8500000);
  assert.equal(r.amount, 8500000);
});

test("364일이면 1년 미만이라 0원", () => {
  const r = severance({ hireDate: "2026-01-02", lastDay: "2026-12-31", monthly: 2236300 });
  assert.equal(r.serviceDays, 364);
  assert.equal(r.eligible, false);
  assert.equal(r.reason, "under1y");
  assert.equal(r.amount, 0);
});

test("주 15시간 미만이면 0원", () => {
  const r = severance({ ...EXAMPLE, over15: false });
  assert.equal(r.eligible, false);
  assert.equal(r.reason, "under15h");
  assert.equal(r.amount, 0);
});

test("윤년 2월이 3개월 기간에 들면 일수가 늘어난다 (2028-04-01 퇴직 → 91일)", () => {
  const r = severance({ hireDate: "2025-04-01", lastDay: "2028-03-31", monthly: 3000000 });
  assert.equal(r.periodStart, "2028-01-01");
  assert.equal(r.periodDays, 91);
});

test("입력 오류", () => {
  assert.ok(severance({ ...EXAMPLE, hireDate: "" }).error);
  assert.ok(severance({ ...EXAMPLE, lastDay: "2027-02-30" }).error);
  assert.ok(severance({ ...EXAMPLE, lastDay: "2024-01-01" }).error);
  assert.ok(severance({ ...EXAMPLE, monthly: 0 }).error);
});
