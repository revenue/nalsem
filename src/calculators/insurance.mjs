// 급여·인건비: 2027 4대보험 계산기 (월급 → 근로자·사업주 4대보험료).
// 계산은 docs/assets/insurance-calc.js 가 급여 엔진(alba-pay-engine.js, 급여대장 엑셀과 같은 엔진)의 socialInsurance 를 불러서 한다.
// 화면은 docs/assets/insurance-ui.js. 요율 출처: 본부 저장소 ventures/payroll-template/rules-2027.md 0·4장 (2026-11-22 확인,
// 고용보험 2027 요율은 2026-11-25 다시 찾아봐도 시행령 공포 전). 예시 숫자는 빌드 때 엔진으로 계산한다. 입력값은 주소·통계·저장소에 넣지 않는다.
import { ARROW } from "../layout.mjs";
import { insure, EXAMPLE } from "../../docs/assets/insurance-calc.js";
import { TEMPLATE } from "./alba.mjs";
import { gearCard } from "./pay-gear.mjs";

const CHECKED = "2026-11-25";
const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const num = (n) => Number(n).toLocaleString("ko-KR");
const won = (n) => `${num(n)}원`;
const SRC = {
  pension: a("https://www.mohw.go.kr/menu.es?mid=a10714060000", "보건복지부 연금개혁 Q&amp;A"),
  health: a("https://www.korea.kr/news/policyNewsView.do?newsId=148971715", "정책브리핑 2026-09-11(건강보험)"),
  ltc: a("https://www.korea.kr/news/policyNewsView.do?newsId=148974757", "정책브리핑 2026-11-02(장기요양)"),
  employ: a("https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19866", "고용노동부 보도자료 2026-09-01(고용보험 정부안)"),
  insure: a("https://www.4insure.or.kr/ptl/totalinfo/tab01/page05.html", "4대사회보험정보연계센터 적용 제외 안내"),
  ltcRound: a("https://www.4insure.or.kr/pbiz/ntcn/selectInstNtcMttrDetail.do?pstSn=2056025", "4대사회보험정보연계센터 공지 2026-11-12(장기요양 계산 방식)"),
};

const unitInput = (id, unit, { value = "", ph = "", mode = "numeric" } = {}) => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input id="${id}" type="text" inputmode="${mode}" autocomplete="off"${value !== "" ? ` value="${value}"` : ""}${ph ? ` placeholder="${ph}"` : ""}></div></div>`;
const field = (id, label, input, help = "") => `<div class="field"><label for="${id}">${label}</label>${input}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const seg = (id, label, opts, help = "") => `<div class="field"><label id="${id}-l">${label}</label><div class="seg" id="${id}" role="group" aria-labelledby="${id}-l">${opts.map(([v, t], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>${help ? `<p class="help">${help}</p>` : ""}</div>`;

const FORM = `<form id="isf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>월급</legend>
    <div class="form-row cols-2">
      ${field("is-pay", "월 급여 (세전)", unitInput("is-pay", "원", { value: "3,000,000" }), "기본급과 수당을 모두 더한 한 달 지급액이에요.")}
      ${field("is-nontax", "그중 비과세", unitInput("is-nontax", "원", { value: "0", ph: "200,000" }), "식대(월 20만 원까지), 자가운전보조금 등은 보험료에서 빠져요.")}
    </div>
    ${seg("is-emp", "고용보험 근로자 요율", [["current", "0.9% (현행)"], ["proposal", "1.0% (2027 정부안)"]], "2027년 요율은 아직 확정되지 않았어요. 정부안은 1.0%예요.")}
  </fieldset>
  <details class="tx-fold"><summary>알바·단시간 직원, 산재보험 (선택)</summary><div class="tx-fold-body">
    ${seg("is-hours", "1주 근무시간", [["over15", "15시간 이상"], ["under15", "15시간 미만"]], "15시간 미만(월 60시간 미만)이면 국민연금·건강보험에 들지 않아요.")}
    ${seg("is-tenure", "일한 기간", [["3plus", "3개월 이상"], ["new", "3개월 미만"]], "15시간 미만이어도 3개월 이상 일하면 고용보험에 들어가요.")}
    ${field("is-acc", "산재보험 요율 (사업주)", unitInput("is-acc", "%", { value: "0", ph: "0.7", mode: "decimal" }), "업종마다 달라요. 모르면 0으로 두세요. 2027년 업종별 요율은 12월 말에 고시돼요.")}
  </div></details>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button></div>
  <p class="note tx-privacy">입력한 월급은 이 브라우저 안에서만 계산해요. 어디에도 보내거나 저장하지 않아요.</p>
</form>`;

