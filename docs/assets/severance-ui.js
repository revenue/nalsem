/* 날셈 2027 퇴직금 계산기 화면 (ES 모듈): #svf 폼을 읽어 severance-calc.js(급여 엔진)로 계산하고 #result 에 그린다.
   날짜·임금은 주소·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계: 결과 갱신은 N.bump 가 계산기 이름만 보낸다(calc.js "calculate"). 급여대장 안내 링크 클릭은 "template_click"(입력값 없음). */
const v = new URL(import.meta.url).search; // 캐시 문자열(?v=)을 계산 모듈 쪽에도 붙인다
const C = await import("./severance-calc.js" + v);
const TEMPLATE_URL = "https://suikster0.gumroad.com/l/horyty";

const $ = (id) => document.getElementById(id);
const form = $("svf"), out = $("result");
const N = window.N;
if (form && out) init();

function init() {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const won = (n) => `${Math.round(Number(n)).toLocaleString("ko-KR")}원`;
  const num = (id) => { const s = String($(id).value).replace(/[^0-9]/g, ""); return s === "" ? 0 : Number(s); };
  const dateOf = (id) => {
    const [y, m, d] = ["y", "m", "d"].map((k) => String($(`${id}-${k}`).value).replace(/[^0-9]/g, ""));
    if (y.length !== 4 || !m || !d) return "";
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };
  const kdate = (s) => { const [y, m, d] = s.split("-"); return `${y}년 ${+m}월 ${+d}일`; };
  const segVal = (id) => ($(id).querySelector('[aria-pressed="true"]') || {}).dataset?.v;
  const setSeg = (id, val) => $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === val)));
  form.querySelectorAll(".seg").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setSeg(g.id, b.dataset.v); schedule(); }));
  if (N && N.ymdInputs) { N.ymdInputs($("sv-hire")); N.ymdInputs($("sv-last")); } // 칸이 차면 다음 칸으로

  // 금액 칸은 입력하는 동안 천 단위 쉼표를 붙인다
  for (const id of ["sv-pay", "sv-bonus", "sv-leave", "sv-three"]) {
    $(id).addEventListener("input", (e) => {
      const el = e.target, digits = el.value.replace(/[^0-9]/g, "");
      const s = digits === "" ? "" : Number(digits).toLocaleString("ko-KR");
      if (s !== el.value) el.value = s;
    });
  }

  function read() {
    return {
      hireDate: dateOf("sv-hire"), lastDay: dateOf("sv-last"),
      monthly: num("sv-pay"), bonusYear: num("sv-bonus"), leaveYear: num("sv-leave"), threeMonthTotal: num("sv-three"),
      over15: segVal("sv-hours") !== "under15",
    };
  }

  const kv = (rows) => `<div class="kv">${rows.map(([k, val]) => `<div><span class="k">${k}</span><span class="v">${val}</span></div>`).join("")}</div>`;
  const h3 = (t) => `<h3 class="tx-h">${t}</h3>`;

  function render(h, r) {
    const warn = [];
    if (r.reason === "under1y") warn.push(`재직일수가 ${r.serviceDays.toLocaleString("ko-KR")}일로 1년(365일)이 안 돼 퇴직금이 없어요. ${365 - r.serviceDays}일 더 일하면 생겨요.`);
    if (r.reason === "under15h") warn.push("4주 평균 1주 15시간 미만이면 퇴직금이 없어요.");
    if (!h.threeMonthTotal) warn.push("퇴직 전 3개월 임금을 월 급여 × 3으로 봤어요. 3개월 동안 급여가 달랐다면 '더 정확하게'에 합계를 넣으세요.");
    warn.push("평균임금이 통상임금보다 적으면 통상임금으로 계산해요. 무급 휴직·육아휴직 기간이 3개월 안에 있으면 결과가 달라져요.");
    warn.push("퇴직일은 마지막 근무일 다음 날, 3개월은 퇴직일 전날까지로 계산했어요.");
    warn.push("퇴직소득세는 빼지 않았어요.");
    const yearsTxt = `${Math.floor(r.serviceDays / 365)}년 ${r.serviceDays % 365}일`;
    const hero = `<div class="result-hero"><div class="k">예상 퇴직금 (세전)</div><div class="v accent">${won(r.amount)}<small>${r.eligible ? `1일 평균임금 ${won(r.avgDaily)} × 30 × ${r.serviceDays.toLocaleString("ko-KR")}일 ÷ 365` : "퇴직금 대상이 아니에요"}</small></div></div>`;
    const period = kv([
      ["퇴직일", kdate(r.retireDate)],
      ["재직일수", `${r.serviceDays.toLocaleString("ko-KR")}일 (약 ${yearsTxt})`],
      ["3개월 시작일", kdate(r.periodStart)],
      ["3개월 날짜 수", `${r.periodDays}일`],
    ]);
    const wages = kv([
      ["3개월 임금", won(r.wages3)],
      ["상여금 3/12", won(r.bonusPart)],
      ["연차수당 3/12", won(r.leavePart)],
      ["3개월 임금 총액", won(r.total3)],
      ["1일 평균임금", won(r.avgDaily)],
    ]);
    const warnHtml = `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
    const funnel = `<p class="ap-funnel">직원 퇴직금 적립과 4대보험·주휴수당을 매달 한 번에 정리하려면 → <a href="${TEMPLATE_URL}" rel="noopener" data-template-link data-placement="result">2027 급여대장 엑셀(9,900원)</a></p>`;
    const foot = `<p class="note">참고용 계산이에요. 노무 자문이 아니에요. 다툼이 있으면 고용노동부(1350)에 물어보세요.</p>`;
    out.innerHTML = hero + h3("기간") + period + h3("평균임금") + wages + warnHtml + funnel + foot;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => run(true), 200); }
  function run(count = true) {
    const h = read();
    out.hidden = false;
    const r = C.severance(h);
    if (r.error) { out.innerHTML = `<p class="note">${esc(r.error)}</p>`; return; }
    render(h, r);
    if (N && count) N.bump(out);
  }
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", (e) => { e.preventDefault(); run(true); out.scrollIntoView({ behavior: "smooth", block: "start" }); });

  // 급여대장 안내 링크 클릭 (판매 링크 클릭 가설 H1 측정). 입력값은 넣지 않는다.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-template-link]");
    if (!link) return;
    if (N) N.track("template_click", { calculator: "severance", item_id: "payroll-template-2027", placement: link.dataset.placement || "result" });
  });
  run(false); // 첫 화면 예시 결과 (통계는 보내지 않음)
}
