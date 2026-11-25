// 급여·인건비: 2027 연차수당 계산기 (입사일·기준일 → 연차 발생표, 지금 연차, 남은 연차 수당).
// 계산은 docs/assets/annual-leave-calc.js (규칙 주석 참고: 근로기준법 제60조, 대법원 2021다227100, 단시간 비례). 화면은 docs/assets/annual-leave-ui.js.
// 예시 숫자는 빌드 때 계산한다. 입력값(날짜·임금)은 주소·통계·저장소에 넣지 않는다.
import { ARROW } from "../layout.mjs";
import { annualLeave, daysForYear, EXAMPLE } from "../../docs/assets/annual-leave-calc.js";
import { TEMPLATE } from "./alba.mjs";
const LEAVE = { href: "https://suikster0.gumroad.com/l/leave2027", bundle: "https://suikster0.gumroad.com/l/payroll-leave-2027" };
import { gearCard } from "./pay-gear.mjs";

const CHECKED = "2026-11-26";
const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const won = (n) => `${Math.round(Number(n)).toLocaleString("ko-KR")}원`;
const SRC = {
  art60: a("https://casenote.kr/법령/근로기준법/제60조", "근로기준법 제60조(연차 유급휴가)"),
  art18: a("https://casenote.kr/법령/근로기준법/제18조", "제18조③(단시간 근로자)"),
  art11: a("https://casenote.kr/법령/근로기준법/제11조", "제11조(5인 이상 적용)"),
};

const ymd = (id, label, [y, m, d], help = "") => `<div class="field" id="${id}"><label for="${id}-y">${label}</label><div class="ymd"><div class="unit" data-unit="년"><input id="${id}-y" type="text" inputmode="numeric" maxlength="4" data-len="4" value="${y}" autocomplete="off"></div><div class="unit" data-unit="월"><input id="${id}-m" type="text" inputmode="numeric" maxlength="2" data-len="2" value="${m}" autocomplete="off" aria-label="${label} 월"></div><div class="unit" data-unit="일"><input id="${id}-d" type="text" inputmode="numeric" maxlength="2" data-len="2" value="${d}" autocomplete="off" aria-label="${label} 일"></div></div>${help ? `<p class="help">${help}</p>` : ""}</div>`;
const unitInput = (id, unit, { value = "", ph = "", mode = "numeric" } = {}) => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input id="${id}" type="text" inputmode="${mode}" autocomplete="off"${value !== "" ? ` value="${value}"` : ""}${ph ? ` placeholder="${ph}"` : ""}></div></div>`;
const field = (id, label, input, help = "", extra = "") => `<div class="field"${extra}><label for="${id}">${label}</label>${input}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const seg = (id, label, opts, help = "") => `<div class="field"><label id="${id}-l">${label}</label><div class="seg" id="${id}" role="group" aria-labelledby="${id}-l">${opts.map(([v, t], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>${help ? `<p class="help">${help}</p>` : ""}</div>`;
const parts = (s) => { const [y, m, d] = s.split("-"); return [y, String(+m), String(+d)]; };

const FORM = `<form id="alf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>근무 기간</legend>
    ${ymd("al-hire", "입사일", parts(EXAMPLE.hireDate))}
    ${ymd("al-ref", "기준일", parts(EXAMPLE.refDate), "오늘 날짜나 마지막 근무일을 넣으세요. 이날까지 생긴 연차를 계산해요.")}
    ${seg("al-scale", "사업장 규모", [["5plus", "5인 이상"], ["under5", "5인 미만"]], "연차 유급휴가는 상시 5인 이상 사업장에만 적용돼요.")}
  </fieldset>
  <fieldset class="tx-group"><legend>임금 (세전)</legend>
    ${seg("al-paytype", "급여 형태", [["monthly", "월급"], ["hourly", "시급"]])}
    ${field("al-monthly", "월급 (통상임금)", unitInput("al-monthly", "원", { value: "3,000,000" }), "기본급과 매달 고정으로 받는 수당. 연장·야간수당과 상여금은 빼요.", ' id="al-monthly-f"')}
    ${field("al-hourly", "시급", unitInput("al-hourly", "원", { value: "10,700" }), "2027년 최저임금은 10,700원이에요.", ' id="al-hourly-f" hidden')}
    <div class="form-row cols-2">
      ${field("al-hours", "1주 근무시간 (계약)", unitInput("al-hours", "시간", { value: "40", mode: "decimal" }), "40시간 미만이면 연차를 시간으로 줄여 계산해요.")}
      ${field("al-used", "지금 연차 중 쓴 날", unitInput("al-used", "일", { value: "0", mode: "decimal" }), "남은 날만 수당으로 계산해요.")}
    </div>
  </fieldset>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button></div>
  <p class="note tx-privacy">입력한 날짜와 임금은 이 브라우저 안에서만 계산해요. 어디에도 보내거나 저장하지 않아요.</p>
</form>`;

const ex = annualLeave(EXAMPLE);
const ex1y = annualLeave({ ...EXAMPLE, hireDate: "2026-01-01", refDate: "2026-12-31" });
const ex1yPlus = annualLeave({ ...EXAMPLE, hireDate: "2026-01-01", refDate: "2027-01-01" });
const exPart = annualLeave({ ...EXAMPLE, weeklyHours: 20, payType: "hourly", hourly: 10700 });
const YEAR_TABLE = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>근속</th><th>연차</th></tr></thead><tbody>
  <tr><td>1년 미만</td><td>1개월 개근마다 1일 (최대 11일)</td></tr>
  ${[[1, "1~2년"], [3, "3~4년"], [5, "5~6년"], [11, "11~12년"], [21, "21년 이상"]].map(([n, t]) => `<tr><td>${t}</td><td>${daysForYear(n)}일</td></tr>`).join("")}
