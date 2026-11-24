// 결혼 준비 계산기 3개(식대·축의금, 양가 분담, 결제 일정): 화면 입력 → 결혼 시트 엔진 변환(docs/assets/wedding-input.js) 검증. `npm test`
// 엔진(docs/assets/wedding-engine.js)은 본부 저장소 ventures/wedding-sheet/template/engine.mjs 를 그대로 복사했다.
// 엔진 자체는 본부에서 엑셀 수식과 53개 상황(검사 78,381개)을 대조했다. 여기서는 입력 변환과 페이지 예시 숫자를
// 시트 예시판 기대값(본부 test-report.md 4-2)과 손계산으로 확인한다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { mealCalc, splitCalc, payCalc, payExampleFor, MEAL_EXAMPLE, SPLIT_EXAMPLE, PAY_EXAMPLE } from "../docs/assets/wedding-input.js";

test("식대 예시 = 시트 예시판 하객·식대 탭 (식사 135/121, 식대 16,896,000, 축의금 − 식대 13,194,000)", () => {
  const r = mealCalc(MEAL_EXAMPLE);
  assert.equal(r.groom.attend, 150);
  assert.equal(r.bride.attend, 134);
  assert.equal(r.groom.eat, 135);
  assert.equal(r.bride.eat, 121);
  assert.equal(r.billed, 256); // 보증 200 < 식사 256
  assert.equal(r.mealTotal, 16896000);
  assert.equal(r.shortfall, 0);
  assert.equal(r.groom.meal, 8910000); // 16,896,000 × 135/256
  assert.equal(r.bride.meal, 7986000);
  assert.equal(r.total.gift, 30090000);
  assert.equal(r.groom.net, 6970000);
  assert.equal(r.bride.net, 6224000);
  assert.equal(r.total.net, 13194000);
  assert.equal(r.breakEven, Math.ceil(16896000 / 284)); // 59,493원
});

test("보증 미달: 식사 인원이 보증보다 적으면 보증인원 기준으로 내고, 빈 자리 식대를 따로 보여 준다", () => {
  const r = mealCalc({ guarantee: 250, mealPrice: 80000, mealRatePct: null, groups: [{ side: "신랑측", invited: 100, ratePct: 100, gift: 100000 }, { side: "신부측", invited: 80, ratePct: 100, gift: 100000 }] });
  assert.equal(r.total.eat, 180);
  assert.equal(r.billed, 250);
  assert.equal(r.mealTotal, 250 * 80000);
  assert.equal(r.shortfall, 70 * 80000);
  assert.equal(r.toFill, 70);
  assert.equal(r.groom.meal + r.bride.meal, r.mealTotal); // 양가 몫 합 = 식대
});

test("식대 입력 오류: 식대·초대 인원이 없거나 100% 넘는 비율", () => {
  assert.ok(mealCalc({ ...MEAL_EXAMPLE, mealPrice: null }).error);
  assert.ok(mealCalc({ ...MEAL_EXAMPLE, groups: [] }).error);
  assert.ok(mealCalc({ ...MEAL_EXAMPLE, mealRatePct: 120 }).error);
  assert.ok(mealCalc({ ...MEAL_EXAMPLE, groups: [{ side: "신랑측", invited: 10, ratePct: 150, gift: 0 }] }).error);
});

test("분담 예시 손계산: 신부측 → 신랑측 2,584,297원", () => {
  const r = splitCalc(SPLIT_EXAMPLE), s = r.split;
  // 하객 비율 135/256 = 0.52734375 → 3,500,000 × 0.52734375 = 1,845,703.125 → 1,845,703
  assert.deepEqual(r.lines.map((x) => [x.groom, x.bride]), [[1845703, 1654297], [1470000, 1470000], [4000000, 0], [0, 2000000], [3600000, 2400000], [600000, 600000]]);
  assert.equal(s.groomBurden, 11515703);
  assert.equal(s.brideBurden, 8124297);
  assert.equal(s.totalBurden, 19640000);
  assert.equal(s.groomPaid, 13500000); // 예식장 + 예물 + 신혼여행
  assert.equal(s.bridePaid, 4940000); // 스드메 + 예단 (청첩장은 아직)
  assert.equal(s.groomShould, 10915703);
  assert.equal(s.direction, "신부측 → 신랑측");
  assert.equal(s.settleAmount, 2584297);
});

