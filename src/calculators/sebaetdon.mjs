// 생활비: 2027 설 세뱃돈 계산기. 토스 미니앱 '설날 세뱃돈 계산기'(본부 저장소 ventures/sebaetdon/)의 웹판.
// 계산은 docs/assets/sebaetdon-calc.js(토스 앱과 같은 표·규칙)가, 화면은 docs/assets/sebaetdon-ui.js가 한다. 예시 카드 숫자는 빌드 때 엔진으로 계산한다.
// 입력값(인원·금액)은 주소·통계·저장소에 넣지 않는다.
import { ARROW } from "../layout.mjs";
import { sebaetdon, AGE_GROUPS, LEVELS, KID_AMOUNTS, ADULT_AMOUNTS, SOURCES, EXAMPLE, HOLIDAY_TEXT, formatManwon, budgetMessage, MAX_KIDS_PER_GROUP, MAX_ADULTS } from "../../docs/assets/sebaetdon-calc.js";

const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const M = formatManwon;

// ── 제휴 링크 묶음 (페이지당 1곳) ─────────────
// 근거: 본부 저장소 ops/operating-policy.md 5장(시즌 상품: 설 선물), research/제휴플랫폼_국내_2026-11-26.md.
// 쿠팡 검색 결과 링크(상품을 고르지 않고 가격을 저장·표시하지 않는다). url이 빈 항목은 내지 않고, 모두 비면 묶음 전체를 내지 않는다.
// 대가 문구는 묶음 맨 위에 확정 표현으로 쓴다. <aside>로 감싸 FAQ 구조화 데이터(layout.mjs faqOf)에 들어가지 않게 한다.
// 클릭은 화면 스크립트가 affiliate_click(계산기·항목 id·플랫폼)만 보낸다.
export const AFF = {
  title: "설 준비물 찾아보기",
  items: [
    // 2026-11-26 쿠팡 파트너스 간편 링크로 만듦, curl -I 로 q=세뱃돈봉투·용돈박스·설 선물세트와 AF 태그 확인
    { id: "envelope", name: "세뱃돈 봉투", note: "쿠팡 검색 결과", url: "https://link.coupang.com/a/iYxLX4Cxj2" },
    { id: "money-box", name: "용돈 박스 (부모님 용돈)", note: "쿠팡 검색 결과", url: "https://link.coupang.com/a/iYxNTzTdvw" },
    { id: "gift-set", name: "설 선물세트", note: "쿠팡 검색 결과", url: "https://link.coupang.com/a/iYxOMGcj2y" },
  ],
};
export const AFF_DISC = "이 영역의 링크로 구매하면 날셈이 판매 수수료를 받습니다. 구매 가격은 같습니다. 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
export function affBox() {
  const list = AFF.items.filter((x) => x.url);
  if (!list.length) return "";
  return `<aside class="card bz wd-aff" aria-label="광고: ${AFF.title}"><p class="wd-aff-disc"><b>광고</b> ${AFF_DISC}</p><h2>${AFF.title}</h2><ul class="wd-aff-list">${list.map((x) => `<li><a href="${x.url}" target="_blank" rel="sponsored nofollow noopener" data-aff-link data-aff-id="${x.id}" data-aff-net="coupang">${x.name}</a><small>${x.note}</small></li>`).join("")}</ul><p class="wd-aff-note">가격과 재고는 쿠팡에서 확인하세요. 날셈은 상품을 팔거나 추천 순위를 매기지 않습니다.</p></aside>`;
}

// ── 입력 양식 ─────────────
const unitInput = (attr, unit, { value = "", ph = "", label = "" } = {}) => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input ${attr} type="text" inputmode="numeric" autocomplete="off"${value !== "" ? ` value="${value}"` : ""}${ph ? ` placeholder="${ph}"` : ""}${label ? ` aria-label="${label}"` : ""}></div></div>`;
const field = (id, label, input, help = "") => `<div class="field"><label for="${id}">${label}</label>${input}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const seg = (id, label, opts, sel, help = "") => `<div class="field"><label id="${id}-l">${label}</label><div class="seg" id="${id}" role="group" aria-labelledby="${id}-l">${opts.map((o) => `<button type="button" data-v="${o.value}" aria-pressed="${o.value === sel}">${o.label}</button>`).join("")}</div>${help ? `<p class="help">${help}</p>` : ""}</div>`;

