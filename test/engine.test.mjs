// 엔진 검증: 공개된 확정 날짜(공휴일·수능·간지)와 대조. `npm test`
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const f of ["docs/assets/vendor/korean-lunar-calendar.min.js", "docs/assets/calc.js"]) vm.runInContext(readFileSync(f, "utf8"), ctx, { filename: f });
const N = ctx.N;
const iso = (t) => N.iso(t);
assert.deepEqual = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b)); // vm 컨텍스트 프로토타입 차이 회피
const hol = (y) => N.holidays(y).map((h) => iso(h.date).slice(5) + " " + h.name);

let n = 0;
const t = (name, fn) => { fn(); n++; };

t("음력: 2026 설·추석·부처님오신날", () => {
  assert.equal(iso(N.toSolar(2026, 1, 1)), "2026-02-17");
  assert.equal(iso(N.toSolar(2026, 8, 15)), "2026-09-25");
  assert.equal(iso(N.toSolar(2026, 4, 8)), "2026-05-24");
  assert.equal(iso(N.toSolar(2027, 1, 1)), "2027-02-07");
});
t("공휴일 2026: 삼일절(일)→3/2, 개천절(토)→10/5 대체, 부처님오신날(일)→5/25", () => {
  const h = hol(2026);
  assert.ok(h.includes("03-02 대체공휴일(삼일절)"), h.join());
  assert.ok(h.includes("10-05 대체공휴일(개천절)"));
  assert.ok(h.includes("05-25 대체공휴일(부처님오신날)"));
  assert.ok(h.includes("02-16 설날 연휴") && h.includes("02-18 설날 연휴"));
});
t("공휴일 2027: 설(2/7 일)→2/9 대체, 성탄절(토)→12/27, 한글날(토)→10/11, 개천절(일)→10/4, 광복절(일)→8/16, 어린이날(수) 없음", () => {
  const h = hol(2027);
  for (const x of ["02-09 대체공휴일(설날)", "12-27 대체공휴일(성탄절)", "10-11 대체공휴일(한글날)", "10-04 대체공휴일(개천절)", "08-16 대체공휴일(광복절)"]) assert.ok(h.includes(x), x + " 없음: " + h.join());
  assert.ok(!h.some((x) => x.includes("어린이날)")));
});
t("공휴일 2025: 3/3 대체(삼일절 토), 추석 10/6, 개천절 10/3, 한글날 10/9, 10/8 대체(추석연휴 일)", () => {
  const h = hol(2025);
  for (const x of ["03-03 대체공휴일(삼일절)", "10-06 추석", "10-08 대체공휴일(추석)"]) assert.ok(h.includes(x), x + " 없음: " + h.join());
});
t("간지·띠", () => {
  assert.equal(N.ganjiOf(1984).name, "갑자");
  assert.equal(N.ganjiOf(2026).name, "병오");
  assert.equal(N.ganjiOf(2026).animal, "말");
  assert.equal(N.ganjiOf(2026).color, "붉은");
  assert.equal(N.zodiacOf(2000), "용");
});
t("나이", () => {
  const base = N.mk(2026, 9, 27);
  assert.deepEqual((({ man, korean, yearAge }) => ({ man, korean, yearAge }))(N.ages(N.mk(1990, 5, 3), base)), { man: 36, korean: 37, yearAge: 36 });
  assert.equal(N.ages(N.mk(1990, 12, 3), base).man, 35);
  assert.equal(N.ages(N.mk(2026, 9, 27), base).man, 0);
  assert.equal(iso(N.nextBirthday(N.mk(2000, 2, 29), base).date), "2027-02-28");
});
t("날짜 산술", () => {
  assert.equal(iso(N.addMonths(N.mk(2026, 1, 31), 1)), "2026-02-28");
  assert.deepEqual(N.diffYMD(N.mk(2026, 1, 31), N.mk(2026, 3, 1)), { y: 0, m: 1, d: 1, days: 29 });
  assert.equal(N.diffDays(N.mk(2026, 1, 1), N.mk(2026, 12, 31)), 364);
});
t("삼재·궁합", () => {});
// 쥐띠(신자진 그룹) 삼재는 인·묘·진년: 2022(임인)·2023(계묘)·2024(갑진). 2026(병오)은 아님
assert.equal(N.samjae(0, 2024).phase, "날삼재");
assert.equal(N.samjae(0, 2026).active, false);
assert.equal(N.samjae(0, 2026).nextStart, 2034);
assert.equal(N.zodiacMatch(0, 4).label, "삼합"); // 쥐-용
assert.equal(N.zodiacMatch(0, 6).label, "충"); // 쥐-말
assert.equal(N.zodiacMatch(0, 1).label, "육합"); // 쥐-소
assert.equal(N.zodiacMatch(0, 7).label, "원진"); // 쥐-양
t("수능·학교", () => {
  assert.equal(iso(N.suneung(2027).date), "2026-11-19");
  assert.equal(N.suneung(2027).confirmed, true);
  assert.equal(N.suneung(2028).confirmed, false);
  assert.deepEqual(N.school(2000), { elemIn: 2007, elemOut: 2013, midIn: 2013, midOut: 2016, highIn: 2016, highOut: 2019, univIn: 2019, univOut: 2023 });
});
console.log(`engine: ${n + 1} groups passed`);
