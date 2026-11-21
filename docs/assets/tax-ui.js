/* 날셈 연말정산 화면: #tf 폼을 읽어 TAX.optimize 로 계산하고 #result 에 그린다.
   금액 입력값은 주소(쿼리)·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계는 N.bump 가 계산기 이름만 1회 보낸다(calc.js). */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("tf"), out = $("result");
  if (!form || !out || !window.TAX) return;
  const T = window.TAX, focus = form.dataset.focus || "all";
  const NAMES = ["나", "배우자"];
  const MAX_DEPS = 6;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const man = T.man;
  // 만 원 단위 입력 → 원
  const won = (el) => { if (!el) return 0; const v = parseFloat(String(el.value).replace(/[^0-9.]/g, "")); return isFinite(v) && v > 0 ? Math.round(v * 10000) : 0; };
  const val = (id) => won($(id));

  // ── 가족 행 ──
  const box = $("deps"), tpl = $("dep-tpl");
  let seq = 0;
  const REL_NAME = { child: "자녀", parent: "부모님", other: "형제자매" };
  function renumber() {
    if (!box) return;
    const c = { child: 0, parent: 0, other: 0 };
    [...box.children].forEach((n) => { const r = n.querySelector('[data-k="rel"]').value; c[r]++; n.dataset.name = REL_NAME[r] + c[r]; n.querySelector(".dep-name").textContent = REL_NAME[r] + c[r]; n.querySelector(".only-child").hidden = r !== "child"; });
    form.querySelectorAll("[data-add]").forEach((b) => (b.disabled = box.children.length >= MAX_DEPS));
  }
  function addDep(rel, vals) {
    if (!box || box.children.length >= MAX_DEPS) return null;
    const node = tpl.content.firstElementChild.cloneNode(true);
    seq++;
    node.querySelectorAll("[data-k]").forEach((el) => (el.id = `d${seq}-${el.dataset.k}`));
    node.querySelectorAll("label[data-for]").forEach((l) => (l.htmlFor = `d${seq}-${l.dataset.for}`));
    node.querySelector('[data-k="rel"]').value = rel;
    if (vals) Object.entries(vals).forEach(([k, v]) => { const el = node.querySelector(`[data-k="${k}"]`); if (!el) return; if (el.type === "checkbox") el.checked = !!v; else el.value = v; });
    box.appendChild(node);
    renumber();
    return node;
  }
  form.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { const n = addDep(add.dataset.add); if (n) n.querySelector('[data-k="by"]').focus(); schedule(); return; }
    const rm = e.target.closest("[data-remove]");
    if (rm) { rm.closest(".tx-dep").remove(); renumber(); schedule(); }
  });
  form.addEventListener("change", (e) => { if (e.target.matches('[data-k="rel"]')) renumber(); });

  // 12월 결제 수단
  const seg = $("dec-kind");
  let decKind = "credit";
  if (seg) seg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); decKind = b.dataset.v; schedule(); });

  // ── 폼 → 가구 ──
  function read() {
    const errs = [];
    const spouses = [0, 1].map((k) => ({
      salary: val(`s${k}-sal`), woman: !!($(`s${k}-woman`) && $(`s${k}-woman`).checked),
      card: { credit: val(`s${k}-credit`), debit: val(`s${k}-debit`), market: val(`s${k}-market`), culture: val(`s${k}-culture`) },
      medicalSelf: val(`s${k}-medSelf`), medicalForSpouse: val(`s${k}-medSp`),
      otherCredits: val(`s${k}-other`), social: val(`s${k}-social`) || undefined,
    }));
    const deps = [];
    if (box) for (const n of box.children) {
      const q = (k) => n.querySelector(`[data-k="${k}"]`);
      const byEl = q("by"), by = parseInt(byEl.value, 10), field = byEl.closest(".field");
      const ok = by >= 1900 && by <= T.YEAR;
      field.classList.toggle("is-error", !!byEl.value && !ok);
      if (byEl.value && !ok) field.querySelector(".err").textContent = `1900~${T.YEAR} 사이 연도를 넣어 주세요`;
      if (!ok) { if (byEl.value) errs.push(n.dataset.name); continue; }
      const rel = q("rel").value;
      deps.push({
        name: n.dataset.name, rel, birthYear: by, disabled: q("dis").checked, incomeOk: q("inc").checked,
        birthOrder: rel === "child" ? +q("bo").value : 0,
        medical: { paid: [won(q("m0")), won(q("m1"))] }, plannedMedical: won(q("mp")),
        education: { amount: won(q("ea")), kind: q("ek").value, payer: +q("ep").value },
        insurance: { amount: won(q("ia")), payer: +q("ip").value },
        card: won(q("cd")),
      });
    }
    return { names: NAMES, spouses, deps, plannedMedicalCouple: [val("s0-medPlan"), val("s1-medPlan")], december: { amount: val("dec-amt"), kind: decKind }, errs };
  }

  // ── 결과 그리기 ──
  const KIND_TAG = { dep: "부양가족", planned: "앞으로 낼 의료비", card: "12월 카드" };
  const ORDER = { all: ["dep", "planned", "card"], deps: ["dep", "planned", "card"], medical: ["planned", "dep", "card"], card: ["card", "dep", "planned"] }[focus];
  const fmtWon = (n) => (n >= 10_000 ? man(n).replace("약 ", "") : n > 0 ? "1만 원 미만" : "0원");
  function render(h, r) {
    const b = r.best, P = b.persons;
    const reasons = r.reasons.slice().sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind) || (x.even - y.even) || (y.gain - x.gain));
    const hero = r.diffVsWorst >= 10_000
      ? `<div class="result-hero"><div class="k">추천대로 하면 가장 불리하게 나눌 때보다</div><div class="v accent">${man(r.diffVsWorst)}<small>덜 냄</small></div></div>`
      : `<div class="result-hero"><div class="k">이 가구는</div><div class="v">어떻게 나눠도 비슷<small>차이 1만 원 미만</small></div></div>`;
    const hiName = NAMES[r.hi];
    const vsHigh = r.candidates.length > 1 ? `<p class="note">${r.diffVsAllHigh >= 10_000 ? `${h.december.amount > 0 ? (h.deps.length ? "가족과 12월 카드를" : "12월 카드를") : "가족을"} 전부 소득 높은 쪽(${hiName})으로 몰았을 때보다 <b>${man(r.diffVsAllHigh)}</b> 덜 냅니다.` : `소득 높은 쪽(${hiName})으로 전부 몰았을 때와 같은 결과입니다(차이 1만 원 미만).`} 금액은 부부의 결정세액과 지방소득세를 합친 것입니다.</p>` : "";
    const list = reasons.length ? `<h3 class="tx-h">추천과 이유</h3><ol class="tx-reco">${reasons.map((x) => `<li class="${x.even ? "even" : ""}"><span class="tag${x.even ? " neutral" : ""}">${KIND_TAG[x.kind]}</span><p>${esc(x.text)}</p></li>`).join("")}</ol>` : `<p class="note">부양가족, 앞으로 낼 의료비, 12월 카드 중 나눌 것이 없어 두 사람의 세금만 계산했습니다. 위 칸을 채우면 추천이 나옵니다.</p>`;
    const row = (label, f) => `<tr><td>${label}</td>${P.map((p) => `<td class="num">${f(p)}</td>`).join("")}</tr>`;
    const credits = (p) => p.creditSum - Math.max(0, p.creditSum - p.calc);
    const table = `<h3 class="tx-h">추천대로 했을 때 두 사람의 세금 (추정)</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>${NAMES[0]}</th><th>${NAMES[1]}</th></tr></thead><tbody>
      ${row("총급여", (p) => fmtWon(p.salary))}${row("과세표준 (세율 구간)", (p) => `${fmtWon(p.base)} (${p.marginal}%)`)}${row("산출세액", (p) => fmtWon(p.calc))}${row("세액공제 (실제 쓰인 것)", (p) => fmtWon(credits(p)))}${row("결정세액", (p) => fmtWon(p.decided))}${row("지방소득세", (p) => fmtWon(p.local))}
      <tr class="hl"><td>합계</td>${P.map((p) => `<td class="num">${fmtWon(p.total)}</td>`).join("")}</tr></tbody></table></div>
      <p class="note">공제 방식: ${P.map((p, i) => `${NAMES[i]} ${p.regime === "standard" ? "표준세액공제(13만 원)가 더 유리" : "특별공제(보험료·의료비 등)"}`).join(", ")}. 환급액은 회사가 이미 뗀 세금(기납부세액)에 따라 달라 여기서는 결정세액만 비교합니다.</p>`;
    const warn = [];
    r.notes.forEach((x) => warn.push(x));
    r.warnings.forEach((x) => warn.push(x));
    if (r.nearZero && !(h.spouses[0].otherCredits || h.spouses[1].otherCredits)) warn.push("한쪽 결정세액이 0원에 가까워 추천 배분이 뒤집힐 수 있습니다. '더 정확하게'에서 연금저축·월세·기부금 등 그 밖의 세액공제 합계를 넣어 다시 보세요.");
    const unv = r.usedUnverified.filter((k) => k !== "social" && k !== "kid2017");
    if (unv.length) warn.push("원문으로 확정하지 못한 규칙을 썼습니다: " + unv.map((k) => T.RULES[k].label).join(", ") + ".");
    if (r.usedUnverified.includes("social")) warn.push("4대보험료는 2026년 요율로 추정했습니다. 실제 납부액은 '더 정확하게'에 넣을 수 있습니다(배분 결정에는 영향이 거의 없습니다).");
    if (h.spouses.some((s) => s.salary > 0 && s.salary <= 5_000_000)) warn.push("총급여 500만 원 이하인 배우자는 맞벌이가 아니라 상대방의 배우자 기본공제 대상일 수 있습니다. 이 계산기는 두 사람 모두 공제 대상이 아닌 맞벌이 부부를 가정합니다.");
    if (h.errs.length) warn.push(`${h.errs.join(", ")}: 출생연도를 확인해 주세요. 계산에서 뺐습니다.`);
    const warnHtml = warn.length ? `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
    const disc = `<p class="note tx-disc"><b>2026년 귀속 세법 기준 추정.</b> 실제 결과는 1월 홈택스 '맞벌이 근로자 절세 안내'에서 확인하세요. 홈택스는 1월 중순 간소화 자료가 열린 뒤, 부부가 각자 공제신고서를 작성하고 배우자 자료 제공에 동의하면 부양가족 배분별 세금을 비교해 줍니다. 2026년에 혼인신고했다면 결혼세액공제(처음 받는 사람 각 50만 원)도 받을 수 있습니다(배분과 무관).</p>`;
    out.innerHTML = hero + vsHigh + list + warnHtml + table + disc;
  }

  // ── 실행 ──
  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 160); }
  function run() {
    const h = read();
    if (!(h.spouses[0].salary > 0 && h.spouses[1].salary > 0)) { out.hidden = false; out.innerHTML = `<p class="note">두 사람의 총급여를 넣으면 바로 계산합니다.</p>`; return; }
    let r;
    try { r = T.optimize(h); } catch (e) { out.hidden = false; out.innerHTML = `<p class="note">${esc(e.message || "계산할 수 없습니다")}</p>`; return; }
    render(h, r);
    N.bump(out);
  }
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", (e) => { e.preventDefault(); run(); out.scrollIntoView({ behavior: "smooth", block: "start" }); });

  // ── 예시 가구 (설명 카드의 예시와 같은 숫자) ──
  const EXAMPLES = {
    all: { v: { "s0-sal": 9000, "s1-sal": 3500, "s0-credit": 1600, "s1-credit": 1200, "dec-amt": 300 }, deps: [["child", { by: 2016 }], ["parent", { by: 1958 }]] },
    deps: { v: { "s0-sal": 9000, "s1-sal": 4800 }, deps: [["child", { by: 2014 }], ["child", { by: 2019 }], ["parent", { by: 1952 }]] },
    medical: { v: { "s0-sal": 7000, "s1-sal": 3000, "s1-medPlan": 800 }, deps: [["child", { by: 2022, m1: 150 }]] },
    card: { v: { "s0-sal": 6000, "s1-sal": 4000, "s0-credit": 1300, "s1-credit": 1400, "dec-amt": 300 }, deps: [] },
  };
  const ex = $("tx-example");
  if (ex) ex.addEventListener("click", () => {
    const E = EXAMPLES[focus];
    form.reset(); decKind = "credit";
    if (seg) seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === "credit")));
    if (box) box.innerHTML = "";
    Object.entries(E.v).forEach(([id, v]) => { const el = $(id); if (el) { el.value = v; const d = el.closest("details"); if (d) d.open = true; } });
    E.deps.forEach(([rel, vals]) => { const n = addDep(rel, vals); if (n && (vals.m0 || vals.m1)) n.querySelector("details").open = true; });
    run();
  });
  renumber();
})();
