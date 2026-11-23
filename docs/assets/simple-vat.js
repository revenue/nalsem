/* 날셈 간이과세자 부가가치세 엔진 (2026년 귀속, 2027-01-25 확정신고분).
   순수 함수만 둔다. 브라우저(window.SVAT)와 Node 테스트(test/simple-vat.test.mjs, vm) 양쪽에서 쓴다.
   금액 단위는 원. 원 미만은 버린다. 입력값은 이 파일 밖으로 나가지 않는다(전송·저장 없음).
   조문 출처(2026-11-22 국가법령정보센터 현행 조문 대조, 본부 저장소 ventures/simple-vat/benchmark.md):
   - 부가가치세법 [시행 2026.1.2, 법률 제21065호] 제46조(신용카드 발행세액공제 1.3%, 연 1천만 원, 2026-12-31까지),
     제47조·제63조④(전자세금계산서 발급세액공제, 연 100만 원), 제61조(간이과세 적용 범위, 신규는 12개월 환산),
     제62조(적용기간), 제63조(납부세액 = 공급대가 × 부가가치율 × 10%, 매입 공급대가 0.5% 공제, 공제 합계가 세액을 넘으면 넘는 부분 없음),
     제66조(예정부과), 제67조(과세기간 끝난 뒤 25일 이내 확정신고, 이미 낸 세액 공제), 제69조(공급대가 4,800만 원 미만 납부의무 면제, 신규는 12개월 환산·1개월 미만 끝수는 1개월)
   - 2026-07-01 일반과세자 → 간이과세자 전환자(2026-11-24 같은 조문 대조): 과세기간 7.1~12.31(법 제5조④1호), 그 기간 공급대가를 12개월로 환산해 면제 판정(제69조③3호),
     예정부과기간(1~6월)은 일반과세 기간이라 예정부과 없음(제66조①), 재고납부세액(제64조)은 세무서가 전환일부터 90일 안에 통지하고(시행령 제112조⑤)
     확정신고 때 더해 내며(같은 조 ⑦) 납부면제여도 낸다(제69조① 단서). 공제가 재고납부세액까지 줄이는지는 확인 못 해 업종별 세액까지만 뺀다(보수적)
   - 부가가치세법 시행령 [시행 2026.2.27] 제109조①(1억 400만 원), 제111조②(업종별 부가가치율 표), 제89조②(전자세금계산서 건당 200원)
   - 조세특례제한법 제104조의8②, 같은 법 시행령 [시행 2026.9.18] 제104조의5④(부가세 전자신고세액공제 5천 원, 2026.2.27 개정)
   국세청 「사례로 배우는 부가가치세 전자신고 방법」 간이 음식점업·소매업(2024.1) 사례를 test/simple-vat.test.mjs 가 원 단위까지 재현한다.
   해마다 손볼 것: YEAR·DUE·CARD(공제율·한도·기한)·EFILE. 현행 법 제46조①3호는 2027년 공급분부터 1%·연 500만 원이고, 2026-08 정부 세제개편안은 1.2%·500만 원 안(2차 자료, 국회 통과 확인 필요). */