const ex = insure(EXAMPLE);
const exMin = insure({ ...EXAMPLE, pay: 2236300 });
const exMeal = insure({ ...EXAMPLE, pay: 3200000, nonTax: 200000 });
const exProp = insure({ ...EXAMPLE, emp: "proposal" });

const RATE_TABLE = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>보험</th><th>근로자</th><th>사업주</th></tr></thead><tbody>
  <tr><td>국민연금</td><td>5.0%</td><td>5.0%</td></tr>
  <tr><td>건강보험</td><td>3.595%</td><td>3.595%</td></tr>
  <tr><td>장기요양</td><td colspan="2">건강보험료의 13.90%</td></tr>
  <tr><td>고용보험</td><td>0.9%</td><td>1.15%</td></tr>
  <tr><td>산재보험</td><td>없음</td><td>업종별</td></tr>
</tbody></table></div>`;

const EX_TABLE = (r) => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>단위: 원</th><th>근로자</th><th>사업주</th></tr></thead><tbody>
  <tr><td>국민연금</td><td>${num(r.employee.pension)}</td><td>${num(r.employer.pension)}</td></tr>
  <tr><td>건강보험</td><td>${num(r.employee.health)}</td><td>${num(r.employer.health)}</td></tr>
  <tr><td>장기요양</td><td>${num(r.employee.ltc)}</td><td>${num(r.employer.ltc)}</td></tr>
  <tr><td>고용보험</td><td>${num(r.employee.employment)}</td><td>${num(r.employer.employment)}</td></tr>
  <tr><td><b>합계</b></td><td><b>${num(r.employee.total)}</b></td><td><b>${num(r.employer.total)}</b></td></tr>
</tbody></table></div>`;

