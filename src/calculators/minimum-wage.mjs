// 급여·인건비: 2027 최저임금 계산기 (시급 → 월급·연봉, 월급 → 최저임금 미달 확인).
// 계산은 docs/assets/minimum-wage-calc.js (급여 엔진의 월 유급시간 사용). 화면은 docs/assets/minimum-wage-ui.js.
// 예시 숫자는 빌드 때 계산한다. 입력값은 주소·통계·저장소에 넣지 않는다.
import { ARROW } from "../layout.mjs";
import { minimumWage, EXAMPLE, MIN_2026, MIN_2027 } from "../../docs/assets/minimum-wage-calc.js";
import { TEMPLATE } from "./alba.mjs";
import { gearCard } from "./pay-gear.mjs";

const CHECKED = "2026-11-26";
const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const won = (n) => `${Math.round(Number(n)).toLocaleString("ko-KR")}원`;
const SRC = {
  minwage: a("https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19744", "고용노동부 2027 최저임금 고시 보도자료"),
  act6: a("https://casenote.kr/법령/최저임금법/제6조", "최저임금법 제6조(산입범위)"),
};

const unitInput = (id, unit, { value = "", mode = "numeric" } = {}) => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input id="${id}" type="text" inputmode="${mode}" autocomplete="off"${value !== "" ? ` value="${value}"` : ""}></div></div>`;
const field = (id, label, input, help = "", extra = "") => `<div class="field"${extra}><label for="${id}">${label}</label>${input}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const seg = (id, label, opts, help = "") => `<div class="field"><label id="${id}-l">${label}</label><div class="seg" id="${id}" role="group" aria-labelledby="${id}-l">${opts.map(([v, t], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>${help ? `<p class="help">${help}</p>` : ""}</div>`;
const select = (id, label, opts, sel, help = "") => field(id, label, `<select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(sel) ? " selected" : ""}>${t}</option>`).join("")}</select>`, help);

const FORM = `<form id="mwf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>무엇을 볼까요</legend>
    ${seg("mw-mode", "계산 방식", [["wage", "시급으로 월급 보기"], ["check", "내 월급 확인"]])}
    ${field("mw-wage", "시급", unitInput("mw-wage", "원", { value: "10,700" }), "2027년 최저임금은 10,700원이에요.", ' id="mw-wage-f"')}
    ${field("mw-monthly", "월급 (세전)", unitInput("mw-monthly", "원", { value: "2,200,000" }), "기본급과 매달 고정으로 받는 수당·상여금·식대를 더한 금액. 연장·야간·휴일수당은 빼요.", ' id="mw-monthly-f" hidden')}
    ${field("mw-hours", "1주 근무시간 (계약)", unitInput("mw-hours", "시간", { value: "40", mode: "decimal" }), "휴게시간은 빼요. 15시간 이상이면 주휴시간이 더해져요.")}
    ${select("mw-shop", "사업장 근무 체계", [[5, "주 5일제 (보통)"], [6, "주 6일제"]], 5)}
  </fieldset>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button></div>
  <p class="note tx-privacy">입력한 금액은 이 브라우저 안에서만 계산해요. 어디에도 보내거나 저장하지 않아요.</p>
</form>`;

const ex = minimumWage(EXAMPLE), ex20 = minimumWage({ ...EXAMPLE, weeklyHours: 20 }), ex15 = minimumWage({ ...EXAMPLE, weeklyHours: 15 }), exChk = minimumWage({ ...EXAMPLE, mode: "check" });
const HOURS_TABLE = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>1주 근무</th><th>월 유급시간</th><th>2027 최저 월급</th></tr></thead><tbody>
  ${[40, 35, 30, 25, 20, 15, 14].map((w) => { const r = minimumWage({ ...EXAMPLE, weeklyHours: w }); return `<tr><td>${w}시간</td><td>${r.hours}시간</td><td>${won(r.monthly)}</td></tr>`; }).join("")}
</tbody></table></div>`;

