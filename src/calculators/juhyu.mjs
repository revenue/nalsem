// 급여·인건비: 2027 주휴수당 계산기 (한 주·한 달·주휴 포함 월급).
// 계산은 docs/assets/juhyu-pay-calc.js 가 급여 엔진(alba-pay-engine.js, 급여대장 엑셀과 같은 엔진)의 주휴 함수를 불러서 한다.
// 화면은 docs/assets/juhyu-pay-ui.js. 규칙 출처: 본부 저장소 ventures/payroll-template/rules-2027.md 2장 (2026-11-22 확인).
// 예시 카드의 숫자는 빌드 때 엔진으로 계산한다. 입력값(시급·근무시간)은 주소·통계·저장소에 넣지 않는다.
import { ARROW } from "../layout.mjs";
import { juhyu, EXAMPLE } from "../../docs/assets/juhyu-pay-calc.js";
import { TEMPLATE } from "./alba.mjs";

const CHECKED = "2026-11-22";
const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;
const SRC = {
  minwage: a("https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19744", "고용노동부 2027 최저임금 고시 보도자료"),
  art55: a("https://casenote.kr/법령/근로기준법/제55조", "근로기준법 제55조"),
  art18: a("https://casenote.kr/법령/근로기준법/제18조", "제18조③"),
  holidayQA: a("https://www.moel.go.kr/minwon/fastcounsel/fastcounselView.do?inetDcssMngId=202401081620124231000", "고용노동부 상담 답변(주휴 계산)"),
};

const unitInput = (id, unit, { value = "", ph = "", mode = "decimal" } = {}) => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input id="${id}" type="text" inputmode="${mode}" autocomplete="off"${value !== "" ? ` value="${value}"` : ""}${ph ? ` placeholder="${ph}"` : ""}></div></div>`;
const field = (id, label, input, help = "") => `<div class="field"><label for="${id}">${label}</label>${input}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const seg = (id, label, opts, help = "") => `<div class="field"><label id="${id}-l">${label}</label><div class="seg" id="${id}" role="group" aria-labelledby="${id}-l">${opts.map(([v, t], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>${help ? `<p class="help">${help}</p>` : ""}</div>`;
const select = (id, label, opts, sel, help = "") => field(id, label, `<select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(sel) ? " selected" : ""}>${t}</option>`).join("")}</select>`, help);
const MONTHS = Array.from({ length: 12 }, (_, i) => [`2027-${String(i + 1).padStart(2, "0")}`, `2027년 ${i + 1}월`]);

const FORM = `<form id="jhf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>근무 조건</legend>
    <div class="form-row cols-2">
      ${field("jh-wage", "시급", unitInput("jh-wage", "원", { value: "10700", mode: "numeric" }), "2027년 최저임금은 10,700원이에요.")}
      ${field("jh-hours", "1주 근무시간 (계약)", unitInput("jh-hours", "시간", { value: "20" }), "근로계약서에 적힌 1주 시간이에요. 휴게시간은 빼요.")}
    </div>
    ${seg("jh-pattern", "근무 요일과 시간", [["regular", "매주 같아요"], ["irregular", "주마다 들쭉날쭉해요"]], "들쭉날쭉하면 (1주 시간 ÷ 40) × 8 로 계산해요.")}
    ${select("jh-month", "계산할 달", MONTHS, "2027-01", "그 달에 일요일이 몇 번 있는지에 따라 한 달 주휴수당이 달라요.")}
  </fieldset>
  <details class="tx-fold"><summary>더 정확하게 (선택)</summary><div class="tx-fold-body">
    ${select("jh-shop", "사업장 근무 체계", [[5, "주 5일제 (보통)"], [6, "주 6일제"]], 5, "직원 대부분이 주 6일 일하는 사업장이면 1주 시간을 6으로 나눠요.")}
  </div></details>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button></div>
  <p class="note tx-privacy">입력한 시급과 근무시간은 이 브라우저 안에서만 계산해요. 어디에도 보내거나 저장하지 않아요.</p>
