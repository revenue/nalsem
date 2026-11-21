// 연말정산 엔진 검증 (docs/assets/tax.js). `npm test`
// 기대값은 손으로 계산했다. 계산 과정은 각 테스트 옆 주석. 세법 출처는 ventures/nalsem-dual-income/tax-rules.md (본부 저장소)
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync("docs/assets/tax.js", "utf8"), ctx, { filename: "tax.js" });
const T = ctx.TAX;
assert.ok(T, "TAX 전역이 없음");
const J = (x) => JSON.parse(JSON.stringify(x)); // vm 컨텍스트 객체 비교용

let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { failed++; console.error("FAIL " + name + "\n  " + e.message); } };

// ── 1. 근로소득공제 (소득세법 제47조) ──
t("근로소득공제 구간 경계", () => {
  assert.equal(T.earnedIncomeDeduction(5_000_000), 3_500_000); // 70%
  assert.equal(T.earnedIncomeDeduction(15_000_000), 7_500_000); // 350만 + 1천만×40%
  assert.equal(T.earnedIncomeDeduction(45_000_000), 12_000_000); // 750만 + 3천만×15%
  assert.equal(T.earnedIncomeDeduction(50_000_000), 12_250_000); // 1,200만 + 500만×5%
  assert.equal(T.earnedIncomeDeduction(100_000_000), 14_750_000);
  assert.equal(T.earnedIncomeDeduction(300_000_000), 18_750_000); // 1,475만 + 2억×2%
  assert.equal(T.earnedIncomeDeduction(400_000_000), 20_000_000); // 한도 2천만
  assert.equal(T.earnedIncomeDeduction(0), 0);
});

// ── 2. 기본세율 (소득세법 제55조) ──
t("기본세율 구간 경계", () => {
  assert.equal(T.basicTax(0), 0);
  assert.equal(T.basicTax(14_000_000), 840_000);
  assert.equal(T.basicTax(30_000_000), 3_240_000); // 84만 + 1,600만×15%
  assert.equal(T.basicTax(50_000_000), 6_240_000);
  assert.equal(T.basicTax(88_000_000), 15_360_000);
  assert.equal(T.basicTax(150_000_000), 37_060_000);
  assert.equal(T.basicTax(300_000_000), 94_060_000);
  assert.equal(T.basicTax(500_000_000), 174_060_000);
  assert.equal(T.basicTax(1_000_000_000), 384_060_000);
});

// ── 3. 근로소득세액공제와 한도 (소득세법 제59조) ──
t("근로소득세액공제", () => {
  assert.equal(T.earnedIncomeCredit(1_000_000, 30_000_000), 550_000); // 55%
  assert.equal(T.earnedIncomeCredit(2_000_000, 33_000_000), 740_000); // 71.5만+21만=92.5만 → 한도 74만
  assert.equal(T.earnedIncomeCredit(3_000_000, 50_000_000), 660_000); // 한도 max(74만-1,700만×0.008, 66만)=66만
  assert.equal(T.earnedIncomeCredit(3_000_000, 40_000_000), 684_000); // 한도 74만-700만×0.008=68.4만
  assert.equal(T.earnedIncomeCredit(5_000_000, 80_000_000), 500_000); // 한도 50만
  assert.equal(T.earnedIncomeCredit(30_000_000, 120_000_000), 500_000); // 1.2억 이하 구간 하한 50만
  assert.equal(T.earnedIncomeCredit(30_000_000, 120_100_000), 450_000); // 50만-(10만×1/2)=45만
  assert.equal(T.earnedIncomeCredit(30_000_000, 200_000_000), 200_000); // 하한 20만
});

// ── 4. 자녀·출산 세액공제 (소득세법 제59조의2) ──
t("자녀세액공제·출산입양", () => {
  assert.equal(T.childCredit(0), 0);
  assert.equal(T.childCredit(1), 250_000);
  assert.equal(T.childCredit(2), 550_000);
  assert.equal(T.childCredit(3), 950_000);
  assert.equal(T.childCredit(4), 1_350_000);
  assert.equal(T.birthCredit([1]), 300_000);
  assert.equal(T.birthCredit([2, 3]), 1_200_000);
});

