/* 날셈 2027 최저임금 계산기 화면 (ES 모듈): #mwf 폼을 읽어 minimum-wage-calc.js 로 계산하고 #result 에 그린다.
   금액은 주소·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계: 결과 갱신은 N.bump 가 계산기 이름만 보낸다. 급여대장 안내 링크는 "template_click", 제휴 묶음은 "affiliate_click"(입력값 없음). */
const v = new URL(import.meta.url).search; // 캐시 문자열(?v=)을 계산 모듈 쪽에도 붙인다
const C = await import("./minimum-wage-calc.js" + v);
const TEMPLATE_URL = "https://suikster0.gumroad.com/l/horyty";

const $ = (id) => document.getElementById(id);
const form = $("mwf"), out = $("result");
const N = window.N;
if (form && out) init();

function init() {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const won = (n) => `${Math.round(Number(n)).toLocaleString("ko-KR")}원`;
  const num = (id) => { const s = String($(id).value).replace(/[^0-9.]/g, ""); if (s === "") return 0; const x = parseFloat(s); return isFinite(x) ? x : 0; };
  const segVal = (id) => ($(id).querySelector('[aria-pressed="true"]') || {}).dataset?.v;
  const setSeg = (id, val) => $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === val)));
  const syncMode = () => { const chk = segVal("mw-mode") === "check"; $("mw-wage-f").hidden = chk; $("mw-monthly-f").hidden = !chk; };
  form.querySelectorAll(".seg").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setSeg(g.id, b.dataset.v); syncMode(); schedule(); }));
  for (const id of ["mw-wage", "mw-monthly"]) {
    $(id).addEventListener("input", (e) => {
      const el = e.target, digits = el.value.replace(/[^0-9]/g, "");
      const s = digits === "" ? "" : Number(digits).toLocaleString("ko-KR");
      if (s !== el.value) el.value = s;
    });
  }

  const read = () => ({ mode: segVal("mw-mode"), wage: num("mw-wage"), monthly: num("mw-monthly"), weeklyHours: num("mw-hours"), shopDays: parseInt($("mw-shop").value, 10) });
  const kv = (rows) => `<div class="kv">${rows.map(([k, val]) => `<div><span class="k">${k}</span><span class="v">${val}</span></div>`).join("")}</div>`;
  const h3 = (t) => `<h3 class="tx-h">${t}</h3>`;

  function render(h, r) {
    const warn = [];
    let hero, body;
    if (r.mode === "check") {
      hero = `<div class="result-hero"><div class="k">내 월급의 시급 환산</div><div class="v ${r.ok ? "accent" : ""}">${won(r.hourly)} <small>${r.ok ? "2027년 최저임금 이상이에요" : `최저임금보다 한 달 ${won(r.shortfall)} 적어요`}</small></div></div>`;
      body = h3("계산 내역") + kv([["월급", won(h.monthly)], ["월 유급시간", `${r.hours}시간`], ["2027 최저 월급", won(r.need)], ["부족액 (월)", won(r.shortfall)]]);
      warn.push("매달 고정으로 받는 상여금·식대·교통비는 월급에 넣고, 연장·야간·휴일수당은 빼고 넣어야 정확해요.");
      if (!r.ok) warn.push("수습 3개월(1년 이상 계약, 단순 노무직 제외)이면 90%까지 줄 수 있어요. 그 밖에는 차액을 받을 수 있어요.");
    } else {
      if (r.belowMin) warn.push(`시급이 2027년 최저임금 ${won(C.MIN_2027)}보다 낮아요.`);
      hero = `<div class="result-hero"><div class="k">월급 (주휴 포함)</div><div class="v accent">${won(r.monthly)} <small>${r.hours}시간 × 시급 ${won(r.wage)}</small></div></div>`;
      body = h3("계산 내역") + kv([
        ["주급 (주휴 포함)", `${won(r.weekly)}`],
        ["1주 주휴시간", `${r.holidayHours}시간`],
        ["월 유급시간", `${r.hours}시간`],
        ["연봉 (× 12)", won(r.yearly)],
        ["2026년이면", won(r.vs2026.monthly2026)],
      ]);
      if (h.weeklyHours < 15) warn.push("1주 15시간 미만이라 주휴시간이 없어요.");
      warn.push("월 유급시간은 한 달 평균으로 계산해요. 시급제 알바는 그 달 일요일 수에 따라 조금 달라요.");
    }
    const warnHtml = `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
    const funnel = `<p class="ap-funnel">2027년 최저임금으로 직원 급여를 매달 다시 계산하려면 → <a href="${TEMPLATE_URL}" rel="noopener" data-template-link data-placement="result">2027 급여대장 엑셀(9,900원)</a></p>`;
    out.innerHTML = hero + body + warnHtml + funnel + `<p class="note">참고용 계산이에요. 노무 자문이 아니에요.</p>`;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => run(true), 180); }
  function run(count = true) {
    const h = read();
    out.hidden = false;
    const r = C.minimumWage(h);
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
    if (N) N.track("template_click", { calculator: "minimum-wage", item_id: "payroll-template-2027", placement: link.dataset.placement || "result" });
  });
  // 제휴 묶음(쿠팡·예스24) 클릭. 상품 id와 플랫폼만 보낸다.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-aff-link]");
    if (a && N) N.track("affiliate_click", { calculator: "minimum-wage", item_id: a.dataset.affId, network: a.dataset.affNet });
  });
  syncMode();
  run(false); // 첫 화면 예시 결과 (통계는 보내지 않음)
}
