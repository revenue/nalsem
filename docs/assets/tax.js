/* 날셈 연말정산 엔진 (2026년 귀속 = 2027년 1~2월 연말정산).
   순수 함수만 둔다. 브라우저(window.TAX)와 Node 테스트(test/tax.test.mjs, vm) 양쪽에서 쓴다.
   금액 단위는 원. 원 미만은 버린다(정수 곱셈 후 나눗셈으로 부동소수 오차를 피한다).
   조문 출처와 확인 날짜: RULES 와 본부 저장소 ventures/nalsem-dual-income/tax-rules.md (2026-11-21 국가법령정보센터 현행 조문 대조).
   원문으로 확정하지 못한 규칙은 RULES[id].verified === false 이고, 결과에 쓰이면 화면이 경고한다.
   입력값은 이 파일 밖으로 나가지 않는다(전송·저장 없음). */
(function (g) {
  "use strict";

  const YEAR = 2026;
  const fl = Math.floor;
  const pos = (x) => (x > 0 ? x : 0);
  const mul = (a, num, den) => fl((a * num) / den); // a × num/den, 원 미만 버림
  const LAW = "https://www.law.go.kr/법령/";

  // 규칙 목록: 화면의 출처 표시와 미확인 경고에 쓴다. verified 는 tax-rules.md 의 대조 결과를 따른다.
  const RULES = {
    wageDeduction: { label: "근로소득공제", src: LAW + "소득세법/제47조", verified: true },
    basicRate: { label: "기본세율", src: LAW + "소득세법/제55조", verified: true },
    wageCredit: { label: "근로소득세액공제와 한도", src: LAW + "소득세법/제59조", verified: true },
    personal: { label: "기본공제·추가공제, 한 가족은 한 사람만 공제", src: LAW + "소득세법/제50조", verified: true },
    childCredit: { label: "자녀세액공제(2026년 9세 이상)·출산입양공제", src: LAW + "소득세법/제59조의2", verified: true },
    kid2017: { label: "2017년생 자녀의 2026년 자녀세액공제 제외(부칙 제2조③ 문언 해석)", src: LAW + "소득세법/제59조의2", verified: false },
    special: { label: "보험료·의료비·교육비 세액공제", src: LAW + "소득세법/제59조의4", verified: true },
    standard: { label: "표준세액공제 13만 원", src: LAW + "소득세법/제59조의4", verified: true },
    creditCap: { label: "세액공제는 산출세액 한도(결정세액 0원 미만 없음)", src: LAW + "소득세법/제61조", verified: true },
    medicalDependent: { label: "부양가족 의료비는 그 가족을 기본공제 받는 사람이 낸 것만 공제(예규 재소득-649)", src: "https://www.nts.go.kr/", verified: true },
    card: { label: "신용카드 등 소득공제", src: LAW + "조세특례제한법/제126조의2", verified: true },
    cardKids: { label: "자녀 수에 따른 카드 공제 기본한도 상향(2026년 사용분부터)", src: LAW + "조세특례제한법/제126조의2", verified: true },
    social: { label: "4대보험 근로자 부담 추정(2026년 요율, 2차 출처)", src: "https://www.nhis.or.kr/", verified: false },
    marriage: { label: "결혼세액공제(2026년 12월 31일 이전 혼인신고, 1회 50만 원)", src: LAW + "조세특례제한법/제92조", verified: true },
  };

  // ── 근로소득공제 (소득세법 제47조 ①, 한도 2천만 원) ──
  function earnedIncomeDeduction(s) {
    s = pos(s);
    let d;
    if (s <= 5_000_000) d = mul(s, 70, 100);
    else if (s <= 15_000_000) d = 3_500_000 + mul(s - 5_000_000, 40, 100);
    else if (s <= 45_000_000) d = 7_500_000 + mul(s - 15_000_000, 15, 100);
    else if (s <= 100_000_000) d = 12_000_000 + mul(s - 45_000_000, 5, 100);
    else d = 14_750_000 + mul(s - 100_000_000, 2, 100);
    return Math.min(d, 20_000_000, s);
  }

  // ── 기본세율 (소득세법 제55조 ①) [상한, 세율 %] ──
  const BRACKETS = [[14_000_000, 6], [50_000_000, 15], [88_000_000, 24], [150_000_000, 35], [300_000_000, 38], [500_000_000, 40], [1_000_000_000, 42], [Infinity, 45]];
  function basicTax(b) {
    b = pos(b);
    let tax = 0, prev = 0;
    for (const [top, r] of BRACKETS) { if (b <= prev) break; tax += (Math.min(b, top) - prev) * r; prev = top; }
    return fl(tax / 100);
  }
  const marginalRate = (b) => { for (const [top, r] of BRACKETS) if (b <= top) return r; return 45; };

  // ── 근로소득세액공제 (소득세법 제59조 ①②) ──
  function earnedIncomeCredit(calc, s) {
    calc = pos(calc);
    const c = calc <= 1_300_000 ? mul(calc, 55, 100) : 715_000 + mul(calc - 1_300_000, 30, 100);
    let lim;
    if (s <= 33_000_000) lim = 740_000;
    else if (s <= 70_000_000) lim = Math.max(740_000 - mul(s - 33_000_000, 8, 1000), 660_000);
    else if (s <= 120_000_000) lim = Math.max(660_000 - mul(s - 70_000_000, 1, 2), 500_000);
    else lim = Math.max(500_000 - mul(s - 120_000_000, 1, 2), 200_000);
    return Math.min(c, lim);
  }

  // ── 자녀세액공제 (소득세법 제59조의2 ①, 2026.4.21 개정 법률 제21548호: 13세 이상, 부칙 제2조②로 2026년 과세기간은 9세 이상) ──
  // 금액: 1명 25만·2명 55만·셋째부터 1명당 40만. 부칙 제2조③: 2017년생은 ②(단계 적용)를 적용하지 않음 → 문언상 2026년에는 제외(국세청 해석 미확인)
  const KID_MIN_AGE = 9, KID_EXCLUDED_BIRTH_YEAR = 2017;
  function childCredit(k) { return k <= 0 ? 0 : k === 1 ? 250_000 : k === 2 ? 550_000 : 550_000 + (k - 2) * 400_000; }
  // 출산·입양 (같은 조 ③): 해당 연도 출생·입양 첫째 30만, 둘째 50만, 셋째 이상 70만
  function birthCredit(orders) { return (orders || []).reduce((a, o) => a + (o <= 1 ? 300_000 : o === 2 ? 500_000 : 700_000), 0); }

  // ── 4대보험 근로자 부담 추정 (2026년 요율, 2차 출처: 보도 기사. 사용자가 실제 금액을 넣으면 그 값을 쓴다) ──
  // 국민연금 4.75%(기준소득월액 상한 1~6월 637만, 7~12월 659만), 건강 3.595%, 장기요양 = 건강보험료 × 13.14%, 고용 0.9%
  // 국민연금은 연금보험료공제(소득세법 제51조의3), 건강·장기요양·고용은 특별소득공제(제52조 ①)
  function socialInsurance(s, override) {
    s = pos(s);
    const half = s / 2;
    const pension = mul(Math.min(half, 6_370_000 * 6) + Math.min(half, 6_590_000 * 6), 475, 10000);
    const health = mul(s, 3595, 100000);
    const care = mul(health, 1314, 10000);
    const employment = mul(s, 9, 1000);
    let r = { pension, special: health + care + employment, estimated: true };
    if (override > 0) { const tot = r.pension + r.special || 1; const pp = mul(override, r.pension, tot); r = { pension: pp, special: override - pp, estimated: false }; }
    return r;
  }

  // ── 신용카드 등 소득공제 (조세특례제한법 제126조의2) ──
  // use: credit(신용 15%), debit(체크·직불·현금영수증 30%), culture(도서·공연·박물관·영화·체육시설 30%, 총급여 7천만 원 이하만),
  //      market(전통시장·대중교통 40%). 국세청 신고안내 책자(2025.12) 사례 계산 방식:
  //      공제가능금액 = ①~⑤ 수단별 공제액 합 - ⑥ 최저사용금액(총급여 25%)에 해당하는 공제액(신용 → 30% 수단 → 40% 수단 순으로 채움)
  // 기본한도(⑩, 2025.12.23 개정, 2026.1.1 이후 사용분): 7천만 원 이하 300만(자녀등 1명 350만, 2명 이상 400만), 초과 250만(275만, 300만)
  // 추가한도(⑪): 기본한도 초과분, (문화체육+)전통시장·대중교통 공제액, 7천만 원 이하 300만·초과 200만 중 작은 것. 소비증가분(②7호)은 2024년 과세연도 한정이라 0원
  function cardDeduction(s, use, kids) {
    use = use || {};
    const low = s <= 70_000_000;
    let credit = pos(use.credit || 0), debit = pos(use.debit || 0), culture = pos(use.culture || 0);
    const market = pos(use.market || 0);
    if (!low) { credit += culture; culture = 0; } // 7천만 원 초과는 문화체육 별도 공제율 없음: 보수적으로 신용카드분(15%)으로 본다
    const th = mul(pos(s), 25, 100), total = credit + debit + culture + market;
    const gross = mul(credit, 15, 100) + mul(debit + culture, 30, 100) + mul(market, 40, 100);
    let six;
    if (th <= credit) six = mul(th, 15, 100);
    else if (th <= credit + debit + culture) six = mul(credit, 15, 100) + mul(th - credit, 30, 100);
    else six = mul(credit, 15, 100) + mul(debit + culture, 30, 100) + mul(th - credit - debit - culture, 40, 100);
    const raw = total > th ? pos(gross - six) : 0;
    const pool = mul(culture, 30, 100) + mul(market, 40, 100);
    const k = Math.min(kids || 0, 2);
    const basicLimit = low ? [3_000_000, 3_500_000, 4_000_000][k] : [2_500_000, 2_750_000, 3_000_000][k];
    const extraLimit = low ? 3_000_000 : 2_000_000;
    const amount = raw <= basicLimit ? raw : basicLimit + Math.min(raw - basicLimit, pool, extraLimit);
    return { amount, raw, threshold: th, toThreshold: pos(th - total), basicLimit, extraLimit, capped: raw > amount };
  }

  // ── 의료비 세액공제 (소득세법 제59조의4 ②) ──
  // general: 한도(700만) 있는 의료비, special: 본인·65세 이상·장애인·6세 이하 등 한도 없는 의료비
  // 총급여 3%는 general 에서 먼저 빼고, 모자라면 special 에서 뺀다.
  function medicalBaseAmount(s, m) {
    const general = pos(m.general || 0), special = pos(m.special || 0), th = mul(pos(s), 3, 100);
    return general >= th ? Math.min(general - th, 7_000_000) + special : pos(special - (th - general));
  }
  function medicalCredit(s, m) { return mul(medicalBaseAmount(s, m), 15, 100); }

  // 교육비 대상별 한도 (소득세법 제59조의4 ③): 취학 전·초중고 1명당 300만, 대학생 900만
  const EDU_CAP = { pre: 3_000_000, school: 3_000_000, univ: 9_000_000 };

  // ── 한 사람의 결정세액 ──
  // p: { salary, people:[{elderly, disabled}], woman, kidsCredit, births:[순서], card:{credit,debit,market}, kidsForCard,
  //      insurance, medical:{general, special}, education, otherCredits, social }
  function personTax(p) {
    const s = pos(p.salary || 0);
    const wageIncome = s - earnedIncomeDeduction(s);
    const people = p.people || [];
    // 기본공제 1인 150만 원(본인 포함), 경로우대 70세 이상 100만, 장애인 200만, 부녀자 50만(종합소득금액 3천만 원 이하) (소득세법 제50조·제51조)
    const personal = 1_500_000 * (1 + people.length) + people.reduce((a, x) => a + (x.elderly ? 1_000_000 : 0) + (x.disabled ? 2_000_000 : 0), 0)
      + (p.woman && wageIncome <= 30_000_000 ? 500_000 : 0);
    const social = socialInsurance(s, p.social);
    const pc = p.card || {};
    const cardUse = { credit: pos(pc.credit || 0), debit: pos(pc.debit || 0), culture: pos(pc.culture || 0), market: pos(pc.market || 0) };
    const card = cardDeduction(s, cardUse, p.kidsForCard || 0);
    const child = childCredit(p.kidsCredit || 0), birth = birthCredit(p.births);
    const other = pos(p.otherCredits || 0);
    const medicalBase = { general: pos((p.medical && p.medical.general) || 0), special: pos((p.medical && p.medical.special) || 0) };
    const insurance = mul(Math.min(pos(p.insurance || 0), 1_000_000), 12, 100);
    const medical = medicalCredit(s, medicalBase);
    const education = mul(pos(p.education || 0), 15, 100);

    // 특별소득공제(건강·고용보험료)·특별세액공제를 받는 쪽과 표준세액공제(13만 원) 쪽 중 세금이 적은 쪽 (소득세법 제59조의4 ⑨)
    const run = (itemized) => {
      const base = pos(wageIncome - personal - social.pension - (itemized ? social.special : 0) - card.amount);
      const calc = basicTax(base), wage = earnedIncomeCredit(calc, s);
      const credits = itemized ? { wage, child, birth, insurance, medical, education, standard: 0, other } : { wage, child, birth, insurance: 0, medical: 0, education: 0, standard: 130_000, other };
      const sum = Object.values(credits).reduce((a, x) => a + x, 0);
      const decided = pos(calc - sum); // 세액공제는 산출세액 한도, 결정세액은 0원 밑으로 내려가지 않는다 (제61조)
      return { base, calc, credits, creditSum: sum, decided, wasted: pos(sum - calc) };
    };
    const a = run(true), b = s > 0 ? run(false) : a;
    const r = b.decided < a.decided ? Object.assign(b, { regime: "standard" }) : Object.assign(a, { regime: "itemized" });
    const local = mul(r.decided, 10, 100); // 지방소득세 10%
    return Object.assign(r, { salary: s, wageIncome, personal, social, card, cardUse, medicalBase, local, total: r.decided + local, marginal: marginalRate(r.base) });
  }

  // ── 부양가족 요건 (소득세법 제50조. 나이는 그 해 중 해당 나이인 날이 있으면 인정 → 연도 - 출생연도로 판정) ──
  function depFlags(d, opts) {
    const age = YEAR - (d.birthYear || YEAR);
    const rel = d.rel || "child";
    const ageRule = rel === "child" ? age <= 20 : rel === "parent" ? age >= 60 : age <= 20 || age >= 60;
    const disabled = !!d.disabled, incomeOk = d.incomeOk !== false;
    const ageOk = ageRule || disabled;
    const basic = ageOk && incomeOk;
    return { age, rel, ageOk, incomeOk, basic, disabled, elderly: age >= 70, senior65: age >= 65, under6: age <= 6, kidCredit: rel === "child" && basic && age >= KID_MIN_AGE && (d.birthYear !== KID_EXCLUDED_BIRTH_YEAR || !!(opts && opts.kid2017)), born2017: rel === "child" && basic && d.birthYear === KID_EXCLUDED_BIRTH_YEAR, cardKid: rel === "child" && basic && age <= 20 };
  }

  // ── 배분 추천: 가능한 배분을 전부 계산해 부부 합산(결정세액 + 지방소득세)이 가장 작은 것을 고른다 ──
  // 이미 낸 돈(의료비·교육비·보험료·카드)은 낸 사람에게 고정. 바꾸는 것은 ① 부양가족 기본공제 배정
  // ② 앞으로 낼 의료비의 결제자 ③ 12월 카드 사용액 배분(0~100%, 10% 단위)뿐이다.
  function optimize(h) {
    const S = [0, 1].map((i) => Object.assign({ salary: 0 }, (h.spouses || [])[i] || {}));
    const names = h.names || ["나", "배우자"];
    const deps = (h.deps || []).map((d, i) => Object.assign({}, d, { f: depFlags(d, h), idx: i, name: d.name || defaultName(h.deps, i) }));
    const warnings = [], used = new Set(["wageDeduction", "basicRate", "wageCredit", "personal", "creditCap"]);
    if (!(S[0].social > 0) || !(S[1].social > 0)) used.add("social");
    for (const d of deps) {
      if (!d.f.incomeOk) warnings.push(`${d.name}: 연 소득금액 100만 원(근로소득만 있으면 총급여 500만 원) 초과라 기본공제를 받을 수 없습니다. 이 가족을 위해 낸 의료비·교육비는 낸 사람이 공제받는 것으로 계산했습니다.`);
      else if (!d.f.ageOk) warnings.push(`${d.name}: ${YEAR}년 기준 나이 요건(자녀 20세 이하 = ${YEAR - 20}년 이후 출생, 부모 60세 이상 = ${YEAR - 60}년 이전 출생) 밖이라 인적공제를 받을 수 없습니다. 장애인이면 나이 제한이 없습니다.`);
    }
    const assignable = deps.filter((d) => d.f.incomeOk); // 배정 변수가 있는 가족(나이 요건 밖이어도 카드·교육비가 따라감)
    const hi = S[0].salary >= S[1].salary ? 0 : 1;
    // 앞으로 낼 의료비: 부부 본인 것 + 가족 것. 결제자를 0/1 로 바꿔 본다
    const planned = [];
    (h.plannedMedicalCouple || [0, 0]).forEach((amt, k) => { if (amt > 0) planned.push({ amount: amt, who: "spouse", k }); });
    deps.forEach((d) => { if (d.plannedMedical > 0) planned.push({ amount: d.plannedMedical, who: "dep", d }); });
    const dec = h.december && h.december.amount > 0 ? h.december : null;
    const ratios = dec ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (hi === 0 ? 10 - r : r)) : [null];
    const m = assignable.length, p = planned.length;
    if (m > 8 || p > 8) throw new Error("가족이나 예정 의료비 항목이 너무 많습니다");

    const medGroup = (d) => (d.f.senior65 || d.f.disabled || d.f.under6 ? "special" : "general");
    const evalCase = (mask, pmask, ratio) => {
      const assign = deps.map(() => null);
      assignable.forEach((d, j) => { assign[d.idx] = (mask >> j) & 1 ? 1 - hi : hi; });
      const plannedPayer = planned.map((x, j) => {
        const self = x.who === "spouse" ? x.k : assign[x.d.idx] != null ? assign[x.d.idx] : hi;
        return (pmask >> j) & 1 ? 1 - self : self;
      });
      const P = [0, 1].map((k) => ({ salary: S[k].salary, woman: !!S[k].woman, people: [], kidsCredit: 0, births: [], kidsForCard: 0, card: Object.assign({ credit: 0, debit: 0, culture: 0, market: 0 }, S[k].card || {}), insurance: 0, medical: { general: 0, special: 0 }, education: 0, otherCredits: S[k].otherCredits || 0, social: S[k].social }));
      for (let k = 0; k < 2; k++) {
        P[k].medical.special += pos(S[k].medicalSelf || 0); // 본인 의료비(한도 없음)
        P[k].medical.general += pos(S[k].medicalForSpouse || 0); // 배우자를 위해 낸 의료비(의료비 대상은 나이·소득 제한 없는 기본공제대상자, 한도 있음)
      }
      const addEdu = (k, d) => { const e = d.education || {}; if (e.amount > 0) P[k].education += Math.min(e.amount, EDU_CAP[e.kind] || 3_000_000); };
      for (const d of deps) {
        const a = assign[d.idx];
        const e = d.education || {}, ins = d.insurance || {};
        if (a != null) {
          if (d.f.basic) {
            P[a].people.push({ elderly: d.f.elderly, disabled: d.f.disabled });
            if (d.f.kidCredit) P[a].kidsCredit++;
            if (d.rel === "child" && d.birthOrder > 0) P[a].births.push(d.birthOrder);
            if (d.f.cardKid) P[a].kidsForCard++; // 카드 한도 상향의 "자녀등": 20세 이하(장애인 무관) 직계비속, 그 사람이 기본공제 받는 경우
          }
          P[a].card.credit += pos(d.card || 0); // 가족 명의 카드: 그 가족을 기본공제 받는 사람에게(소득 요건, 나이 무관)
          if (e.amount > 0 && e.payer === a) addEdu(a, d); // 교육비: 기본공제 받는 사람이 낸 것
          if (d.f.basic && ins.amount > 0 && ins.payer === a) P[a].insurance += ins.amount; // 보험료: 요건을 모두 갖춘 기본공제대상자, 계약·납부한 사람
        } else if (e.amount > 0 && (e.payer === 0 || e.payer === 1)) addEdu(e.payer, d); // 소득 요건 밖 가족의 교육비: 2026년부터 소득 제한 없음 → 낸 사람
        const paid = (d.medical && d.medical.paid) || [0, 0];
        for (let k = 0; k < 2; k++) if (paid[k] > 0 && (a == null || a === k)) P[k].medical[medGroup(d)] += paid[k];
      }
      planned.forEach((x, j) => {
        const payer = plannedPayer[j];
        if (x.who === "spouse") P[payer].medical[payer === x.k ? "special" : "general"] += x.amount;
        else { const a = assign[x.d.idx]; if (a == null || a === payer) P[payer].medical[medGroup(x.d)] += x.amount; }
      });
      if (dec) { const key = dec.kind === "debit" ? "debit" : "credit", to0 = mul(dec.amount, ratio, 10); P[0].card[key] += to0; P[1].card[key] += dec.amount - to0; }
      const persons = P.map(personTax);
      return { assign, plannedPayer, decRatio: ratio, persons, total: persons[0].total + persons[1].total };
    };

    const candidates = [];
    for (let mask = 0; mask < 1 << m; mask++) for (let pmask = 0; pmask < 1 << p; pmask++) for (const r of ratios) candidates.push(evalCase(mask, pmask, r));
    let best = candidates[0], worst = candidates[0];
    for (const c of candidates) { if (c.total < best.total) best = c; if (c.total > worst.total) worst = c; } // 동률이면 먼저 나온 것을 둔다(표시 안정용)
    const allHigh = candidates[0]; // 가족·12월 카드 모두 소득 높은 쪽, 예정 의료비는 본인·배정된 사람이 결제

    // 규칙 사용 기록
    if (deps.some((d) => d.f.kidCredit || d.birthOrder > 0)) used.add("childCredit");
    if (best.persons.some((x) => x.credits.medical || x.credits.insurance || x.credits.education || x.regime === "standard")) { used.add("special"); used.add("standard"); }
    if (deps.some((d) => d.f.incomeOk && d.medical && (d.medical.paid || []).some((v) => v > 0)) || planned.some((x) => x.who === "dep")) used.add("medicalDependent");
    if (best.persons.some((x) => x.card.raw > 0)) used.add("card");
    if (best.persons.some((x) => x.card.raw > 2_500_000) && deps.some((d) => d.f.cardKid)) used.add("cardKids");

    // 이유: 결정 하나만 반대로 바꾸고 나머지는 다시 최적으로 둔 경우와 비교
    const minWhere = (pred) => candidates.reduce((acc, c) => (pred(c) && (!acc || c.total < acc.total) ? c : acc), null);
    const reasons = [];
    for (const d of assignable) {
      const to = best.assign[d.idx], alt = minWhere((c) => c.assign[d.idx] !== to);
      reasons.push(reasonFor("dep", d.name, names, to, alt.total - best.total, best, alt, d));
    }
    planned.forEach((x, j) => {
      const to = best.plannedPayer[j], alt = minWhere((c) => c.plannedPayer[j] !== to);
      const label = x.who === "spouse" ? `${names[x.k]} 본인 의료비(앞으로 낼 ${man(x.amount)})` : `${x.d.name} 의료비(앞으로 낼 ${man(x.amount)})`;
      reasons.push(reasonFor("planned", label, names, to, alt.total - best.total, best, alt, x));
    });
    if (dec) {
      const same = candidates.filter((c) => c.assign.every((v, i) => v === best.assign[i]) && c.plannedPayer.every((v, i) => v === best.plannedPayer[i]));
      const near = same.filter((c) => c.total - best.total < 10_000).map((c) => c.decRatio);
      const worstDec = same.reduce((a, c) => (c.total > a.total ? c : a), same[0]);
      reasons.push(cardReason(dec, names, best, worstDec, near));
    }

    if (!h.kid2017 && deps.some((d) => d.f.born2017)) {
      used.add("kid2017");
      const alt = optimize(Object.assign({}, h, { kid2017: true }));
      const changed = alt.best.assign.some((v, i) => v !== best.assign[i]);
      warnings.push(changed
        ? `2017년생 자녀: 개정 소득세법 부칙(2026.4.21)을 문언대로 읽으면 2026년에는 자녀세액공제 대상이 아니어서 그렇게 계산했습니다. 국세청 해석이 아직 없어 확정이 아니며, 공제 대상으로 보면 추천 배분이 바뀝니다(그 경우 ${alt.reasons.filter((r) => r.kind === "dep").map((r) => r.text.split(":")[0]).join(", ")}). 1월 홈택스에서 꼭 확인하세요.`
        : "2017년생 자녀: 개정 소득세법 부칙(2026.4.21)을 문언대로 읽어 2026년 자녀세액공제에서 뺐습니다(국세청 해석 미확인). 공제 대상으로 봐도 추천 배분은 같습니다.");
    }
    // 투명성: 추천 배분에서 공제되지 않는 이미 낸 돈을 알린다(돈을 옮기라는 뜻이 아님)
    const notes = [];
    for (const d of deps) {
      const a = best.assign[d.idx];
      if (a == null) continue;
      const paid = (d.medical && d.medical.paid) || [0, 0];
      [0, 1].forEach((k) => { if (k !== a && paid[k] > 0) notes.push(`${names[k]}가 이미 낸 ${d.name} 의료비 ${man(paid[k])}은 추천 배분(${names[a]}가 기본공제)에서는 공제되지 않습니다. 의료비는 그 가족을 기본공제 받는 사람이 낸 것만 공제됩니다. 이 손해를 넣고도 추천 배분이 합산 세금이 가장 적습니다.`); });
      const e = d.education || {};
      if (e.amount > 0 && e.payer !== a && (e.payer === 0 || e.payer === 1)) notes.push(`${names[e.payer]}가 낸 ${d.name} 교육비는 추천 배분에서는 공제되지 않습니다(기본공제 받는 사람이 낸 것만 공제).`);
      const ins = d.insurance || {};
      if (ins.amount > 0 && ins.payer !== a && (ins.payer === 0 || ins.payer === 1)) notes.push(`${names[ins.payer]}가 계약한 ${d.name} 보험료는 추천 배분에서는 공제되지 않습니다(기본공제 받는 사람이 계약·납부한 것만 공제).`);
    }
    const nearZero = [best].concat(reasons.map((r) => r.alt).filter(Boolean)).some((c) => c.persons.some((x) => x.decided < 300_000 && x.salary > 0));
    const usedUnverified = [...used].filter((k) => RULES[k] && !RULES[k].verified);
    return {
      best, worst, allHigh, candidates, hi, deps, planned, warnings, notes: notes.map((x) => x.replace(/나가 /g, "내가 ").replace(/배우자가 /g, "배우자가 ")), usedUnverified, nearZero,
      diffVsWorst: worst.total - best.total, diffVsAllHigh: allHigh.total - best.total,
      reasons: reasons.map((r) => { const o = Object.assign({}, r); delete o.alt; return o; }),
    };
  }

  function defaultName(all, i) {
    const d = all[i], rel = d.rel || "child";
    const n = all.slice(0, i + 1).filter((x) => (x.rel || "child") === rel).length;
    return (rel === "child" ? "자녀" : rel === "parent" ? "부모님" : "가족") + n;
  }
  // 주격 조사: 나 → 내가, 받침 있으면 이, 없으면 가
  function subj(w) { if (w === "나") return "내가"; const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "이" : "가"); }
  // "약 ○○만 원" (만 원 반올림)
  function man(won) { const v = Math.round(won / 10_000); return v === 0 && won > 0 ? "1만 원 미만" : `약 ${v.toLocaleString("ko-KR")}만 원`; }

  function whyText(best, alt, to) {
    const other = 1 - to, b = best.persons, a = alt.persons;
    const spec = (c) => c.persons.reduce((x, p) => x + p.credits.medical + p.credits.education + p.credits.insurance, 0);
    const lost = spec(best) - spec(alt);
    if (lost >= 10_000) return `반대로 하면 이미 낸 의료비·교육비·보험료 중 공제받지 못하는 몫이 생겨 세액공제가 약 ${Math.round(lost / 10_000)}만 원 줄어듭니다(낸 사람과 기본공제 받는 사람이 같아야 함)`;
    if (a[other].decided === 0 && a[other].wasted > 0) return `반대로 하면 {${other}}의 결정세액이 0원이 되어 세액공제 약 ${Math.round(a[other].wasted / 10_000)}만 원이 쓰이지 못하고 사라집니다`;
    // 산출세액 130만 원 이하에서는 근로소득세액공제가 산출세액의 55%라, 소득공제로 산출세액이 줄면 이 공제도 같이 줄어 실제 효과가 세율의 45%뿐이다 (소득세법 제59조)
    if (a[other].calc <= 1_300_000 && a[other].decided > 0) return `반대로 하면 {${other}}의 산출세액이 130만 원 이하가 됩니다. 이 구간에서는 근로소득세액공제(산출세액의 55%)도 함께 줄어, 소득공제의 실제 효과가 세율(${a[other].marginal}%)의 절반에 못 미칩니다`;
    if (a[other].marginal < b[other].marginal) return `반대로 하면 {${other}}의 과세표준이 더 낮은 세율 구간(${a[other].marginal}%)으로 내려가 공제 효과가 작아집니다`;
    if (b[other].marginal < b[to].marginal) return `{${to}}의 세율 구간(${b[to].marginal}%)이 {${other}}(${b[other].marginal}%)보다 높아 같은 소득공제라도 줄어드는 세금이 큽니다`;
    if (b[other].marginal > b[to].marginal) return `{${to}} 쪽은 공제 문턱(의료비 총급여 3%, 카드 25%)이 낮거나 이미 넘어 있어 실제로 공제되는 금액이 큽니다`;
    return `세율 구간은 같지만 공제 문턱·한도와 세액공제 계산 때문에 {${to}} 쪽에서 실제로 줄어드는 세금이 큽니다`;
  }
  function reasonFor(kind, label, names, to, gain, best, alt, d) {
    const fill = (s) => s.replace(/\{(\d)\}가/g, (_, k) => subj(names[+k])).replace(/\{(\d)\}/g, (_, k) => names[+k]);
    if (gain < 10_000) return { kind, label, to, gain, alt, even: true, text: fill(`${label}: 누구로 해도 차이가 1만 원 미만입니다.`) };
    let why = whyText(best, alt, to);
    if (kind === "dep") {
      const extra = [];
      if (d.f.kidCredit) extra.push("자녀세액공제");
      if (d.birthOrder > 0) extra.push("출산·입양 공제");
      if (((d.medical && d.medical.paid) || []).some((v) => v > 0)) extra.push("이미 낸 의료비(낸 사람이 이 가족을 기본공제 받아야 공제)");
      if (d.education && d.education.amount > 0) extra.push("교육비(낸 사람 기준)");
      if (d.insurance && d.insurance.amount > 0) extra.push("보험료(계약한 사람 기준)");
      if (d.card > 0) extra.push("이 가족 명의 카드 사용액");
      if (d.f.cardKid) extra.push("카드 공제 한도 상향(20세 이하 자녀)");
      if (extra.length) why += `. 함께 따라가는 것: ${extra.join(", ")}`;
    }
    const head = kind === "dep" ? `${label}의 기본공제는 {${to}}에게` : `${label}는 {${to}}가 결제`;
    return { kind, label, to, gain, alt, even: false, text: fill(`${head}: 반대보다 부부 합산 ${man(gain)} 덜 냅니다. ${why}.`) };
  }
  function cardReason(dec, names, best, worstDec, near) {
    const r = best.decRatio, amt = dec.amount, to0 = mul(amt, r, 10);
    const gain = worstDec.total - best.total;
    const split = r === 10 ? `전부 ${names[0]} 카드로` : r === 0 ? `전부 ${names[1]} 카드로` : `${names[0]} ${man(to0)}, ${names[1]} ${man(amt - to0)}로 나눠`;
    const P = best.persons;
    const notes = [0, 1].map((k) => {
      const c = P[k].card;
      if (P[k].decided === 0) return `${names[k]}: 결정세액이 이미 0원이라 카드 공제를 더 받아도 줄일 세금이 없음`;
      if (c.capped) return `${names[k]}: 카드 공제 한도(${Math.round(c.basicLimit / 10_000)}만 원)에 닿음`;
      if (c.toThreshold > 0) return `${names[k]}: 총급여 25%(${Math.round(c.threshold / 10_000)}만 원)까지 ${Math.round(c.toThreshold / 10_000)}만 원 더 써야 공제 시작`;
      return `${names[k]}: 25% 문턱을 넘어 쓰는 만큼 공제(세율 구간 ${P[k].marginal}%)`;
    });
    if (gain < 10_000) return { kind: "card", label: `12월 카드 ${man(amt)}`, gain, even: true, text: `12월 카드 ${man(amt)}: 누구 카드로 써도 차이가 1만 원 미만입니다. ${notes.join(" / ")}.` };
    const wide = near.length > 1 ? ` (비슷한 비율이 ${near.length}가지 있어 꼭 이 비율일 필요는 없음)` : "";
    return { kind: "card", label: `12월 카드 ${man(amt)}`, gain, even: false, text: `12월 카드 ${man(amt)}은 ${split} 쓰면 가장 불리하게 나눌 때보다 ${man(gain)} 덜 냅니다${wide}. ${notes.join(" / ")}.` };
  }

  g.TAX = { YEAR, RULES, BRACKETS, EDU_CAP, earnedIncomeDeduction, basicTax, marginalRate, earnedIncomeCredit, childCredit, birthCredit, socialInsurance, cardDeduction, medicalCredit, medicalBaseAmount, personTax, depFlags, optimize, man };
})(typeof window !== "undefined" ? window : globalThis);
