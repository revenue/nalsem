/* 날셈 고효율 가전 지원금 화면: #kf 폼을 읽어 KEPCO.calc 로 계산하고 #result 에 그린다.
   복지할인 유형과 금액은 주소(쿼리)·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계는 N.bump 가 계산기 이름만 보낸다(calc.js). 쿠팡 링크는 window.KEPCO_LINKS(빌드 때 넣음)가 있을 때만 보인다. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("kf"), out = $("result");
  if (!form || !out || !window.KEPCO) return;
  const K = window.KEPCO, MAX = 4;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const won = (el) => { if (!el) return 0; const v = parseFloat(String(el.value).replace(/[^0-9.]/g, "")); return isFinite(v) && v > 0 ? Math.round(v * 10000) : 0; };
  const links = () => window.KEPCO_LINKS || {};

  // ── 제품 행 ──
  const box = $("kp-rows"), tpl = $("kp-tpl"), add = $("kp-add");
  let seq = 0;
  function sync(node) {
    const it = K.item(node.querySelector('[data-k="item"]').value);
    node.querySelector(".kp-since").textContent = it ? `이 품목은 ${it.grade === 1 ? "1등급" : it.grade + "등급까지"}, 적용기준 시행일 ${K.dot(it.since)} 이후` : "";
  }
  function renumber() {
    [...box.children].forEach((n, i) => { n.querySelector(".kp-name").textContent = `제품 ${i + 1}`; n.querySelector("[data-remove]").hidden = box.children.length === 1; });
    add.disabled = box.children.length >= MAX;
  }
  function addRow(vals) {
    if (box.children.length >= MAX) return null;
    const node = tpl.content.firstElementChild.cloneNode(true);
    seq++;
    node.querySelectorAll("[data-k]").forEach((el) => (el.id = `k${seq}-${el.dataset.k}`));
    node.querySelectorAll("label[data-for]").forEach((l) => (l.htmlFor = `k${seq}-${l.dataset.for}`));
    if (vals) Object.entries(vals).forEach(([k, v]) => { const el = node.querySelector(`[data-k="${k}"]`); if (el) el.value = v; });
    box.appendChild(node);
    sync(node);
    renumber();
    return node;
  }
  add.addEventListener("click", () => { const n = addRow(); if (n) n.querySelector('[data-k="item"]').focus(); schedule(); });
  box.addEventListener("click", (e) => { const rm = e.target.closest("[data-remove]"); if (rm && box.children.length > 1) { rm.closest(".kp-row").remove(); renumber(); schedule(); } });
  box.addEventListener("change", (e) => { if (e.target.matches('[data-k="item"]')) sync(e.target.closest(".kp-row")); });

  function read() {
    return {
      typeId: $("kp-type").value,
      prior: won($("kp-prior")),
      rows: [...box.children].map((n) => {
        const q = (k) => n.querySelector(`[data-k="${k}"]`);
        return { item: q("item").value, grade: parseInt(q("grade").value, 10), dateOk: q("date").value, price: won(q("price")) };
      }).filter((r) => r.price > 0),
    };
  }

  const REASON = {
    grade: (r) => `라벨 등급이 기준(${r.eligible.need === 1 ? "1등급" : r.eligible.need + "등급까지"})보다 낮아 대상이 아닙니다.`,
    date: (r) => `라벨의 적용기준 시행일이 ${K.dot(r.eligible.since)}보다 이전이면 대상이 아닙니다.`,
  };

  function render(h, r) {
    const days = K.daysLeft(new Date());
    const hero = r.total > 0
      ? `<div class="result-hero"><div class="k">돌려받을 지원금 (${esc(r.type.label)}, ${r.rate}%)</div><div class="v accent">약 ${K.man(r.total)}<small>${K.wonStr(r.total)}</small></div></div>`
      : `<div class="result-hero"><div class="k">돌려받을 지원금</div><div class="v">0원<small>${r.remainingBefore === 0 ? "남은 한도 없음" : "대상 제품 없음"}</small></div></div>`;
    const stats = `<div class="stats cols-3"><div class="stat"><div class="k">결제 금액</div><div class="v">${K.man(r.price)}</div></div><div class="stat"><div class="k">실제 부담</div><div class="v">${K.man(r.net)}</div></div><div class="stat"><div class="k">남는 한도</div><div class="v">${K.man(r.remainingAfter)}<small>/ 30만 원</small></div></div></div>`;
    const L = links();
    const rows = `<div class="kv">${r.rows.map((x) => {
      const why = x.eligible.ok ? (x.capped ? `${r.rate}%면 ${K.man(x.raw)}이지만 남은 한도까지만 받습니다.` : `${K.man(x.price)} × ${r.rate}%`) : (REASON[x.eligible.reason] || (() => ""))(x);
      const p = L[x.item];
      const img = p && p.img ? `<img class="kp-thumb" src="${esc(p.img)}" alt="" width="48" height="48" decoding="async" referrerpolicy="no-referrer">` : "";
      const link = p && p.url ? ` <a class="kp-buy kp-buy-row" href="${esc(p.url)}" target="_blank" rel="sponsored nofollow noopener">${img}<span>쿠팡에서 대상 ${esc(x.label)} 보기 (${esc(p.model)})</span></a>` : "";
      return `<div><span class="k">${esc(x.label)}<small class="kp-why">${esc(why)}</small>${link}</span><span class="v">${x.eligible.ok ? K.wonStr(x.support) : "대상 아님"}</span></div>`;
    }).join("")}</div>`;
    const warn = [];
    if (r.rows.some((x) => x.eligible.ok && x.eligible.check === "date")) warn.push("적용기준 시행일을 아직 모르는 제품이 있습니다. 받은 뒤 라벨에서 등급과 함께 확인하세요. 품목별 기준일은 이 페이지의 '지원 품목과 등급 기준' 표에 있습니다.");
    if (r.limitHit) warn.push("한도 30만 원을 다 씁니다. 더 사도 지원금은 늘지 않습니다.");
    if (h.prior === 0) warn.push("예전에 이 사업으로 받은 적이 있다면 그 금액을 넣어야 정확합니다(한도는 해마다 새로 생기지 않습니다).");
    if (days >= 0) warn.push(`2026년 신청 마감까지 ${days === 0 ? "오늘이 마지막 날입니다" : days + "일 남았습니다"}. 잔여 예산은 ${K.BUDGET.checked} 기준 ${(K.BUDGET.won / 1e8).toFixed(1)}억 원이었고 예산이 떨어지면 일찍 끝납니다.`);
    else warn.push("2026년분 신청은 끝났습니다. 해마다 2월에 새 공고가 나왔습니다(2025년 2월 17일, 2026년 2월 9일).");
    const warnHtml = `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    const go = `<p class="note">신청과 실시간 잔여 예산은 <a href="${K.SRC.home}" rel="noopener" target="_blank">한전 고효율 가전 지원사업 홈페이지</a>에서 확인하세요. 날셈은 한전 공식 사이트가 아닙니다.</p>`;
    out.innerHTML = hero + stats + rows + warnHtml + go;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 160); }
  function run() {
    const h = read();
    out.hidden = false;
    if (!h.typeId) { out.innerHTML = `<p class="note">복지할인 유형을 고르고 제품 가격을 넣으면 바로 계산합니다.</p>`; return; }
    if (!h.rows.length) { out.innerHTML = `<p class="note">살 제품의 가격을 넣으면 바로 계산합니다. 지금 남은 한도는 <b>${K.man(Math.max(0, K.LIMIT - h.prior))}</b>입니다.</p>`; return; }
    const r = K.calc(h);
    if (r.error) { out.innerHTML = `<p class="note">복지할인 유형을 다시 골라 주세요.</p>`; return; }
    render(h, r);
    N.bump(out);
  }
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", (e) => { e.preventDefault(); run(); out.scrollIntoView({ behavior: "smooth", block: "start" }); });

  // 예시: 설명 카드의 예시와 같은 숫자 (수급자, 이미 10만 원, 1등급 냉장고 150만 원)
  $("kp-example").addEventListener("click", () => {
    form.reset();
    box.innerHTML = "";
    $("kp-type").value = "basic";
    $("kp-prior").value = "10";
    addRow({ item: "fridge", grade: "1", date: "yes", price: "150" });
    run();
  });
  addRow();
})();
