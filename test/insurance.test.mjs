// 2027 4대보험 계산기(docs/assets/insurance-calc.js) 검증. `npm test`
// 요율·끝수 규칙은 test/alba-pay-engine.test.mjs 가 원본으로 검사한다. 여기서는 페이지가 엔진을
// 맞게 부르는지(비과세 차감, 가입 조건, 고용보험 요율 선택, 산재)와 손계산 숫자를 대조한다.
// 손계산: 연금 5%(기준소득월액 천 원 미만 절사, 하한 41만·상한 659만), 건강 3.595% 10원 미만 버림,
// 장기요양 = 건강 × 13.90% 10원 미만 버림, 고용 근로자 0.9%(정부안 1.0%) / 사업주 +0.25%.
import test from "node:test";
import assert from "node:assert/strict";
import { insure, EXAMPLE, R } from "../docs/assets/insurance-calc.js";

test("기준 요율: 연금 5%, 건강 3.595%, 고용 0.9%·정부안 1.0%", () => {
  assert.equal(R.pensionEmployee, 0.05);
  assert.equal(R.healthEmployee, 0.03595);
  assert.equal(R.employmentCurrent, 0.009);
  assert.equal(R.employmentProposal, 0.01);
});

test("예시: 월 300만 원", () => {
  const r = insure(EXAMPLE);
  assert.deepEqual(r.employee, { pension: 150000, health: 107850, employment: 27000, ltc: 14990, total: 299840 });
  assert.deepEqual(r.employer, { pension: 150000, health: 107850, employment: 34500, accident: 0, ltc: 14990, total: 307340 });
  assert.equal(r.afterInsurance, 2700160);
  assert.equal(r.ownerCost, 3307340);
});

test("2027 최저 월급 2,236,300원: 연금 기준소득월액 2,236,000원", () => {
  const r = insure({ ...EXAMPLE, pay: 2236300 });
  assert.equal(r.pensionBase, 2236000);
  assert.equal(r.employee.pension, 111800);
  assert.equal(r.employee.health, 80390); // 80,394.985
  assert.equal(r.employee.ltc, 11170); // 80,390 × 0.139 = 11,174.21
  assert.equal(r.employee.employment, 20120); // 20,126.7
  assert.equal(r.employee.total, 223480);
  assert.equal(r.employer.employment, 25710); // 2,236,300 × 1.15% = 25,717.45
});

test("월 800만 원: 연금은 상한 659만 원 기준 329,500원", () => {
  const r = insure({ ...EXAMPLE, pay: 8000000 });
  assert.equal(r.pensionBase, 6590000);
  assert.equal(r.employee.pension, 329500);
  assert.equal(r.pensionCapped, true);
  assert.equal(r.employee.health, 287600);
});

test("월 30만 원: 연금은 하한 41만 원 기준 20,500원", () => {
  const r = insure({ ...EXAMPLE, pay: 300000 });
  assert.equal(r.pensionBase, 410000);
  assert.equal(r.employee.pension, 20500);
  assert.equal(r.pensionFloored, true);
});

test("고용보험 정부안 1.0%: 근로자 30,000원, 사업주 37,500원", () => {
  const r = insure({ ...EXAMPLE, emp: "proposal" });
  assert.equal(r.employee.employment, 30000);
  assert.equal(r.employer.employment, 37500);
});

test("비과세 20만 원은 보험료 계산에서 빠진다", () => {
  const r = insure({ ...EXAMPLE, pay: 3200000, nonTax: 200000 });
  assert.equal(r.base, 3000000);
  assert.equal(r.employee.total, 299840);
  assert.equal(r.afterInsurance, 3200000 - 299840);
});

test("주 15시간 미만: 연금·건강 없음, 고용은 3개월 이상이면 가입", () => {
  const a = insure({ ...EXAMPLE, pay: 600000, over15: false, months3: false });
  assert.equal(a.employee.total, 0);
  assert.equal(a.employer.total, 0);
  const b = insure({ ...EXAMPLE, pay: 600000, over15: false, months3: true });
  assert.equal(b.employee.pension, 0);
  assert.equal(b.employee.health, 0);
  assert.equal(b.employee.employment, 5400);
  assert.equal(b.employer.employment, 6900);
});

test("산재 0.7%는 사업주만 21,000원", () => {
  const r = insure({ ...EXAMPLE, accidentPct: 0.7 });
  assert.equal(r.employer.accident, 21000);
  assert.equal(r.employer.total, 328340);
  assert.equal(r.employee.total, 299840);
});

test("입력 오류", () => {
  assert.ok(insure({ ...EXAMPLE, pay: 0 }).error);
  assert.ok(insure({ ...EXAMPLE, nonTax: 3000000 }).error);
  assert.ok(insure({ ...EXAMPLE, accidentPct: 30 }).error);
});
