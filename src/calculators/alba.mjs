// 급여·인건비: 2027 알바 인건비 계산기 (직원 1명, 한 달).
// 계산은 docs/assets/alba-pay-engine.js(급여대장 엑셀과 같은 엔진, 본부 저장소 ventures/payroll-template/template/engine.mjs 그대로 복사)가 하고,
// docs/assets/alba-pay-input.js 가 간단한 입력을 엔진 입력으로 바꾼다. 화면은 docs/assets/alba-pay-ui.js.
// 규칙 출처: 본부 저장소 ventures/payroll-template/rules-2027.md (2026-11-22 확인). 아래 예시 카드의 숫자는 빌드 때 엔진으로 계산한다.
// 입력값(시급·근무시간)은 주소·통계·저장소에 넣지 않는다.
import { ARROW } from "../layout.mjs";
import { calc, EXAMPLE } from "../../docs/assets/alba-pay-input.js";

export const TEMPLATE = { href: "#template-coming-soon", price: "9,900원", name: "2027 급여대장 엑셀" };
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
  art56: a("https://casenote.kr/법령/근로기준법/제56조", "근로기준법 제56조"),
  holidayQA: a("https://www.moel.go.kr/minwon/fastcounsel/fastcounselView.do?inetDcssMngId=202401081620124231000", "고용노동부 상담 답변(주휴 계산)"),
  split: a("https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=20248", "고용노동부 보도자료 2026-11-13"),
  pension: a("https://www.mohw.go.kr/menu.es?mid=a10714060000", "보건복지부 연금개혁 Q&amp;A"),
  health: a("https://www.korea.kr/news/policyNewsView.do?newsId=148971715", "정책브리핑 2026-09-11(건강보험)"),
  ltc: a("https://www.korea.kr/news/policyNewsView.do?newsId=148974757", "정책브리핑 2026-11-02(장기요양)"),
  employ: a("https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19866", "고용노동부 보도자료 2026-09-01(고용보험 정부안)"),
  insure: a("https://www.4insure.or.kr/ptl/totalinfo/tab01/page05.html", "4대사회보험정보연계센터 적용 제외 안내"),
};

// ── 입력 칸 ──
const unitInput = (id, unit, { value = "", ph = "", mode = "decimal" } = {}) => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input id="${id}" type="text" inputmode="${mode}" autocomplete="off"${value !== "" ? ` value="${value}"` : ""}${ph ? ` placeholder="${ph}"` : ""}></div></div>`;
const field = (id, label, input, help = "") => `<div class="field"><label for="${id}">${label}</label>${input}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const seg = (id, label, opts, help = "") => `<div class="field"><label id="${id}-l">${label}</label><div class="seg" id="${id}" role="group" aria-labelledby="${id}-l">${opts.map(([v, t], i) => `<button type="button" data-v="${v}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div>${help ? `<p class="help">${help}</p>` : ""}</div>`;
const select = (id, label, opts, sel, help = "") => field(id, label, `<select id="${id}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(sel) ? " selected" : ""}>${t}</option>`).join("")}</select>`, help);
const MONTHS = Array.from({ length: 12 }, (_, i) => [`2027-${String(i + 1).padStart(2, "0")}`, `2027년 ${i + 1}월`]);

const FORM = `<form id="apf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>사업장</legend>
    ${seg("ap-scale", "상시 근로자 수", [["5인 미만", "5인 미만"], ["5인 이상", "5인 이상"]], "알바도 사람 수에 들어가요. 지난 1개월 동안 일한 사람 수의 합을 영업일 수로 나눠서 세요.")}
    ${select("ap-month", "계산할 달", MONTHS, "2027-01", "달마다 일하는 날과 주휴 횟수가 달라요.")}
  </fieldset>
  <fieldset class="tx-group"><legend>직원 한 명의 근무</legend>
    <div class="form-row cols-2">
      ${field("ap-wage", "시급", unitInput("ap-wage", "원", { value: "10700", mode: "numeric" }), "2027년 최저임금은 10,700원이에요.")}
      ${select("ap-days", "주 근무일 수", [1, 2, 3, 4, 5, 6].map((d) => [d, `주 ${d}일`]), 5, "월요일부터 차례로 일한다고 보고 계산해요.")}
    </div>
    <div class="form-row cols-2">
      ${field("ap-hours", "하루 근무시간", unitInput("ap-hours", "시간", { value: "6" }), "휴게시간은 빼고 넣어 주세요. 0.5시간 단위까지 돼요.")}
      ${field("ap-night", "이 중 야간(22시~06시)", unitInput("ap-night", "시간", { value: "0" }), "밤 10시 이후에 일하는 시간이에요.")}
    </div>
    <div class="form-row cols-2">
      ${field("ap-holiday", "한 달 휴일근무 (선택)", unitInput("ap-holiday", "시간", { ph: "0" }), "쉬기로 한 주휴일에 나와서 일한 시간의 합이에요.")}
      ${select("ap-absent", "개근 여부", [[0, "매주 개근"], [1, "결근한 주 1번"], [2, "결근한 주 2번"], [3, "결근한 주 3번"], [4, "결근한 주 4번"]], 0, "지각·조퇴는 결근이 아니에요. 결근한 주는 주휴수당이 없어요.")}
    </div>
  </fieldset>
  <fieldset class="tx-group"><legend>4대보험</legend>
    ${seg("ap-emp", "고용보험 근로자 요율", [["current", "0.9% (현행)"], ["proposal", "1.0% (정부안)"]], "2027년 요율은 아직 확정되지 않았어요. 정부안은 1.0%예요.")}
    ${field("ap-acc", "산재보험 요율 (사업주만)", unitInput("ap-acc", "%", { ph: "예: 0.9" }), "업종마다 달라요. 2027년 업종별 요율은 12월 말에 고시돼요. 비우면 산재보험을 빼고 계산해요. 참고로 2026년 전체 평균은 1.47%였어요.")}
  </fieldset>
  <details class="tx-fold"><summary>더 정확하게 (선택)</summary><div class="tx-fold-body">
    ${select("ap-shop", "사업장 근무 체계", [[5, "주 5일제 (보통)"], [6, "주 6일제"]], 5, "주휴시간 = 주 근무시간 ÷ 5. 직원 대부분이 주 6일 일하는 사업장이면 ÷ 6이에요.")}
    ${select("ap-tenure", "일한 기간", [["3plus", "3개월 이상"], ["new", "3개월 미만"]], "3plus", "주 15시간 미만이어도 3개월 이상 일하면 고용보험에 들어가요.")}
  </div></details>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button><button class="btn btn-ghost btn-sm" type="button" id="ap-example"><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> 예시로 채우기</button><button class="btn btn-ghost btn-sm" type="button" data-share=""><iconify-icon icon="solar:share-linear"></iconify-icon> 공유</button></div>
  <p class="note tx-privacy">입력한 시급과 근무시간은 이 브라우저 안에서만 계산해요. 어디에도 보내거나 저장하지 않아요.</p>
