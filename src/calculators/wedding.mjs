// 결혼 준비: 결혼식 식대·축의금 계산기, 결혼 비용 양가 분담 계산기, 결혼 준비 결제 일정 계산기.
// 계산은 docs/assets/wedding-engine.js(결혼 준비 시트와 같은 엔진, 본부 저장소 ventures/wedding-sheet/template/engine.mjs 그대로 복사)가 하고,
// docs/assets/wedding-input.js 가 간단한 입력을 엔진 입력으로 바꾼다. 화면은 docs/assets/wedding-ui.js.
// 시세 출처: 본부 저장소 ventures/wedding-sheet/benchmark.md 6장 (2026-11-22~23 확인). 예시 카드의 숫자는 빌드 때 엔진으로 계산한다.
// 입력값(인원·금액)은 주소·통계·저장소에 넣지 않는다. 세금·위약금은 다루지 않는다.
import { ARROW } from "../layout.mjs";
import { mealCalc, splitCalc, payCalc, MEAL_EXAMPLE, SPLIT_EXAMPLE, PAY_EXAMPLE, SHEET, METHODS, PAYER_OPTS, MAX_ROWS } from "../../docs/assets/wedding-input.js";

const CHECKED = "2026-11-23";
const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const won = (x) => `${Number(x).toLocaleString("ko-KR")}원`;
const SRC = {
  kca: a("https://www.fnnews.com/news/202610120606031746", "파이낸셜뉴스 2026-10-12(한국소비자원 참가격)"),
  sbs: a("https://biz.sbs.co.kr/amp/article/20000339402", "SBS Biz 2026-10-12"),
  newsis: a("https://www.newsis.com/view/NISX20260804_0003736206", "뉴시스 2026-08-05"),
  hk: a("https://www.hankyung.com/amp/2026033064751", "한국경제 2026-03-30"),
  gift: a("https://v.daum.net/v/20260516003319431", "조선일보 아무튼 주말·틸리언 조사(2026-05)"),
};

const unitInput = (attr, unit, { value = "", ph = "", mode = "numeric", label = "" } = {}) => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input ${attr} type="text" inputmode="${mode}" autocomplete="off"${value !== "" && value !== null ? ` value="${value}"` : ""}${ph ? ` placeholder="${ph}"` : ""}${label ? ` aria-label="${label}"` : ""}></div></div>`;
const field = (id, label, input, help = "") => `<div class="field"><label for="${id}">${label}</label>${input}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const actions = (exId) => `<div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button><button class="btn btn-ghost btn-sm" type="button" id="${exId}"><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> 예시로 채우기</button></div>
  <p class="note tx-privacy">입력한 인원과 금액은 이 브라우저 안에서만 계산해요. 어디에도 보내거나 저장하지 않아요.</p>`;
const promo = (id, body) => `<div class="card bz ap-promo" id="${id}"><h2>${SHEET.name}</h2>${P(body)}${P(`<a href="${SHEET.href}" rel="noopener" data-template-link data-placement="promo">판매 페이지에서 자세히 보기 ${ARROW}</a>`)}${P(`가격은 ${SHEET.price}이에요. Gumroad에서 팔고, 결제는 달러로 처리돼서 해외결제가 되는 카드가 필요할 수 있어요.`)}</div>`;

