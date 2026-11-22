// 간이과세자 부가가치세 엔진 검증 (docs/assets/simple-vat.js). `npm test`
// 기대값은 손으로 계산했다(식은 각 테스트 주석). 국세청 사례 2건은 국세청 「사례로 배우는 부가가치세 전자신고 방법」(2024.1, 2023년 귀속,
// https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?nttSn=1330029 ) 의 홈택스 화면 숫자와 대조했다. 당시 전자신고세액공제는 1만 원.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync("docs/assets/simple-vat.js", "utf8"), ctx, { filename: "simple-vat.js" });
const S = ctx.SVAT;
assert.ok(S, "SVAT 전역이 없음");
const J = (x) => JSON.parse(JSON.stringify(x));
const M = 10000; // 만 원

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error("FAIL " + name + "\n  " + e.message); } };

// ── 1. 기준값이 조문과 같은가 ──
t("기준값: 면제 4,800만 미만, 간이 1억400만, 매입 0.5%, 카드 1.3%·1천만, 전자세금계산서 200원·100만, 전자신고 5천 원, 기한 2027-01-25", () => {
  assert.equal(S.YEAR, 2026);
  assert.equal(S.DUE, "2027-01-25");
  assert.equal(S.EXEMPT, 48000000);
  assert.equal(S.SIMPLE_MAX, 104000000);
  assert.equal(S.PURCHASE_PERMILLE, 5);
  assert.deepEqual(J(S.CARD), { permille: 13, cap: 10000000, until: "2026-12-31" });
  assert.deepEqual(J(S.EINV), { per: 200, cap: 1000000 });
  assert.equal(S.EFILE, 5000);
  assert.equal(new Date(S.DUE + "T00:00:00Z").getUTCDay(), 1); // 월요일 → 연장 없음
});
t("업종별 부가가치율 표 (시행령 제111조②)", () => {
  const got = Object.fromEntries(S.INDUSTRIES.map((i) => [i.id, i.rate]));
  assert.deepEqual(J(got), { retail: 15, food: 15, recycle: 15, mfg: 20, agri: 20, parcel: 20, lodging: 25, build: 30, transport: 30, ict: 30, service: 30, rent: 40, pro: 40 });
});
t("영업 개월 수: 2025년 이전 12, 1월 12, 3월 10, 7월 6, 12월 1 (1개월 미만 끝수는 1개월)", () => {
  assert.equal(S.months("before"), 12);
  assert.equal(S.months(1), 12);
  assert.equal(S.months(3), 10);
  assert.equal(S.months("7"), 6);
  assert.equal(S.months(12), 1);
  assert.equal(S.months(13), null);
  assert.equal(S.calc({ open: 0, rows: [] }).error, "open");
  assert.equal(S.calc({ rows: [{ ind: "x", sales: 1 }] }).error, "industry");
});

// ── 2. 국세청 사례 (2023년 귀속, 전자신고세액공제 1만 원) ──
t("국세청 사례: 간이 음식점업 국세식당 → 차감 납부할 세액 280,500원", () => {
  // 매출 공급대가 6,400만(카드 4,000만 + 현금영수증 600만 + 현금 1,800만) × 15% × 10% = 960,000
  // 매입 세금계산서 공급대가 1,320만(1,650+3,300+2,750+5,500천) + 사업용카드 110만 = 1,430만 × 0.5% = 71,500 (면세 축산물 카드 매입·계산서는 제외)
  // 카드·현금영수증 발행 4,600만 × 1.3% = 598,000, 전자신고 10,000 → 공제 679,500
  const r = S.calc({ rows: [{ ind: "food", sales: 64000000 }], purchase: 14300000, card: 46000000 }, { efileAmount: 10000 });
  assert.equal(r.gross, 960000);
  assert.equal(r.cr.purchase, 71500);
  assert.equal(r.cr.card, 598000);
  assert.equal(r.credits, 679500);
  assert.equal(r.exempt, false);
  assert.equal(r.payable, 280500);
});
t("국세청 사례: 간이 소매업 국세상사 → 차감 납부할 세액 182,000원", () => {
  // 매출 6,000만 × 15% × 10% = 900,000. 매입 2,200만 × 0.5% = 110,000. 카드 4,600만 × 1.3% = 598,000. 전자신고 10,000 → 공제 718,000
  const r = S.calc({ rows: [{ ind: "retail", sales: 60000000 }], purchase: 22000000, card: 46000000 }, { efileAmount: 10000 });
  assert.equal(r.gross, 900000);
  assert.equal(r.credits, 718000);
  assert.equal(r.payable, 182000);
});

