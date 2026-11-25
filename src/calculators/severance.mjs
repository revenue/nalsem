// 급여·인건비: 2027 퇴직금 계산기 (입사일·마지막 근무일·3개월 임금 → 평균임금·퇴직금).
// 계산은 docs/assets/severance-calc.js 가 급여 엔진(alba-pay-engine.js, 급여대장 엑셀과 같은 엔진)의 severanceEstimate 를 불러서 한다.
// 화면은 docs/assets/severance-ui.js. 규칙 출처: 본부 저장소 ventures/payroll-template/rules-2027.md 6장(퇴직급여법 제4·8조, 근로기준법 제2조).
// 예시 숫자는 빌드 때 엔진으로 계산한다. 입력값(날짜·임금)은 주소·통계·저장소에 넣지 않는다.
import { ARROW } from "../layout.mjs";
import { severance, EXAMPLE } from "../../docs/assets/severance-calc.js";
import { TEMPLATE } from "./alba.mjs";
import { gearCard } from "./pay-gear.mjs";

const CHECKED = "2026-11-25";
const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const won = (n) => `${Math.round(Number(n)).toLocaleString("ko-KR")}원`;
const SRC = {
  art4: a("https://casenote.kr/법령/근로자퇴직급여_보장법/제4조", "근로자퇴직급여 보장법 제4조"),
  art8: a("https://casenote.kr/법령/근로자퇴직급여_보장법/제8조", "제8조"),
  art2: a("https://casenote.kr/법령/근로기준법/제2조", "근로기준법 제2조(평균임금)"),
  faq: a("https://www.moel.go.kr/faq/faqView.do?seqRepeat=89", "고용노동부 자주 묻는 질문(퇴직금)"),
  calc: a("https://www.moel.go.kr/retirementpayCal.do", "고용노동부 퇴직금 계산기"),
};

const ymd = (id, label, [y, m, d], help = "") => `<div class="field" id="${id}"><label for="${id}-y">${label}</label><div class="ymd"><div class="unit" data-unit="년"><input id="${id}-y" type="text" inputmode="numeric" maxlength="4" data-len="4" value="${y}" autocomplete="off"></div><div class="unit" data-unit="월"><input id="${id}-m" type="text" inputmode="numeric" maxlength="2" data-len="2" value="${m}" autocomplete="off" aria-label="${label} 월"></div><div class="unit" data-unit="일"><input id="${id}-d" type="text" inputmode="numeric" maxlength="2" data-len="2" value="${d}" autocomplete="off" aria-label="${label} 일"></div></div>${help ? `<p class="help">${help}</p>` : ""}</div>`;
const unitInput = (id, unit, { value = "", ph = "" } = {}) => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input id="${id}" type="text" inputmode="numeric" autocomplete="off"${value !== "" ? ` value="${value}"` : ""}${ph ? ` placeholder="${ph}"` : ""}></div></div>`;
const field = (id, label, input, help = "") => `<div class="field"><label for="${id}">${label}</label>${input}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const seg = (id, label, opts, help = "") => `<div class="field"><label id="${id}-l">${label}</label><div class="seg" id="${id}" role="group" aria-labelledby="${id}-l">${opts.map(([v, t], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>${help ? `<p class="help">${help}</p>` : ""}</div>`;
const parts = (s) => { const [y, m, d] = s.split("-"); return [y, String(+m), String(+d)]; };

const FORM = `<form id="svf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>근무 기간</legend>
    ${ymd("sv-hire", "입사일", parts(EXAMPLE.hireDate))}
    ${ymd("sv-last", "마지막 근무일", parts(EXAMPLE.lastDay), "퇴직일은 마지막 근무일 다음 날로 계산해요.")}
  </fieldset>
  <fieldset class="tx-group"><legend>임금 (세전)</legend>
    ${field("sv-pay", "월 급여", unitInput("sv-pay", "원", { value: "3,000,000" }), "기본급과 매달 받는 수당을 더한 금액이에요. 퇴직 전 3개월은 이 금액 × 3으로 봐요.")}
    <div class="form-row cols-2">
      ${field("sv-bonus", "1년 상여금", unitInput("sv-bonus", "원", { value: "0" }), "퇴직 전 1년 동안 받은 상여금. 3/12만 더해요.")}
      ${field("sv-leave", "1년 연차수당", unitInput("sv-leave", "원", { value: "0" }), "쓰지 못한 연차를 돈으로 받은 금액. 3/12만 더해요.")}
    </div>
  </fieldset>
  <details class="tx-fold"><summary>더 정확하게 (선택)</summary><div class="tx-fold-body">
    ${field("sv-three", "퇴직 전 3개월 임금 합계 (직접 넣기)", unitInput("sv-three", "원", { ph: "비워 두면 월 급여 × 3" }), "3개월 동안 급여가 달랐다면 급여명세서의 세전 합계를 넣으세요.")}
    ${seg("sv-hours", "1주 근무시간 (4주 평균)", [["over15", "15시간 이상"], ["under15", "15시간 미만"]], "15시간 미만이면 퇴직금이 없어요.")}
  </div></details>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button></div>
  <p class="note tx-privacy">입력한 날짜와 임금은 이 브라우저 안에서만 계산해요. 어디에도 보내거나 저장하지 않아요.</p>
</form>`;

const ex = severance(EXAMPLE);
const exBonus = severance({ ...EXAMPLE, bonusYear: 3600000, leaveYear: 600000 });
const ex1y = severance({ hireDate: "2026-01-01", lastDay: "2026-12-31", monthly: 2236300 });