const FORM = `<form id="sbf" autocomplete="off" novalidate>
  <p class="note" id="sb-dday" aria-live="polite">2027 설날은 2월 7일(일)이에요.</p>
  <fieldset class="tx-group"><legend>세뱃돈 줄 아이 (나이대별 인원)</legend>
    <div class="form-row cols-3">
      ${AGE_GROUPS.map((g) => field(`sb-${g.id}`, g.label, unitInput(`id="sb-${g.id}" data-kid="${g.id}"`, "명", { ph: "0" }))).join("\n      ")}
    </div>
    <p class="help">나이대마다 최대 ${MAX_KIDS_PER_GROUP}명까지 넣을 수 있어요. 빈칸은 0명이에요.</p>
  </fieldset>
  <fieldset class="tx-group"><legend>용돈 드릴 어른</legend>
    ${field("sb-adults", "부모님·어른 수", unitInput(`id="sb-adults"`, "분", { ph: "0" }), `양가 부모님, 조부모님처럼 용돈 봉투를 따로 드릴 분 수예요. 최대 ${MAX_ADULTS}분이에요.`)}
  </fieldset>
  ${seg("sb-level", "금액 기준", LEVELS, "normal", "보통은 2026년 설 보도에 나온 나이대별 범위의 가운데 값이에요.")}
  <fieldset class="tx-group"><legend>선택 입력 (만 원)</legend>
    <div class="form-row cols-3">
      ${field("sb-budget", "세뱃돈 예산", unitInput(`id="sb-budget"`, "만 원", { ph: "예: 30" }), "넣으면 이 안에 맞춰 1인 금액을 다시 나눠요.")}
      ${field("sb-travel", "귀성 교통비", unitInput(`id="sb-travel"`, "만 원", { ph: "예: 12" }), "기름값·통행료·기차표")}
      ${field("sb-gifts", "차례·선물비", unitInput(`id="sb-gifts"`, "만 원", { ph: "예: 30" }), "장보기·선물세트")}
    </div>
  </fieldset>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button><button class="btn btn-ghost btn-sm" type="button" id="sb-example"><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> 예시로 채우기</button></div>
  <p class="note tx-privacy">입력한 인원과 금액은 이 브라우저 안에서만 계산해요. 어디에도 보내거나 저장하지 않아요.</p>
</form>`;