// ── 3. 손계산 사례 (2026년 귀속, 전자신고 5천 원) ──
t("스마트스토어 3,000만(소매, 1월 개업) → 납부면제 0원, 계산상 세액은 공제로 0원", () => {
  // 30,000,000 × 15% × 10% = 450,000. 매입 2,000만 × 0.5% = 100,000, 카드 2,800만 × 1.3% = 364,000, 전자신고 5,000 → 469,000 > 450,000
  const r = S.calc({ open: 1, rows: [{ ind: "retail", sales: 3000 * M }], purchase: 2000 * M, card: 2800 * M });
  assert.equal(r.sales, 30000000);
  assert.equal(r.exempt, true);
  assert.equal(r.gross, 450000);
  assert.equal(r.credits, 469000);
  assert.equal(r.afterCredits, 0);
  assert.equal(r.lost, 19000);
  assert.equal(r.payable, 0);
});
t("배달 음식점 6,000만(2025년 이전 개업) → 55,000원", () => {
  // 60,000,000 × 15% × 10% = 900,000. 매입 2,500만 → 125,000. 카드 5,500만 → 715,000. 전자신고 5,000. 900,000 − 845,000 = 55,000
  const r = S.calc({ rows: [{ ind: "food", sales: 6000 * M }], purchase: 2500 * M, card: 5500 * M });
  assert.equal(r.exempt, false);
  assert.equal(r.gross, 900000);
  assert.equal(r.cr.purchase, 125000);
  assert.equal(r.cr.card, 715000);
  assert.equal(r.payable, 55000);
});
t("프리랜서형 그 밖의 서비스업 5,000만(30%), 2025년 매출 4,800만 미만 → 1,350,000원", () => {
  // 50,000,000 × 30% × 10% = 1,500,000. 매입 300만 → 15,000. 카드 1,000만 → 130,000. 전자신고 5,000. 1,500,000 − 150,000 = 1,350,000
  const r = S.calc({ rows: [{ ind: "service", sales: 5000 * M }], purchase: 300 * M, card: 1000 * M });
  assert.equal(r.gross, 1500000);
  assert.equal(r.payable, 1350000);
});
t("4,800만 경계: 4,799만 면제, 정확히 4,800만은 면제 아님(미만), 4,801만 면제 아님", () => {
  const a = S.calc({ rows: [{ ind: "retail", sales: 47990000 }] });
  assert.equal(a.exempt, true); assert.equal(a.payable, 0);
  const b = S.calc({ rows: [{ ind: "retail", sales: 48000000 }] });
  assert.equal(b.exempt, false);
  assert.equal(b.gross, 720000); // 48,000,000 × 1.5%
  assert.equal(b.payable, 715000); // − 전자신고 5,000
  const c = S.calc({ rows: [{ ind: "retail", sales: 48010000 }] });
  assert.equal(c.exempt, false);
  assert.equal(c.gross, 720150);
  assert.equal(c.payable, 715150);
  const d = S.calc({ rows: [{ ind: "retail", sales: 47999999 }] });
  assert.equal(d.exempt, true);
});
t("개업 연도 환산: 7월 개업(6개월) 2,500만 → 환산 5,000만이라 면제 아님, 2,390만은 면제, 2,400만(환산 정확히 4,800만)은 면제 아님", () => {
  const a = S.calc({ open: 7, rows: [{ ind: "retail", sales: 2500 * M }] });
  assert.equal(a.months, 6);
  assert.equal(a.annual, 50000000);
  assert.equal(a.exempt, false);
  assert.equal(a.gross, 375000); // 세액은 환산 전 실제 매출로 계산
  assert.equal(a.payable, 370000);
  assert.ok(a.warn.includes("annualized"));
  assert.equal(S.calc({ open: 7, rows: [{ ind: "retail", sales: 2390 * M }] }).exempt, true);
  assert.equal(S.calc({ open: 7, rows: [{ ind: "retail", sales: 2400 * M }] }).exempt, false);
  // 3월 개업(10개월) 4,000만 → 환산 4,800만 → 면제 아님. 3,999만 → 4,798.8만 → 면제
  assert.equal(S.calc({ open: 3, rows: [{ ind: "retail", sales: 4000 * M }] }).exempt, false);
  assert.equal(S.calc({ open: 3, rows: [{ ind: "retail", sales: 3999 * M }] }).exempt, true);
  // 같은 매출을 1년 내내 벌었으면 면제
  assert.equal(S.calc({ open: "before", rows: [{ ind: "retail", sales: 2500 * M }] }).exempt, true);
});
t("카드 발행세액공제 한도 1,000만 원: 1월 개업 음식점 8억(카드 8억) → 1,040만이 1,000만에서 멈춤, 1,995,000원", () => {
  // 신규 사업자는 첫 해에 매출 제한 없이 간이과세자다(법 제61조④). 800,000,000 × 1.5% = 12,000,000
  // 카드 800,000,000 × 1.3% = 10,400,000 → 한도 10,000,000. 전자신고 5,000. 12,000,000 − 10,005,000 = 1,995,000
  const r = S.calc({ open: 1, rows: [{ ind: "food", sales: 800000000 }], card: 800000000 });
  assert.equal(r.cr.cardRaw, 10400000);
  assert.equal(r.cr.card, 10000000);
  assert.equal(r.cr.cardCapped, true);
  assert.equal(r.payable, 1995000);
  assert.equal(r.overSimple, true); // 다음 해 7월부터 일반과세
});
t("공제가 세액보다 크면 0원 (환급 없음): 소매 5,000만, 매입 4,000만, 카드 5,000만", () => {
  // 750,000 − (200,000 + 650,000 + 5,000) < 0 → 0, 넘는 105,000원은 없어짐
  const r = S.calc({ rows: [{ ind: "retail", sales: 5000 * M }], purchase: 4000 * M, card: 5000 * M });
  assert.equal(r.exempt, false);
  assert.equal(r.gross, 750000);
  assert.equal(r.credits, 855000);
  assert.equal(r.payable, 0);
  assert.equal(r.lost, 105000);
});
t("겸영: 소매 3,000만 + 그 밖의 서비스 2,000만 → 업종별 세액 합 1,050,000, 면제 판정은 합계 5,000만", () => {
  const r = S.calc({ rows: [{ ind: "retail", sales: 3000 * M }, { ind: "service", sales: 2000 * M }], efile: false });
  assert.equal(r.lines.length, 2);
  assert.equal(r.gross, 450000 + 600000);
  assert.equal(r.exempt, false);
  assert.equal(r.payable, 1050000);
});
t("7월 예정부과 세액 차감과 더 낸 금액 표시", () => {
  const r = S.calc({ rows: [{ ind: "food", sales: 6000 * M }], purchase: 2500 * M, card: 5500 * M, prepaid: 30000 });
  assert.equal(r.payable, 25000); // 55,000 − 30,000
  const r2 = S.calc({ rows: [{ ind: "food", sales: 6000 * M }], purchase: 2500 * M, card: 5500 * M, prepaid: 80000 });
  assert.equal(r2.payable, 0);
  assert.equal(r2.prepaidOver, 25000);
  const r3 = S.calc({ rows: [{ ind: "retail", sales: 3000 * M }], prepaid: 100000 });
  assert.equal(r3.exempt, true);
  assert.equal(r3.prepaidOver, 100000);
});
t("전자세금계산서 발급세액공제: 건당 200원, 연 100만 원 한도, 영수증 발급 간이과세자(신규·2025년 4,800만 미만)는 제외", () => {
  assert.equal(S.calc({ rows: [{ ind: "retail", sales: 6000 * M }], prevOver: true, einv: 30 }).cr.einv, 6000);
  assert.equal(S.calc({ rows: [{ ind: "retail", sales: 6000 * M }], prevOver: true, einv: 6000 }).cr.einv, 1000000);
  const a = S.calc({ rows: [{ ind: "retail", sales: 6000 * M }], einv: 30 }); // 2025년 4,800만 미만 → 영수증 발급자
  assert.equal(a.cr.einv, 0); assert.ok(a.warn.includes("einv-not-eligible"));
  assert.equal(S.calc({ open: 1, rows: [{ ind: "retail", sales: 6000 * M }], prevOver: true, einv: 30 }).cr.einv, 0); // 2026년 개업은 첫 과세기간
});
t("카드 발행세액공제 업종 요건: 2025년 4,800만 이상 기존 사업자는 소비자 대상 업종만 (법 제46조①1호가)", () => {
  // 정보통신업 6,000만, 카드 3,000만: 영수증 발급자면 390,000원 공제, 2025년 4,800만 이상이면 공제 없음(보수적으로 0)
  assert.equal(S.calc({ rows: [{ ind: "ict", sales: 6000 * M }], card: 3000 * M }).cr.card, 390000);
  const r = S.calc({ rows: [{ ind: "ict", sales: 6000 * M }], card: 3000 * M, prevOver: true });
  assert.equal(r.cr.card, 0); assert.equal(r.cardOk, false); assert.ok(r.warn.includes("card-not-eligible"));
  assert.equal(r.payable, 1800000 - 5000); // 60,000,000 × 3% − 전자신고
  // 음식점은 그대로 공제, 그 밖의 서비스업은 공제하되 확인 안내
  assert.equal(S.calc({ rows: [{ ind: "food", sales: 6000 * M }], card: 5500 * M, prevOver: true }).cr.card, 715000);
  const sv = S.calc({ rows: [{ ind: "service", sales: 6000 * M }], card: 1000 * M, prevOver: true });
  assert.equal(sv.cr.card, 130000); assert.ok(sv.warn.includes("card-check"));
  // 2026년 개업자는 업종과 관계없이 공제 (법 제46조①1호나, 제36조①2호나)
  assert.equal(S.calc({ open: 2, rows: [{ ind: "ict", sales: 6000 * M }], card: 3000 * M, prevOver: true }).cr.card, 390000);
});
t("경고: 4,800만 이상이면 2027-07-01부터 세금계산서 발급 대상, 부동산임대업은 일반과세 전환", () => {
  assert.ok(S.calc({ rows: [{ ind: "food", sales: 6000 * M }] }).warn.includes("invoice-next"));
  assert.ok(S.calc({ rows: [{ ind: "rent", sales: 5000 * M }] }).warn.includes("rent-over"));
  assert.ok(!S.calc({ rows: [{ ind: "food", sales: 3000 * M }] }).warn.includes("invoice-next"));
  assert.ok(!S.calc({ open: 1, rows: [{ ind: "food", sales: 800000000 }] }).warn.includes("invoice-next")); // 1억400만 이상은 over-simple 로 안내
});
t("원 미만 버림과 경고", () => {
  const r = S.calc({ rows: [{ ind: "lodging", sales: 50000033 }], purchase: 999, card: 60000000 });
  assert.equal(r.gross, 1250000); // 50,000,033 × 25 / 1000 = 1,250,000.825
  assert.equal(r.cr.purchase, 4); // 999 × 0.5% = 4.995
  assert.ok(r.warn.includes("card-over-sales"));
  assert.ok(S.calc({ rows: [{ ind: "pro", sales: 1000 * M }] }).warn.includes("excluded-industry"));
  assert.ok(S.calc({ rows: [] }).warn.includes("no-sales"));
});

