/* 날셈 2027 알바 인건비 계산기 화면 (ES 모듈): #apf 폼을 읽어 alba-pay-input.js → 급여 엔진으로 계산하고 #result 에 그린다.
   시급·근무시간은 주소·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계: 결과 갱신은 N.bump 가 계산기 이름만 보낸다(calc.js "calculate"). 급여대장 안내 링크 클릭은 "template_click"(입력값 없음). */
const v = new URL(import.meta.url).search; // 캐시 문자열(?v=)을 엔진 쪽에도 붙인다
const A = await import("./alba-pay-input.js" + v);

const $ = (id) => document.getElementById(id);
const form = $("apf"), out = $("result");
const N = window.N;
if (form && out) init();

function init() {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;
  const num = (id) => { const s = String($(id).value).replace(/[^0-9.]/g, ""); if (s === "") return null; const x = parseFloat(s); return isFinite(x) ? x : null; };
  const segVal = (id) => ($(id).querySelector('[aria-pressed="true"]') || {}).dataset?.v;
  const setSeg = (id, val) => $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === val)));
  form.querySelectorAll(".seg").forEach((g) => g.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setSeg(g.id, b.dataset.v); schedule(); }));

  function read() {
    return {
      scale: segVal("ap-scale"), month: $("ap-month").value,
      wage: num("ap-wage") || 0, days: parseInt($("ap-days").value, 10),
      hours: num("ap-hours") || 0, night: num("ap-night") || 0, holidayHours: num("ap-holiday") || 0,
      absentWeeks: parseInt($("ap-absent").value, 10) || 0,
      employment: segVal("ap-emp"), accidentPct: num("ap-acc"),
      shopDays: parseInt($("ap-shop").value, 10), tenure: $("ap-tenure").value,
    };
  }

  const kv = (rows) => `<div class="kv">${rows.map(([k, val, sub, cls]) => `<div${cls ? ` class="${cls}"` : ""}><span class="k">${k}${sub ? `<small class="kp-why">${sub}</small>` : ""}</span><span class="v">${val}</span></div>`).join("")}</div>`;
  const h3 = (t) => `<h3 class="tx-h">${t}</h3>`;

  function render(h, r) {
    const x = r.row, ee = x.employee, er = x.employer, el = x.eligibility;
    const [, mm] = h.month.split("-").map(Number);
    const wk = x.weeklyHolidayMin / 60;
    const hero = `<div class="result-hero"><div class="k">사장님 월 비용 (2027년 ${mm}월)</div><div class="v accent">${won(x.ownerCost)}<small>지급총액 + 사업주 4대보험</small></div></div>`;
    const stats = `<div class="stats cols-3 ap-stats"><div class="stat"><div class="k">지급총액</div><div class="v">${won(x.gross)}</div></div><div class="stat"><div class="k">사업주 4대보험</div><div class="v">${won(er.total)}</div></div><div class="stat"><div class="k">직원 실수령</div><div class="v">${won(x.netPay)}<small>소득세 전</small></div></div></div>`;
    const no = (ok) => (ok ? "" : "적용 안 됨");
    const pay = kv([
      ["기본급", won(x.basePay), `${x.workedMin / 60}시간 × ${won(h.wage)}`],
      ["주휴수당", won(x.weeklyHolidayPay), wk > 0 ? `${+(wk / Math.max(1, r.weeks - h.absentWeeks)).toFixed(2)}시간 × ${r.weeks - h.absentWeeks}주` : r.under15 ? "주 15시간 미만" : "개근한 주 없음"],
      ...(h.scale === "5인 이상" ? [
        ["연장 가산 (50%)", won(x.overtimePremium), x.overtimePremium ? "하루 8시간·주 40시간 넘은 시간" : ""],
        ["야간 가산 (50%)", won(x.nightPremium), x.nightPremium ? `야간 ${x.nightMin / 60}시간` : ""],
        ["휴일 가산 (50%)", won(x.holidayPremium), x.holidayPremium ? `휴일 ${x.holidayMin / 60}시간` : ""],
      ] : [["가산수당", "0원", "5인 미만은 가산 없음"]]),
      ["지급총액", won(x.gross), "", "ap-sum"],
    ]);
    const empPct = (A.EMPLOYMENT[h.employment] * 100).toFixed(1);
    const eeT = kv([
      ["국민연금 5.0%", won(ee.pension), no(el.pension)],
      ["건강보험 3.595%", won(ee.health), no(el.health)],
      ["장기요양", won(ee.ltc), el.health ? "건강보험료 × 13.90%" : no(false)],
      [`고용보험 ${empPct}%`, won(ee.employment), no(el.employment)],
      ["근로자 공제 합계", won(ee.total), "", "ap-sum"],
    ]);
    const erT = kv([
      ["국민연금 5.0%", won(er.pension), no(el.pension)],
      ["건강보험 3.595%", won(er.health), no(el.health)],
      ["장기요양", won(er.ltc), el.health ? "건강보험료 × 13.90%" : no(false)],
      [`고용보험 ${empPct}% + 0.25%`, won(er.employment), no(el.employment)],
      [`산재보험 ${r.accidentBlank ? "" : h.accidentPct + "%"}`.trim(), won(er.accident), r.accidentBlank ? "요율을 비워서 뺐어요" : ""],
      ["사업주 부담 합계", won(er.total), "", "ap-sum"],
    ]);
    const extra = x.severanceAccrual ? `<p class="note">참고: 퇴직금 적립(월 지급총액 ÷ 12)까지 넣으면 월 <b>${won(x.ownerCostWithAccrual)}</b>이에요. 퇴직금은 1년 이상 일하고 퇴사할 때 줘요.</p>` : "";

    const warn = [];
    if (r.underMin) warn.push(`시급이 2027년 최저임금 10,700원보다 낮아요. 최저임금보다 적게 주면 법 위반이에요.`);
    if (r.under15) warn.push(`주 ${r.weeklyHours}시간이라 주 15시간 미만이에요. 주휴수당·퇴직금이 없고 국민연금·건강보험도 보통 들지 않아요. 고용보험은 3개월 이상 일하면 들어가고, 산재보험은 시간과 관계없이 들어가요.`);
    if (h.scale === "5인 미만") {
      const five = A.calc(h, "5인 이상");
      const diff = five.row ? five.row.ownerCost - x.ownerCost : 0;
      warn.push(`5인 미만 사업장은 연장·야간·휴일 50% 가산을 주지 않아도 돼요. 일한 시간의 시급은 다 줘요.${diff > 0 ? ` 같은 근무가 5인 이상이면 사장님 월 비용이 ${won(diff)} 더 들어요.` : ""}`);
    }
    if (h.employment === "proposal") warn.push("고용보험 1.0%는 정부안이에요. 아직 확정되지 않았어요.");
    else warn.push("고용보험은 현행 0.9%로 계산했어요. 2027년에 1.0%로 오르는 정부안이 있어요(미확정).");
    if (r.accidentBlank) warn.push("산재보험은 빠져 있어요. 업종 요율 × 지급총액만큼 더 들어요. 2027년 요율은 12월 말 고시예요.");
    warn.push(`이 달은 일요일이 ${r.weeks}번이라 주휴를 최대 ${r.weeks}번 넣었어요. 첫 주가 지난달에 걸쳐 있어도 일요일이 이 달이면 이 달에 넣어요.`);
    const warnHtml = `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
    const funnel = `<p class="ap-funnel">직원 여러 명을 매달 관리하려면 → <a href="#template-coming-soon" data-template-link>2027 급여대장 엑셀(9,900원)</a></p>`;
    const foot = `<p class="note">참고용 계산이에요. 노무 자문이 아니에요. 소득세는 빼고 계산했어요.</p>`;
    out.innerHTML = hero + stats + h3("지급 내역") + pay + h3("근로자 4대보험 공제") + eeT + h3("사업주 4대보험") + erT + extra + warnHtml + funnel + foot;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 160); }
  function run() {
    const h = read();
    out.hidden = false;
    const r = A.calc(h);
    if (r.error) { out.innerHTML = `<p class="note">${esc(r.error)}</p>`; return; }
    render(h, r);
    if (N) N.bump(out);
  }
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", (e) => { e.preventDefault(); run(); out.scrollIntoView({ behavior: "smooth", block: "start" }); });

  // 급여대장 안내 링크 클릭 (판매 링크 클릭 가설 H1 측정). 입력값은 넣지 않는다.
  out.addEventListener("click", (e) => {
    if (!e.target.closest("[data-template-link]")) return;
    if (N) N.track("template_click", { calculator: "alba-pay", item_id: "payroll-template-2027", placement: "result" });
  });

  // 예시: 설명 카드의 예시와 같은 값 (alba-pay-input.js EXAMPLE)
  $("ap-example").addEventListener("click", () => {
    const E = A.EXAMPLE;
    form.reset();
    setSeg("ap-scale", E.scale); setSeg("ap-emp", E.employment);
    $("ap-month").value = E.month; $("ap-wage").value = String(E.wage); $("ap-days").value = String(E.days);
    $("ap-hours").value = String(E.hours); $("ap-night").value = String(E.night); $("ap-holiday").value = E.holidayHours ? String(E.holidayHours) : "";
    $("ap-absent").value = String(E.absentWeeks); $("ap-acc").value = E.accidentPct === null ? "" : String(E.accidentPct);
    $("ap-shop").value = String(E.shopDays); $("ap-tenure").value = E.tenure;
    run();
  });
  run();
}