</tbody></table></div>`;

const INFO = [
  card("연차는 며칠 생기나요?", YEAR_TABLE + UL([
    "1년 미만이면 한 달 개근할 때마다 1일씩, 최대 11일이 생겨요. 이 연차는 입사 1년이 되는 날까지 써야 해요.",
    "1년 동안 80% 이상 출근하면 15일이 생겨요. 3년째부터 2년마다 1일씩 늘어나고 25일이 최대예요.",
    `<b>1년만 일하고 그만두면</b> 15일은 생기지 않아요. 1년을 채운 다음 날까지 일해야 해요. 예: 2026년 1월 1일 입사, 12월 31일까지 근무하면 ${ex1y.totalDays}일, 2027년 1월 1일까지 근무하면 ${ex1yPlus.totalDays}일이에요(대법원 2021다227100).`,
  ]), `${SRC.art60}`),
  card("연차수당은 얼마인가요?", UL([
    "<b>연차수당 = 남은 연차 일수 × 1일 통상임금</b>이에요. 1일 통상임금은 시급 × 하루 소정근로시간(보통 8시간)이에요.",
    "월급제라면 통상 시급 = 월급(통상임금) ÷ 209시간(주 40시간 기준)이에요.",
    `예: 월급 300만 원으로 2년째 15일을 하나도 쓰지 않았다면 ${won(ex.pay)}이에요.`,
    "보통 연차를 쓸 수 있는 1년이 끝난 뒤 남은 날만큼 받아요. 회사가 법에 맞게 사용을 권했는데도 쓰지 않았다면 수당이 없을 수 있어요(연차 사용 촉진).",
  ])),
  card("알바·단시간 근로자는요?", UL([
    "4주 평균 1주 15시간 이상이고 5인 이상 사업장이면 알바도 연차가 생겨요.",
    `1주 40시간보다 적게 일하면 시간으로 줄여요. 연차 시간 = 일수 × 8시간 × (1주 근무시간 ÷ 40). 주 20시간이면 15일이 60시간, 시급 10,700원이면 ${won(exPart.pay)}이에요.`,
    "5인 미만 사업장은 연차 규정이 적용되지 않아요. 계약서나 취업규칙에 따로 정했다면 그에 따라요.",
  ]), `${SRC.art18}, ${SRC.art11}`),
  card("사장님이라면: 2027 연차관리대장 엑셀", P("직원이 여러 명이면 연차를 한 명씩 계산기로 보기 번거로워요. 연차관리대장 엑셀은 직원 30명까지 입사일만 넣으면 지금 연차, 쓴 날·남은 날, 남은 연차수당, 연차 사용 촉진 1·2차 날짜(근로기준법 제61조)를 한 장에서 보여 줘요. 이 페이지와 같은 계산 방식이고 구글시트에서도 열려요. 가격은 6,900원이에요.")
    + P(`<a href="${LEAVE.href}" rel="noopener" data-template-link data-item="leave-ledger-2027" data-placement="promo">연차관리대장 판매 페이지 보기 ${ARROW}</a>`)
    + P(`매달 급여·4대보험까지 함께 관리하려면 <a href="${LEAVE.bundle}" rel="noopener" data-template-link data-item="payroll-leave-bundle-2027" data-placement="promo-bundle">${TEMPLATE.name}과 묶음(13,900원)</a>이 따로 사는 것보다 2,900원 싸요.`)
    + P(`퇴사할 때 받을 돈은 <a href="/severance/">퇴직금 계산기</a>, 월급별 공제는 <a href="/insurance/">4대보험 계산기</a>에서 볼 수 있어요.`)),
  gearCard(),
  card("이 페이지에 대해", UL([
    "<b>참고용 계산이에요. 노무 자문이 아니에요.</b> 매월 개근하고 1년간 80% 이상 출근했다고 보고 계산해요.",
    "회계연도(1월 1일) 기준으로 연차를 주는 회사는 날짜가 달라질 수 있어요. 퇴사할 때는 입사일 기준으로 다시 맞춰 봐요.",
    `기준 확인일은 ${CHECKED}예요.`,
  ])),
].join("");

export const annualLeavePay = [
  {
    slug: "annual-leave", cat: "pay", title: "2027 연차수당 계산기", short: "입사일로 연차 일수와 남은 연차 수당",
    lede: "입사일과 기준일을 넣으면 지금까지 생긴 연차를 근속연수별로 보여 주고, 지금 쓸 수 있는 연차와 남은 연차 수당을 계산해요. 1년 미만 월 단위 연차, 1년만 일하고 퇴사할 때, 주 40시간 미만 알바, 5인 미만 사업장까지 반영해요. 참고용이고 노무 자문이 아니에요.",
    description: "2027 연차수당 계산기. 입사일·기준일·월급(또는 시급)을 넣으면 1년 미만 월 단위 연차(최대 11일), 근속연수별 연차(15~25일), 지금 쓸 수 있는 연차, 남은 연차 수당을 계산합니다. 1년 근무 후 퇴사 시 15일 미발생(대법원 판결), 단시간 근로자 시간 비례, 5인 미만 미적용 반영.",
    keys: ["연차수당 계산기", "연차 계산기", "2027 연차", "연차 일수 계산", "연차수당 계산법", "1년 미만 연차", "알바 연차", "퇴사 연차수당"],
    form: FORM, modules: ["annual-leave-ui.js"], related: ["severance", "insurance", "alba-pay"],
    info: INFO,
  },
];