// ── 5. 신용카드 등 소득공제 (조세특례제한법 제126조의2) ──
t("카드: 25% 문턱은 신용카드분부터 뺀다", () => {
  // 총급여 4천만 → 문턱 1천만. 신용 1,500만(초과 500만×15%=75만) + 체크 500만×30%=150만 + 전통시장 100만×40%=40만 = 265만
  assert.equal(T.cardDeduction(40_000_000, { credit: 15_000_000, debit: 5_000_000, market: 1_000_000 }, 0).amount, 2_650_000);
  // 신용 800만은 전부 문턱에 들어가고, 남은 200만을 체크에서 뺀다 → 체크 300만×30% = 90만
  assert.equal(T.cardDeduction(40_000_000, { credit: 8_000_000, debit: 5_000_000, market: 0 }, 0).amount, 900_000);
  // 문턱 미만이면 0원
  assert.equal(T.cardDeduction(40_000_000, { credit: 9_000_000, debit: 0, market: 0 }, 0).amount, 0);
});
t("카드: 기본한도와 전통시장·대중교통 추가한도", () => {
  // 신용 2천만(1천만 초과×15%=150만) + 체크 1천만×30%=300만 + 시장 300만×40%=120만 = 570만
  // 기본한도 300만 초과분 270만 중 시장분 120만까지 추가 → 420만
  const r = T.cardDeduction(40_000_000, { credit: 20_000_000, debit: 10_000_000, market: 3_000_000 }, 0);
  assert.equal(r.raw, 5_700_000);
  assert.equal(r.amount, 4_200_000);
});

// ── 국세청 「2025년 연말정산 신고안내」(2025.12) 계산 사례와 대조 ──
t("국세청 사례: 근로소득공제(인쇄 p.95), 근로소득세액공제(p.162)", () => {
  assert.equal(T.earnedIncomeDeduction(33_800_000), 10_320_000);
  assert.equal(T.earnedIncomeCredit(900_000, 30_000_000), 495_000);
  assert.equal(T.earnedIncomeCredit(2_000_000, 60_000_000), 660_000);
});
t("국세청 사례1 신용카드(p.137~138): 총급여 6,800만 → 530만", () => {
  // 신용 3,200만(대중교통 200 포함) / 현금영수증 800만(전통시장 300 포함) / 체크 300만(문화체육 100 포함)
  const r = T.cardDeduction(68_000_000, { credit: 30_000_000, debit: 7_000_000, culture: 1_000_000, market: 5_000_000 }, 0);
  assert.equal(r.raw, 6_350_000);
  assert.equal(r.amount, 5_300_000);
});
t("국세청 종합사례(p.212~219): 카드 489.5만, 과세표준 36,285,000 → 산출 4,182,750, 근로소득세액공제 66만", () => {
  // 2025년 귀속 사례라 자녀 수 한도 상향 없이(kids 0) 대조
  const r = T.cardDeduction(65_400_000, { credit: 13_000_000, debit: 12_000_000, culture: 1_000_000, market: 5_000_000 }, 0);
  assert.equal(r.raw, 4_895_000);
  assert.equal(r.amount, 4_895_000);
  assert.equal(T.basicTax(36_285_000), 4_182_750);
  assert.equal(T.earnedIncomeCredit(4_182_750, 65_400_000), 660_000);
});
t("국세청 의료비 사례(p.177): 난임 제외 부분 103.5만 (+난임 30만 = 133.5만)", () => {
  // 그 외 부양가족 (550-300-100-100)+80+200 = 330만, 65세 이상·장애인 450만, 3% = 90만
  assert.equal(T.medicalCredit(30_000_000, { general: 3_300_000, special: 4_500_000 }), 1_035_000);
});
t("국세청 보험료 사례(p.172): 110만 → 12만", () => {
  assert.equal(T.personTax({ salary: 50_000_000, insurance: 1_100_000 }).credits.insurance, 120_000);
});
t("2026년 카드 기본한도: 자녀등 수에 따라 상향(조특법 제126조의2 ⑩)", () => {
  const big = { credit: 40_000_000 };
  assert.equal(T.cardDeduction(40_000_000, big, 0).amount, 3_000_000);
  assert.equal(T.cardDeduction(40_000_000, big, 1).amount, 3_500_000);
  assert.equal(T.cardDeduction(40_000_000, big, 3).amount, 4_000_000);
  assert.equal(T.cardDeduction(80_000_000, { credit: 60_000_000 }, 1).amount, 2_750_000);
});
t("2017년생 자녀: 문언 해석으로 계산하고 경고", () => {
  const r = T.optimize({ spouses: [{ salary: 60_000_000 }, { salary: 50_000_000 }], deps: [{ rel: "child", birthYear: 2017 }] });
  assert.ok(r.warnings.some((w) => /2017년생/.test(w)));
  assert.ok(r.usedUnverified.includes("kid2017"));
});