// ── 제휴 링크 묶음 (페이지당 1곳, 결과 바로 아래) ─────────────
// 근거: 본부 저장소 ops/operating-policy.md 5·6장, research/제휴플랫폼_국내_2026-11-26.md 4장 아이디어 3 (2026-11-26).
// 쿠팡은 검색 결과 링크(상품을 고르지 않고 가격을 저장·표시하지 않는다), 신혼여행 숙소는 링크프라이스 아고다 링크(매체 날셈 nalsem.suik.me, 2026-11-26 승인, 첫 화면으로 감).
// 대가 문구는 묶음 맨 위에 확정 표현으로 쓰고, 플랫폼 지정 문구를 그대로 붙인다. 후기형 문구·이미지·플로팅·대출·카드 할부 추천은 넣지 않는다.
// <aside>로 감싸서 FAQ 구조화 데이터(layout.mjs faqOf)에 들어가지 않게 한다.
const CP = (code) => `https://link.coupang.com/a/${code}`;
// 아고다: 2026-11-26 확인 결과 도시 페이지·검색 주소로 딥링크해도 아고다 첫 화면(ko-kr)으로 간다. 그래서 도시 이름을 붙이지 않고 첫 화면 링크 1개만 쓴다.
const AGODA_HOME = `https://click.linkprice.com/click.php?m=agoda&a=A100710565&l=9999&l_cd1=3&l_cd2=0&tu=${encodeURIComponent("https://www.agoda.com/ko-kr/")}`;
export const AFF = {
  "wedding-meal": {
    title: "하객 준비물 찾아보기",
    items: [
      { p: "coupang", id: "gift", name: "결혼식 답례품", note: "쿠팡 검색 결과", url: CP("iYqBfpozim") },
      { p: "coupang", id: "invitation", name: "청첩장", note: "쿠팡 검색 결과", url: CP("iYqCVytIbY") },
      { p: "coupang", id: "guestbook", name: "웨딩 방명록", note: "쿠팡 검색 결과", url: CP("iYqFTemRAi") },
    ],
  },
  "wedding-split": {
    title: "예단·혼수 찾아보기",
    items: [
      { p: "coupang", id: "yedan-bedding", name: "예단 이불", note: "쿠팡 검색 결과", url: CP("iYqHBWJbUq") },
      { p: "coupang", id: "robot-vacuum", name: "로봇청소기", note: "쿠팡 검색 결과", url: CP("iYqHmnLHLE") },
      { p: "coupang", id: "dishwasher", name: "식기세척기", note: "쿠팡 검색 결과", url: CP("iYqF3m8z9w") },
    ],
  },
  "wedding-payment": {
    title: "신혼여행 숙소 찾아보기",
    items: [
      { p: "agoda", id: "agoda-home", name: "아고다에서 신혼여행 숙소 찾기", note: "아고다 첫 화면", url: AGODA_HOME },
      { p: "coupang", id: "carrier", name: "여행용 캐리어", note: "쿠팡 검색 결과", url: CP("iYqGdRMvVQ") },
    ],
  },
};
export const AFF_DISC = {
  base: "이 영역의 링크로 구매하거나 예약하면 날셈이 판매 수수료를 받습니다. 구매 가격은 같습니다.",
  coupang: "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.",
  agoda: "이 포스팅은 제휴마케팅이 포함된 광고로 커미션을 지급 받습니다.",
};
export function affBox(slug) {
  const b = AFF[slug];
  if (!b || !b.items.length) return "";
  const ps = [...new Set(b.items.map((x) => x.p))];
  const disc = [AFF_DISC.base, ...ps.map((p) => AFF_DISC[p])].join(" ");
  return `<aside class="card bz wd-aff" aria-label="광고: ${b.title}"><p class="wd-aff-disc"><b>광고</b> ${disc}</p><h2>${b.title}</h2><ul class="wd-aff-list">${b.items.map((x) => `<li><a href="${x.url}" target="_blank" rel="sponsored nofollow noopener" data-aff="${x.p}" data-aff-item="${x.id}">${x.name}</a><small>${x.note}</small></li>`).join("")}</ul><p class="wd-aff-note">가격과 재고는 이동한 사이트에서 확인하세요. 날셈은 상품을 팔거나 추천 순위를 매기지 않습니다.</p></aside>`;
}

// ── 식대·축의금 ──────────────────────────────────────────────
const E = MEAL_EXAMPLE;
const cell = (l, html) => `<div class="wd-c" data-l="${l}">${html}</div>`;
const groupRow = (g, i) => `<div class="wd-g">
      ${cell("그룹", unitInput(`id="wm-n${i}" data-k="name"`, "", { value: g.name, mode: "text", label: `${g.side} 그룹 ${(i % 4) + 1} 이름` }))}
      ${cell("초대", unitInput(`id="wm-i${i}" data-k="invited"`, "명", { value: g.invited, label: `${g.side} ${g.name} 초대 인원` }))}
      ${cell("참석률", unitInput(`id="wm-r${i}" data-k="rate"`, "%", { value: g.ratePct, label: `${g.side} ${g.name} 예상 참석률` }))}
      ${cell("1인 축의금", unitInput(`id="wm-g${i}" data-k="gift"`, "원", { value: g.gift, label: `${g.side} ${g.name} 1인 축의금` }))}
    </div>`;
