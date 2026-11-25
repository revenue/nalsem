/* 날셈 2027 주휴수당 계산기 화면 (ES 모듈): #jhf 폼을 읽어 juhyu-pay-calc.js(급여 엔진)로 계산하고 #result 에 그린다.
   시급·근무시간은 주소·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계: 결과 갱신은 N.bump 가 계산기 이름만 보낸다(calc.js "calculate"). 급여대장 안내 링크 클릭은 "template_click"(입력값 없음). */
const v = new URL(import.meta.url).search; // 캐시 문자열(?v=)을 계산 모듈 쪽에도 붙인다
const J = await import("./juhyu-pay-calc.js" + v);
const TEMPLATE_URL = "https://suikster0.gumroad.com/l/horyty";

const $ = (id) => document.getElementById(id);
const form = $("jhf"), out = $("result");
const N = window.N;
if (form && out) init();

function init() {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;
  const hrs = (n) => `${Number(n.toFixed(2))}시간`;
  const num = (id) => { const s = String($(id).value).replace(/[^0-9.]/g, ""); if (s === "") return null; const x = parseFloat(s); return isFinite(x) ? x : null; };
  const segVal = (id) => ($(id).querySelector('[aria-pressed="true"]') || {}).dataset?.v;
  const setSeg = (id, val) => $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === val)));
  form.querySelectorAll(".seg").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setSeg(g.id, b.dataset.v); schedule(); }));

  function read() {
    return {
      wage: num("jh-wage") || 0, weeklyHours: num("jh-hours") || 0,
      irregular: segVal("jh-pattern") === "irregular", month: $("jh-month").value,
      shopDays: parseInt($("jh-shop").value, 10),
    };
  }

  const kv = (rows) => `<div class="kv">${rows.map(([k, val]) => `<div><span class="k">${k}</span><span class="v">${val}</span></div>`).join("")}</div>`;
  const h3 = (t) => `<h3 class="tx-h">${t}</h3>`;

  function render(h, r) {
    const mm = Number(h.month.split("-")[1]);
    const warn = [];
    if (r.belowMin) warn.push(`시급이 2027년 최저임금 ${won(J.MIN_WAGE)}보다 낮아요. 최저임금보다 적게 주면 안 돼요.`);
    if (!r.eligible) warn.push(`1주 근무시간이 ${J.THRESHOLD}시간 미만이라 주휴수당이 없어요. 계약을 ${J.THRESHOLD}시간 이상으로 바꾸면 생겨요.`);
    warn.push("그 주에 일하기로 한 날을 모두 나왔다고 보고 계산했어요. 결근한 주는 그 주 주휴수당이 빠져요.");
    const hero = `<div class="result-hero"><div class="k">1주 주휴수당</div><div class="v accent">${won(r.weekly)}<small>${r.eligible ? `하루 주휴 ${hrs(r.dayHours)} × 시급 ${won(h.wage)}` : "주 15시간 미만"}</small></div></div>`;
    const stats = `<div class="stats cols-3"><div class="stat"><div class="k">2027년 ${mm}월 주휴수당</div><div class="v">${won(r.monthly)}</div></div><div class="stat"><div class="k">${mm}월 일요일</div><div class="v">${r.sundays}번</div></div><div class="stat"><div class="k">주휴 포함 월 환산</div><div class="v">${won(r.monthlySalary)}</div></div></div>`;
    const detail = kv([
      ["1주 근무시간 (계약)", hrs(h.weeklyHours)],
      ["하루 주휴시간", r.eligible ? hrs(r.dayHours) : "0시간"],
      ["계산 방식", h.irregular ? "(1주 시간 ÷ 40) × 8, 최대 8시간" : `1주 시간 ÷ ${h.shopDays === 6 ? 6 : 5}, 최대 8시간`],
      ["월 환산 유급시간", `${r.monthlyPaidHours}시간 (365일 ÷ 7 ÷ 12)`],
    ]);
    const warnHtml = `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
    const funnel = `<p class="ap-funnel">직원 여러 명의 주휴·가산수당·4대보험을 매달 계산하려면 → <a href="${TEMPLATE_URL}" rel="noopener" data-template-link data-placement="result">2027 급여대장 엑셀(9,900원)</a></p>`;
    const foot = `<p class="note">참고용 계산이에요. 노무 자문이 아니에요. 한 사람의 한 달 인건비와 4대보험은 <a href="/alba-pay/">알바 인건비 계산기</a>에서 볼 수 있어요.</p>`;
    out.innerHTML = hero + stats + h3("계산 내역") + detail + warnHtml + funnel + foot;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => run(true), 160); }
  function run(count = true) {
    const h = read();
    out.hidden = false;
    const r = J.juhyu(h);
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
    if (N) N.track("template_click", { calculator: "juhyu-pay", item_id: "payroll-template-2027", placement: link.dataset.placement || "result" });
  });
  // 제휴 묶음(쿠팡·예스24) 클릭. 상품 id와 플랫폼만 보낸다.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-aff-link]");
    if (a && N) N.track("affiliate_click", { calculator: "juhyu-pay", item_id: a.dataset.affId, network: a.dataset.affNet });
  });
  run(false); // 첫 화면 예시 결과 (통계는 보내지 않음)
}
