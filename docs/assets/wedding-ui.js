/* 날셈 결혼 준비 계산기 화면 (ES 모듈): #wmf(식대·축의금), #wsf(양가 분담), #wpf(결제 일정) 폼을 읽어 wedding-input.js → 결혼 시트 엔진으로 계산하고 #result 에 그린다.
   인원·금액은 주소·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계: 결과 갱신은 N.bump 가 계산기 이름만 보낸다(calc.js "calculate"). 결혼 시트 안내 링크 클릭은 "template_click"(입력값 없음). */
const v = new URL(import.meta.url).search; // 캐시 문자열(?v=)을 엔진 쪽에도 붙인다
const W = await import("./wedding-input.js" + v);

const $ = (id) => document.getElementById(id);
const out = $("result");
const N = window.N;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const won = (x) => `${Number(x).toLocaleString("ko-KR")}원`;
const num = (el) => { if (!el) return null; const s = String(el.value).replace(/[^0-9.]/g, ""); if (s === "") return null; const x = parseFloat(s); return isFinite(x) ? x : null; };
const kv = (rows) => `<div class="kv">${rows.map(([k, val, sub, cls]) => `<div${cls ? ` class="${cls}"` : ""}><span class="k">${k}${sub ? `<small class="kp-why">${sub}</small>` : ""}</span><span class="v">${val}</span></div>`).join("")}</div>`;
const h3 = (t) => `<h3 class="tx-h">${t}</h3>`;
const funnel = (calc, text) => `<p class="ap-funnel">${text} → <a href="${W.SHEET.href}" rel="noopener" data-template-link data-placement="result">${W.SHEET.name}(${W.SHEET.price})</a></p>`;
const warnBox = (items) => (items.length ? `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${items.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : "");

function wire(form, calcName, run) {
  let timer = 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(go, 160); };
  function go() {
    out.hidden = false;
    run();
    if (N) N.bump(out);
  }
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", (e) => { e.preventDefault(); go(); out.scrollIntoView({ behavior: "smooth", block: "start" }); });
  // 결혼 시트 안내 링크 클릭 (판매 링크 클릭 측정). 입력값은 넣지 않는다.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-template-link]");
    if (link && N) N.track("template_click", { calculator: calcName, item_id: "wedding-sheet-2027", placement: link.dataset.placement || "result" });
  });
  return { go, schedule };
}

// ── 식대·축의금 ──────────────────────────────────────────────
const mf = $("wmf");
if (mf && out) {
  const read = () => ({
    mealPrice: num($("wm-price")), guarantee: num($("wm-guar")), mealRatePct: num($("wm-rate")),
    groups: [...mf.querySelectorAll(".wd-groups")].flatMap((box) => [...box.querySelectorAll(".wd-g")].map((row) => ({
      side: box.dataset.side,
      name: row.querySelector('[data-k="name"]').value.trim(),
      invited: num(row.querySelector('[data-k="invited"]')),
      ratePct: num(row.querySelector('[data-k="rate"]')),
      gift: num(row.querySelector('[data-k="gift"]')),
    }))),
  });
  const render = (h, r) => {
    const g = r.groom, b = r.bride, t = r.total;
    const sign = (x) => (x < 0 ? `<span class="wd-neg">${won(x)}</span>` : won(x));
    const hero = `<div class="result-hero"><div class="k">축의금 − 식대 (양가 합계)</div><div class="v accent">${sign(t.net)}<small>예상 축의금 ${won(t.gift)} − 식대 ${won(r.mealTotal)}</small></div></div>`;
    const stats = `<div class="stats wd-stats"><div class="stat"><div class="k">식대 총액</div><div class="v">${won(r.mealTotal)}<small>${r.billed}명 × ${won(r.mealPrice)}</small></div></div><div class="stat"><div class="k">예상 식사 인원</div><div class="v">${t.eat}명<small>보증 ${r.guarantee}명</small></div></div><div class="stat"><div class="k">보증 미달로 더 내는 식대</div><div class="v">${won(r.shortfall)}</div></div></div>`;
    const side = kv([
      ["예상 참석", `${g.attend}명 / ${b.attend}명`, "신랑측 / 신부측"],
      ["예상 식사 인원", `${g.eat}명 / ${b.eat}명`],
      ["식대 몫", `${won(g.meal)} / ${won(b.meal)}`, `식사 인원 비율 ${(r.share * 100).toFixed(1)}% : ${(100 - r.share * 100).toFixed(1)}%`],
      ["예상 축의금", `${won(g.gift)} / ${won(b.gift)}`],
      ["축의금 − 식대", `${sign(g.net)} / ${sign(b.net)}`, "", "ap-sum"],
    ]);
    const warn = [];
    if (r.shortfall > 0) warn.push(`예상 식사 인원이 보증인원보다 ${r.toFill}명 적어요. 아무도 먹지 않는 ${r.toFill}명분 식대 ${won(r.shortfall)}을 그대로 내요.`);
    else if (r.guarantee > 0) warn.push(`예상 식사 인원이 보증인원보다 ${t.eat - r.guarantee}명 많아서 보증 미달 식대는 없어요.`);
    if (t.attend > 0) warn.push(`참석자 한 명이 평균 ${won(r.breakEven)} 넘게 내면 축의금이 식대보다 많아요.`);
    if (r.rows.some((x) => x.warn)) warn.push("측을 고르지 않은 그룹이 있어요.");
    warn.push("대관료·음료·봉사료 같은 추가 비용은 빠져 있어요. 예식장 견적서로 따로 확인하세요.");
    out.innerHTML = hero + stats + h3("신랑측 / 신부측") + side + warnBox(warn)
      + funnel("wedding-meal", "예식장·스드메 계약금·잔금 일정과 양가 분담까지 한 파일로 관리하려면")
      + `<p class="note">참고용 예상치예요. 실제 금액은 예식장 계약서를 기준으로 하세요.</p>`;
  };
  const { go } = wire(mf, "wedding-meal", () => {
    const h = read();
    const r = W.mealCalc(h);
    if (r.error) { out.innerHTML = `<p class="note">${esc(r.error)}</p>`; return; }
    render(h, r);
  });
  $("wm-example").addEventListener("click", () => {
    const E = W.MEAL_EXAMPLE;
    $("wm-price").value = E.mealPrice; $("wm-guar").value = E.guarantee; $("wm-rate").value = E.mealRatePct;
    const rows = [...mf.querySelectorAll(".wd-g:not(.wd-head)")];
    E.groups.forEach((g, i) => {
      const row = rows[i]; if (!row) return;
      row.querySelector('[data-k="name"]').value = g.name;
      row.querySelector('[data-k="invited"]').value = g.invited;
      row.querySelector('[data-k="rate"]').value = g.ratePct;
      row.querySelector('[data-k="gift"]').value = g.gift;
    });
    go();
  });
  go();
}

// ── 양가 분담 ───────────────────────────────────────────────
const sf = $("wsf");
if (sf && out) {
  const box = $("ws-rows"), tpl = $("ws-tpl"), add = $("ws-add");
  let seq = 0;
  function renumber() {
    [...box.children].forEach((n, i) => { n.querySelector(".ws-name").textContent = `항목 ${i + 1}`; n.querySelector("[data-remove]").hidden = box.children.length === 1; });
    add.disabled = box.children.length >= W.MAX_ROWS;
  }
  function syncRatio(node) { node.querySelector(".ws-ratio").hidden = node.querySelector('[data-k="method"]').value !== "비율"; }
  function addRow(vals) {
    if (box.children.length >= W.MAX_ROWS) return null;
    const node = tpl.content.firstElementChild.cloneNode(true);
    seq++;
    node.querySelectorAll("[data-k]").forEach((el) => (el.id = `ws${seq}-${el.dataset.k}`));
    node.querySelectorAll("label[data-for]").forEach((l) => (l.htmlFor = `ws${seq}-${l.dataset.for}`));
    if (vals) {
      const set = (k, val) => { const el = node.querySelector(`[data-k="${k}"]`); if (el && val !== null && val !== undefined) el.value = val; };
      set("name", vals.name); set("amount", vals.amount); set("method", vals.method); set("ratio", vals.ratioPct); set("payer", vals.payer);
    }
    syncRatio(node);
    box.appendChild(node);
    renumber();
    return node;
  }
  const fill = (E) => {
    box.innerHTML = "";
    E.rows.forEach((r) => addRow(r));
    $("ws-ratio").value = E.defaultRatioPct; $("ws-gg").value = E.guestsGroom; $("ws-gb").value = E.guestsBride;
  };
  const read = () => ({
    defaultRatioPct: num($("ws-ratio")), guestsGroom: num($("ws-gg")), guestsBride: num($("ws-gb")),
    rows: [...box.children].map((n) => ({
      name: n.querySelector('[data-k="name"]').value.trim(),
      amount: num(n.querySelector('[data-k="amount"]')),
      method: n.querySelector('[data-k="method"]').value,
      ratioPct: num(n.querySelector('[data-k="ratio"]')),
      payer: n.querySelector('[data-k="payer"]').value,
    })),
  });
  const render = (h, r) => {
    const s = r.split;
    const pct = (x) => `${+(x * 100).toFixed(1)}%`;
    const settle = s.settleAmount > 0 ? `${s.direction} ${won(s.settleAmount)}` : "정산할 돈 없음";
    const hero = `<div class="result-hero"><div class="k">지금까지 낸 돈 기준 정산</div><div class="v accent">${esc(settle)}<small>${s.settleAmount > 0 ? "더 낸 쪽에 덜 낸 쪽이 보낼 금액" : "낸 돈이 각자 몫과 같아요"}</small></div></div>`;
    const stats = `<div class="stats wd-stats"><div class="stat"><div class="k">전체 금액</div><div class="v">${won(s.totalBurden)}</div></div><div class="stat"><div class="k">신랑측 부담</div><div class="v">${won(s.groomBurden)}<small>${pct(s.totalBurden ? s.groomBurden / s.totalBurden : 0)}</small></div></div><div class="stat"><div class="k">신부측 부담</div><div class="v">${won(s.brideBurden)}<small>${pct(s.totalBurden ? s.brideBurden / s.totalBurden : 0)}</small></div></div></div>`;
    const lines = `<div class="tbl-wrap"><table class="tbl wd-tbl"><thead><tr><th>항목</th><th>방식</th><th class="num">신랑측</th><th class="num">신부측</th></tr></thead><tbody>${r.lines.map((x) => `<tr><td>${esc(x.name)}${x.payer === "아직" ? ' <small class="kp-why">아직 안 냄</small>' : ""}</td><td>${esc(x.method === "비율" ? `비율 ${pct(x.share)}` : x.method === "하객 비율" ? `하객 ${pct(x.share)}` : x.method)}</td><td class="num">${won(x.groom)}</td><td class="num">${won(x.bride)}</td></tr>`).join("")}<tr class="hl"><td>합계</td><td></td><td class="num">${won(s.groomBurden)}</td><td class="num">${won(s.brideBurden)}</td></tr></tbody></table></div>`;
    const paid = kv([
      ["낸 돈 합계", won(s.paidTotal)],
      ["신랑측이 낸 돈 / 낸 항목의 신랑측 몫", `${won(s.groomPaid)} / ${won(s.groomShould)}`],
      ["신부측이 낸 돈 / 낸 항목의 신부측 몫", `${won(s.bridePaid)} / ${won(s.brideShould)}`],
      ["정산", esc(settle), "", "ap-sum"],
    ]);
    const warn = [];
    if (r.noGuests) warn.push("하객 비율 항목이 있는데 양가 하객 수가 비어 있어서 반반으로 계산했어요.");
    else if (r.usesGuests) warn.push(`하객 비율은 신랑측 ${pct(r.guestShare)} : 신부측 ${pct(1 - r.guestShare)}로 계산했어요.`);
    const unpaid = r.lines.filter((x) => x.payer === "아직");
    if (unpaid.length) warn.push(`아직 안 낸 항목 ${unpaid.length}개(${won(unpaid.reduce((a, x) => a + x.amount, 0))})는 부담에는 들어가고 정산에서는 빠졌어요.`);
    warn.push("축의금은 넣지 않았어요. 축의금을 각자 받는다면 식대·축의금 계산기로 측별 손익을 따로 보세요.");
    out.innerHTML = hero + stats + h3("항목별 몫") + lines + h3("낸 돈과 정산") + paid + warnBox(warn)
      + funnel("wedding-split", "계약금·중도금·잔금 날짜, D-day, 월별 낼 돈까지 40줄로 관리하려면")
      + `<p class="note">참고용 계산이에요. 양가가 합의한 방식과 실제 영수증을 기준으로 하세요.</p>`;
  };
  const { go, schedule } = wire(sf, "wedding-split", () => {
    const h = read();
    const r = W.splitCalc(h);
    if (r.error) { out.innerHTML = `<p class="note">${esc(r.error)}</p>`; return; }
    render(h, r);
  });
  add.addEventListener("click", () => { const n = addRow(); if (n) n.querySelector('[data-k="name"]').focus(); schedule(); });
  box.addEventListener("click", (e) => { const rm = e.target.closest("[data-remove]"); if (rm && box.children.length > 1) { rm.closest(".ws-row").remove(); renumber(); schedule(); } });
  box.addEventListener("change", (e) => { if (e.target.matches('[data-k="method"]')) syncRatio(e.target.closest(".ws-row")); });
  $("ws-example").addEventListener("click", () => { fill(W.SPLIT_EXAMPLE); go(); });
  fill(W.SPLIT_EXAMPLE);
  go();
}

// ── 결제 일정 ───────────────────────────────────────────────
const pf = $("wpf");
if (pf && out) {
  const box = $("wp-rows"), tpl = $("wp-tpl"), add = $("wp-add");
  const pad = (x) => String(x).padStart(2, "0");
  const now = new Date();
  const TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const md = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${y}.${+m}.${+d}`; };
  const ym = (s) => { const [y, m] = s.split("-"); return `${+m}월<small class="kp-why">${y}</small>`; };
  const mdShort = (iso) => { const [, m, d] = iso.split("-"); return `${+m}.${+d}`; };
  const dd = (n) => (n === "" ? "" : n === 0 ? "D-day" : n > 0 ? `D-${n}` : `D+${-n}`);
  const badge = (st) => `<span class="wp-st" data-st="${esc(st)}">${esc(st)}</span>`;
  let seq = 0;
  function renumber() {
    [...box.children].forEach((n, i) => { n.querySelector(".wp-name").textContent = `항목 ${i + 1}`; n.querySelector("[data-remove]").hidden = box.children.length === 1; });
    add.disabled = box.children.length >= W.MAX_ROWS;
  }
  function addRow(vals) {
    if (box.children.length >= W.MAX_ROWS) return null;
    const node = tpl.content.firstElementChild.cloneNode(true);
    seq++;
    node.querySelectorAll("[data-k]").forEach((el) => (el.id = `wp${seq}-${el.dataset.k}`));
    node.querySelectorAll("label[data-for]").forEach((l) => (l.htmlFor = `wp${seq}-${l.dataset.for}`));
    if (vals) {
      const set = (k, val) => { const el = node.querySelector(`[data-k="${k}"]`); if (!el || val === null || val === undefined) return; if (el.type === "checkbox") el.checked = !!val; else el.value = val; };
      set("name", vals.name); set("total", vals.total);
      for (const k of ["dep", "mid"]) { set(`${k}-amount`, vals[k].amount); set(`${k}-date`, vals[k].date); set(`${k}-paid`, vals[k].paid); }
      set("bal-date", vals.bal.date); set("bal-paid", vals.bal.paid);
    }
    box.appendChild(node);
    renumber();
    return node;
  }
  const fill = (E) => {
    box.innerHTML = "";
    E.rows.forEach((r) => addRow(r));
    $("wp-wedding").value = E.wedding; $("wp-budget").value = E.budget ?? "";
  };
  const q = (n, k) => n.querySelector(`[data-k="${k}"]`);
  const read = () => ({
    today: TODAY, wedding: $("wp-wedding").value, budget: num($("wp-budget")),
    rows: [...box.children].map((n) => ({
      name: q(n, "name").value.trim(), total: num(q(n, "total")),
      dep: { amount: num(q(n, "dep-amount")), date: q(n, "dep-date").value, paid: q(n, "dep-paid").checked },
      mid: { amount: num(q(n, "mid-amount")), date: q(n, "mid-date").value, paid: q(n, "mid-paid").checked },
      bal: { date: q(n, "bal-date").value, paid: q(n, "bal-paid").checked },
    })),
  });
  // 잔금(자동) 칸: 줄마다 총액 − 계약금 − 중도금
  const syncBal = () => [...box.children].forEach((n) => {
    const b = (num(q(n, "total")) || 0) - (num(q(n, "dep-amount")) || 0) - (num(q(n, "mid-amount")) || 0);
    const o = q(n, "bal-amount"); o.textContent = won(b); o.classList.toggle("wd-neg", b < 0);
  });
  const render = (r) => {
    const u = r.upcoming[0];
    const hero = u
      ? `<div class="result-hero"><div class="k">다음 결제 · ${md(u.date)} · ${esc(u.name)}</div><div class="v accent">${won(u.amount)}<small>${dd(u.dday)} ${esc(u.status)}</small></div></div>`
      : `<div class="result-hero"><div class="k">다음 결제</div><div class="v accent">남은 결제 없음<small>날짜가 있는 회차를 모두 냈어요</small></div></div>`;
    const stat = (k, v, sub = "") => `<div class="stat"><div class="k">${k}</div><div class="v">${v}${sub ? `<small>${sub}</small>` : ""}</div></div>`;
    const stats = `<div class="stats wd-stats">${r.wedding ? stat("예식", dd(r.weddingDday), md(r.wedding)) : ""}${stat("계약 총액", won(r.contractTotal), r.budgetLeft !== "" ? `예산에서 남은 돈 <span class="${r.budgetLeft < 0 ? "wd-neg" : ""}">${won(r.budgetLeft)}</span>` : "")}${stat("낸 돈", won(r.paid))}${stat("남은 돈", won(r.unpaid))}</div>`;
    const up = r.upcoming.length
      ? `<div class="tbl-wrap"><table class="tbl wd-tbl"><thead><tr><th>날짜</th><th>금액 · 항목</th></tr></thead><tbody>${r.upcoming.map((x) => `<tr><td class="num">${mdShort(x.date)}<small class="kp-why">${x.date.slice(0, 4)} · ${dd(x.dday)}</small></td><td><b class="wp-amt">${won(x.amount)}</b> ${badge(x.status)}<small class="kp-why">${esc(x.name)}</small></td></tr>`).join("")}</tbody></table></div>`
      : `<p class="note">날짜가 있는 안 낸 회차가 없어요.</p>`;
    const due = kv([
      ["이번 달 남은 결제", won(r.thisMonthDue), "오늘부터 이번 달 말까지 안 낸 회차"],
      ["14일 안에 낼 결제", `${r.soonCount}건`],
      ["연체", r.overdueCount ? `<span class="wd-neg">${r.overdueCount}건 ${won(r.overdueAmount)}</span>` : "없음", "날짜가 지났는데 안 낸 회차", r.overdueCount ? "ap-sum" : ""],
    ]);
    const mrow = (label, m, cum) => `<tr><td>${label}</td><td class="num">${won(m.total)}<small class="kp-why">${m.unpaid === m.total ? "모두 안 냄" : m.unpaid ? `안 냄 ${won(m.unpaid)}` : "모두 냄"}${cum === null ? "" : ` · 누적 ${won(cum)}`}</small></td></tr>`;
    const mon = r.months.length || r.before.total
      ? `<div class="tbl-wrap"><table class="tbl wd-tbl"><thead><tr><th>달</th><th class="num">낼 돈</th></tr></thead><tbody>${r.before.total ? mrow("지난달까지", r.before, r.before.total) : ""}${r.months.map((m) => (m.total ? mrow(ym(m.month), m, m.cumulative) : "")).join("")}${r.after.total ? mrow("그 뒤", r.after, null) : ""}${r.noDate.total ? mrow("날짜 없음", r.noDate, null) : ""}</tbody></table></div>`
      : "";
    const lines = `<div class="tbl-wrap"><table class="tbl wd-tbl"><thead><tr><th>항목</th><th class="num">남은 돈</th></tr></thead><tbody>${r.lines.map((x) => `<tr><td>${esc(x.name)} ${badge(x.status)}${x.next ? `<small class="kp-why">다음 ${md(x.next)}</small>` : ""}</td><td class="num">${won(x.unpaid)}<small class="kp-why">총액 ${won(x.total)}</small></td></tr>`).join("")}</tbody></table></div>`;
    const warn = [];
    if (r.amountIssues.length) warn.push(`계약금 + 중도금이 총액보다 커요: ${r.amountIssues.join(", ")}`);
    if (r.noDateItems.length) warn.push(`날짜가 없어 일정에서 빠진 항목이 있어요: ${r.noDateItems.join(", ")}. ${r.wedding ? "회차 날짜를 넣어 주세요." : "예식일을 넣으면 잔금은 예식일로 잡혀요."}`);
    if (r.overdueCount) warn.push(`날짜가 지났는데 '냄' 체크가 안 된 항목이 ${r.overdueCount}개예요. 이미 냈다면 체크하세요.`);
    out.innerHTML = hero + stats + h3("다음 결제 5건") + up + due + h3("달마다 낼 돈") + mon + h3("항목별 상태") + lines + warnBox(warn)
      + funnel("wedding-payment", "이 일정에 양가 분담과 하객 식대까지 더해 40줄로 관리하려면")
      + `<p class="note">${md(r.today)} 기준 참고용 계산이에요. 실제 금액과 날짜는 업체 계약서를 기준으로 하세요.</p>`;
  };
  const { go, schedule } = wire(pf, "wedding-payment", () => {
    syncBal();
    const r = W.payCalc(read());
    if (r.error) { out.innerHTML = `<p class="note">${esc(r.error)}</p>`; return; }
    render(r);
  });
  add.addEventListener("click", () => { const n = addRow(); if (n) q(n, "name").focus(); schedule(); });
  box.addEventListener("click", (e) => { const rm = e.target.closest("[data-remove]"); if (rm && box.children.length > 1) { rm.closest(".wp-row").remove(); renumber(); schedule(); } });
  $("wp-example").addEventListener("click", () => { fill(W.payExampleFor(TODAY)); go(); });
  fill(W.payExampleFor(TODAY));
  go();
}
