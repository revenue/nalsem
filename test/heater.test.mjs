// 난방기 전기요금 엔진 검증 (docs/assets/heater.js). `npm test`
// 기대값은 손으로 계산했다. 요금 출처: 한전ON 주택용(저압) 요금표(2024-01-01 적용), 일반사항(부가세 10%·기금 2.7%), 2026-11-26 확인
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync("docs/assets/heater.js", "utf8"), ctx, { filename: "heater.js" });
const H = ctx.HEATER;
assert.ok(H, "HEATER 전역이 없음");

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error("FAIL " + name + "\n  " + e.message); } };
const pick = (b) => [b.base, b.energy, b.climate, b.fuel, b.charge, b.vat, b.fund, b.total];

// ── 1. 공식 예시와 요금표 ──
t("한전ON 예시: 250kWh 기본요금 1,600원·전력량요금 34,730원", () => {
  const b = H.bill(250, 12);
  assert.equal(b.base, 1600);
  assert.equal(b.energy, 34730);
});
t("250kWh 12월 청구금액", () => assert.deepEqual(pick(H.bill(250, 12)), [1600, 34730, 2250, 1250, 39830, 3983, 1070, 44880]));
t("0kWh는 기본요금 910원만", () => assert.deepEqual(pick(H.bill(0, 12)), [910, 0, 0, 0, 910, 91, 20, 1020]));
t("200kWh는 1구간(기타계절)", () => {
  const b = H.bill(200, 1);
  assert.equal(b.tier, 1);
  assert.deepEqual(pick(b), [910, 24000, 1800, 1000, 27710, 2771, 740, 31220]);
});
t("201kWh부터 2구간, 401kWh부터 3구간", () => {
  assert.equal(H.bill(201, 12).tier, 2);
  assert.equal(H.bill(400, 12).tier, 2);
  assert.equal(H.bill(401, 12).tier, 3);
});
t("450kWh 12월 (3구간, 부가세 반올림)", () => assert.deepEqual(pick(H.bill(450, 12)), [7300, 82285, 4050, 2250, 95885, 9589, 2580, 108050]));
t("하계(8월)는 300kWh까지 1구간", () => {
  const b = H.bill(300, 8);
  assert.equal(b.tier, 1);
  assert.deepEqual(pick(b), [910, 36000, 2700, 1500, 41110, 4111, 1100, 46320]);
});
t("동계 슈퍼유저: 1월 1,100kWh는 1,000kWh 초과분 736.2원", () => {
  const b = H.bill(1100, 1);
  assert.equal(b.superKwh, 100);
  assert.deepEqual(pick(b), [7300, 324920, 9900, 5500, 347620, 34762, 9380, 391760]);
});
t("11월은 슈퍼유저 대상 달이 아님", () => {
  const b = H.bill(1100, 11);
  assert.equal(b.superKwh, 0);
  assert.equal(b.total, 343420);
});

// ── 2. 기기 사용량 ──
t("300W × 8시간 × 30일 = 72kWh", () => assert.equal(H.kwhOf({ w: 300, hours: 8, days: 30 }), 72));
t("켜져 있는 비율 50%면 절반", () => assert.equal(H.kwhOf({ w: 1500, hours: 3, days: 30, duty: 50 }), 67.5));
t("하루 24시간·31일을 넘는 입력은 잘라 냄", () => assert.equal(H.kwhOf({ w: 100, hours: 30, days: 40 }), 74.4));

// ── 3. 늘어나는 요금 ──
t("평소 250kWh + 전기장판 72kWh (12월)", () => {
  const r = H.calc({ month: 12, usual: 250, rows: [{ kind: "mat", w: 300, hours: 8, days: 30 }] });
  assert.equal(r.added, 72);
  assert.equal(r.before.total, 44880);
  assert.equal(r.after.total, 63420);
  assert.equal(r.diff, 18540);
  assert.equal(r.tierUp, false);
  assert.equal(r.rows[0].won, 18540);
});
t("평소 350kWh + 100kWh면 3구간으로 올라감", () => {
  const r = H.calc({ month: 12, usual: 350, rows: [{ kind: "heater", w: 1000, hours: 100 / 30, days: 30 }] });
  assert.equal(r.added, 100);
  assert.equal(r.before.total, 70640);
  assert.equal(r.after.total, 108050);
  assert.equal(r.tierUp, true);
});
t("기기별 몫의 합은 늘어난 요금과 같다", () => {
  const r = H.calc({ month: 1, usual: 280, rows: [{ kind: "mat", w: 300, hours: 8, days: 30 }, { kind: "heater", w: 1500, hours: 2, days: 20 }, { kind: "hum-sonic", w: 30, hours: 10, days: 30 }] });
  assert.equal(r.rows.reduce((s, x) => s + x.won, 0), r.diff);
});
t("사용량 0인 줄은 빠진다", () => {
  const r = H.calc({ month: 12, usual: 200, rows: [{ kind: "etc", w: 0, hours: 5, days: 30 }] });
  assert.equal(r.rows.length, 0);
  assert.equal(r.diff, 0);
});
t("1kWh 더 쓸 때 드는 돈: 2구간이면 약 258원", () => assert.equal(H.marginal(300, 12), 258));
t("1kWh 더 쓸 때 드는 돈: 구간 경계 근처(382kWh)도 지금 구간 단가", () => assert.equal(H.marginal(382, 12), 258));
t("1kWh 더 쓸 때 드는 돈: 1구간 151원, 3구간 362원, 동계 1,000kWh 초과 845원", () => {
  assert.equal(H.marginal(100, 12), 151);
  assert.equal(H.marginal(450, 12), 362);
  assert.equal(H.marginal(1200, 1), 845);
});

console.log(`heater: ${n}개 통과${failed ? `, ${failed}개 실패` : ""}`);
if (failed) process.exit(1);
