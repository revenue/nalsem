// 2027 설 세뱃돈 계산기(docs/assets/sebaetdon-calc.js) 검증. `npm test`
// 기대값: 토스 미니앱 '설날 세뱃돈 계산기'의 시험(toss-miniapp apps/sebaetdon/src/lib/calc.test.ts·dday.test.ts)과 같은 사례 + 손계산.
import test from "node:test";
import assert from "node:assert/strict";
import { sebaetdon, fitBudget, billsForEnvelope, countBills, budgetMessage, daysUntilSeollal, ddayLabel, KID_AMOUNTS, ADULT_AMOUNTS, AGE_GROUPS, LEVELS, EXAMPLE, clampInputs } from "../docs/assets/sebaetdon-calc.js";

const kids = (k = {}) => ({ preschool: 0, elementaryLow: 0, elementaryHigh: 0, middle: 0, high: 0, college: 0, ...k });
const inp = (o = {}) => ({ kids: kids(o.kids), adults: 0, level: "normal", budget: null, travel: null, gifts: null, ...o, kids: kids(o.kids) });

test("금액표: 토스 앱과 같은 6개 나이대 × 3개 기준, 어른 10·20·30만 원", () => {
  assert.deepEqual(KID_AMOUNTS, {
    preschool: { thrifty: 1, normal: 2, generous: 3 },
    elementaryLow: { thrifty: 2, normal: 3, generous: 5 },
    elementaryHigh: { thrifty: 3, normal: 5, generous: 7 },
    middle: { thrifty: 3, normal: 5, generous: 10 },
    high: { thrifty: 5, normal: 7, generous: 10 },
    college: { thrifty: 5, normal: 10, generous: 20 },
  });
  assert.deepEqual(ADULT_AMOUNTS, { thrifty: 10, normal: 20, generous: 30 });
  for (const { value } of LEVELS) {
    const a = AGE_GROUPS.map((g) => KID_AMOUNTS[g.id][value]);
    for (let i = 1; i < a.length; i++) assert.ok(a[i] >= a[i - 1], `${value}: 나이가 많을수록 같거나 많다`);
  }
});

test("신권: 봉투마다 5만 원권 먼저, 봉투끼리 합치지 않는다", () => {
  assert.deepEqual(billsForEnvelope(7), { fiveMan: 1, oneMan: 2 });
  assert.deepEqual(billsForEnvelope(20), { fiveMan: 4, oneMan: 0 });
  assert.deepEqual(countBills([{ perPerson: 3, count: 2 }]), { fiveMan: 0, oneMan: 6 });
  for (let n = 0; n <= 40; n++) { const b = billsForEnvelope(n); assert.equal(b.fiveMan * 5 + b.oneMan, n); }
});

test("토스 앱 표본: 미취학1·초등저2·중1·대1, 어른 2, 교통 10·선물 15 → 23 + 40 + 25 = 88만 원", () => {
  const r = sebaetdon(inp({ kids: { preschool: 1, elementaryLow: 2, middle: 1, college: 1 }, adults: 2, travel: 10, gifts: 15 }));
  assert.deepEqual(r.rows.map((x) => [x.label, x.perPerson, x.count, x.subtotal]), [["미취학", 2, 1, 2], ["초등 1~3학년", 3, 2, 6], ["중학생", 5, 1, 5], ["대학생·취준생", 10, 1, 10]]);
  assert.equal(r.kidsCount, 5);
  assert.equal(r.kidsTotal, 23);
  assert.equal(r.adultTotal, 40);
  assert.equal(r.grandTotal, 88);
  assert.deepEqual(r.bills, { fiveMan: 11, oneMan: 8 }); // 교통비·선물비는 신권에서 뺀다
  assert.equal(r.budgetPlan, null);
});

test("기준을 바꾸면 다른 열: 알뜰 58, 보통 88, 넉넉 128만 원", () => {
  const base = { kids: { preschool: 1, elementaryLow: 2, middle: 1, college: 1 }, adults: 2, travel: 10, gifts: 15 };
  assert.deepEqual(["thrifty", "normal", "generous"].map((level) => sebaetdon(inp({ ...base, level })).grandTotal), [1 + 4 + 3 + 5 + 20 + 25, 88, 3 + 10 + 10 + 20 + 60 + 25]);
});