// ── 6. 의료비 세액공제 (소득세법 제59조의4 ②) ──
t("의료비: 3% 문턱은 일반 의료비부터, 700만 한도", () => {
  assert.equal(T.medicalCredit(40_000_000, { general: 2_000_000, special: 0 }), 120_000); // (200만-120만)×15%
  assert.equal(T.medicalCredit(40_000_000, { general: 500_000, special: 3_000_000 }), 345_000); // 300만-(120만-50만)=230만×15%
  assert.equal(T.medicalCredit(40_000_000, { general: 10_000_000, special: 0 }), 1_050_000); // 한도 700만×15%
  assert.equal(T.medicalCredit(40_000_000, { general: 1_000_000, special: 100_000 }), 0);
});

// ── 7. 사람 한 명 전체 계산 (손계산) ──
t("총급여 5천만, 부양가족 없음", () => {
  // 근로소득금액 3,775만. 4대보험 추정: 연금 4.75%=237.5만, 건강 3.595%=179.75만, 장기요양 179.75만×13.14%=23.6191만, 고용 0.9%=45만
  // 과세표준 3,775만-150만-237.5만-248.3691만 = 3,139.1309만 → 산출 84만+(1,739.1309만×15%)=344.8696만
  // 근로소득세액공제 66만 → 결정세액 278.8696만 (표준세액공제 쪽은 303.125만이라 특별공제 쪽 선택)
  const r = T.personTax({ salary: 50_000_000 });
  assert.equal(r.wageIncome, 37_750_000);
  assert.equal(r.calc, 3_448_696);
  assert.equal(r.decided, 2_788_696);
  assert.equal(r.local, 278_869);
  assert.equal(r.regime, "itemized");
});
t("총급여 0원·300만 원이면 세금 0원, 오류 없음", () => {
  for (const s of [0, 3_000_000]) { const r = T.personTax({ salary: s }); assert.equal(r.decided, 0); assert.ok(r.base >= 0); }
});

// ── 8. 배분 추천 (전수 계산) ──
const sp = (salary, extra = {}) => ({ salary, ...extra });
const child = (birthYear, extra = {}) => ({ rel: "child", birthYear, ...extra });

