// 2027 최저임금 계산기(docs/assets/minimum-wage-calc.js) 검증. `npm test`
// 기대값: 고용노동부 고시(2027 시급 10,700원·월 209시간 2,236,300원, 2026 시급 10,320원·월 2,156,880원)와 손계산.
import test from "node:test";
import assert from "node:assert/strict";
import { minimumWage, EXAMPLE, MIN_2026, MIN_2027 } from "../docs/assets/minimum-wage-calc.js";

test("기준: 2027 10,700원, 2026 10,320원", () => {
  assert.equal(MIN_2027, 10700);
  assert.equal(MIN_2026, 10320);
});

test("주 40시간: 209시간, 월 2,236,300원, 2026년보다 79,420원 많음", () => {
  const r = minimumWage(EXAMPLE);
  assert.equal(r.hours, 209);
  assert.equal(r.monthly, 2236300);
  assert.equal(r.yearly, 26835600);
  assert.equal(r.weekly, 513600); // (40 + 8) × 10,700
  assert.equal(r.vs2026.monthly2026, 2156880);
  assert.equal(r.vs2026.diff, 79420);
});

test("주 20시간: 104시간, 1,112,800원 / 주 15시간: 78시간, 834,600원", () => {
  assert.equal(minimumWage({ ...EXAMPLE, weeklyHours: 20 }).monthly, 1112800);
  const r15 = minimumWage({ ...EXAMPLE, weeklyHours: 15 });
  assert.equal(r15.hours, 78);
  assert.equal(r15.monthly, 834600);
});

test("주 14시간: 주휴 없이 61시간, 652,700원", () => {
  const r = minimumWage({ ...EXAMPLE, weeklyHours: 14 });
  assert.equal(r.holidayHours, 0);
  assert.equal(r.hours, 61);
  assert.equal(r.monthly, 652700);
});

test("주 6일제 36시간: 주휴 6시간, 183시간", () => {
  const r = minimumWage({ ...EXAMPLE, weeklyHours: 36, shopDays: 6 });
  assert.equal(r.holidayHours, 6);
  assert.equal(r.hours, 183);
});

test("월급 확인: 220만 원(주 40시간)은 시급 약 10,526원, 월 36,300원 부족", () => {
  const r = minimumWage({ ...EXAMPLE, mode: "check", monthly: 2200000 });
  assert.equal(r.ok, false);
  assert.equal(Math.round(r.hourly), 10526);
  assert.equal(r.shortfall, 36300);
  assert.equal(minimumWage({ ...EXAMPLE, mode: "check", monthly: 2236300 }).ok, true);
});

test("최저임금 미만 시급 표시와 입력 오류", () => {
  assert.equal(minimumWage({ ...EXAMPLE, wage: 10320 }).belowMin, true);
  assert.ok(minimumWage({ ...EXAMPLE, weeklyHours: 0 }).error);
  assert.ok(minimumWage({ ...EXAMPLE, wage: 0 }).error);
  assert.ok(minimumWage({ ...EXAMPLE, mode: "check", monthly: 0 }).error);
});
