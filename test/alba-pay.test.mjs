// 2027 알바 인건비 계산기: 화면 입력 → 엔진 변환(docs/assets/alba-pay-input.js) 검증. `npm test`
// 엔진 자체는 test/alba-pay-engine.test.mjs 가 원본 T1~T19로 검사한다. 여기서는 "주 N일 × 하루 H시간" 입력이
// 엔진에 맞게 펼쳐지는지와 페이지 예시 숫자를 손계산과 대조한다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { calc, toRecords, check, EXAMPLE, sundaysOf } from "../docs/assets/alba-pay-input.js";

test("페이지 예시: 5인 이상, 2027-01, 주 5일 × 6시간(야간 2시간), 개근, 고용 0.9%, 산재 없음", () => {
  const r = calc(EXAMPLE), x = r.row;
  // 1월 평일 21일 × 6h = 126h, 일요일 5번(3·10·17·24·31)
  assert.equal(r.weeks, 5);
  assert.equal(x.workedMin, 126 * 60);
  assert.equal(x.basePay, 126 * 10700); // 1,348,200
  assert.equal(x.weeklyHolidayPay, 5 * 6 * 10700); // 주휴 6h × 5주 = 321,000
  assert.equal(x.nightPremium, 21 * 2 * 10700 / 2); // 224,700
  assert.equal(x.overtimePremium + x.holidayPremium, 0);
  assert.equal(x.gross, 1893900);
  // 연금 1,893,000 × 5% / 건강 68,085.7 → 68,080 / 장기요양 68,080 × 13.90% = 9,463 → 9,460 / 고용 0.9% 17,045 → 17,040
  assert.deepEqual({ ...x.employee }, { pension: 94650, health: 68080, ltc: 9460, employment: 17040, total: 189230 });
  // 사업주 고용 1.15% = 21,779.85 → 21,770
  assert.deepEqual({ ...x.employer }, { pension: 94650, health: 68080, ltc: 9460, employment: 21770, accident: 0, total: 193960 });
  assert.equal(x.ownerCost, 2087860);
  assert.equal(x.netPay, 1893900 - 189230);
});

test("같은 근무 5인 미만: 야간 가산 없음 → 지급총액 1,669,200원, 사장님 월 비용 1,840,180원", () => {
  const x = calc(EXAMPLE, "5인 미만").row;
  assert.equal(x.nightPremium, 0);
  assert.equal(x.gross, 1348200 + 321000);
  assert.equal(x.ownerCost, 1840180);
});

test("주 40h(5일 × 8h) 2027-02: 지급총액 2,054,400원", () => {
  // 월급제 209h(T5)와 달리 실제 달력으로 센다. 보험 끝수는 엔진 T14·T15가 검사한다.
  // 2027-02(평일 20일, 일요일 4번): 160h + 주휴 8h × 4 = 192h × 10,700 = 2,054,400원
  const x = calc({ ...EXAMPLE, scale: "5인 미만", month: "2027-02", hours: 8, night: 0 }).row;
  assert.equal(x.basePay, 160 * 10700);
  assert.equal(x.weeklyHolidayPay, 32 * 10700);
  assert.equal(x.gross, 2054400);
});

test("야간 배치: 퇴근을 22시 + 야간시간에 둔다 (6h 중 야간 2h → 18:00~24:00)", () => {
  const r = toRecords(EXAMPLE).find((x) => x.date === "2027-01-04");
  assert.equal(r.start, 18 * 60);
  assert.equal(r.end, 24 * 60);
  const day = toRecords({ ...EXAMPLE, night: 0 }).find((x) => x.date === "2027-01-04");
  assert.deepEqual([day.start, day.end], [600, 960]);
});

test("주 14h(4일 × 3.5h) 3개월 이상: 주휴 0, 연금·건강 제외, 고용·산재 적용 (T18과 같은 판정)", () => {
  const r = calc({ ...EXAMPLE, days: 4, hours: 3.5, night: 0, accidentPct: 1 });
  assert.equal(r.under15, true);
  assert.equal(r.row.weeklyHolidayPay, 0);
  assert.equal(r.row.employee.pension + r.row.employee.health, 0);
  assert.ok(r.row.employee.employment > 0);
  assert.ok(r.row.employer.accident > 0);
  assert.equal(r.row.severanceAccrual, 0);
  // 3개월 미만이면 고용도 제외
  assert.equal(calc({ ...EXAMPLE, days: 4, hours: 3.5, night: 0, tenure: "new" }).row.employee.employment, 0);
});

test("결근 1주 + 휴일근무 10h(5인 이상): 주휴 4주, 휴일 가산 10h × 50%, 결근일 임금 빠짐", () => {
  const x = calc({ ...EXAMPLE, absentWeeks: 1, holidayHours: 10 }).row;
  assert.equal(x.weeklyHolidayPay, 4 * 6 * 10700);
  assert.equal(x.holidayMin, 600);
  assert.equal(x.holidayPremium, 10 * 10700 / 2); // 8h + 2h 두 일요일로 나눠 8h 초과 100% 없음
  assert.equal(x.workedMin, (20 * 6 + 10) * 60);
});

test("5인 이상 하루 10h: 1일 8h 초과 2h × 50% 연장 가산 (T8과 같은 규칙)", () => {
  const x = calc({ ...EXAMPLE, days: 4, hours: 10, night: 0 }).row; // 주 40h
  // 2027-01 평일 월~목: 4·5·6·7, 11~14, 18~21, 25~28 = 16일
  assert.equal(x.dailyOTMin, 16 * 120);
  assert.equal(x.overtimePremium, 16 * 2 * 10700 / 2);
});

test("입력 확인: 시급 없음·근무일 7일·야간 > 근무시간·휴일 한도", () => {
  assert.ok(check({ ...EXAMPLE, wage: 0 }).error);
  assert.ok(check({ ...EXAMPLE, days: 7 }).error);
  assert.ok(check({ ...EXAMPLE, night: 7 }).error);
  assert.ok(check({ ...EXAMPLE, holidayHours: sundaysOf("2027-01").sundays.length * 8 + 1 }).error);
  assert.equal(check(EXAMPLE), null);
});

test("엔진 사본이 본부 원본과 같은지 (본부 저장소가 옆에 있을 때만)", (t) => {
  const hq = new URL("../../../ventures/payroll-template/template/engine.mjs", import.meta.url);
  if (!existsSync(hq)) return t.skip("본부 원본 없음");
  assert.equal(readFileSync(new URL("../docs/assets/alba-pay-engine.js", import.meta.url), "utf8"), readFileSync(hq, "utf8"));
});