const groupSet = (side) => `<fieldset class="tx-group"><legend>${side} 하객</legend>
    <div class="wd-g wd-head" aria-hidden="true"><span>그룹</span><span>초대</span><span>참석률</span><span>1인 축의금</span></div>
    <div class="wd-groups" data-side="${side}">
    ${E.groups.map((g, i) => [g, i]).filter(([g]) => g.side === side).map(([g, i]) => groupRow(g, i)).join("\n    ")}
    </div>
  </fieldset>`;

const MEAL_FORM = `<form id="wmf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>예식장 계약</legend>
    <div class="form-row cols-2">
      ${field("wm-price", "1인 식대", unitInput(`id="wm-price"`, "원", { value: E.mealPrice }), "2026년 중간값은 전국 6만 원, 서울 8만 원이에요.")}
      ${field("wm-guar", "최소 보증인원", unitInput(`id="wm-guar"`, "명", { value: E.guarantee }), "실제로 덜 먹어도 이 인원만큼 식대를 내요. 비우면 0명이에요.")}
    </div>
    ${field("wm-rate", "식사 비율 (선택)", unitInput(`id="wm-rate"`, "%", { value: E.mealRatePct, ph: "100" }), "참석한 하객 중 식사하는 비율이에요. 답례품만 받고 가는 하객이 있으면 100%보다 낮게 잡아요. 비우면 100%예요.")}
  </fieldset>
  ${groupSet("신랑측")}
  ${groupSet("신부측")}
  <p class="help">참석률은 초대한 사람 중 실제로 올 것 같은 비율이에요. 빈칸이면 100%로 계산해요. 그룹 이름은 바꿔 써도 돼요.</p>
  ${actions("wm-example")}
</form>`;

const me = mealCalc(E);
const MEAL_INFO = [
  affBox("wedding-meal"),
  card("보증인원이 뭔가요?", UL([
    "예식장과 계약할 때 약속하는 <b>최소 식사 인원</b>이에요. 실제 식사 인원이 적어도 보증인원만큼 식대를 내요.",
    "그래서 청구되는 식사 인원은 <b>보증인원과 예상 식사 인원 중 큰 쪽</b>이에요.",
    "보증인원을 못 채우면 비어 있는 자리만큼 식대가 그냥 나가요. 이 계산기는 그 금액을 따로 보여 줘요.",
    "보증인원을 줄일 수 있는 시점과 방법은 예식장마다 달라요. 계약서를 확인하세요.",
  ])),
  card("2026년 식대·보증인원·축의금 시세", UL([
    "1인 식대 중간값: <b>전국 6만 원, 서울 8만 원, 경인 6.2만 원</b> (2026-08 기준)",
    "식사 형태별 식대: 코스 11.9만 원, 뷔페 6.2만 원, 한상차림 5.5만 원 (2026-02 기준)",
    "최소 보증인원: <b>200명</b>이 가장 흔해요. 서울 등 5개 지역 평균 224명, 부산 등 4개 지역 평균 102명",
    "축의금 평균 <b>97,900원</b>. 10만 원이 65.3%, 5만 원 이하 21.9% (2026-05 성인 1,500명 조사)",
  ]), `${SRC.kca}, ${SRC.sbs}, ${SRC.newsis}, ${SRC.hk}, ${SRC.gift} (${CHECKED} 확인)`),
  card("예시: 보증 200명, 1인 66,000원", P(`신랑측·신부측 하객을 그룹 4개씩 나눠 넣었어요(위 입력칸의 처음 값). 식사 비율은 90%예요.`)
    + UL([
      `예상 참석 ${me.total.attend}명 (신랑측 ${me.groom.attend}, 신부측 ${me.bride.attend}) → 식사 ${me.total.eat}명`,
      `식사 ${me.total.eat}명이 보증 ${E.guarantee}명보다 많아서 ${me.billed}명분 식대 <b>${won(me.mealTotal)}</b>`,
      `식대 나누기(식사 인원 비율): 신랑측 ${won(me.groom.meal)}, 신부측 ${won(me.bride.meal)}`,
      `예상 축의금 ${won(me.total.gift)} → <b>축의금 − 식대 ${won(me.total.net)}</b>`,
      `참석자 한 명이 평균 ${won(me.breakEven)}을 내면 식대만큼이에요.`,
    ])),
  card("이렇게 계산해요", UL([
    "그룹별 예상 참석 = 초대 인원 × 참석률. 1명 단위로 반올림해요.",
    "측별 식사 인원 = 예상 참석 × 식사 비율. 1명 단위로 반올림해요.",
    "식대 = max(보증인원, 식사 인원 합계) × 1인 식대",
    "식대를 양가로 나눌 때는 식사 인원 비율을 써요. 신랑측 몫을 원 단위로 반올림하고 나머지를 신부측 몫으로 해서, 합이 늘 식대와 같아요.",
    "예상 축의금 = 그룹별 예상 참석 × 1인 축의금",
  ])),
  card("이 페이지에 대해", UL([
    "<b>참고용 예상치예요.</b> 실제 식대·보증인원·추가 비용(대관료, 음료, 봉사료)은 예식장 계약서를 기준으로 하세요.",
    "축의금 세금, 계약 해지 위약금은 다루지 않아요.",
    `계산은 날셈의 ${SHEET.name}과 같은 엔진으로 해요. 엑셀 수식과 53가지 상황을 맞춰 봤어요.`,
  ])),
  promo("wedding-sheet", "식대는 시작일 뿐이에요. 예식장·스드메·신혼여행의 계약금·중도금·잔금 날짜와 양가 분담을 한 파일에 넣으면 다음 결제 5건, 이번 달 낼 돈, 양가 정산, 하객 손익이 자동으로 계산돼요. 이 계산기와 같은 하객·식대 표가 들어 있고, 계산한 식대가 결제 일정 첫 줄에 자동으로 들어가요."),
].join("");