t("가구1 소득 차이 큰 부부: 10살 자녀는 고소득 쪽", () => {
  // 나 9천만(24% 구간) / 배우자 2,500만(결정세액 약 33만). 자녀를 배우자에게 올리면 자녀세액공제 25만이 결정세액에 걸려 일부 낭비
  const r = T.optimize({ spouses: [sp(90_000_000), sp(25_000_000)], deps: [child(2016)] });
  assert.equal(r.best.assign[0], 0);
  assert.ok(r.diffVsWorst > 200_000, "차이 " + r.diffVsWorst);
});
t("가구2 비슷한 부부: 맞바꾸면 대칭, 추천은 전수 최소", () => {
  const h = { spouses: [sp(50_000_000), sp(50_000_000)], deps: [child(2016), { rel: "parent", birthYear: 1955 }] };
  const r = T.optimize(h);
  for (const c of r.candidates) assert.ok(r.best.total <= c.total);
  const sw = T.optimize({ spouses: [h.spouses[1], h.spouses[0]], deps: h.deps });
  assert.equal(sw.best.total, r.best.total);
});
t("가구3 한쪽 결정세액 0원 근처: 12월 카드는 오히려 고소득 쪽 (통설과 반대)", () => {
  // 나 6천만, 1~11월 신용 1,200만(문턱 1,500만 미달). 배우자 1천만, 신용 500만(문턱 250만 초과), 결정세액 약 4.5만
  // 12월 500만: 나에게 쓰면 200만 초과×15%=30만 공제×15%≈4.5만 절감, 배우자에게 쓰면 결정세액이 거의 바닥이라 약 2만
  const r = T.optimize({ spouses: [sp(60_000_000, { card: { credit: 12_000_000 } }), sp(10_000_000, { card: { credit: 5_000_000 } })], deps: [], december: { amount: 5_000_000, kind: "credit" } });
  assert.equal(r.best.decRatio, 10);
  assert.ok(r.best.persons[1].decided >= 0);
});
t("가구3b zero-tax spouse: 자녀는 세금이 남은 쪽", () => {
  const r = T.optimize({ spouses: [sp(60_000_000), sp(14_000_000)], deps: [child(2016)] });
  assert.equal(r.best.assign[0], 0);
});
t("가구4 의료비 큰 가구: 배우자 본인 수술비 800만 예정은 나가 결제", () => {
  // 배우자 3천만은 결정세액 약 50만이 전부라 본인이 내면 공제(106.5만)가 다 쓰이지 못함. 나(7천만)가 내면 590만×15%=88.5만 전부 사용
  const r = T.optimize({ spouses: [sp(70_000_000), sp(30_000_000)], deps: [], plannedMedicalCouple: [0, 8_000_000] });
  const j = r.planned.findIndex((x) => x.who === "spouse" && x.k === 1); // plannedPayer 는 planned 목록 순서
  assert.equal(r.best.plannedPayer[j], 0);
  // 반대(배우자 본인 결제)일 때 배우자 결정세액은 0원이고 공제가 남아 사라진다
  const alt = r.candidates.find((c) => c.plannedPayer[j] === 1 && c.total === Math.min(...r.candidates.filter((x) => x.plannedPayer[j] === 1).map((x) => x.total)));
  assert.equal(alt.persons[1].decided, 0);
});
t("가구5 카드 문턱 근처: 12월 200만은 이미 문턱을 넘은 쪽", () => {
  // 둘 다 5천만(문턱 1,250만). 나 1,200만, 배우자 2천만. 나에게 쓰면 150만만 공제 대상, 배우자는 200만 전부
  const r = T.optimize({ spouses: [sp(50_000_000, { card: { credit: 12_000_000 } }), sp(50_000_000, { card: { credit: 20_000_000 } })], deps: [], december: { amount: 2_000_000, kind: "credit" } });
  assert.equal(r.best.decRatio, 0);
});
t("이미 낸 돈은 낸 사람에게 고정 (paid medical stays with payer)", () => {
  // 5살 자녀 의료비 300만을 이미 나가 냄. 둘 다 15% 구간. 자녀를 배우자에게 올리면 내가 낸 의료비를 아무도 공제 못 함(규칙 확인 결과에 따름)
  const h = { spouses: [sp(40_000_000), sp(60_000_000)], deps: [child(2021, { medical: { paid: [3_000_000, 0] } })] };
  const before = JSON.stringify(h);
  const r = T.optimize(h);
  assert.equal(JSON.stringify(h), before, "입력이 바뀌었다");
  for (const c of r.candidates) {
    // 어떤 배분에서도 배우자(1)의 의료비에 내가 낸 300만이 들어가지 않는다
    assert.equal(c.persons[1].medicalBase.general + c.persons[1].medicalBase.special, 0);
  }
  assert.equal(r.best.assign[0], 0);
  assert.ok(!r.reasons.some((x) => /옮기|명의로 바꾸|대신 공제/.test(x.text)));
});
t("카드 사용액도 낸 사람에게 고정", () => {
  const r = T.optimize({ spouses: [sp(50_000_000, { card: { credit: 20_000_000 } }), sp(50_000_000, { card: { credit: 1_000_000 } })], deps: [] });
  for (const c of r.candidates) { assert.equal(c.persons[0].cardUse.credit, 20_000_000); assert.equal(c.persons[1].cardUse.credit, 1_000_000); }
});
t("부양가족 없음: 카드 추천만", () => {
  const r = T.optimize({ spouses: [sp(50_000_000), sp(40_000_000)], deps: [], december: { amount: 1_000_000, kind: "debit" } });
  assert.deepEqual(J(r.best.assign), []);
  assert.ok(r.reasons.every((x) => x.kind === "card"));
});
t("나이 요건 밖 가족은 인적공제 배정 제외 + 안내", () => {
  const r = T.optimize({ spouses: [sp(50_000_000), sp(40_000_000)], deps: [{ rel: "parent", birthYear: 1970 }, child(2003)] });
  assert.equal(r.best.persons[0].personal + r.best.persons[1].personal, 3_000_000); // 본인 둘만
  assert.ok(r.warnings.some((w) => /나이/.test(w)));
});
t("나이 계산: 2026년 귀속 기준 출생연도", () => {
  assert.equal(T.depFlags({ rel: "child", birthYear: 2006 }).basic, true); // 20세
  assert.equal(T.depFlags({ rel: "child", birthYear: 2005 }).basic, false);
  assert.equal(T.depFlags({ rel: "child", birthYear: 2005, disabled: true }).basic, true);
  assert.equal(T.depFlags({ rel: "parent", birthYear: 1966 }).basic, true); // 60세
  assert.equal(T.depFlags({ rel: "parent", birthYear: 1956 }).elderly, true); // 70세
  // 자녀세액공제 2026년 9세 이상(소득세법 부칙 제21548호 제2조②1), 2017년생은 같은 조 ③ 문언상 제외
  assert.equal(T.depFlags({ rel: "child", birthYear: 2016 }).kidCredit, true);
  assert.equal(T.depFlags({ rel: "child", birthYear: 2017 }).kidCredit, false);
  assert.equal(T.depFlags({ rel: "child", birthYear: 2017 }, { kid2017: true }).kidCredit, true);
  assert.equal(T.depFlags({ rel: "child", birthYear: 2018 }).kidCredit, false);
  assert.equal(T.depFlags({ rel: "child", birthYear: 2020 }).under6, true);
  assert.equal(T.depFlags({ rel: "child", birthYear: 2019 }).under6, true); // 2026.1.1 현재 6세
  assert.equal(T.depFlags({ rel: "child", birthYear: 2018 }).under6, false);
  assert.equal(T.depFlags({ rel: "parent", birthYear: 1961 }).senior65, true);
});