// ── 설명 카드 ─────────────
const ex = sebaetdon(EXAMPLE);
const exKids = ex.rows.map((r) => `${r.label} ${r.count}명`).join(", ");
const amountTable = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>나이대</th>${LEVELS.map((l) => `<th>${l.label}</th>`).join("")}</tr></thead><tbody>${AGE_GROUPS.map((g) => `<tr><td>${g.label}</td>${LEVELS.map((l) => `<td>${M(KID_AMOUNTS[g.id][l.value])}</td>`).join("")}</tr>`).join("")}<tr><td>부모님·어른 (1분)</td>${LEVELS.map((l) => `<td>${M(ADULT_AMOUNTS[l.value])}</td>`).join("")}</tr></tbody></table></div>`;

const INFO = [
  affBox(),
  card("2027년 설 연휴는 언제인가요?", UL([
    `설날은 <b>2027년 2월 7일(일)</b>이에요. 연휴는 ${HOLIDAY_TEXT}이라 4일 쉬어요.`,
    "설날이 일요일과 겹쳐서 연휴 다음 평일인 2월 9일(화)이 대체공휴일이에요.",
    "세뱃돈 신권은 연휴 직전 주에 은행 창구가 붐비니 미리 준비하는 편이 편해요.",
  ]), "한국천문연구원 월력 자료 2027, 관공서의 공휴일에 관한 규정"),
  card("나이대별 세뱃돈, 보통 얼마 주나요?", P("2024~2026년 설 무렵 보도된 조사를 나이대별로 정리했어요. 정답이 아니라 참고값이에요. 보통은 2026년 설 보도에 나온 범위의 가운데 값이고, 넉넉하게의 어른 30만 원은 당근 설문에서 가장 많이 고른 금액이에요.") + amountTable, SOURCES.join(" / ")),
  card(`예시: 아이 ${ex.kidsCount}명, 부모님 ${ex.adults}분`, P(`${exKids}에게 '보통' 기준으로 주고, 부모님 두 분께 용돈을 드리고, 교통비 ${M(EXAMPLE.travel)}·차례·선물비 ${M(EXAMPLE.gifts)}을 넣었어요.`) + UL([
    `세뱃돈 ${M(ex.kidsTotal)} + 부모님 용돈 ${M(ex.adultTotal)} + 교통비 ${M(ex.travel)} + 차례·선물비 ${M(ex.gifts)} = <b>${M(ex.grandTotal)}</b>`,
    `신권은 5만 원권 ${ex.bills.fiveMan}장, 1만 원권 ${ex.bills.oneMan}장 (세뱃돈·용돈 봉투만 셈)`,
    `세뱃돈 예산을 ${M(EXAMPLE.budget)}으로 잡으면 1인 금액을 ${ex.budgetPlan.rows.map((r) => `${r.label} ${r.perPerson}만`).join(", ")} 원으로 줄여요. ${budgetMessage(ex.budgetPlan)}`,
  ])),
  card("신권은 몇 장 바꿔야 하나요?", UL([
    "봉투마다 5만 원권을 먼저 넣고, 나머지를 1만 원권으로 채운다고 보고 장수를 세요. 7만 원이면 5만 원권 1장 + 1만 원권 2장이에요.",
    "봉투끼리 합치지 않아요. 3만 원 봉투 두 개는 5만 원권 없이 1만 원권 6장이 필요해요.",
    "명절 전에는 은행 창구에서 신권으로 바꾸려는 사람이 많아요. 교환 기간과 1인 한도는 은행·지점마다 달라서 미리 확인하세요.",
  ])),
  card("이렇게 계산해요", UL([
    "세뱃돈 = 나이대별 1인 금액 × 인원. 금액은 위 표의 고른 기준 열을 써요.",
    "부모님 용돈 = 1분 금액 × 인원. 올해 설에 나갈 돈 = 세뱃돈 + 용돈 + 교통비 + 차례·선물비",
    "예산을 넣고 세뱃돈 합계가 예산을 넘으면, 1인 금액에 (예산 ÷ 합계)를 곱해 1만 원 단위로 내려요. 최소 1만 원이고, 나이가 많은 쪽이 어린 쪽보다 적어지지 않게 맞춰요. 남는 돈은 다시 나누지 않아요.",
    "부모님 용돈은 예산 맞추기에서 건드리지 않아요.",
  ])),
  card("이 페이지에 대해", UL([
    "<b>참고값이에요.</b> 집안마다 정한 금액이 있으면 그걸 따르세요.",
    "토스 앱에서도 같은 계산을 할 수 있어요. 토스에서 '설날 세뱃돈 계산기'를 검색하세요.",
    "2027년 1월 설 무렵 새 조사가 나오면 금액표를 다시 확인해요.",
  ])),
].join("");

export const sebaetdonCalc = [
  {
    slug: "sebaetdon", cat: "bill", title: "2027 설 세뱃돈 계산기", short: "조카 나이대별 세뱃돈·부모님 용돈과 설 지출 합계",
    lede: "세뱃돈 줄 아이를 나이대별로, 용돈 드릴 어른 수를 넣으면 보도된 조사 기준의 보통 금액으로 세뱃돈과 부모님 용돈 합계, 예산에 맞춘 1인 금액, 은행에서 바꿀 5만 원권·1만 원권 신권 장수를 계산해요. 귀성 교통비와 차례·선물비를 넣으면 올해 설에 나갈 돈 전체가 나와요.",
    description: `2027 설 세뱃돈 계산기. 미취학·초등·중고생·대학생 조카 인원과 부모님 수를 넣으면 나이대별 세뱃돈 보통 금액(미취학 2만, 초등 고학년 5만, 고등 7만, 대학생 10만 원)과 부모님 용돈 합계, 예산에 맞춘 금액, 신권 장수, 교통비·차례·선물비를 더한 설 지출을 계산합니다. 2027 설 연휴 2월 6~9일.`,
    keys: ["세뱃돈 계산기", "세뱃돈 얼마", "2027 세뱃돈", "조카 세뱃돈", "세뱃돈 시세", "부모님 설 용돈", "설 용돈 얼마", "세뱃돈 신권", "설날 지출", "세뱃돈 적정 금액"],
    form: FORM, modules: ["sebaetdon-ui.js"], related: ["holidays", "lunar-to-solar", "d-day"],
    info: INFO,
  },
];
