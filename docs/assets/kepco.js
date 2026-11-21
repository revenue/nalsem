/* 날셈 고효율 가전 지원금 엔진 (한전 고효율 가전제품 구매비용 지원사업, 2026년분).
   순수 함수만 둔다. 브라우저(window.KEPCO)와 Node 테스트(test/kepco.test.mjs, vm) 양쪽에서 쓴다.
   금액 단위는 원. 원 미만은 버린다. 한전이 지원금을 어떤 단위에서 끊는지는 공개 자료에 없어 화면에 "약"으로 표시한다.
   출처(2026-11-22 확인): 사업안내 https://en-ter.co.kr/support/info/info01/info.do ,
   지원품목 https://en-ter.co.kr/support/info/info03/info.do , 자주묻는질문 https://en-ter.co.kr/support/bbs/faq/info.do
   본부 저장소 ventures/kepco-appliance/benchmark.md 에 같은 표가 있다.
   입력값(복지할인 유형·금액)은 이 파일 밖으로 나가지 않는다(전송·저장 없음). 해마다 2월 새 공고가 나오면 YEAR·ITEMS·BUDGET 을 고친다. */
(function (g) {
  "use strict";

  const YEAR = 2026;
  const LIMIT = 300000; // 가구당 누적 한도(과거 연도 수령액 포함, 매년 갱신 안 됨)
  const DEADLINE = "2026-12-31"; // 신청 마감(예산 소진 시 조기 종료)
  const BUDGET = { won: 380000000, checked: "2026-11-22" }; // 공식 사이트 첫 화면 "잔여예산" 표시값
  const SRC = {
    info: "https://en-ter.co.kr/support/info/info01/info.do",
    items: "https://en-ter.co.kr/support/info/info03/info.do",
    apply: "https://en-ter.co.kr/support/info/info02/info.do",
    faq: "https://en-ter.co.kr/support/bbs/faq/info.do",
    home: "https://en-ter.co.kr/support/main/main.do",
    search: "https://eep.energy.or.kr/certification/certi_intro.aspx",
  };

  // 복지할인 유형 → 지원율(%)
  const TYPES = [
    { id: "disabled", label: "장애인(중증)", rate: 30 },
    { id: "merit", label: "유공자", rate: 30 },
    { id: "basic", label: "기초생활수급자", rate: 30 },
    { id: "facility", label: "사회복지시설", rate: 30 },
    { id: "nearpoor", label: "차상위계층", rate: 30 },
    { id: "lifesupport", label: "생명유지장치 사용", rate: 30 },
    { id: "multichild", label: "다자녀 가구", rate: 15 },
    { id: "bigfamily", label: "대가족 가구", rate: 15 },
    { id: "birth", label: "출산 가구", rate: 15 },
  ];

  // 지원 품목: 등급(이하)과 적용기준 시행일(이후) 두 가지를 모두 충족해야 한다
  const ITEMS = [
    { id: "fridge", label: "냉장고", grade: 1, since: "2021-10-01", eep: "https://eep.energy.or.kr/certification/certi_list_252.aspx" },
    { id: "kimchi", label: "김치냉장고", grade: 1, since: "2023-05-01", eep: "https://eep.energy.or.kr/certification/certi_list_241.aspx" },
    { id: "ac-wall", label: "에어컨 (벽걸이)", grade: 1, since: "2021-10-01", eep: "https://eep.energy.or.kr/certification/certi_list_260.aspx" },
    { id: "ac-other", label: "에어컨 (스탠드·투인원 등, 시스템 에어컨 제외)", grade: 3, since: "2021-10-01", eep: "https://eep.energy.or.kr/certification/certi_list_260.aspx" },
    { id: "washer", label: "세탁기 (일반)", grade: 2, since: "2022-11-01", eep: "https://eep.energy.or.kr/certification/certi_list_254.aspx" },
    { id: "drum", label: "세탁기 (드럼·세탁건조 콤보)", grade: 1, since: "2022-11-01", eep: "https://eep.energy.or.kr/certification/certi_list_255.aspx" },
    { id: "rice", label: "전기밥솥", grade: 1, since: "2018-04-01", eep: "https://eep.energy.or.kr/certification/certi_list_253.aspx" },
    { id: "vacuum", label: "진공청소기 (유선)", grade: 3, since: "2019-01-01", eep: "https://eep.energy.or.kr/certification/certi_list_115.aspx" },
    { id: "purifier", label: "공기청정기", grade: 1, since: "2018-01-01", eep: "https://eep.energy.or.kr/certification/certi_list_121.aspx" },
    { id: "tv", label: "TV", grade: 1, since: "2022-01-01", eep: "https://eep.energy.or.kr/certification/certi_list_143.aspx" },
    { id: "dehumid", label: "제습기", grade: 1, since: "2024-07-01", eep: "https://eep.energy.or.kr/certification/certi_list_145.aspx" },
    { id: "dryer", label: "의류건조기", grade: 1, since: "2020-03-01", eep: "https://eep.energy.or.kr/certification/certi_list_269.aspx" },
    { id: "dishwasher", label: "식기세척기", grade: 1, since: "2025-01-01", eep: "https://eep.energy.or.kr/certification/certi_list_292.aspx" },
  ];
  const EXCLUDED = ["시스템에어컨", "이동식 에어컨", "냉난방기", "멀티전기히트펌프시스템", "냉동고", "냉온수기", "구독·렌탈 제품", "둥근 모양의 옛 효율등급 라벨 제품"];

  const fl = Math.floor;
  const type = (id) => TYPES.find((t) => t.id === id) || null;
  const item = (id) => ITEMS.find((i) => i.id === id) || null;
  const dot = (iso) => iso.slice(2).replace(/-/g, "."); // 2021-10-01 → 21.10.01

  // 한 제품의 대상 여부. grade: 라벨 등급(1~5), dateOk: "yes" | "no" | "unknown"
  function eligible(itemId, grade, dateOk) {
    const it = item(itemId);
    if (!it) return { ok: false, reason: "item" };
    if (!(grade >= 1 && grade <= 5)) return { ok: false, reason: "grade-missing" };
    if (grade > it.grade) return { ok: false, reason: "grade", need: it.grade };
    if (dateOk === "no") return { ok: false, reason: "date", since: it.since };
    return { ok: true, check: dateOk === "yes" ? null : "date", since: it.since };
  }

  // 가구 계산. typeId: 복지할인 유형, prior: 과거 연도 포함 이미 받은 지원금(원), rows: [{ item, grade, dateOk, price }]
  // 지원금 = 제품별 구매가 × 지원율, 남은 한도 안에서 입력 순서대로 채운다(같은 품목 여러 개도 합계 30만 원까지, FAQ 42번).
  function calc({ typeId, prior = 0, rows = [] }) {
    const t = type(typeId);
    if (!t) return { error: "type" };
    const remaining0 = Math.max(0, LIMIT - Math.max(0, fl(prior)));
    let remaining = remaining0;
    const out = rows.map((r) => {
      const price = Math.max(0, fl(r.price || 0));
      const e = eligible(r.item, r.grade, r.dateOk);
      const raw = e.ok ? fl((price * t.rate) / 100) : 0;
      const support = Math.min(raw, remaining);
      remaining -= support;
      return { item: r.item, label: (item(r.item) || {}).label || "", price, eligible: e, raw, support, capped: support < raw, net: price - support };
    });
    const total = out.reduce((s, r) => s + r.support, 0);
    const price = out.reduce((s, r) => s + r.price, 0);
    return { rate: t.rate, type: t, remainingBefore: remaining0, remainingAfter: remaining, rows: out, total, price, net: price - total, limitHit: remaining === 0 && total > 0 };
  }

  // 마감까지 남은 날 (한국 시간 기준, 오늘 포함하지 않음). today: Date
  function daysLeft(today) {
    const k = new Date(today.getTime() + 9 * 3600 * 1000);
    const t0 = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
    const [y, m, d] = DEADLINE.split("-").map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - t0) / 86400000);
  }

  const man = (won) => { if (!won) return "0원"; const v = won / 10000; return (Math.round(v * 10) / 10).toLocaleString("ko-KR") + "만 원"; };
  const wonStr = (won) => won.toLocaleString("ko-KR") + "원";

  g.KEPCO = { YEAR, LIMIT, DEADLINE, BUDGET, SRC, TYPES, ITEMS, EXCLUDED, type, item, eligible, calc, daysLeft, dot, man, wonStr };
})(typeof window !== "undefined" ? window : globalThis);