</form>`;

const ex = juhyu(EXAMPLE);
const ex40 = juhyu({ ...EXAMPLE, weeklyHours: 40 });
const ex14 = juhyu({ ...EXAMPLE, weeklyHours: 14 });
const exIrr = juhyu({ ...EXAMPLE, weeklyHours: 32, irregular: true });

const INFO = [
  card("주휴수당은 누가 받나요?", UL([
    "<b>1주 15시간 이상</b> 일하기로 계약하고, 그 주에 일하기로 한 날을 <b>모두 나오면</b> 받아요.",
    "5인 미만 사업장도, 알바·단기 근로자도 똑같아요.",
    "지각·조퇴는 결근이 아니에요. 결근한 주는 그 주 주휴수당만 빠져요.",
    `1주 15시간 미만이면 받지 않아요. 예: 1주 14시간이면 ${won(ex14.weekly)}이에요.`,
  ]), `${SRC.art55}, ${SRC.art18}`),
  card("얼마를 받나요?", UL([
    "<b>하루 주휴시간 = 1주 근무시간 ÷ 5</b>예요. 8시간이 최대예요.",
    `1주 20시간 × 시급 10,700원이면 주휴 ${ex.dayHours}시간, <b>${won(ex.weekly)}</b>이에요.`,
    `1주 40시간이면 주휴 8시간, <b>${won(ex40.weekly)}</b>이에요.`,
    `요일·시간이 주마다 다르면 (1주 시간 ÷ 40) × 8이에요. 1주 32시간이면 ${exIrr.dayHours}시간, ${won(exIrr.weekly)}이에요.`,
    "계약보다 더 일한 시간으로 주휴수당이 늘지는 않아요. 기준은 계약한 시간이에요.",
  ]), SRC.holidayQA),
  card("주휴 포함 월급 (209시간)", UL([
    "월급제는 1주 근무시간과 주휴시간을 더해 한 달(365일 ÷ 7 ÷ 12주)로 환산해요.",
    `1주 40시간이면 (40 + 8) × 4.345 ≈ <b>${ex40.monthlyPaidHours}시간</b>, 2027년 최저 월급은 <b>${won(ex40.monthlySalary)}</b>이에요.`,
    `1주 20시간이면 ${ex.monthlyPaidHours}시간, ${won(ex.monthlySalary)}이에요.`,
    "시급제 알바는 실제 달력으로 계산해요. 일요일이 다섯 번인 달은 주휴수당도 다섯 번이에요.",
  ]), `${SRC.minwage} (기준 확인일 ${CHECKED})`),
  card(`사장님이라면: ${TEMPLATE.name}`, P(`직원이 여러 명이면 주휴수당만으로는 부족해요. 근무기록을 넣으면 주휴·연장·야간·휴일수당과 근로자·사업주 4대보험, 사장님 월 인건비까지 한 번에 계산하는 엑셀이에요. 구글시트에서도 열려요. 가격은 ${TEMPLATE.price}이에요.`)
    + P(`<a href="${TEMPLATE.href}" rel="noopener" data-template-link data-placement="promo">판매 페이지에서 자세히 보기 ${ARROW}</a>`)
    + P(`직원 한 명의 한 달 인건비는 무료 <a href="/alba-pay/">2027 알바 인건비 계산기</a>에서 볼 수 있어요.`)),
  card("이 페이지에 대해", UL([
    "<b>참고용 계산이에요. 노무 자문이 아니에요.</b> 실제 지급은 근로계약서와 근무기록으로 다시 확인하세요.",
    "계산은 날셈의 2027 급여대장 엑셀과 같은 엔진으로 해요. 고용노동부 상담 예시 등 19개 사례로 검사했어요.",
  ])),
].join("");

export const juhyuPay = [
  {
    slug: "juhyu-pay", cat: "pay", title: "2027 주휴수당 계산기", short: "1주·한 달 주휴수당과 주휴 포함 월급",
    lede: "시급과 1주 근무시간을 넣으면 2027년 주휴수당을 한 주, 한 달 단위로 계산하고 주휴를 포함한 월급(209시간 방식)도 알려 드려요. 주 15시간 조건, 들쭉날쭉한 근무, 주 6일제 사업장까지 반영해요. 참고용이고 노무 자문이 아니에요.",
    description: "2027 주휴수당 계산기. 시급과 1주 근무시간을 넣으면 하루 주휴시간, 1주 주휴수당, 그 달 일요일 수에 맞춘 한 달 주휴수당, 주휴 포함 월 환산 급여(209시간)를 계산합니다. 2027년 최저임금 10,700원 기준, 주 15시간 미만·불규칙 근무·주 6일제 반영.",
    keys: ["주휴수당 계산기", "2027 주휴수당", "주휴수당 계산법", "주휴수당 조건", "알바 주휴수당", "주 15시간 주휴수당", "주휴 포함 월급", "209시간 월급"],
    form: FORM, modules: ["juhyu-pay-ui.js"], related: ["alba-pay", "simple-vat"],
    info: INFO,
  },
];