// ── 설명 카드 예시 (src/calculators/tax.mjs EXAMPLE) 의 숫자가 엔진 결과와 맞는지 ──
const manR = (won) => Math.round(won / 10_000);
const gainOf = (r, kind, i = 0) => manR(r.reasons.filter((x) => x.kind === kind)[i].gain);
t("설명 카드 예시: 연봉 차이 큰 부부(대표 페이지)", () => {
  const r = T.optimize({ spouses: [sp(90_000_000, { card: { credit: 16_000_000 } }), sp(35_000_000, { card: { credit: 12_000_000 } })], deps: [child(2016), { rel: "parent", birthYear: 1958 }], december: { amount: 3_000_000, kind: "credit" } });
  assert.deepEqual(J(r.best.assign), [0, 0]); assert.equal(r.best.decRatio, 0);
  assert.equal(manR(r.diffVsWorst), 47); assert.equal(manR(r.diffVsAllHigh), 7);
  assert.equal(gainOf(r, "dep", 0), 15); assert.equal(gainOf(r, "dep", 1), 15); assert.equal(gainOf(r, "card"), 7);
  assert.equal(Math.round(r.best.persons[0].base / 1_000_000), 63); assert.equal(Math.round(r.best.persons[1].base / 100_000), 187);
});
t("설명 카드 예시: 자녀 둘과 아버지(부양가족 페이지)", () => {
  const r = T.optimize({ spouses: [sp(90_000_000), sp(48_000_000)], deps: [child(2014), child(2019), { rel: "parent", birthYear: 1952 }] });
  assert.deepEqual(J(r.best.assign), [0, 0, 0]);
  assert.equal(manR(r.diffVsWorst), 54); assert.equal(gainOf(r, "dep", 2), 25);
  assert.equal(r.best.persons[0].credits.child, 250_000);
});
t("설명 카드 예시: 수술비와 아이 병원비(의료비 페이지)", () => {
  const r = T.optimize({ spouses: [sp(70_000_000), sp(30_000_000)], deps: [child(2022, { medical: { paid: [0, 1_500_000] } })], plannedMedicalCouple: [0, 8_000_000] });
  assert.equal(r.best.assign[0], 0); assert.equal(r.best.plannedPayer[0], 0);
  assert.equal(gainOf(r, "planned"), 44); assert.equal(gainOf(r, "dep"), 6);
  assert.equal(r.best.persons[0].credits.medical, 885_000);
  assert.ok(r.notes.some((x) => /배우자가 이미 낸 자녀1 의료비/.test(x)));
});
t("설명 카드 예시: 12월 300만 원(카드 페이지)", () => {
  const h = { spouses: [sp(60_000_000, { card: { credit: 13_000_000 } }), sp(40_000_000, { card: { credit: 14_000_000 } })], deps: [], december: { amount: 3_000_000, kind: "credit" } };
  const r = T.optimize(h);
  assert.equal(r.best.decRatio, 0); assert.equal(gainOf(r, "card"), 5);
  const d = T.optimize(Object.assign({}, h, { december: { amount: 3_000_000, kind: "debit" } }));
  const base = T.optimize(Object.assign({}, h, { december: null })).best.total;
  assert.equal(manR(base - d.best.total), 15); // 배우자 체크카드 300만 → 약 15만 원
});

