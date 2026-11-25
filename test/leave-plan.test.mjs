// 연차 황금연휴 계산기 엔진 검증 (docs/assets/leave-plan.js). `npm test` (빌드 뒤)
// 2027년 숫자는 언론 보도(월력요항 기준: 쉬는 날 119일, 추석 연차 2일로 9일, 개천절~한글날 연차 4일로 10일)와 같아야 한다.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { COMBOS_2027, HOL_2027, TRAVEL_PICKS } from "../src/calculators/holiday-leave.mjs";

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
for (const f of ["docs/assets/vendor/korean-lunar-calendar.min.js", "docs/assets/calc.js", "docs/assets/leave-plan.js"]) vm.runInContext(readFileSync(f, "utf8"), ctx, { filename: f });
const { N, LP } = ctx;
let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error("FAIL " + name + "\n  " + e.message); } };
const iso = (d) => N.iso(d);

t("2027 쉬는 날 119일, 평일 공휴일 15일", () => {
  const s = LP.yearStats(2027);
  assert.equal(s.offDays, 119); assert.equal(s.weekdayHolidays, 15);
});
t("2027 추석: 연차 2일(9/13, 9/17)로 9/11~9/19 9일", () => {
  const w = LP.windows(2027, 2).find((x) => iso(x.start) === "2027-09-11" && iso(x.end) === "2027-09-19");
  assert.ok(w); assert.equal(w.total, 9); assert.equal(w.leave, 2);
  assert.equal(w.leaveDays.map(iso).join(), "2027-09-13,2027-09-17");
});
t("2027 개천절~한글날: 연차 4일로 10/2~10/11 10일이 연차 4일 이하 최장", () => {
  const w = LP.longest(2027, 4);
  assert.equal(iso(w.start), "2027-10-02"); assert.equal(iso(w.end), "2027-10-11"); assert.equal(w.total, 10);
});
t("설명 카드의 2027 꿀조합 표가 엔진 결과와 같다", () => {
  const ws = LP.windows(2027, 4);
  for (const row of COMBOS_2027) {
    const [s, e, leave, total] = row[4];
    const w = ws.find((x) => iso(x.start) === s && iso(x.end) === e);
    assert.ok(w, row[0] + " " + s + "~" + e + " 구간 없음");
    assert.equal(w.leave, leave, row[0] + " 연차"); assert.equal(w.total, total, row[0] + " 일수");
  }
});
t("설명 카드의 2027 공휴일 표가 N.holidays(2027)과 같다(24일)", () => {
  const hs = N.holidays(2027);
  assert.equal(hs.length, 24);
  const names = HOL_2027.map(([, nm]) => nm);
  for (const h of hs) assert.ok(names.some((nm) => nm.includes(h.name.replace(" 연휴", ""))), h.name + " 표에 없음");
});
t("추천 조합: 연차 예산을 넘지 않고 구간이 겹치지 않는다(2026~2028, 1~15일)", () => {
  for (const y of [2026, 2027, 2028]) for (let b = 1; b <= 15; b++) {
    const p = LP.plan(y, b);
    assert.ok(p.used <= b, `${y} ${b}`);
    for (let i = 1; i < p.chosen.length; i++) assert.ok(p.chosen[i - 1].end < p.chosen[i].start, `${y} ${b} 겹침`);
    if (b > 1) assert.ok(p.total >= LP.plan(y, b - 1).total, `${y} ${b} 단조`);
  }
});
t("2027 연차 5일 추천 = 설 9일 + 노동절 5일 + 추석 6일 = 20일", () => {
  const p = LP.plan(2027, 5);
  assert.equal(p.total, 20); assert.equal(p.used, 5);
});
t("빌드된 페이지: 대가 문구가 첫 쿠팡 링크보다 먼저, 링크 sponsored, 사이트맵", () => {
  const h = readFileSync("docs/holiday-leave/index.html", "utf8");
  const disc = "쿠팡 파트너스 활동의 일환으로, 구매가 일어나면 날셈이 일정액의 수수료를 받습니다";
  const first = h.indexOf("link.coupang.com");
  assert.ok(first > 0 && h.indexOf(disc) > 0 && h.indexOf(disc) < first);
  const links = h.match(/<a [^>]*href="https:\/\/link\.coupang\.com[^>]*>/g) || [];
  assert.equal(links.length, TRAVEL_PICKS.reduce((s, g) => s + g.items.length, 0));
  assert.ok(links.every((a) => a.includes('rel="sponsored nofollow noopener"')));
  assert.ok(h.includes("/assets/leave-plan.js?v=") && h.includes("/assets/leave-plan-ui.js?v="));
  assert.ok(readFileSync("docs/sitemap.xml", "utf8").includes("https://nalsem.suik.me/holiday-leave/"));
});

console.log(`leave plan: ${n} passed, ${failed} failed`);
if (failed) process.exit(1);