</form>`;

// ── 설명 카드 ──
const ex = calc(EXAMPLE), exr = ex.row, ex5 = calc(EXAMPLE, "5인 미만").row;
const RATE_TABLE = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>보험</th><th>근로자</th><th>사업주</th><th>상태</th></tr></thead><tbody>
  <tr><td>국민연금</td><td>5.0%</td><td>5.0%</td><td>확정</td></tr>
  <tr><td>건강보험</td><td>3.595%</td><td>3.595%</td><td>확정(동결)</td></tr>
  <tr><td>장기요양</td><td colspan="2">건강보험료 × 13.90%</td><td>확정</td></tr>
  <tr><td>고용보험</td><td>0.9% (정부안 1.0%)</td><td>0.9% (정부안 1.0%) + 0.25%</td><td><b>미확정</b></td></tr>
  <tr><td>산재보험</td><td>없음</td><td>업종별</td><td><b>미확정</b>(12월 말 고시)</td></tr>
</tbody></table></div>`;

const INFO = [
  card("주휴수당은 누가 받나요?", UL([
    "<b>주 15시간 이상</b> 일하기로 하고 그 주를 <b>개근</b>하면 받아요. 5인 미만 사업장도 똑같아요.",
    "하루 주휴시간은 <b>주 근무시간 ÷ 5</b>예요. 주 20시간이면 4시간, 주 40시간이면 8시간이에요. 8시간이 최대예요.",
    "기준은 계약한 시간이에요. 계약보다 더 일한 시간으로 주휴가 늘지는 않아요.",
    "주 15시간 미만이면 주휴수당과 퇴직금이 없어요.",
  ]), `${SRC.art55}, ${SRC.art18}, ${SRC.holidayQA}`),
  card("5인 미만이면 가산수당이 없어요", UL([
    "연장·야간·휴일근무의 <b>50% 가산</b>은 5인 이상 사업장만 줘요. 휴일 8시간을 넘으면 100%예요.",
    "5인 미만이어도 일한 시간만큼의 시급은 다 줘야 해요. 가산분만 없어요.",
    "5인 이상이면 주 40시간이 안 되는 알바가 계약보다 더 일한 시간에도 50%를 더 줘요. 이 계산기는 계약한 시간만큼만 일한다고 보고 계산해요.",
    "사업장을 쪼개 5인 미만으로 꾸미는 것은 고용노동부 감독 대상이에요.",
  ]), `${SRC.art56}, ${SRC.split}`),
  card("2027년 4대보험 요율", RATE_TABLE + UL([
    "사업주는 고용보험에 0.25%를 더 내요(고용안정·직업능력개발, 150인 미만).",
    "고용보험 1.0%는 정부안이에요. 시행령 공포를 아직 확인하지 못했어요. 확정되면 이 페이지를 고칠게요.",
    "각 보험료는 10원 미만을 버려요. 공단 고지액과 몇십 원 다를 수 있어요.",
  ]), `${SRC.pension}, ${SRC.health}, ${SRC.ltc}, ${SRC.employ} (${CHECKED} 확인)`),
  card("주 15시간 미만 알바는요?", UL([
    "국민연금·건강보험은 보통 들지 않아요(월 60시간 미만).",
    "고용보험은 <b>3개월 이상</b> 계속 일하면 들어가요.",
    "산재보험은 <b>일한 시간과 관계없이</b> 들어가요.",
    "주휴수당과 퇴직금 대상이 아니에요.",
  ]), SRC.insure),
  card(`예시: 주 5일 하루 6시간, 그중 야간 2시간`, P(`5인 이상 매장에서 시급 10,700원 알바가 2027년 1월에 월~금 하루 6시간(18시~24시) 일하고 매주 개근했다고 해 볼게요. 고용보험은 현행 0.9%, 산재는 뺐어요.`)
    + UL([
      `기본급: ${exr.workedMin / 60}시간 × 10,700원 = <b>${won(exr.basePay)}</b>`,
      `주휴수당: 6시간 × ${ex.weeks}주 = <b>${won(exr.weeklyHolidayPay)}</b> (1월은 일요일이 ${ex.weeks}번이에요)`,
      `야간 가산: 하루 2시간 × 50% = <b>${won(exr.nightPremium)}</b>`,
      `지급총액 <b>${won(exr.gross)}</b>, 근로자 4대보험 ${won(exr.employee.total)}`,
      `사업주 4대보험 ${won(exr.employer.total)}, <b>사장님 월 비용 ${won(exr.ownerCost)}</b>`,
      `같은 근무라도 5인 미만이면 야간 가산이 없어서 사장님 월 비용은 ${won(ex5.ownerCost)}이에요.`,
    ])),
  card("이렇게 계산해요", UL([
    "실제 달력으로 계산해요. 일요일이 그 달에 있는 주의 주휴수당을 그 달에 넣어요. 그래서 달마다 금액이 달라요.",
    "주휴일은 일요일로 봐요. 휴일근무는 일요일에 하루 8시간까지 나눠 넣어요.",
    "결근한 주는 그 주 마지막 근무일 하루를 쉰 것으로 봐요. 그날 임금과 그 주 주휴수당이 빠져요.",
    "소득세는 빠져 있어요. 국세청 간이세액표로 따로 떼요. 알바 월급 수준이면 대부분 0원이에요.",
    "퇴직금은 1년 이상 일하면 퇴사할 때 줘요. 결과의 적립액은 월 지급총액 ÷ 12로 어림한 참고값이에요.",
  ])),
  card("이 페이지에 대해", UL([
    "<b>참고용 계산이에요. 노무 자문이 아니에요.</b> 실제 지급은 근로계약서와 근무기록으로 다시 확인하세요.",
    "<b>미확정 값</b>: 고용보험 1.0%(정부안), 산재보험 업종별 요율(12월 말 고시)은 아직 정해지지 않았어요.",
    `최저임금 10,700원은 확정이에요(${SRC.minwage}). 기준 확인일은 ${CHECKED}예요.`,
    `계산은 날셈의 ${TEMPLATE.name}과 같은 엔진으로 해요. 고용노동부 상담 예시 등 19개 사례로 검사했어요.`,
  ])),
  `<div class="card bz ap-promo" id="template-coming-soon"><h2>${TEMPLATE.name} (준비 중)</h2>${P(`직원 10명까지 근무기록을 넣으면 주휴·가산·4대보험과 사장님 월 인건비를 한 번에 계산하는 엑셀 파일이에요. 가격은 ${TEMPLATE.price}로 준비하고 있어요.`)}${P("판매 페이지가 열리면 이 자리에 링크를 둘게요.")}</div>`,
].join("");

export const alba = [
  {
    slug: "alba-pay", cat: "pay", title: "2027 알바 인건비 계산기", short: "주휴·가산·4대보험까지 사장님 월 비용",
    lede: "시급과 근무시간을 넣으면 알바 한 명의 한 달 기본급, 주휴수당, 가산수당, 4대보험과 사장님이 실제로 내는 월 비용을 계산해요. 2027년 최저임금 10,700원과 2027년 4대보험 요율 기준이에요. 참고용이고 노무 자문이 아니에요.",
    description: "2027 알바 인건비 계산기. 5인 미만·이상, 시급, 주 근무일과 하루 근무시간, 야간·휴일근무를 넣으면 기본급·주휴수당·가산수당·근로자와 사업주 4대보험·사장님 월 비용을 계산합니다. 2027년 최저임금 10,700원, 국민연금 10%, 장기요양 0.9994% 기준.",
    keys: ["알바 인건비 계산기", "2027 주휴수당 계산기", "알바 4대보험 계산", "사장님 인건비 계산", "5인 미만 가산수당", "2027 최저임금 월급", "알바 급여 계산기", "야간수당 계산기"],
    form: FORM, modules: ["alba-pay-ui.js"],
    info: INFO,
  },
];