t("이유 문장: 예정 의료비 결제자는 '0원 낭비'로, 교육비 낸 사람 불일치는 '이미 낸 돈'으로 설명", () => {
  const r = T.optimize({ spouses: [sp(70_000_000), sp(30_000_000)], deps: [child(2022, { medical: { paid: [0, 1_500_000] } }), { rel: "parent", birthYear: 1950, incomeOk: false, medical: { paid: [4_000_000, 0] } }], plannedMedicalCouple: [0, 8_000_000] });
  const pl = r.reasons.find((x) => x.kind === "planned");
  assert.ok(/결정세액이 0원/.test(pl.text) && !/이미 낸/.test(pl.text), pl.text);
  const e = T.optimize({ spouses: [sp(90_000_000), sp(48_000_000)], deps: [child(2017, { education: { amount: 2_000_000, kind: "school", payer: 1 } })] });
  assert.equal(e.best.assign[0], 1);
  assert.ok(/이미 낸 의료비·교육비·보험료 약 200만 원/.test(e.reasons[0].text), e.reasons[0].text);
});

// ── 독립 리뷰(2026-11-21) 지적 회귀 테스트 ──
t("리뷰1: 부모님(직계존속) 교육비는 공제 대상 아님(제59조의4 ③1)", () => {
  const r = T.optimize({ spouses: [sp(60_000_000), sp(50_000_000)], deps: [{ rel: "parent", birthYear: 1955, education: { amount: 3_000_000, kind: "univ", payer: 1 } }] });
  for (const c of r.candidates) assert.equal(c.persons[0].credits.education + c.persons[1].credits.education, 0);
});
t("리뷰2: 형제자매 명의 카드는 넣지 않음", () => {
  const r = T.optimize({ spouses: [sp(60_000_000, { card: { credit: 16_000_000 } }), sp(50_000_000)], deps: [{ rel: "other", birthYear: 2010, card: 10_000_000 }] });
  for (const c of r.candidates) assert.equal(c.persons[0].cardUse.credit, 16_000_000);
});
t("리뷰3: 20세 넘은 장애인 자녀도 카드 한도 자녀등", () => {
  const r = T.optimize({ spouses: [sp(60_000_000), sp(55_000_000, { card: { credit: 40_000_000 } })], deps: [child(1998, { disabled: true }), child(2012)] });
  const c = r.candidates.find((x) => x.assign[0] === 1 && x.assign[1] === 1);
  assert.equal(c.persons[1].card.basicLimit, 4_000_000);
});
t("리뷰4: 월세·기부금 세액공제를 받으면 표준세액공제와 같이 쓰지 않음", () => {
  const r = T.personTax({ salary: 30_000_000, itemizedOther: 300_000 });
  if (r.regime === "standard") assert.equal(r.credits.other, 0); else assert.equal(r.credits.other, 300_000);
  const both = T.personTax({ salary: 30_000_000, otherCredits: 300_000 });
  assert.equal(both.credits.other, 300_000); // 연금저축 등은 양쪽 모두
});
t("리뷰6: 나이 요건 밖 가족은 '기본공제는'이라고 쓰지 않음", () => {
  const r = T.optimize({ spouses: [sp(60_000_000), sp(50_000_000)], deps: [child(2002, { education: { amount: 9_000_000, kind: "univ", payer: 1 } })] });
  const x = r.reasons.find((y) => y.kind === "dep");
  assert.ok(!/기본공제는/.test(x.text) && /인적공제 대상 아님/.test(x.text), x.text);
});
t("리뷰7·8: 130만 원 문장은 이미 그 구간이면 '되다'라고 하지 않고, 문턱 아래 의료비를 이유로 들지 않음", () => {
  const r = T.optimize({ spouses: [sp(60_000_000), sp(28_000_000, { card: { credit: 12_000_000 } })], deps: [{ rel: "parent", birthYear: 1950 }], december: { amount: 3_000_000, kind: "credit" } });
  for (const x of r.reasons) assert.ok(!(/130만 원 이하가 됩니다/.test(x.text) && r.best.persons[1].calc <= 1_300_000), x.text);
  const m = T.optimize({ spouses: [sp(90_000_000), sp(40_000_000)], deps: [child(2014, { medical: { paid: [100_000, 0] } })] });
  assert.ok(!/이미 낸/.test(m.reasons[0].text.split("함께 따라가는")[0]), m.reasons[0].text);
});
t("리뷰9: 2017년생 경고는 바뀐 것만, 12월 카드·결제자 변화도 포함", () => {
  const r = T.optimize({ spouses: [sp(60_000_000), sp(50_000_000)], deps: [child(2017), child(2014)] });
  const w = r.warnings.find((x) => /2017년생/.test(x));
  assert.ok(w && !/자녀2은\(는\)/.test(w), w);
});
t("리뷰10: 가족의 예정 의료비는 그 가족 이유 문장에 함께, 따로 '세율 구간' 이유를 만들지 않음", () => {
  const r = T.optimize({ spouses: [sp(90_000_000), sp(60_000_000)], deps: [{ rel: "parent", birthYear: 1950, plannedMedical: 8_000_000 }] });
  assert.ok(!r.reasons.some((x) => x.kind === "planned"));
  const d = r.reasons.find((x) => x.kind === "dep");
  assert.ok(d.even || /12월에 낼 의료비/.test(d.text), d.text);
});