// ── 양가 분담 ───────────────────────────────────────────────
const S = SPLIT_EXAMPLE;
const opts = (list, sel) => list.map(([v, t]) => `<option value="${v}"${v === sel ? " selected" : ""}>${t}</option>`).join("");
const SPLIT_ROW_TPL = `<template id="ws-tpl"><div class="tx-dep ws-row">
  <div class="tx-dep-head"><b class="ws-name">항목</b><button type="button" class="tx-x" data-remove aria-label="이 항목 빼기"><iconify-icon icon="solar:close-circle-linear"></iconify-icon></button></div>
  <div class="form-row cols-2">
    <div class="field"><label data-for="name">항목 이름</label><input data-k="name" type="text" autocomplete="off" placeholder="예: 스드메 패키지"></div>
    <div class="field"><label data-for="amount">금액</label>${unitInput(`data-k="amount"`, "원", { ph: "2940000" })}</div>
  </div>
  <div class="form-row cols-2">
    <div class="field"><label data-for="method">분담 방식</label><select data-k="method">${opts(METHODS.map((m) => [m, m]), "반반")}</select></div>
    <div class="field ws-ratio"><label data-for="ratio">신랑측 비율</label>${unitInput(`data-k="ratio"`, "%", { ph: "기본 비율" })}</div>
  </div>
  <div class="field"><label data-for="payer">실제로 낸 쪽</label><select data-k="payer">${opts(PAYER_OPTS, "아직")}</select></div>
</div></template>`;

const SPLIT_FORM = `<form id="wsf" autocomplete="off" novalidate>
  ${SPLIT_ROW_TPL}
  <fieldset class="tx-group"><legend>항목</legend>
    <div id="ws-rows" class="tx-deps"></div>
    <div class="actions"><button class="btn btn-ghost btn-sm" type="button" id="ws-add"><iconify-icon icon="solar:add-circle-linear"></iconify-icon> 항목 더하기</button></div>
    <p class="help">계약금·잔금처럼 나눠 내는 항목은 낸 회차만 한 줄로 넣어도 돼요. 최대 15줄이에요.</p>
  </fieldset>
  <fieldset class="tx-group"><legend>기준</legend>
    ${field("ws-ratio", "기본 신랑측 비율", unitInput(`id="ws-ratio"`, "%", { value: S.defaultRatioPct, ph: "50" }), "'비율' 항목에서 칸을 비워 두면 이 비율을 써요. 비우면 50%예요.")}
    <div class="form-row cols-2">
      ${field("ws-gg", "신랑측 하객", unitInput(`id="ws-gg"`, "명", { value: S.guestsGroom }), "'하객 비율' 항목에만 써요.")}
      ${field("ws-gb", "신부측 하객", unitInput(`id="ws-gb"`, "명", { value: S.guestsBride }), "식사 인원이나 초대 인원 중 하나로 맞춰 넣어요.")}
    </div>
  </fieldset>
  ${actions("ws-example")}
</form>`;