(function (g) {
  "use strict";

  const YEAR = 2026; // 귀속 연도 (과세기간 2026-01-01 ~ 2026-12-31)
  const DUE = "2027-01-25"; // 확정신고·납부 기한 (법 제67조①). 월요일이라 기한 연장 없음
  const EXEMPT = 48000000; // 이 금액 "미만"이면 납부의무 면제 (법 제69조①)
  const SIMPLE_MAX = 104000000; // 간이과세 적용 기준금액 (시행령 제109조①). 이상이면 다음 해 7월 1일부터 일반과세 (법 제62조)
  const PURCHASE_PERMILLE = 5; // 매입 공급대가의 0.5% (법 제63조③1호)
  const CARD = { permille: 13, cap: 10000000, until: "2026-12-31" }; // 법 제46조①3호
  const EINV = { per: 200, cap: 1000000 }; // 법 제47조①, 시행령 제89조②
  const EFILE = 5000; // 조특법 시행령 제104조의5④ (2026.2.27 개정 전 1만 원)

  // 업종별 부가가치율(%) (시행령 제111조② 표, 2021.7.1 이후). ex 는 화면용 예시(Claude 정리, 업종 판정은 사업자등록증 기준)
  const INDUSTRIES = [
    { id: "retail", rate: 15, label: "소매업", ex: "스마트스토어·쇼핑몰 같은 온라인 판매, 편의점·잡화점" },
    { id: "food", rate: 15, label: "음식점업", ex: "배달 전문점, 식당, 카페, 분식점" },
    { id: "recycle", rate: 15, label: "재생용 재료수집 및 판매업", ex: "고물상" },
    { id: "mfg", rate: 20, label: "제조업", ex: "최종소비자에게 직접 파는 제조만 간이과세 가능(떡집·양복점 등)" },
    { id: "agri", rate: 20, label: "농업·임업·어업", ex: "" },
    { id: "parcel", rate: 20, label: "소화물 전문 운송업", ex: "퀵서비스 등" },
    { id: "lodging", rate: 25, label: "숙박업", ex: "펜션, 게스트하우스" },
    { id: "build", rate: 30, label: "건설업", ex: "인테리어 등 최종소비자 대상만 간이과세 가능" },
    { id: "transport", rate: 30, label: "운수 및 창고업(소화물 전문 운송업 제외)", ex: "개인택시, 화물 운송" },
    { id: "ict", rate: 30, label: "정보통신업", ex: "" },
    { id: "service", rate: 30, label: "그 밖의 서비스업", ex: "미용실, 세탁소, 수리점 등" },
    { id: "rent", rate: 40, label: "부동산임대업", ex: "연 공급대가 4,800만 원 이상이면 간이과세 불가" },
    { id: "pro", rate: 40, label: "전문·과학·기술서비스업, 사업지원·임대서비스업 등", ex: "금융·보험 관련 서비스, 부동산 관련 서비스 포함. 전문·과학·기술서비스업과 사업시설관리·사업지원·임대서비스업은 최종소비자 대상이 아니면 간이과세 불가" },
  ];

  // 카드 발행세액공제 업종 요건(2025년 매출 4,800만 원 이상인 기존 간이과세자만 해당): B2C 는 확실, CHECK 는 소비자 대상일 때만(화면에서 확인 안내)
  const CARD_B2C = ["retail", "food", "lodging"];
  const CARD_CHECK = ["service", "transport"];
  const fl = Math.floor;
  const won = (v) => Math.max(0, fl(Number(v) || 0));
  const industry = (id) => INDUSTRIES.find((x) => x.id === id) || null;

  // 2026년 영업 개월 수. open: "before"(2025년 이전 개업) 또는 2026년 개업 월(1~12).
  // 법 제69조③: 개업일부터 12월 31일까지를 12개월로 환산하고 1개월 미만 끝수는 1개월. 그래서 m월 중 어느 날 개업해도 13 − m 개월.
  // "switch": 2026-07-01 일반과세자 → 간이과세자 전환자. 간이 과세기간이 7~12월 6개월이다(법 제5조④1호, 제69조③3호).
  function months(open) {
    if (open === "before" || open == null || open === "") return 12;
    if (open === "switch") return 6;
    const m = Number(open);
    if (!(m >= 1 && m <= 12) || fl(m) !== m) return null;
    return 13 - m;
  }

  // 계산. rows: [{ ind, sales }] 업종별 2026년 공급대가(부가세 포함 매출), purchase: 세금계산서·카드·현금영수증으로 받은 매입 공급대가,
  // card: 매출 중 신용카드·현금영수증·간편결제 등으로 받은 금액, einv: 전자세금계산서 발급 건수, prepaid: 7월에 이미 낸 예정부과·예정신고 세액,
  // prevOver: (2025년 이전 개업자·전환자) 2025년 공급대가가 4,800만 원 이상이었는지, stock: (전환자만) 세무서가 통지한 재고납부세액, efile: 직접 전자신고 여부, opts.efileAmount: 전자신고세액공제 금액(과거 사례 재현용)
  function calc({ rows = [], open = "before", prevOver = false, purchase = 0, card = 0, einv = 0, prepaid = 0, stock = 0, efile = true } = {}, opts = {}) {
    const mo = months(open);
    const sw = open === "switch";
    if (mo == null) return { error: "open" };
    const lines = [];
    for (const r of rows) {
      const it = industry(r.ind);
      if (!it) return { error: "industry" };
      const sales = won(r.sales);
      if (sales > 0) lines.push({ ind: it.id, label: it.label, rate: it.rate, sales, tax: fl((sales * it.rate) / 1000) }); // 공급대가 × 부가가치율 × 10%
    }
    const sales = lines.reduce((s, x) => s + x.sales, 0);
    const gross = lines.reduce((s, x) => s + x.tax, 0); // 업종별 계산의 합계 (법 제63조② 후단)
    // 12개월 환산 매출 (화면 표시용, 원 미만 버림). 판정은 나눗셈 없이 정수로 비교한다.
    const annual = fl((sales * 12) / mo);
    const exempt = sales * 12 < EXEMPT * mo;
    const overSimple = sales * 12 >= SIMPLE_MAX * mo;

    // 영수증만 발급하는 간이과세자(법 제36조①2호): 2026년 개업(첫 과세기간) 또는 2025년 공급대가 4,800만 원 미만.
    // 이들은 카드 발행세액공제를 업종과 관계없이 받고(법 제46조①1호나), 전자세금계산서 발급세액공제는 받지 않는다(법 제63조④).
    // 그 밖의 간이과세자는 주로 소비자 대상 업종(시행령 제88조②→제73조①: 소매·음식·숙박·미용·여객운송 등)만 카드 공제를 받는다(법 제46조①1호가).
    // 전환자는 2025년에 이미 사업을 했으므로 기존 사업자와 같이 2025년 공급대가로 본다.
    const receiptOnly = (open !== "before" && !sw) || !prevOver;
    const cardOk = receiptOnly || lines.every((x) => CARD_B2C.includes(x.ind) || CARD_CHECK.includes(x.ind));
    const cardIn = won(card), purchaseIn = won(purchase);
    const cr = {
      purchase: fl((purchaseIn * PURCHASE_PERMILLE) / 1000),
      cardRaw: cardOk ? fl((cardIn * CARD.permille) / 1000) : 0,
      einv: receiptOnly ? 0 : Math.min(won(einv) * EINV.per, EINV.cap),
      efile: efile ? (opts.efileAmount ?? EFILE) : 0,
    };
    cr.card = Math.min(cr.cardRaw, CARD.cap);
    cr.cardCapped = cr.cardRaw > CARD.cap;
    const credits = cr.purchase + cr.card + cr.einv + cr.efile;
    // 공제 합계가 세액을 넘으면 넘는 부분은 없는 것으로 본다(법 제63조⑥, 제46조②, 조특법 제104조의8②). 간이과세자는 환급이 없다.
    const afterCredits = Math.max(0, gross - credits);
    const lost = Math.max(0, credits - gross);
    const pre = sw ? 0 : won(prepaid);
    const stk = sw ? won(stock) : 0;
    const payable = (exempt ? 0 : Math.max(0, afterCredits - pre)) + stk;
    const prepaidOver = exempt ? pre : Math.max(0, pre - afterCredits);

    const warn = [];
    if (cardIn > sales) warn.push("card-over-sales");
    if (sales === 0) warn.push("no-sales");
    if (lines.some((x) => ["mfg", "build", "rent", "pro"].includes(x.ind))) warn.push("excluded-industry");
    if (sw) warn.push("switch");
    else if (mo < 12) warn.push("annualized");
    if (overSimple) warn.push("over-simple");
    if (!cardOk && cardIn > 0) warn.push("card-not-eligible");
    if (!receiptOnly && cardOk && cardIn > 0 && lines.some((x) => CARD_CHECK.includes(x.ind))) warn.push("card-check");
    if (receiptOnly && won(einv) > 0) warn.push("einv-not-eligible");
    if (!overSimple && sales * 12 >= EXEMPT * mo) warn.push(lines.some((x) => x.ind === "rent") ? "rent-over" : "invoice-next");

    return { months: mo, switched: sw, stock: stk, receiptOnly, cardOk, lines, sales, annual, exempt, overSimple, gross, credits, cr, afterCredits, lost, prepaid: pre, payable, prepaidOver, warn };
  }

  // 신고 기한까지 남은 날 (한국 시간 기준, 오늘 포함하지 않음)
  function daysLeft(today) {
    const k = new Date(today.getTime() + 9 * 3600 * 1000);
    const t0 = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
    const [y, m, d] = DUE.split("-").map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - t0) / 86400000);
  }

  const wonStr = (n) => fl(n).toLocaleString("ko-KR") + "원";
  const man = (n) => { if (!n) return "0원"; const v = n / 10000; return (Math.round(v * 10) / 10).toLocaleString("ko-KR") + "만 원"; };

  g.SVAT = { YEAR, DUE, EXEMPT, SIMPLE_MAX, PURCHASE_PERMILLE, CARD, EINV, EFILE, INDUSTRIES, industry, months, calc, daysLeft, wonStr, man };
})(typeof window !== "undefined" ? window : globalThis);