const INFO = [
  card("2027년 최저임금", UL([
    `<b>시급 ${won(MIN_2027)}</b>이에요. 2026년(${won(MIN_2026)})보다 ${won(MIN_2027 - MIN_2026)} 올랐어요. 2027년 1월 1일부터 적용돼요.`,
    `주 40시간 일하면 주휴시간을 더해 한 달 209시간, <b>월 ${won(ex.monthly)}</b>이에요. 2026년(${won(ex.vs2026.monthly2026)})보다 ${won(ex.vs2026.diff)} 많아요.`,
    "5인 미만 사업장, 알바·수습·외국인 근로자도 똑같이 적용돼요. 수습 3개월은 1년 이상 계약일 때만 90%까지 줄 수 있고, 단순 노무직은 줄일 수 없어요.",
  ]), `${SRC.minwage} (${CHECKED} 확인)`),
  card("근무시간별 최저 월급", HOURS_TABLE + UL([
    "월 유급시간 = (1주 근무시간 + 주휴시간) × 365 ÷ 7 ÷ 12예요. 주휴시간은 1주 근무시간 ÷ 5(최대 8시간)예요.",
    `주 20시간이면 ${ex20.hours}시간 ${won(ex20.monthly)}, 주 15시간이면 ${ex15.hours}시간 ${won(ex15.monthly)}이에요.`,
    "주 15시간 미만이면 주휴시간이 없어요. 그래서 14시간과 15시간 사이에 월급 차이가 커요.",
  ])),
  card("내 월급이 최저임금보다 적은지 보는 법", UL([
    "월급을 월 유급시간으로 나눈 시급이 10,700원보다 적으면 미달이에요.",
    `예: 주 40시간에 월 220만 원이면 시급 약 ${won(exChk.hourly)}, 한 달 ${won(exChk.shortfall)}이 모자라요.`,
    "매달 고정으로 받는 상여금·식대·교통비 같은 복리후생비도 2024년부터 전부 최저임금에 넣어 계산해요. 연장·야간·휴일수당과 결혼 축하금 같은 임시 금품은 빼요.",
  ]), SRC.act6),
  card(`사장님이라면: ${TEMPLATE.name}`, P(`2027년 1월부터 최저임금이 바뀌면 직원별 주휴·가산수당과 4대보험도 다시 계산해야 해요. 급여대장 엑셀은 2027년 기준으로 만들어져 있어 근무기록만 넣으면 사장님 월 인건비까지 한 번에 나와요. 구글시트에서도 열려요. 가격은 ${TEMPLATE.price}이에요.`)
    + P(`<a href="${TEMPLATE.href}" rel="noopener" data-template-link data-placement="promo">판매 페이지에서 자세히 보기 ${ARROW}</a>`)
    + P(`주휴수당만 보려면 <a href="/juhyu-pay/">주휴수당 계산기</a>, 알바 한 달 인건비와 4대보험은 <a href="/alba-pay/">알바 인건비 계산기</a>에서 볼 수 있어요.`)),
  gearCard(),
  card("이 페이지에 대해", UL([
    "<b>참고용 계산이에요. 노무 자문이 아니에요.</b>",
    "월 유급시간은 한 달 평균(365일 ÷ 12)으로 계산해요. 실제 달력의 일요일 수에 따라 시급제 알바의 한 달 급여는 조금 달라요.",
  ])),
].join("");

export const minimumWagePay = [
  {
    slug: "minimum-wage", cat: "pay", title: "2027 최저임금 계산기", short: "시급 10,700원 월급·연봉과 미달 확인",
    lede: "2027년 최저임금 시급 10,700원으로 주급, 월급(주휴 포함 209시간), 연봉을 계산해요. 내 월급을 넣으면 시급으로 바꿔 최저임금보다 적은지, 한 달에 얼마가 모자라는지도 알려 드려요. 주 15시간 미만, 주 6일제까지 반영해요. 참고용이고 노무 자문이 아니에요.",
    description: "2027 최저임금 계산기. 2027년 최저시급 10,700원(2026년 10,320원) 기준으로 1주 근무시간별 주급·월급(주 40시간 209시간 2,236,300원)·연봉을 계산하고, 월급을 시급으로 바꿔 최저임금 미달 여부와 부족액을 알려 줍니다. 주휴시간, 주 15시간 미만, 주 6일제 반영.",
    keys: ["최저임금 계산기", "2027 최저임금", "2027 최저시급", "최저임금 월급", "2027 최저임금 월급", "209시간 월급", "최저임금 연봉", "최저임금 위반 확인"],
    form: FORM, modules: ["minimum-wage-ui.js"], related: ["juhyu-pay", "alba-pay", "insurance"],
    info: INFO,
  },
];