const se = splitCalc(S);
const seLine = (i) => se.lines[i];
const SPLIT_INFO = [
  affBox("wedding-split"),
  card("분담 방식 5가지", UL([
    "<b>반반</b>: 반씩 내요.",
    "<b>비율</b>: 신랑측 비율을 정해요. 예: 60%면 신랑측 6, 신부측 4",
    "<b>하객 비율</b>: 양가 하객 수 비율로 나눠요. 식대·예식장처럼 하객 수에 따라 커지는 항목에 맞아요.",
    "<b>신랑측 전액 / 신부측 전액</b>: 예물·예단처럼 한쪽이 맡는 항목이에요.",
    "방식은 정답이 없어요. 상견례 전에 큰 항목부터 양가가 같이 정해 두면 나중에 덜 헷갈려요.",
  ])),
  card("정산은 이렇게 해요", UL([
    "항목마다 <b>실제로 낸 쪽</b>을 고르면, 낸 돈을 정한 방식대로 나눴을 때의 몫과 비교해요.",
    "더 낸 쪽이 있으면 덜 낸 쪽이 그 차이만큼 보내면 돼요. 그 금액과 방향을 보여 줘요.",
    "'아직 안 냄' 항목은 양가 부담에는 들어가지만 정산에서는 빠져요. 내고 나서 낸 쪽을 바꾸면 돼요.",
    "'분담대로 나눠 냄'은 이미 정한 몫대로 따로 낸 항목이라 정산할 돈이 생기지 않아요.",
  ])),
  card("예시: 6개 항목, 하객 135명 : 121명", UL([
    `${seLine(0).name} ${won(seLine(0).amount)}, 하객 비율 → 신랑측 ${won(seLine(0).groom)}, 신부측 ${won(seLine(0).bride)} (신랑측이 냄)`,
    `${seLine(1).name} ${won(seLine(1).amount)}, 반반 (신부측이 냄)`,
    `${seLine(4).name} ${won(seLine(4).amount)}, 신랑측 60% → 신랑측 ${won(seLine(4).groom)} (신랑측이 냄)`,
    `예물은 신랑측 전액, 예단은 신부측 전액, 청첩장·답례품은 아직 안 냄`,
    `양가 부담: 신랑측 ${won(se.split.groomBurden)}, 신부측 ${won(se.split.brideBurden)}`,
    `낸 돈: 신랑측 ${won(se.split.groomPaid)}, 신부측 ${won(se.split.bridePaid)} → <b>${se.split.direction} ${won(se.split.settleAmount)}</b>`,
  ])),
  card("이렇게 계산해요", UL([
    "항목마다 신랑측 몫을 원 단위로 반올림하고, 나머지를 신부측 몫으로 해요. 그래서 양가 몫을 더하면 항상 금액과 같아요.",
    "하객 비율 = 신랑측 하객 ÷ (신랑측 + 신부측). 하객 수를 비우면 반반으로 계산해요.",
    "정산 = 신랑측이 실제로 낸 돈 − 낸 항목들의 신랑측 몫. 플러스면 신부측이 신랑측에 보내요.",
  ])),
  card("이 페이지에 대해", UL([
    "<b>참고용 계산이에요.</b> 양가가 합의한 방식과 실제 영수증을 기준으로 하세요.",
    "축의금을 어느 쪽 몫으로 볼지, 세금, 계약 해지 위약금은 다루지 않아요. 축의금과 식대 손익은 결혼식 식대·축의금 계산기에서 볼 수 있어요.",
    `계산은 날셈의 ${SHEET.name}과 같은 엔진으로 해요. 엑셀 수식과 53가지 상황을 맞춰 봤어요.`,
  ])),
  promo("wedding-sheet", "업체·항목 40줄에 계약금·중도금·잔금 날짜까지 넣으면 D-day와 상태(예정·임박·연체·완료), 달마다 낼 돈과 양가 몫, 누가 누구에게 얼마를 보내면 되는지가 자동으로 계산돼요. 이 계산기와 같은 분담 방식 5가지를 써요."),
].join("");