// ── 4. 기한까지 남은 날 (한국 시간) ──
t("신고 기한 D-day", () => {
  assert.equal(S.daysLeft(new Date("2026-11-22T03:00:00Z")), 64);
  assert.equal(S.daysLeft(new Date("2027-01-24T15:30:00Z")), 0); // 1-25 00:30 KST
  assert.equal(S.daysLeft(new Date("2027-01-25T15:30:00Z")), -1);
});
t("표기", () => {
  assert.equal(S.wonStr(1350000), "1,350,000원");
  assert.equal(S.man(0), "0원");
  assert.equal(S.man(48000000), "4,800만 원");
});

// ── 5. 빌드된 페이지 (npm test 는 빌드 뒤에 실행) ──
t("페이지: 고지 문구·구조화 데이터·사이트맵·홈 연결, 제휴 링크와 대리처럼 보이는 표현 없음", () => {
  const h = readFileSync("docs/simple-vat/index.html", "utf8");
  assert.ok(h.includes("참고용 추정입니다. 최종 세액은 홈택스 신고서 화면에서 확인하세요."), "고지 문구");
  assert.ok(h.includes("세무 상담이나 신고 대리를 하지 않습니다"), "대리 아님 고지");
  assert.ok(h.includes('"@type":"WebApplication"') && h.includes('"@type":"FAQPage"') && h.includes('"@type":"BreadcrumbList"'), "JSON-LD");
  assert.ok(h.includes("/assets/simple-vat.js?v=") && h.includes("/assets/simple-vat-ui.js?v="), "엔진·화면 스크립트");
  for (const bad of ["coupang", "link.coupang", "rel=\"sponsored", "신고해 드립니다", "대신 신고", "절세 전략", "세무 상담을 제공"]) assert.ok(!h.includes(bad), "금지: " + bad);
  assert.ok(readFileSync("docs/sitemap.xml", "utf8").includes("https://nalsem.suik.me/simple-vat/"), "사이트맵");
  assert.ok(readFileSync("docs/llms.txt", "utf8").includes("https://nalsem.suik.me/simple-vat/"), "llms.txt");
  const home = readFileSync("docs/index.html", "utf8");
  assert.ok(home.includes('id="biz"') && home.includes('href="/simple-vat/"'), "홈 사업자 세금 분류");
});

console.log(`simple-vat: ${n}개 통과${failed ? `, ${failed}개 실패` : ""}`);
if (failed) process.exit(1);
