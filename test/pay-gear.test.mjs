// 급여 계산기 4종의 제휴 묶음(src/calculators/pay-gear.mjs) 점검. `npm test` (빌드 뒤 docs/ 를 읽는다)
// 지킬 것: 대가 문구가 묶음 맨 위, 모든 제휴 링크 rel="sponsored", 가격 저장 없음, 페이지당 묶음 1곳, 급여대장 판매 링크가 묶음보다 위.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAY_GEAR, GEAR_DISCLOSURE, gearCard } from "../src/calculators/pay-gear.mjs";

test("상품 5개, 링크는 쿠팡 단축 링크나 링크프라이스 단축 링크, 가격 없음", () => {
  assert.equal(PAY_GEAR.length, 5);
  for (const p of PAY_GEAR) {
    assert.match(p.url, p.net === "coupang" ? /^https:\/\/link\.coupang\.com\/a\/\w+$/ : /^https:\/\/app\.ac\/\w+$/);
    assert.ok(!/\d[\d,]*원/.test(p.name + p.note), `${p.id}: 가격이 들어 있음`);
    assert.ok(!("price" in p));
  }
});

test("묶음: 대가 문구가 제목 바로 다음, 모든 링크 sponsored·nofollow", () => {
  const h = gearCard();
  const disc = h.indexOf(GEAR_DISCLOSURE), firstLink = h.indexOf("<a ");
  assert.ok(disc > 0 && disc < firstLink, "대가 문구가 첫 링크보다 앞이어야 함");
  assert.ok(GEAR_DISCLOSURE.includes("쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다"));
  const links = h.match(/<a [^>]+>/g);
  assert.equal(links.length, 5);
  for (const a of links) assert.ok(a.includes('rel="sponsored nofollow noopener"') && a.includes("data-aff-link"), a);
  assert.ok(!/position:\s*(fixed|sticky)/.test(h), "플로팅 금지");
  assert.ok(!/과태료|상담|무료 진단/.test(h), "과장·상담 알선 문구 금지");
});

for (const slug of ["alba-pay", "juhyu-pay", "insurance", "severance", "annual-leave"]) {
  test(`${slug}: 묶음 1곳, 급여대장 판매 카드 아래`, () => {
    const h = readFileSync(new URL(`../docs/${slug}/index.html`, import.meta.url), "utf8");
    assert.equal(h.split('id="pay-gear"').length - 1, 1);
    const promo = h.indexOf('data-placement="promo"'), gear = h.indexOf('id="pay-gear"');
    assert.ok(promo > 0 && promo < gear, "급여대장 판매 링크가 제휴 묶음보다 위");
  });
}