// ── 결제 일정 ───────────────────────────────────────────────
const dateInput = (attr, label) => `<input ${attr} type="date" min="2020-01-01" max="2035-12-31"${label ? ` aria-label="${label}"` : ""}>`;
const part = (k, title, { auto = false } = {}) => `<div class="wp-part" data-part="${k}">
      <div class="wp-l"><b>${title}</b><label class="wp-chk"><input type="checkbox" data-k="${k}-paid"> 냄</label></div>
      ${auto ? `<div class="wp-auto" aria-live="polite"><output data-k="bal-amount">0원</output></div>` : `<div class="wp-c">${unitInput(`data-k="${k}-amount"`, "원", { label: `${title} 금액` })}</div>`}
      <div class="wp-c">${dateInput(`data-k="${k}-date"`, `${title} 날짜`)}</div>
    </div>`;
const PAY_ROW_TPL = `<template id="wp-tpl"><div class="tx-dep wp-row">
  <div class="tx-dep-head"><b class="wp-name">항목</b><button type="button" class="tx-x" data-remove aria-label="이 항목 빼기"><iconify-icon icon="solar:close-circle-linear"></iconify-icon></button></div>
  <div class="form-row cols-2">
    <div class="field"><label data-for="name">항목 이름</label><input data-k="name" type="text" autocomplete="off" placeholder="예: 스드메 패키지"></div>
    <div class="field"><label data-for="total">총액</label>${unitInput(`data-k="total"`, "원", { ph: "2940000" })}</div>
  </div>
  ${part("dep", "계약금")}
  ${part("mid", "중도금")}
  ${part("bal", "잔금 (자동)", { auto: true })}
</div></template>`;

const PAY_FORM = `<form id="wpf" autocomplete="off" novalidate>
  ${PAY_ROW_TPL}
  <fieldset class="tx-group"><legend>예식</legend>
    <div class="form-row cols-2">
      ${field("wp-wedding", "예식일", `<input id="wp-wedding" type="date" min="2020-01-01" max="2035-12-31">`, "잔금 날짜를 비운 항목은 예식일에 내는 것으로 봐요.")}
      ${field("wp-budget", "총 예산 (선택)", unitInput(`id="wp-budget"`, "원", { ph: "42000000" }), "넣으면 계약 총액을 빼고 남은 돈을 보여 줘요.")}
    </div>
  </fieldset>
  <fieldset class="tx-group"><legend>업체·항목</legend>
    <div id="wp-rows" class="tx-deps"></div>
    <div class="actions"><button class="btn btn-ghost btn-sm" type="button" id="wp-add"><iconify-icon icon="solar:add-circle-linear"></iconify-icon> 항목 더하기</button></div>
    <p class="help">총액과 계약금·중도금만 넣으면 잔금은 자동이에요. 이미 낸 회차는 '냄'을 체크하세요. 최대 ${MAX_ROWS}줄이에요.</p>
  </fieldset>
  <p class="help">D-day와 상태는 오늘 날짜를 기준으로 계산해요. 14일 이내면 '임박', 날짜가 지났는데 안 냈으면 '연체'예요.</p>
  ${actions("wp-example")}
</form>`;