test("아이 없이 어른 3분(넉넉) → 90만 원, 5만 원권 18장 / 사람이 없으면 오류", () => {
  const r = sebaetdon(inp({ adults: 3, level: "generous" }));
  assert.equal(r.kidsTotal, 0);
  assert.equal(r.grandTotal, 90);
  assert.deepEqual(r.bills, { fiveMan: 18, oneMan: 0 });
  assert.ok(sebaetdon(inp({})).error);
});

test("예산: 그대로·줄이기·딱 맞음·모자람 (토스 앱 사례)", () => {
  const eq = sebaetdon(inp({ kids: { middle: 1 }, budget: 5 })).budgetPlan;
  assert.equal(eq.status, "within"); assert.equal(budgetMessage(eq), "예산과 딱 맞아요.");
  const under = sebaetdon(inp({ kids: { elementaryHigh: 2 }, budget: 13 })).budgetPlan;
  assert.equal(under.diff, 3); assert.equal(budgetMessage(under), "예산보다 3만 원 적어요.");
  const fit = sebaetdon(inp({ kids: { elementaryHigh: 2, high: 2 }, budget: 12 })).budgetPlan;
  assert.deepEqual(fit.rows.map((x) => [x.perPerson, x.subtotal]), [[2, 4], [3, 6]]);
  assert.equal(budgetMessage(fit), "예산에 맞췄어요. 2만 원 남아요.");
  const exact = sebaetdon(inp({ level: "generous", kids: { middle: 1, college: 1 }, budget: 15 })).budgetPlan;
  assert.deepEqual(exact.rows.map((x) => x.perPerson), [5, 10]); assert.equal(budgetMessage(exact), "예산에 딱 맞췄어요.");
  const short = sebaetdon(inp({ kids: { preschool: 10, elementaryLow: 10 }, budget: 5 })).budgetPlan;
  assert.equal(short.status, "short"); assert.equal(short.diff, -15);
  assert.equal(budgetMessage(short), "1인 최소 1만 원으로 줄여도 예산이 15만 원 모자라요.");
  const mono = fitBudget([{ group: "preschool", perPerson: 5, count: 1, subtotal: 5 }, { group: "college", perPerson: 3, count: 1, subtotal: 3 }], 4);
  assert.deepEqual(mono.rows.map((x) => x.perPerson), [2, 2]);
});

test("페이지 예시: 아이 5명·어른 2분·예산 25 → 111만 원, 예산 안 105만 원 (손계산)", () => {
  const r = sebaetdon(EXAMPLE);
  assert.equal(r.kidsTotal, 29); // 2 + 5×2 + 7 + 10
  assert.equal(r.grandTotal, 111); // 29 + 40 + 12 + 30
  assert.deepEqual(r.bills, { fiveMan: 13, oneMan: 4 });
  const p = r.budgetPlan;
  assert.equal(p.status, "fitted");
  assert.deepEqual(p.rows.map((x) => x.perPerson), [1, 4, 6, 8]); // ⌊2·25/29⌋, ⌊5·25/29⌋, ⌊7·25/29⌋, ⌊10·25/29⌋
  assert.equal(p.kidsTotal, 23);
  assert.equal(p.diff, 2);
  assert.equal(p.grandTotal, 105);
  assert.deepEqual(p.bills, { fiveMan: 10, oneMan: 13 });
});

test("입력 정리: 범위 밖·글자는 범위 안으로, 0은 넣지 않음", () => {
  const c = clampInputs({ kids: { preschool: 99, high: -3, college: "2명" }, adults: 9, level: "x", budget: "0", travel: "12만 원", gifts: 123456 });
  assert.equal(c.kids.preschool, 10); assert.equal(c.kids.high, 0); assert.equal(c.kids.college, 2);
  assert.equal(c.adults, 6); assert.equal(c.level, "normal");
  assert.equal(c.budget, null); assert.equal(c.travel, 12); assert.equal(c.gifts, 9999);
});

test("설날 D-day: 2027-02-07 한국 시각 기준", () => {
  const kst = (y, m, d, h = 12) => Date.UTC(y, m - 1, d, h - 9);
  assert.equal(daysUntilSeollal(kst(2026, 11, 26)), 73);
  assert.equal(ddayLabel(kst(2027, 2, 6)), "2027 설날까지 D-1");
  assert.equal(ddayLabel(kst(2027, 2, 7, 0)), "오늘이 설날이에요"); // 한국 0시(UTC 전날 15시)
  assert.equal(ddayLabel(kst(2027, 2, 8)), "설날이 지났어요");
});