test("분담: 반올림해도 항목마다 양가 몫 합 = 금액, 하객 수가 비면 하객 비율은 반반", () => {
  const r = splitCalc({ defaultRatioPct: 33.3, guestsGroom: null, guestsBride: null, rows: [
    { name: "A", amount: 1455575, method: "비율", ratioPct: 70, payer: "신랑측" },
    { name: "B", amount: 1000001, method: "비율", ratioPct: null, payer: "분담대로" },
    { name: "C", amount: 999999, method: "하객 비율", ratioPct: null, payer: "아직" },
  ] });
  assert.equal(r.lines[0].groom, 1018903); // 1,455,575 × 70% = 1,018,902.5 → 1,018,903 (시트 NOTES.md 3장)
  for (const x of r.lines) assert.equal(x.groom + x.bride, x.amount);
  assert.equal(r.lines[1].groom, Math.round(1000001 * 0.333));
  assert.equal(r.lines[2].groom, 500000); // 999,999 × 0.5 = 499,999.5 → 500,000
  assert.ok(r.noGuests);
  // 분담대로 낸 항목은 정산 0, 아직 안 낸 항목은 정산에서 빠짐 → 신랑측이 A 전액을 냈으니 신부측 몫만큼 받는다
  assert.equal(r.split.direction, "신부측 → 신랑측");
  assert.equal(r.split.settleAmount, 1455575 - 1018903);
});

test("분담 입력 오류: 금액 있는 줄이 없거나 비율이 100% 넘음", () => {
  assert.ok(splitCalc({ rows: [{ name: "x", amount: null, method: "반반", payer: "아직" }] }).error);
  assert.ok(splitCalc({ defaultRatioPct: 150, rows: [{ name: "x", amount: 100, method: "반반", payer: "아직" }] }).error);
});

test("엔진 사본이 본부 원본과 같은지 (본부 저장소가 옆에 있을 때만)", (t) => {
  const hq = new URL("../../../ventures/wedding-sheet/template/engine.mjs", import.meta.url);
  if (!existsSync(hq)) return t.skip("본부 원본 없음");
  assert.equal(readFileSync(new URL("../docs/assets/wedding-engine.js", import.meta.url), "utf8"), readFileSync(hq, "utf8"));
});

test("결제 일정 예시 = 시트 예시판 요약 탭 (D-173, 39,236,000 / 1,800,000 / 37,436,000, 다음 12-01 D-8 임박)", () => {
  const r = payCalc(PAY_EXAMPLE);
  assert.equal(r.weddingDday, 173);
  assert.equal(r.contractTotal, 39236000);
  assert.equal(r.paid, 1800000);
  assert.equal(r.unpaid, 37436000);
  assert.equal(r.budgetLeft, 2764000);
  assert.equal(r.soonCount, 2);
  assert.equal(r.overdueCount, 0);
  assert.deepEqual([r.upcoming[0].date, r.upcoming[0].amount, r.upcoming[0].dday, r.upcoming[0].status], ["2026-12-01", 1000000, 8, "임박"]);
  assert.equal(r.upcoming.length, 5);
  // 월별: 11월 800,000(스드메·스냅 계약금), 예식 달 5월 23,536,000, 누적 39,236,000
  assert.deepEqual([r.months[0].month, r.months[0].total], ["2026-11", 800000]);
  assert.deepEqual([r.months.at(-1).month, r.months.at(-1).total, r.months.at(-1).cumulative], ["2027-05", 23536000, 39236000]);
  assert.equal(r.before.total, 1000000); // 10월 예식장 계약금
  assert.equal(r.noDate.total, 0); // 잔금 날짜가 빈 항목은 예식일로 잡힌다
});

test("결제 일정: 예시로 채우기는 날짜를 오늘 기준으로 옮겨도 D-day·상태가 같다", () => {
  const e = payExampleFor("2027-03-02");
  assert.equal(e.wedding, "2027-08-22");
  const r = payCalc(e);
  assert.equal(r.weddingDday, 173);
  assert.deepEqual([r.upcoming[0].dday, r.upcoming[0].status, r.contractTotal], [8, "임박", 39236000]);
});

test("결제 일정: 연체·금액 확인·날짜 없음·완료", () => {
  const r = payCalc({ today: "2026-12-10", wedding: "", budget: null, rows: [
    { name: "A", total: 1000000, dep: { amount: 300000, date: "2026-12-01", paid: false }, mid: {}, bal: { date: "2027-01-10", paid: false } },
    { name: "B", total: 500000, dep: { amount: 400000, date: "2026-12-20" }, mid: { amount: 200000, date: "2027-01-01" }, bal: { date: "" } },
    { name: "C", total: 300000, dep: {}, mid: {}, bal: { date: "" } },
    { name: "D", total: 200000, dep: { amount: 200000, date: "2026-11-01", paid: true }, mid: {}, bal: { date: "" } },
  ] });
  assert.deepEqual(r.lines.map((x) => x.status), ["연체", "금액 확인", "날짜 입력", "완료"]);
  assert.equal(r.overdueAmount, 300000);
  assert.equal(r.thisMonthDue, 400000); // B 계약금 12-20 (12-10 ~ 12-31)
  assert.deepEqual(r.amountIssues, ["B"]);
  assert.deepEqual(r.noDateItems, ["C"]);
  assert.equal(r.weddingDday, "");
});

test("결제 일정 입력 오류: 총액 없음, 기준일 없음", () => {
  assert.ok(payCalc({ ...PAY_EXAMPLE, rows: [] }).error);
  assert.ok(payCalc({ ...PAY_EXAMPLE, today: "" }).error);
});