const INFO = [
  card("2027년 4대보험 요율", RATE_TABLE + UL([
    "국민연금은 2027년부터 <b>9.5%에서 10.0%</b>로 올라요. 근로자와 사업주가 5.0%씩 내요.",
    "국민연금·건강보험·장기요양은 확정이에요. 고용보험과 산재보험은 아직 확정되지 않았어요.",
    "고용보험 사업주 1.15%는 근로자와 같은 0.9%에 고용안정·직업능력개발 0.25%(150인 미만)를 더한 값이에요.",
    "건강보험은 2026년과 같아요(동결). 산재보험 업종별 요율은 12월 말에 고시돼요.",
    "고용보험은 근로자 1.0%, 사업주 1.25%로 올리는 정부안이 있어요. 시행령 공포를 아직 확인하지 못했어요. 확정되면 이 페이지를 고칠게요.",
  ]), `${SRC.pension}, ${SRC.health}, ${SRC.ltc}, ${SRC.employ} (${CHECKED} 확인)`),
  card(`예시: 월급 ${won(EXAMPLE.pay)}`, EX_TABLE(ex) + UL([
    `근로자는 월급에서 <b>${won(ex.employee.total)}</b>을 떼고, 사업주는 <b>${won(ex.employer.total)}</b>을 더 내요.`,
    `고용보험이 정부안 1.0%로 정해지면 근로자 몫은 ${won(exProp.employee.total)}, 사업주 몫은 ${won(exProp.employer.total)}이 돼요.`,
    `2027년 최저 월급 ${won(exMin.base)}(209시간)이면 근로자 ${won(exMin.employee.total)}, 사업주 ${won(exMin.employer.total)}이에요.`,
  ])),
  card("이렇게 계산해요", UL([
    "<b>국민연금</b>: 월급(비과세 뺀 금액)의 천 원 미만을 버린 '기준소득월액' × 5%. 기준소득월액은 41만 원~659만 원 안에서만 잡아요(2027년 6월까지).",
    "<b>건강보험</b>: 월급 × 3.595%, 10원 미만 버림.",
    "<b>장기요양</b>: 건강보험료 × 13.90%, 10원 미만 버림. 2026년 11월분부터 이렇게 계산해요.",
    "<b>고용보험</b>: 월급 × 0.9%(근로자), 사업주는 0.25%를 더해요.",
    `비과세는 빼고 계산해요. 월급 320만 원에 식대 20만 원이면 300만 원으로 계산해 근로자 ${won(exMeal.employee.total)}이에요.`,
    "공단 고지액은 입사·퇴사 달, 보수총액 신고, 정산에 따라 몇십 원~몇만 원 다를 수 있어요.",
  ]), SRC.ltcRound),
  card("알바·단시간 직원은요?", UL([
    "1주 15시간 미만(월 60시간 미만)이면 국민연금·건강보험은 보통 들지 않아요.",
    "고용보험은 <b>3개월 이상</b> 계속 일하면 들어가요.",
    "산재보험은 <b>일한 시간과 관계없이</b> 사업주가 내요.",
    `시급·근무시간으로 알바 한 달 인건비를 보려면 <a href="/alba-pay/">알바 인건비 계산기</a>, 주휴수당만 보려면 <a href="/juhyu-pay/">주휴수당 계산기</a>를 쓰세요.`,
  ]), SRC.insure),
  card(`사장님이라면: ${TEMPLATE.name}`, P(`직원이 여러 명이면 한 사람씩 계산기를 돌리기 번거로워요. 근무기록을 넣으면 주휴·연장·야간·휴일수당과 근로자·사업주 4대보험, 사장님 월 인건비까지 한 번에 계산하는 엑셀이에요. 이 페이지와 같은 계산 방식이고, 구글시트에서도 열려요. 가격은 ${TEMPLATE.price}이에요.`)
    + P(`<a href="${TEMPLATE.href}" rel="noopener" data-template-link data-placement="promo">판매 페이지에서 자세히 보기 ${ARROW}</a>`)),
  gearCard(),
  card("이 페이지에 대해", UL([
    "<b>참고용 계산이에요. 노무·세무 자문이 아니에요.</b> 실제 고지액은 국민연금·건강보험·근로복지공단 고지서로 확인하세요.",
    "소득세·지방소득세는 빼지 않았어요. 실수령액은 여기서 소득세를 더 뺀 금액이에요.",
    "계산은 날셈의 2027 급여대장 엑셀과 같은 엔진으로 해요.",
  ])),
].join("");

export const insurance = [
  {
    slug: "insurance", cat: "pay", title: "2027 4대보험 계산기", short: "월급별 근로자·사업주 4대보험료",
    lede: "월급을 넣으면 2027년 요율로 국민연금·건강보험·장기요양·고용보험을 근로자 몫과 사업주 몫으로 나눠 계산해요. 국민연금 5% 인상, 비과세 식대, 주 15시간 미만 알바, 산재보험까지 반영해요. 참고용이고 노무·세무 자문이 아니에요.",
    description: "2027 4대보험 계산기. 월급을 넣으면 2027년 요율(국민연금 5.0%, 건강보험 3.595%, 장기요양 13.90%, 고용보험 0.9%·정부안 1.0%)로 근로자 공제액과 사업주 부담금, 사장님 월 인건비를 계산합니다. 비과세 식대·주 15시간 미만·산재보험 반영.",
    keys: ["4대보험 계산기", "2027 4대보험 요율", "4대보험 계산", "4대보험 사업주 부담금", "2027 국민연금 요율", "월급 4대보험 공제", "4대보험 요율표", "직원 4대보험 계산"],
    form: FORM, modules: ["insurance-ui.js"], related: ["alba-pay", "juhyu-pay", "severance", "annual-leave"],
    info: INFO,
  },
];
