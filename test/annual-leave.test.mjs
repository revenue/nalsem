// 2027 연차수당 계산기(docs/assets/annual-leave-calc.js) 검증. `npm test`
// 손계산 기준: 근로기준법 제60조(1년 미만 월 1일·최대 11일, 1년 15일, 3년부터 2년마다 +1일·최대 25일),
// 대법원 2021다227100(기념일까지 근로관계가 이어져야 15일), 단시간 = 일수 × 8 × 주시간/40, 월급 ÷ 209 = 통상 시급.
import test from "node:test";
import assert from "node:assert/strict";
import { annualLeave, daysForYear, EXAMPLE } from "../docs/assets/annual-leave-calc.js";

test("근속연수별 연차: 1·2년 15일, 3·4년 16일, 5년 17일, 21년부터 25일 한도", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 21, 23, 30].map(daysForYear), [15, 15, 16, 16, 17, 25, 25, 25]);
});

test("1년 미만: 2026-03-01 입사, 2026-11-26 기준 → 8일 (4/1~11/1)", () => {
  const r = annualLeave({ ...EXAMPLE, hireDate: "2026-03-01", refDate: "2026-11-26" });
  assert.equal(r.years, 0);
  assert.equal(r.firstYear.days, 8);
  assert.equal(r.current.kind, "first");
  assert.equal(r.current.until, "2027-03-01");
});

test("딱 1년 근무 후 퇴사(마지막 근무일 12-31): 11일만, 15일은 생기지 않음", () => {
  const r = annualLeave({ ...EXAMPLE, hireDate: "2026-01-01", refDate: "2026-12-31" });
  assert.equal(r.firstYear.days, 11);
  assert.equal(r.years, 0);
  assert.equal(r.totalDays, 11);
});

test("입사 기념일까지 근무하면 15일 생김 (총 26일)", () => {
  const r = annualLeave({ ...EXAMPLE, hireDate: "2026-01-01", refDate: "2027-01-01", payType: "hourly", hourly: 10700 });
  assert.equal(r.years, 1);
  assert.equal(r.current.days, 15);
  assert.equal(r.totalDays, 26);
  assert.equal(r.pay, 1284000); // 15일 × 8시간 × 10,700
});

test("3년 근속: 16일", () => {
  const r = annualLeave({ ...EXAMPLE, hireDate: "2026-01-01", refDate: "2029-01-01" });
  assert.equal(r.years, 3);
  assert.equal(r.current.days, 16);
});

test("예시: 월급 300만 원, 2년 근속 15일 → 300만 ÷ 209 × 120시간 = 1,722,488원", () => {
  const r = annualLeave(EXAMPLE);
  assert.equal(r.years, 2);
  assert.equal(r.current.from, "2027-03-02");
  assert.equal(r.totalDays, 41);
  assert.equal(r.unusedHours, 120);
  assert.equal(r.pay, 1722488);
});

test("단시간 주 20시간: 15일 = 60시간, 시급 10,700원 → 642,000원", () => {
  const r = annualLeave({ ...EXAMPLE, weeklyHours: 20, payType: "hourly", hourly: 10700 });
  assert.equal(r.dayHours, 4);
  assert.equal(r.unusedHours, 60);
  assert.equal(r.pay, 642000);
});

test("5일 쓰면 남은 10일만 수당", () => {
  const r = annualLeave({ ...EXAMPLE, payType: "hourly", hourly: 10700, used: 5 });
  assert.equal(r.unusedDays, 10);
  assert.equal(r.pay, 856000);
});

test("5인 미만·주 15시간 미만은 연차 없음", () => {
  assert.equal(annualLeave({ ...EXAMPLE, fivePlus: false }).reason, "under5");
  assert.equal(annualLeave({ ...EXAMPLE, weeklyHours: 14 }).reason, "under15h");
  assert.equal(annualLeave({ ...EXAMPLE, fivePlus: false }).pay, 0);
});

test("입력 오류", () => {
  assert.ok(annualLeave({ ...EXAMPLE, hireDate: "" }).error);
  assert.ok(annualLeave({ ...EXAMPLE, refDate: "2020-01-01" }).error);
  assert.ok(annualLeave({ ...EXAMPLE, monthly: 0 }).error);
});
