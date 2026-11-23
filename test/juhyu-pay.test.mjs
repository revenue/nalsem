// 2027 주휴수당 계산기(docs/assets/juhyu-pay-calc.js) 검증. `npm test`
// 엔진 주휴 규칙은 test/alba-pay-engine.test.mjs 가 원본 T1~T4·T18로 검사한다. 여기서는 페이지가 엔진을
// 맞게 부르는지와 한 달·월 환산 숫자를 손계산과 대조한다. 기대값: 본부 ventures/payroll-template/rules-2027.md 8장.
import test from "node:test";
import assert from "node:assert/strict";
import { juhyu, EXAMPLE, MIN_WAGE, THRESHOLD } from "../docs/assets/juhyu-pay-calc.js";

test("기준값: 최저임금 10,700원, 주 15시간", () => {
  assert.equal(MIN_WAGE, 10700);
  assert.equal(THRESHOLD, 15);
});

test("예시: 주 20시간 × 10,700원, 2027-01 (일요일 5번)", () => {
  const r = juhyu(EXAMPLE);
  assert.equal(r.eligible, true);
  assert.equal(r.dayHours, 4); // 20 ÷ 5
  assert.equal(r.weekly, 42800); // 4h × 10,700
  assert.equal(r.sundays, 5); // 1/3·10·17·24·31
  assert.equal(r.monthly, 214000);
  assert.equal(r.monthlyPaidHours, 104); // (20 + 4) × 365 ÷ 7 ÷ 12 = 104.29
  assert.equal(r.monthlySalary, 1112800);
  assert.equal(r.belowMin, false);
});

test("주 40시간: 주휴 8시간 85,600원, 월 209시간 2,236,300원", () => {
  const r = juhyu({ ...EXAMPLE, weeklyHours: 40 });
  assert.equal(r.dayHours, 8);
  assert.equal(r.weekly, 85600);
  assert.equal(r.monthlyPaidHours, 209);
  assert.equal(r.monthlySalary, 2236300);
});

test("주 45시간이어도 주휴는 8시간 상한", () => {
  const r = juhyu({ ...EXAMPLE, weeklyHours: 45 });
  assert.equal(r.dayHours, 8);
  assert.equal(r.weekly, 85600);
});

test("주 14시간: 주휴수당 없음, 월 환산에도 주휴 없음", () => {
  const r = juhyu({ ...EXAMPLE, weeklyHours: 14 });
  assert.equal(r.eligible, false);
  assert.equal(r.weekly, 0);
  assert.equal(r.monthly, 0);
  assert.equal(r.monthlyPaidHours, Math.round((14 * 365) / 7 / 12)); // 61
});

test("주 15시간 경계: 주휴 3시간", () => {
  const r = juhyu({ ...EXAMPLE, weeklyHours: 15 });
  assert.equal(r.eligible, true);
  assert.equal(r.dayHours, 3);
  assert.equal(r.weekly, 32100);
});

test("불규칙 근무 주 32시간: (32 ÷ 40) × 8 = 6.4시간, 68,480원 (규칙표 T4)", () => {
  const r = juhyu({ ...EXAMPLE, weeklyHours: 32, irregular: true });
  assert.equal(r.dayHours, 6.4);
  assert.equal(r.weekly, 68480);
});

test("주 6일제 사업장 주 36시간: 36 ÷ 6 = 6시간", () => {
  const r = juhyu({ ...EXAMPLE, weeklyHours: 36, shopDays: 6 });
  assert.equal(r.dayHours, 6);
  assert.equal(r.weekly, 64200);
});

test("2027-02는 일요일 4번", () => {
  const r = juhyu({ ...EXAMPLE, month: "2027-02" });
  assert.equal(r.sundays, 4);
  assert.equal(r.monthly, 42800 * 4);
});

test("최저임금 미만 표시와 입력 오류", () => {
  assert.equal(juhyu({ ...EXAMPLE, wage: 10000 }).belowMin, true);
  assert.ok(juhyu({ ...EXAMPLE, wage: 0 }).error);
  assert.ok(juhyu({ ...EXAMPLE, weeklyHours: 0 }).error);
  assert.ok(juhyu({ ...EXAMPLE, weeklyHours: 60 }).error);
});
