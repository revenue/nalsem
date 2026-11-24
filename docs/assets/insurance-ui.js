/* 날셈 2027 4대보험 계산기 화면 (ES 모듈): #isf 폼을 읽어 insurance-calc.js(급여 엔진)로 계산하고 #result 에 그린다.
   월급은 주소·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계: 결과 갱신은 N.bump 가 계산기 이름만 보낸다(calc.js "calculate"). 급여대장 안내 링크 클릭은 "template_click"(입력값 없음). */
const v = new URL(import.meta.url).search; // 캐시 문자열(?v=)을 계산 모듈 쪽에도 붙인다
const C = await import("./insurance-calc.js" + v);
const TEMPLATE_URL = "https://suikster0.gumroad.com/l/horyty";

const $ = (id) => document.getElementById(id);
const form = $("isf"), out = $("result");
const N = window.N;
if (form && out) init();

function init() {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;
  const pct = (x) => `${Number((x * 100).toFixed(3))}%`;
  const num = (id) => { const s = String($(id).value).replace(/[^0-9.]/g, ""); if (s === "") return 0; const x = parseFloat(s); return isFinite(x) ? x : 0; };
  const segVal = (id) => ($(id).querySelector('[aria-pressed="true"]') || {}).dataset?.v;
  const setSeg = (id, val) => $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === val)));
  form.querySelectorAll(".seg").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setSeg(g.id, b.dataset.v); schedule(); }));

  // 금액 칸은 입력하는 동안 천 단위 쉼표를 붙인다
  for (const id of ["is-pay", "is-nontax"]) {
    $(id).addEventListener("input", (e) => {
      const el = e.target, digits = el.value.replace(/[^0-9]/g, "");
      const s = digits === "" ? "" : Number(digits).toLocaleString("ko-KR");
      if (s !== el.value) el.value = s;
    });
  }

  function read() {
    return {
      pay: num("is-pay"), nonTax: num("is-nontax"), accidentPct: num("is-acc"),
      emp: segVal("is-emp"), over15: segVal("is-hours") !== "under15", months3: segVal("is-tenure") !== "new",
    };
  }

  const h3 = (t) => `<h3 class="tx-h">${t}</h3>`;
  const table = (r, h) => {
    const row = (k, ee, er) => `<tr><td>${k}</td><td class="num">${ee}</td><td class="num">${er}</td></tr>`;
    return `<div class="tbl-wrap"><table class="tbl tx-tbl"><thead><tr><th>보험</th><th>근로자</th><th>사업주</th></tr></thead><tbody>`
      + row("국민연금", won(r.employee.pension), won(r.employer.pension))
      + row("건강보험", won(r.employee.health), won(r.employer.health))
      + row("장기요양", won(r.employee.ltc), won(r.employer.ltc))
      + row(`고용보험 (${pct(r.empRate)})`, won(r.employee.employment), won(r.employer.employment))
      + row(`산재보험${h.accidentPct ? ` (${h.accidentPct}%)` : ""}`, "없음", won(r.employer.accident))
      + `<tr><td><b>합계</b></td><td class="num"><b>${won(r.employee.total)}</b></td><td class="num"><b>${won(r.employer.total)}</b></td></tr></tbody></table></div>`;
  };

  function render(h, r) {
    const warn = [];
    if (!r.elig.pension) warn.push("1주 15시간 미만이라 국민연금·건강보험은 넣지 않았어요.");
    if (!r.elig.employment) warn.push("1주 15시간 미만이고 3개월 미만이라 고용보험도 넣지 않았어요. 3개월이 넘으면 들어가요.");
    if (r.pensionCapped) warn.push("월급이 659만 원을 넘어 국민연금은 상한 659만 원으로 계산했어요.");
    if (r.pensionFloored) warn.push("월급이 41만 원보다 적어 국민연금은 하한 41만 원으로 계산했어요.");
    if (!h.accidentPct) warn.push("산재보험은 업종 요율을 넣지 않아 0원으로 뒀어요. 사업주만 내요.");
    warn.push("소득세·지방소득세는 빼지 않았어요. 실수령액은 여기서 소득세를 더 뺀 금액이에요.");
    const hero = `<div class="result-hero"><div class="k">근로자 4대보험 (월)</div><div class="v accent">${won(r.employee.total)}<small>보험료 기준 보수 ${won(r.base)}</small></div></div>`;
    const stats = `<div class="kv"><div><span class="k">사업주 4대보험</span><span class="v">${won(r.employer.total)}</span></div><div><span class="k">월급 − 근로자 4대보험</span><span class="v">${won(r.afterInsurance)}</span></div><div><span class="k">사장님 월 인건비</span><span class="v">${won(r.ownerCost)}</span></div></div>`;
    const warnHtml = `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
    const funnel = `<p class="ap-funnel">직원 여러 명의 4대보험·주휴·가산수당을 매달 계산하려면 → <a href="${TEMPLATE_URL}" rel="noopener" data-template-link data-placement="result">2027 급여대장 엑셀(9,900원)</a></p>`;
    const foot = `<p class="note">참고용 계산이에요. 노무·세무 자문이 아니에요. 공단 고지액과 몇십 원 다를 수 있어요.</p>`;
    out.innerHTML = hero + stats + h3("보험별 금액") + table(r, h) + warnHtml + funnel + foot;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => run(true), 160); }
  function run(count = true) {
    const h = read();
    out.hidden = false;
    const r = C.insure(h);
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
    if (N) N.track("template_click", { calculator: "insurance", item_id: "payroll-template-2027", placement: link.dataset.placement || "result" });
  });
  run(false); // 첫 화면 예시 결과 (통계는 보내지 않음)
}
