// 고효율 가전 지원금 엔진 검증 (docs/assets/kepco.js). `npm test`
// 기대값은 손으로 계산했다. 규칙 출처: 한전 고효율 가전 지원사업 사업안내·지원품목·자주묻는질문 (2026-11-22 확인)
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync("docs/assets/kepco.js", "utf8"), ctx, { filename: "kepco.js" });
const K = ctx.KEPCO;
assert.ok(K, "KEPCO 전역이 없음");
const J = (x) => JSON.parse(JSON.stringify(x));

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error("FAIL " + name + "\n  " + e.message); } };

// ── 1. 공식 표와 같은가 ──
t("지원율: 6개 유형 30%, 3개 유형 15%", () => {
  assert.equal(K.TYPES.length, 9);
  assert.equal(K.TYPES.filter((x) => x.rate === 30).length, 6);
  assert.deepEqual(J(K.TYPES.filter((x) => x.rate === 15).map((x) => x.id)), ["multichild", "bigfamily", "birth"]);
});
t("지원품목 표 (등급·적용기준 시행일)", () => {
  const got = Object.fromEntries(K.ITEMS.map((i) => [i.id, `${i.grade}/${K.dot(i.since)}`]));
  assert.deepEqual(J(got), {
    fridge: "1/21.10.01", kimchi: "1/23.05.01", "ac-wall": "1/21.10.01", "ac-other": "3/21.10.01",
    washer: "2/22.11.01", drum: "1/22.11.01", rice: "1/18.04.01", vacuum: "3/19.01.01", purifier: "1/18.01.01",
    tv: "1/22.01.01", dehumid: "1/24.07.01", dryer: "1/20.03.01", dishwasher: "1/25.01.01",
  });
  assert.equal(new Set(K.ITEMS.map((i) => i.label)).size, K.ITEMS.length);
  assert.equal(K.LIMIT, 300000);
});

// ── 2. 대상 여부 ──
t("등급 기준: 드럼 2등급 불가, 일반 세탁기 2등급 가능, 스탠드 에어컨 3등급 가능, 벽걸이 2등급 불가", () => {
  assert.equal(K.eligible("drum", 2, "yes").reason, "grade");
  assert.equal(K.eligible("drum", 2, "yes").need, 1);
  assert.equal(K.eligible("washer", 2, "yes").ok, true);
  assert.equal(K.eligible("ac-other", 3, "yes").ok, true);
  assert.equal(K.eligible("ac-wall", 2, "yes").ok, false);
  assert.equal(K.eligible("vacuum", 4, "yes").ok, false);
});
t("적용기준 시행일: 이전이면 불가, 모르면 가능하되 확인 표시", () => {
  assert.equal(K.eligible("tv", 1, "no").reason, "date");
  const u = K.eligible("tv", 1, "unknown");
  assert.equal(u.ok, true); assert.equal(u.check, "date"); assert.equal(u.since, "2022-01-01");
  assert.equal(K.eligible("tv", 1, "yes").check, null);
});
t("등급 미입력·없는 품목", () => {
  assert.equal(K.eligible("tv", 0, "yes").reason, "grade-missing");
  assert.equal(K.eligible("freezer", 1, "yes").reason, "item");
});

// ── 3. 지원금 계산 ──
t("수급자 30%, 작년 10만 원 받음, 냉장고 150만 원 → 남은 한도 20만 원에서 멈춤", () => {
  const r = K.calc({ typeId: "basic", prior: 100000, rows: [{ item: "fridge", grade: 1, dateOk: "yes", price: 1500000 }] });
  assert.equal(r.rate, 30);
  assert.equal(r.remainingBefore, 200000);
  assert.equal(r.rows[0].raw, 450000); // 150만 × 30%
  assert.equal(r.total, 200000);
  assert.equal(r.rows[0].capped, true);
  assert.equal(r.net, 1300000);
  assert.equal(r.remainingAfter, 0);
  assert.equal(r.limitHit, true);
});
t("다자녀 15%, 세탁기 89만 + TV 120만 → 13.35만 + 16.65만(한도) = 30만 원", () => {
  const r = K.calc({ typeId: "multichild", rows: [
    { item: "washer", grade: 2, dateOk: "yes", price: 890000 },
    { item: "tv", grade: 1, dateOk: "unknown", price: 1200000 },
  ] });
  assert.equal(r.rows[0].support, 133500); // 89만 × 15%
  assert.equal(r.rows[1].raw, 180000); // 120만 × 15%
  assert.equal(r.rows[1].support, 166500); // 30만 − 13.35만
  assert.equal(r.total, 300000);
  assert.equal(r.price, 2090000);
  assert.equal(r.net, 1790000);
});
t("대상이 아닌 제품은 0원이고 한도를 쓰지 않음", () => {
  const r = K.calc({ typeId: "birth", rows: [
    { item: "drum", grade: 2, dateOk: "yes", price: 1000000 },
    { item: "dryer", grade: 1, dateOk: "yes", price: 1000000 },
  ] });
  assert.equal(r.rows[0].support, 0);
  assert.equal(r.rows[1].support, 150000);
  assert.equal(r.remainingAfter, 150000);
});
t("이미 30만 원 넘게 받았으면 0원", () => {
  const r = K.calc({ typeId: "disabled", prior: 300000, rows: [{ item: "tv", grade: 1, dateOk: "yes", price: 2000000 }] });
  assert.equal(r.total, 0); assert.equal(r.remainingBefore, 0); assert.equal(r.limitHit, false);
  assert.equal(K.calc({ typeId: "disabled", prior: 450000, rows: [] }).remainingBefore, 0);
});
t("원 미만 버림", () => {
  const r = K.calc({ typeId: "bigfamily", rows: [{ item: "purifier", grade: 1, dateOk: "yes", price: 1234567 }] });
  assert.equal(r.total, 185185); // 1,234,567 × 15% = 185,185.05
});
t("유형 없음 → 오류", () => {
  assert.equal(K.calc({ typeId: "", rows: [] }).error, "type");
});

// ── 4. 마감까지 남은 날 (한국 시간) ──
t("마감 D-day", () => {
  assert.equal(K.daysLeft(new Date("2026-11-21T15:30:00Z")), 39); // 11-22 00:30 KST
  assert.equal(K.daysLeft(new Date("2026-11-22T14:59:00Z")), 39); // 11-22 23:59 KST
  assert.equal(K.daysLeft(new Date("2026-12-31T03:00:00Z")), 0);
  assert.equal(K.daysLeft(new Date("2027-01-01T03:00:00Z")), -1);
});

// ── 5. 표시 형식 ──
t("만 원 표기", () => {
  assert.equal(K.man(200000), "20만 원");
  assert.equal(K.man(0), "0원");
  assert.equal(K.man(133500), "13.4만 원");
  assert.equal(K.wonStr(1300000), "1,300,000원");
});

console.log(`kepco: ${n}개 통과${failed ? `, ${failed}개 실패` : ""}`);
if (failed) process.exit(1);