const pe = payCalc(PAY_EXAMPLE);
const md = (iso) => { const [, m, d] = iso.split("-"); return `${+m}월 ${+d}일`; };
const dd = (n) => (n === 0 ? "D-day" : n > 0 ? `D-${n}` : `D+${-n}`);
const PAY_INFO = [
  affBox("wedding-payment"),
  card("계약금·중도금·잔금, 이렇게 넣어요", UL([
    "업체마다 <b>총액</b>과 <b>계약금·중도금의 금액과 날짜</b>를 넣어요. 잔금은 총액 − 계약금 − 중도금으로 자동 계산돼요.",
    "잔금 날짜를 비우면 예식일에 내는 것으로 봐요. 예식장 식대처럼 당일 정산하는 항목은 그대로 비워 두면 돼요.",
    "회차가 더 많으면 같은 업체를 두 줄로 나눠 적어요. 예: 스드메 1차, 스드메 2차",
    "이미 낸 회차는 '냄'을 체크하세요. 낸 돈·남은 돈과 상태(예정·임박·연체·완료)가 바로 바뀌어요.",
  ])),
  card(`예시: 2027년 5월 15일 예식, 항목 ${PAY_EXAMPLE.rows.length}개`, P(`기준일 ${md(PAY_EXAMPLE.today)}, 총 예산 ${won(PAY_EXAMPLE.budget)}으로 계산했어요. '예시로 채우기'를 누르면 오늘 날짜에 맞춰 날짜를 옮겨 채워요.`)
    + UL([
      `예식 <b>${dd(pe.weddingDday)}</b>, 계약 총액 <b>${won(pe.contractTotal)}</b>`,
      `낸 돈 ${won(pe.paid)}, 남은 돈 ${won(pe.unpaid)}, 예산에서 남은 돈 ${won(pe.budgetLeft)}`,
      `다음 결제: ${md(pe.upcoming[0].date)} ${pe.upcoming[0].name} ${won(pe.upcoming[0].amount)} (${dd(pe.upcoming[0].dday)}, ${pe.upcoming[0].status})`,
      `14일 안에 낼 결제 ${pe.soonCount}건, 가장 많이 내는 달은 예식 달(${won(pe.months.at(-1).total)})`,
    ])),
  card("2026년 예식 비용 시세", UL([
    "예식장 + 스드메 평균 <b>2,112만 원</b> (2026년 10월 예식, 전년보다 8.5% 올라요). 2027년 10월 예식 계약 평균은 2,214만 원",
    "예식장 평균 1,788만 원(중간값 1,520만 원), 스드메 평균 324만 원(중간값 294만 원)",
    "지역별 총비용: 강남 3,419만 원, 강남 외 서울 3,154만 원, 수도권 2,834만 원, 비수도권 1,569만 원 (2026-08 기준, 식비가 61%)",
    "계약금·중도금·잔금 비율은 공식 통계가 없어요. 업체 계약서에 적힌 금액과 날짜를 그대로 넣으세요.",
  ]), `${SRC.kca}, ${SRC.sbs} (${CHECKED} 확인)`),
  card("이렇게 계산해요", UL([
    "잔금 = 총액 − 계약금 − 중도금. 계약금과 중도금을 더한 금액이 총액보다 크면 '금액 확인'으로 표시해요.",
    "다음 결제는 아직 안 낸 회차 중 날짜가 가장 빠른 것이에요. 같은 항목의 같은 날 회차는 합쳐서 보여 줘요.",
    "상태: 다 냈으면 완료, 날짜가 지났으면 연체, 14일 이내면 임박, 그 밖에는 예정이에요.",
    "달마다 낼 돈은 회차 날짜가 속한 달에 금액을 더해요. 이번 달부터 24개월까지 보여 줘요.",
  ])),
  card("이 페이지에 대해", UL([
    "<b>참고용 계산이에요.</b> 실제 금액과 날짜는 업체 계약서와 안내를 기준으로 하세요.",
    "계약 해지 위약금, 카드 할부 이자는 다루지 않아요. 양가가 나눠 내는 금액은 결혼 비용 양가 분담 계산기에서 볼 수 있어요.",
    `계산은 날셈의 ${SHEET.name}과 같은 엔진으로 해요. 엑셀 수식과 53가지 상황을 맞춰 봤어요.`,
  ])),
  promo("wedding-sheet", "이 계산기의 결제 일정을 40줄까지 넣고, 항목마다 양가 분담 방식(반반·비율·하객 비율·한쪽 전액)과 하객 수로 계산한 식대까지 한 파일에서 관리해요. 다음 결제 5건, 이번 달 낼 돈, 달마다 신랑측·신부측 몫, 누가 누구에게 얼마를 보내면 되는지가 자동으로 나와요."),
].join("");