const INFO = [
  card("퇴직금은 누가 받나요?", UL([
    "<b>1년 이상</b> 일하고, 4주 평균 <b>1주 15시간 이상</b> 일하기로 했다면 받아요.",
    "<b>5인 미만 사업장도, 알바·계약직도</b> 똑같아요.",
    "1년에서 하루라도 모자라면 받지 못해요. 예: 1월 2일 입사, 12월 31일까지 일하면 364일이에요.",
    "퇴직하면 <b>14일 안에</b> 줘야 해요. 서로 합의하면 날짜를 미룰 수 있어요.",
  ]), `${SRC.art4}, ${SRC.art8}`),
  card("얼마를 받나요?", UL([
    "<b>퇴직금 = 1일 평균임금 × 30일 × (재직일수 ÷ 365)</b>",
    "1일 평균임금 = 퇴직 전 3개월 동안 받은 임금 총액 ÷ 그 3개월의 날짜 수(89~92일)",
    "상여금과 연차수당은 1년 동안 받은 금액의 3/12만 3개월 임금에 더해요.",
    `예: 월 300만 원으로 3년(${ex.serviceDays.toLocaleString("ko-KR")}일) 일하고 2027년 3월 1일까지 근무하면 평균임금 ${won(ex.avgDaily)}, 퇴직금 <b>${won(ex.amount)}</b>이에요.`,
    `같은 사람이 1년 상여금 360만 원, 연차수당 60만 원을 받았다면 <b>${won(exBonus.amount)}</b>이에요.`,
    `2027년 최저 월급(${won(2236300)})으로 딱 1년 일하면 ${won(ex1y.amount)}이에요.`,
  ]), `${SRC.art2}, ${SRC.faq}`),
  card("계산할 때 헷갈리는 것", UL([
    "<b>퇴직일</b>은 마지막으로 일한 날의 다음 날이에요. 12월 31일까지 일했으면 퇴직일은 1월 1일이에요.",
    "3개월 날짜 수는 달마다 달라요. 퇴직일이 1월 1일이면 10~12월 92일, 3월 2일이면 90일이에요.",
    "평균임금이 통상임금보다 적으면 통상임금으로 계산해요. 3개월 중 무급 휴직이 길었다면 고용노동부 계산기로 다시 확인하세요.",
    "육아휴직·업무상 재해로 쉰 기간은 3개월 계산에서 빼요. 이 계산기는 그런 기간이 없다고 봐요.",
    "퇴직소득세는 빼지 않았어요. 실제로 받는 돈은 세금을 뗀 금액이에요.",
  ]), SRC.calc),
  card(`사장님이라면: ${TEMPLATE.name}`, P(`직원이 1년을 넘기면 퇴직금이 생겨요. 급여대장 엑셀은 직원별로 매달 퇴직금 적립 예상액(월 급여의 1/12)을 사장님 월 인건비에 함께 보여 줘서, 퇴직금을 미리 모아 둘 수 있어요. 주휴·가산수당·4대보험까지 한 번에 계산하고, 구글시트에서도 열려요. 가격은 ${TEMPLATE.price}이에요.`)
    + P(`<a href="${TEMPLATE.href}" rel="noopener" data-template-link data-placement="promo">판매 페이지에서 자세히 보기 ${ARROW}</a>`)
    + P(`직원 연차와 연차수당까지 함께 관리하려면 <a href="https://suikster0.gumroad.com/l/payroll-leave-2027" rel="noopener" data-template-link data-item="payroll-leave-bundle-2027" data-placement="promo-bundle">급여대장 + 연차관리대장 묶음(13,900원)</a>도 있어요.`)
    + P(`월급별 4대보험은 <a href="/insurance/">4대보험 계산기</a>, 알바 한 달 인건비는 <a href="/alba-pay/">알바 인건비 계산기</a>에서 볼 수 있어요.`)),
  gearCard(),
  card("이 페이지에 대해", UL([
    "<b>참고용 계산이에요. 노무 자문이 아니에요.</b> 다툼이 있으면 고용노동부(국번 없이 1350)에 물어보세요.",
    `계산은 날셈의 2027 급여대장 엑셀과 같은 엔진으로 해요. 기준 확인일은 ${CHECKED}예요.`,
  ])),
].join("");

export const severancePay = [
  {
    slug: "severance", cat: "pay", title: "2027 퇴직금 계산기", short: "입사일·월급으로 평균임금과 퇴직금",
    lede: "입사일, 마지막 근무일, 월급을 넣으면 1일 평균임금과 퇴직금을 계산해요. 상여금·연차수당 3/12 가산, 1년·주 15시간 조건, 달마다 다른 3개월 날짜 수까지 반영해요. 참고용이고 노무 자문이 아니에요.",
    description: "2027 퇴직금 계산기. 입사일·마지막 근무일·월급을 넣으면 퇴직일, 재직일수, 퇴직 전 3개월 임금과 날짜 수, 1일 평균임금, 퇴직금(평균임금 × 30 × 재직일수 ÷ 365)을 계산합니다. 상여금·연차수당 3/12 가산, 1년 미만·주 15시간 미만 판정, 5인 미만·알바 포함.",
    keys: ["퇴직금 계산기", "2027 퇴직금", "퇴직금 계산법", "평균임금 계산", "알바 퇴직금", "퇴직금 조건", "1년 퇴직금", "퇴직금 상여금"],
    form: FORM, modules: ["severance-ui.js"], related: ["insurance", "alba-pay", "annual-leave"],
    info: INFO,
  },
];
