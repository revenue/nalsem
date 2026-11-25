/* 날셈 난방기 전기요금 화면: #hf 폼을 읽어 HEATER.calc 로 계산하고 #result 에 그린다.
   입력값은 주소·localStorage·통계 이벤트에 넣지 않는다. 통계는 N.bump 가 계산기 이름만 보낸다(calc.js).
   쿠팡 링크는 window.HEATER_LINKS(빌드 때 넣음, 링크 그룹 id → 제품 배열)가 있을 때만 보인다. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("hf"), out = $("result");
  if (!form || !out || !window.HEATER) return;
  const H = window.HEATER, MAX = 5;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (el) => { if (!el) return 0; const v = parseFloat(String(el.value).replace(/[^0-9.]/g, "")); return isFinite(v) && v > 0 ? v : 0; };
  const links = () => window.HEATER_LINKS || {};
  const GROUP = { mat: "mat", water: "water", carbon: "carbon", heater: "heater", radiator: "heater", "hum-heat": "humid", "hum-sonic": "humid" };

  // ── 기기 행 ──
  const box = $("ht-rows"), tpl = $("ht-tpl"), add = $("ht-add");
  let seq = 0;
  function fill(node) {
    const k = H.kind(node.querySelector('[data-k="kind"]').value);
    if (!k) return;
    node.querySelector('[data-k="w"]').value = k.w || "";
    node.querySelector('[data-k="hours"]').value = k.hours || "";
    node.querySelector(".ht-hint").textContent = k.note ? `기본값은 ${k.note}입니다. 제품 라벨의 소비전력으로 바꾸세요.` : "기본값은 흔한 제품의 정격 소비전력입니다. 제품 라벨 값으로 바꾸세요.";
  }
  function renumber() {
    [...box.children].forEach((n, i) => { n.querySelector(".ht-name").textContent = `기기 ${i + 1}`; n.querySelector("[data-remove]").hidden = box.children.length === 1; });
    add.disabled = box.children.length >= MAX;
  }
  function addRow(vals) {
    if (box.children.length >= MAX) return null;
    const node = tpl.content.firstElementChild.cloneNode(true);
    seq++;
    node.querySelectorAll("[data-k]").forEach((el) => (el.id = `h${seq}-${el.dataset.k}`));
    node.querySelectorAll("label[data-for]").forEach((l) => (l.htmlFor = `h${seq}-${l.dataset.for}`));
    box.appendChild(node);
    if (vals && vals.kind) node.querySelector('[data-k="kind"]').value = vals.kind;
    fill(node);
    if (vals) Object.entries(vals).forEach(([k, v]) => { const el = node.querySelector(`[data-k="${k}"]`); if (el && k !== "kind") el.value = v; });
    renumber();
    return node;
  }
  add.addEventListener("click", () => { const n = addRow(); if (n) n.querySelector('[data-k="kind"]').focus(); schedule(); });
  box.addEventListener("click", (e) => { const rm = e.target.closest("[data-remove]"); if (rm && box.children.length > 1) { rm.closest(".ht-row").remove(); renumber(); schedule(); } });
  box.addEventListener("change", (e) => { if (e.target.matches('[data-k="kind"]')) fill(e.target.closest(".ht-row")); });

  function read() {
    return {
      month: parseInt($("ht-month").value, 10) || 12,
      usual: num($("ht-usual")),
      rows: [...box.children].map((n) => {
        const q = (k) => n.querySelector(`[data-k="${k}"]`);
        const duty = q("duty").value === "" ? 100 : num(q("duty"));
        return { kind: q("kind").value, w: num(q("w")), hours: num(q("hours")), days: q("days").value === "" ? 30 : num(q("days")), duty };
      }),
    };
  }

  const img = (p) => (p.img ? `<img class="kp-thumb" src="${esc(p.img)}" alt="" width="48" height="48" decoding="async" referrerpolicy="no-referrer">` : "");
  function buyLinks(kindId, label) {
    const ps = (links()[GROUP[kindId]] || []).filter((p) => p && p.url);
    if (!ps.length) return "";
    return `<span class="kp-buys"><small class="kp-buys-h">쿠팡에서 많이 사는 ${esc(label)} 보기</small>${ps.map((p) => `<a class="kp-buy kp-buy-row" href="${esc(p.url)}" target="_blank" rel="sponsored nofollow noopener">${img(p)}<span>${esc(p.name)}</span></a>`).join("")}</span>`;
  }

  function render(h, r) {
    const hero = `<div class="result-hero"><div class="k">난방기 때문에 늘어나는 전기요금 (${r.month}월, 한 달)</div><div class="v accent">약 ${H.man(r.diff)}<small>${H.wonStr(r.diff)}</small></div></div>`;
    const stats = `<div class="stats cols-3"><div class="stat"><div class="k">평소 요금</div><div class="v">${H.man(r.before.total)}<small>${r.usual}kWh</small></div></div><div class="stat"><div class="k">난방기까지</div><div class="v">${H.man(r.after.total)}<small>${r.usual + r.added}kWh</small></div></div><div class="stat"><div class="k">늘어난 사용량</div><div class="v">${r.added}<small>kWh</small></div></div></div>`;
    const seen = new Set();
    const rows = `<div class="kv">${r.rows.map((x) => {
      const g = GROUP[x.kind];
      const link = g && !seen.has(g) ? (seen.add(g), buyLinks(x.kind, x.label.replace(/ \(.+\)$/, ""))) : "";
      return `<div><span class="k">${esc(x.label)}<small class="kp-why">${x.w.toLocaleString("ko-KR")}W × 하루 ${x.hours}시간 × ${x.days}일${x.duty < 100 ? ` × ${x.duty}%` : ""} = ${x.kwh}kWh</small>${link}</span><span class="v">약 ${H.wonStr(x.won)}</span></div>`;
    }).join("")}</div>`;
    const warn = [];
    if (r.tierUp) warn.push(`난방기 때문에 누진 ${r.before.tier}구간에서 ${r.after.tier}구간으로 올라갑니다. ${r.after.bounds[r.after.tier - 2]}kWh를 넘는 순간 기본요금이 ${H.wonStr(r.before.base)}에서 ${H.wonStr(r.after.base)}으로 오르고, 넘는 사용량에는 더 비싼 단가가 붙습니다.`);
    if (r.superUser) warn.push("12~2월에 한 달 1,000kWh를 넘으면 넘는 사용량에 kWh당 736.2원(슈퍼유저 요금)이 붙습니다.");
    warn.push(`지금 사용량에서 1kWh(1,000W 기기를 1시간) 더 쓰면 약 ${H.wonStr(H.marginal(r.usual + r.added, r.month))}이 늘어납니다(부가세·기금 포함).`);
    if (h.usual === 0) warn.push("평소 한 달 사용량을 넣지 않아 0kWh로 계산했습니다. 고지서의 '사용량(kWh)'을 넣어야 누진 구간이 맞습니다.");
    warn.push("온도조절기가 껐다 켜기를 반복하면 실제 사용량은 이보다 적습니다. 잘 모르면 '켜져 있는 비율'을 100%로 두면 최대치가 나옵니다.");
    const warnHtml = `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    const note = `<p class="note">주택용 저압 기준 예상 요금입니다(복지할인·대가족 할인·TV 수신료 제외). 아파트 단지 계약이나 고압 주택은 다를 수 있습니다. 날셈은 한국전력공사 공식 사이트가 아닙니다.</p>`;
    out.innerHTML = hero + stats + rows + warnHtml + note;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 160); }
  function run() {
    const h = read();
    out.hidden = false;
    const r = H.calc(h);
    if (!r.rows.length) { out.innerHTML = `<p class="note">기기의 소비전력과 하루 사용 시간을 넣으면 바로 계산합니다. 지금 평소 요금은 약 <b>${H.wonStr(H.bill(h.usual, h.month).total)}</b>입니다.</p>`; return; }
    render(h, r);
    N.bump(out);
  }
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", (e) => { e.preventDefault(); run(); out.scrollIntoView({ behavior: "smooth", block: "start" }); });

  // 예시: 설명 카드의 예시와 같은 숫자 (평소 250kWh, 12월, 전기장판 300W 8시간 + 전기히터 1,500W 2시간 20일)
  $("ht-example").addEventListener("click", () => {
    form.reset();
    box.innerHTML = "";
    $("ht-month").value = "12";
    $("ht-usual").value = "250";
    addRow({ kind: "mat", w: "300", hours: "8", days: "30" });
    addRow({ kind: "heater", w: "1500", hours: "2", days: "20" });
    run();
  });
  addRow({ kind: "mat" });
})();
