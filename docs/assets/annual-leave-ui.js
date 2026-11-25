/* 날셈 2027 연차수당 계산기 화면 (ES 모듈): #alf 폼을 읽어 annual-leave-calc.js 로 계산하고 #result 에 그린다.
   날짜·임금은 주소·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계: 결과 갱신은 N.bump 가 계산기 이름만 보낸다. 급여대장 안내 링크는 "template_click", 제휴 묶음은 "affiliate_click"(입력값 없음). */
const v = new URL(import.meta.url).search; // 캐시 문자열(?v=)을 계산 모듈 쪽에도 붙인다
const C = await import("./annual-leave-calc.js" + v);
const TEMPLATE_URL = "https://suikster0.gumroad.com/l/leave2027"; // 2027 연차관리대장 엑셀 (6,900원)

const $ = (id) => document.getElementById(id);
const form = $("alf"), out = $("result");
const N = window.N;
if (form && out) init();

function init() {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const won = (n) => `${Math.round(Number(n)).toLocaleString("ko-KR")}원`;
  const num = (id) => { const s = String($(id).value).replace(/[^0-9.]/g, ""); if (s === "") return 0; const x = parseFloat(s); return isFinite(x) ? x : 0; };
  const hrs = (n) => `${Number(Number(n).toFixed(2))}시간`;
  const dateOf = (id) => {
    const [y, m, d] = ["y", "m", "d"].map((k) => String($(`${id}-${k}`).value).replace(/[^0-9]/g, ""));
    if (y.length !== 4 || !m || !d) return "";
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };
  const kdate = (s) => { const [y, m, d] = s.split("-"); return `${y}년 ${+m}월 ${+d}일`; };
  const segVal = (id) => ($(id).querySelector('[aria-pressed="true"]') || {}).dataset?.v;
  const setSeg = (id, val) => $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === val)));
  const syncPay = () => { const m = segVal("al-paytype") === "monthly"; $("al-monthly-f").hidden = !m; $("al-hourly-f").hidden = m; };
  form.querySelectorAll(".seg").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setSeg(g.id, b.dataset.v); syncPay(); schedule(); }));
  if (N && N.ymdInputs) { N.ymdInputs($("al-hire")); N.ymdInputs($("al-ref")); }
  for (const id of ["al-monthly", "al-hourly"]) {
    $(id).addEventListener("input", (e) => {
      const el = e.target, digits = el.value.replace(/[^0-9]/g, "");
      const s = digits === "" ? "" : Number(digits).toLocaleString("ko-KR");
      if (s !== el.value) el.value = s;
    });
  }

  function read() {
    return {
      hireDate: dateOf("al-hire"), refDate: dateOf("al-ref"), fivePlus: segVal("al-scale") !== "under5",
      payType: segVal("al-paytype"), monthly: num("al-monthly"), hourly: num("al-hourly"),
      weeklyHours: num("al-hours"), used: num("al-used"),
    };
  }

  const kv = (rows) => `<div class="kv">${rows.map(([k, val]) => `<div><span class="k">${k}</span><span class="v">${val}</span></div>`).join("")}</div>`;
  const h3 = (t) => `<h3 class="tx-h">${t}</h3>`;

  function render(h, r) {
    const warn = [];
    if (r.reason === "under5") warn.push("5인 미만 사업장은 근로기준법의 연차 규정이 적용되지 않아요. 계약서·취업규칙에 따로 정했으면 그에 따라요.");
    if (r.reason === "under15h") warn.push("4주 평균 1주 15시간 미만이면 연차가 생기지 않아요.");
    if (r.eligible) {
      if (r.current.kind === "first") warn.push(`1년 미만 연차는 ${kdate(r.current.until)} 전날까지 써야 해요. 그때까지 쓰지 못한 날은 수당으로 받을 수 있어요.`);
      if (r.years >= 1 && r.firstYear.days) warn.push(`첫해에 생긴 ${r.firstYear.days}일은 따로예요. 입사 1년이 되기 전에 썼거나 수당으로 정산됐다고 보고, 지금 연차는 ${r.current.days}일만 계산했어요.`);
      if (h.weeklyHours < 40) warn.push(`1주 ${h.weeklyHours}시간 근무라 연차 하루를 ${hrs(r.dayHours)}으로 계산했어요.`);
      warn.push("매월 개근하고 1년간 80% 이상 출근했다고 보고 계산했어요. 회사가 연차 사용을 법에 맞게 권했다면 남은 연차 수당이 없을 수 있어요.");
    }
    const sub = r.eligible ? `남은 ${r.unusedDays}일 × ${hrs(r.dayHours)} × 시급 ${won(r.hourly)}` : "연차 대상이 아니에요";
    const hero = `<div class="result-hero"><div class="k">남은 연차 수당 (세전)</div><div class="v accent">${won(r.pay)}<small>${sub}</small></div></div>`;
    let body = "";
    if (r.eligible) {
      const cur = r.current.kind === "first" ? "1년 미만 월 단위 연차" : `${r.current.n}년 근속 연차`;
      body += h3("지금 연차") + kv([
        ["종류", cur],
        ["생긴 날수", `${r.current.days}일`],
        ["생긴 날", r.current.from ? kdate(r.current.from) : "아직 없음"],
        ["사용 기한", `${kdate(r.current.until)} 전날까지`],
        ["남은 날수", `${r.unusedDays}일 (${hrs(r.unusedHours)})`],
      ]);
      const rows = [];
      if (r.firstYear.days) rows.push(["1년 미만 (월 단위)", `${r.firstYear.days}일`]);
      for (const s of r.schedule) rows.push([`${s.n}년 근속 (${kdate(s.date)})`, `${s.days}일`]);
      rows.push(["지금까지 생긴 연차 합계", `${r.totalDays}일`]);
      body += h3("연차 발생표") + kv(rows);
    }
    const warnHtml = warn.length ? `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : "";
    const funnel = `<p class="ap-funnel">직원 30명의 연차·연차수당·사용 촉진 날짜를 한 장에서 관리하려면 → <a href="${TEMPLATE_URL}" rel="noopener" data-template-link data-item="leave-ledger-2027" data-placement="result">2027 연차관리대장 엑셀(6,900원)</a></p>`;
    const foot = `<p class="note">참고용 계산이에요. 노무 자문이 아니에요.</p>`;
    out.innerHTML = hero + body + warnHtml + funnel + foot;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => run(true), 200); }
  function run(count = true) {
    const h = read();
    out.hidden = false;
    const r = C.annualLeave(h);
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
    if (N) N.track("template_click", { calculator: "annual-leave", item_id: link.dataset.item || "payroll-template-2027", placement: link.dataset.placement || "result" });
  });
  // 제휴 묶음(쿠팡·예스24) 클릭. 상품 id와 플랫폼만 보낸다.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-aff-link]");
    if (a && N) N.track("affiliate_click", { calculator: "annual-leave", item_id: a.dataset.affId, network: a.dataset.affNet });
  });
  syncPay();
  run(false); // 첫 화면 예시 결과 (통계는 보내지 않음)
}