export const wedding = [
  {
    slug: "wedding-meal", cat: "wedding", title: "결혼식 식대·축의금 계산기", short: "보증인원·식사 인원으로 식대와 축의금 손익",
    lede: "1인 식대, 최소 보증인원, 양가 하객 그룹별 초대 인원·참석률·축의금을 넣으면 청구되는 식대와 보증 미달로 더 내는 식대, 신랑측·신부측 축의금에서 식대를 뺀 금액을 계산해요. 참고용 예상치예요.",
    description: "결혼식 식대·축의금 계산기. 1인 식대·최소 보증인원·식사 비율과 신랑측·신부측 하객 그룹별 초대 인원·참석률·1인 축의금을 넣으면 예상 식사 인원, 보증인원과 비교한 식대 총액, 보증 미달 식대, 측별 식대 몫과 축의금 − 식대를 계산합니다. 2026년 식대 중간값 전국 6만·서울 8만 원 참고.",
    keys: ["결혼식 식대 계산기", "보증인원 계산", "축의금 식대 계산", "결혼식 축의금 손익", "하객 수 식대", "웨딩홀 식대 계산", "결혼식 식대 보증인원", "축의금 얼마 들어올까"],
    form: MEAL_FORM, modules: ["wedding-ui.js"], related: ["wedding-split", "wedding-payment", "d-day"],
    info: MEAL_INFO,
  },
  {
    slug: "wedding-split", cat: "wedding", title: "결혼 비용 양가 분담 계산기", short: "항목별 분담 방식과 누가 얼마를 보낼지",
    lede: "결혼 준비 항목마다 반반·비율·하객 비율·한쪽 전액 중에서 분담 방식을 고르고 실제로 낸 쪽을 넣으면, 신랑측·신부측 부담과 누가 누구에게 얼마를 보내면 되는지 계산해요.",
    description: "결혼 비용 양가 분담 계산기. 예식장·스드메·예물·예단·신혼여행 같은 항목별로 반반·비율·하객 비율·신랑측 전액·신부측 전액 중 분담 방식과 실제로 낸 쪽을 넣으면 양가 부담 합계와 정산 금액(누가 누구에게 얼마)을 계산합니다. 원 단위까지 양가 몫의 합이 금액과 같습니다.",
    keys: ["결혼 비용 분담 계산기", "양가 분담 계산", "결혼 비용 반반", "결혼 준비 정산", "예식 비용 분담 비율", "하객 비율 분담", "결혼 비용 누가 얼마", "결혼 자금 정산"],
    form: SPLIT_FORM, modules: ["wedding-ui.js"], related: ["wedding-meal", "wedding-payment", "d-day"],
    info: SPLIT_INFO,
  },
  {
    slug: "wedding-payment", cat: "wedding", title: "결혼 준비 결제 일정 계산기", short: "계약금·중도금·잔금 D-day와 달마다 낼 돈",
    lede: "예식장·스드메·예물·신혼여행처럼 업체마다 다른 계약금·중도금·잔금의 금액과 날짜를 넣으면 잔금, 다음 결제와 D-day, 연체·임박, 낸 돈·남은 돈, 달마다 낼 돈을 한 번에 계산해요.",
    description: "결혼 준비 결제 일정 계산기. 예식장·스드메·예물·신혼여행 등 업체별 총액과 계약금·중도금 금액·날짜, 잔금 날짜를 넣으면 잔금 자동 계산, 다음 결제 5건과 D-day, 연체·임박 상태, 계약 총액·낸 돈·남은 돈·예산 잔액, 달마다 낼 돈을 계산합니다. 2026년 예식장+스드메 평균 2,112만 원 참고.",
    keys: ["결혼 준비 결제 일정", "결혼 비용 계산기", "결혼 예산 계산기", "계약금 중도금 잔금 계산", "웨딩 잔금 계산", "결혼 준비 비용 정리", "결혼식 D-day 결제", "스드메 잔금 날짜"],
    form: PAY_FORM, modules: ["wedding-ui.js"], related: ["wedding-split", "wedding-meal", "d-day"],
    info: PAY_INFO,
  },
];
