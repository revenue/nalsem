/* 날셈 2027 설 세뱃돈 계산기 화면 (ES 모듈): #sbf 폼을 읽어 sebaetdon-calc.js 로 계산하고 #result 에 그린다.
   인원·금액은 주소·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계: 결과 갱신은 N.bump 가 계산기 이름만 보낸다. 제휴 묶음 클릭은 "affiliate_click"(계산기·항목 id·플랫폼만). */
const v = new URL(import.meta.url).search; // 캐시 문자열(?v=)을 계산 모듈 쪽에도 붙인다
const C = await import("./sebaetdon-calc.js" + v);

const $ = (id) => document.getElementById(id);
const form = $("sbf"), out = $("result");
const N = window.N;
if (form && out) init();

function init() {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const M = C.formatManwon;
  const val = (id) => String($(id).value).replace(/[^0-9]/g, "");
  const segVal = () => ($("sb-level").querySelector('[aria-pressed="true"]') || {}).dataset?.v || C.DEFAULT_LEVEL;
  const setSeg = (v2) => $("sb-level").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v2)));
  $("sb-level").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; setSeg(b.dataset.v); schedule(); });

  const dd = $("sb-dday");
  if (dd) dd.textContent = `${C.ddayLabel(Date.now())} · 설 연휴 ${C.HOLIDAY_TEXT}`;

  const read = () => {
    const kids = C.emptyKids();
    for (const g of C.AGE_GROUPS) kids[g.id] = val(`sb-${g.id}`);
    return { kids, adults: val("sb-adults"), level: segVal(), budget: val("sb-budget"), travel: val("sb-travel"), gifts: val("sb-gifts") };
  };
  const fill = (x) => {
    for (const g of C.AGE_GROUPS) $(`sb-${g.id}`).value = x.kids[g.id] ? String(x.kids[g.id]) : "";
    $("sb-adults").value = x.adults ? String(x.adults) : "";
    for (const k of ["budget", "travel", "gifts"]) $(`sb-${k}`).value = x[k] ? String(x[k]) : "";
    setSeg(x.level);
  };

  const kv = (rows) => `<div class="kv">${rows.map(([k, x]) => `<div><span class="k">${k}</span><span class="v">${x}</span></div>`).join("")}</div>`;
  const h3 = (t) => `<h3 class="tx-h">${t}</h3>`;
  const rowTable = (rows, adults, adultPer) => {
    // 375px에서 잘리지 않게 3칸: 대상 | 1인 × 인원 | 합계
    const body = rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.perPerson}만×${r.count}명</td><td>${M(r.subtotal)}</td></tr>`).join("")
      + (adults ? `<tr><td>부모님·어른</td><td>${adultPer}만×${adults}분</td><td>${M(adultPer * adults)}</td></tr>` : "");
    return body ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>대상</th><th>1인×인원</th><th>합계</th></tr></thead><tbody>${body}</tbody></table></div>` : "";
  };
  const billsLine = (b) => `5만 원권 <b>${b.fiveMan}장</b>, 1만 원권 <b>${b.oneMan}장</b>`;

  function render(r) {
    const hero = `<div class="result-hero"><div class="k">올해 설에 나갈 돈 (${esc(C.levelLabel(r.level))} 기준)</div><div class="v accent">${M(r.grandTotal)}<small>세뱃돈 ${M(r.kidsTotal)} · 용돈 ${M(r.adultTotal)}${r.travel + r.gifts ? ` · 교통·차례·선물 ${M(r.travel + r.gifts)}` : ""}</small></div></div>`;
    const stats = `<div class="stats cols-3"><div class="stat"><div class="k">세뱃돈 (${r.kidsCount}명)</div><div class="v">${M(r.kidsTotal)}</div></div><div class="stat"><div class="k">어른 용돈 (${r.adults}분)</div><div class="v">${M(r.adultTotal)}</div></div><div class="stat"><div class="k">교통·차례·선물</div><div class="v">${M(r.travel + r.gifts)}</div></div></div>`;
    let html = hero + stats + h3("봉투별 금액") + rowTable(r.rows, r.adults, r.adultPerPerson);
    html += h3("은행에서 바꿀 신권") + `<p>${billsLine(r.bills)} <small class="note">봉투마다 5만 원권을 먼저 넣고 나머지를 1만 원권으로 채운 장수예요. 교통비·차례·선물비는 빼고 셌어요.</small></p>`;
    const p = r.budgetPlan;
    if (p) {
      html += h3(`세뱃돈 예산 ${M(p.budget)}에 맞춘 안`) + `<p><b>${esc(C.budgetMessage(p))}</b></p>`;
      if (p.status === "fitted" || p.status === "short") {
        html += rowTable(p.rows, 0, 0) + kv([["세뱃돈 합계", M(p.kidsTotal)], ["이 안으로 설에 나갈 돈", M(p.grandTotal)], ["신권", `5만 원권 ${p.bills.fiveMan}장, 1만 원권 ${p.bills.oneMan}장`]]);
      }
    }
    const warn = ["보도된 조사를 바탕으로 한 참고값이에요. 집안에서 정한 금액이 있으면 그걸 따르세요."];
    if (p && p.status === "fitted" && p.diff > 0) warn.push("남는 돈은 다시 나누지 않았어요. 필요하면 큰 아이 봉투에 더해 주세요.");
    if (!r.kidsCount) warn.push("세뱃돈 줄 아이를 넣으면 나이대별 금액과 예산 맞추기가 함께 나와요.");
    html += `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`;
    html += `<p class="note">토스 앱에서도 같은 계산을 할 수 있어요. 토스에서 '설날 세뱃돈 계산기'를 검색하세요.</p>`;
    out.innerHTML = html;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(() => run(true), 180); }
  function run(count = true) {
    const r = C.sebaetdon(read());
    out.hidden = false;
    if (r.error) { out.innerHTML = `<p class="note">${esc(r.error)}</p>`; return; }
    render(r);
    if (N && count) N.bump(out);
  }
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", (e) => { e.preventDefault(); run(true); out.scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("sb-example").addEventListener("click", () => { fill(C.EXAMPLE); run(true); });

  // 제휴 묶음(쿠팡) 클릭. 항목 id와 플랫폼만 보낸다.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-aff-link]");
    if (a && N) N.track("affiliate_click", { calculator: "sebaetdon", item_id: a.dataset.affId, network: a.dataset.affNet });
  });
  fill(C.EXAMPLE);
  run(false); // 첫 화면 예시 결과 (통계는 보내지 않음)
}