t("샘플 검증(2026-11-22): 독립 계산과 176개 조합 원 단위 일치한 가구의 추천과 이유", () => {
  const M = 10_000;
  const r = T.optimize({ spouses: [sp(6500 * M, { card: { credit: 1400 * M, debit: 300 * M } }), sp(4200 * M, { woman: true, card: { credit: 900 * M, debit: 400 * M, market: 100 * M } })],
    deps: [child(2015, { education: { amount: 200 * M, kind: "school", payer: 0 }, insurance: { amount: 60 * M, payer: 1 } }), child(2021, { medical: { paid: [0, 120 * M] } }), { rel: "parent", birthYear: 1955 }],
    plannedMedicalCouple: [300 * M, 0], december: { amount: 400 * M, kind: "credit" } });
  assert.deepEqual(J(r.best.assign), [0, 1, 0]); assert.equal(r.best.plannedPayer[0], 1); assert.equal(r.best.total, 4_744_558);
  const pl = r.reasons.find((x) => x.kind === "planned");
  assert.ok(/의료비 문턱/.test(pl.text) && !/이미 낸 의료비·교육비·보험료/.test(pl.text), pl.text);
  const cd = r.reasons.find((x) => x.kind === "card");
  assert.ok(!/원로 /.test(cd.text), cd.text);
});

console.log(`tax engine: ${n} passed, ${failed} failed`);
if (failed) process.exit(1);
