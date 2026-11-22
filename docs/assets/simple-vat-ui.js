/* 날셈 간이과세자 부가세 화면: #vf 폼을 읽어 SVAT.calc 로 계산하고 #result 에 그린다.
   매출·매입 금액은 주소(쿼리)·localStorage·통계 이벤트에 넣지 않고 어디로도 보내지 않는다.
   통계는 N.bump 가 계산기 이름만 보낸다(calc.js). */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("vf"), out = $("result");
  if (!form || !out || !window.SVAT) return;
  const S = window.SVAT, MAX = 3;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (el) => { if (!el) return 0; const v = parseFloat(String(el.value).replace(/[^0-9.]/g, "")); return isFinite(v) && v > 0 ? v : 0; };
  const won = (el) => Math.round(num(el) * 10000); // 만 원 → 원
  const W = S.wonStr, MAN = S.man;
  const DISC = "참고용 추정입니다. 최종 세액은 홈택스 신고서 화면에서 확인하세요. 날셈은 세무 상담이나 신고 대리를 하지 않습니다.";

  // ── 업종 행 ──
  const box = $("sv-rows"), tpl = $("sv-tpl"), add = $("sv-add");
  let seq = 0;
  function renumber() {
    [...box.children].forEach((n, i) => { n.querySelector(".sv-name").textContent = box.children.length > 1 ? `업종 ${i + 1}` : "업종과 매출"; n.querySelector("[data-remove]").hidden = box.children.length === 1; });
    add.disabled = box.children.length >= MAX;
  }
  function addRow(vals) {
    if (box.children.length >= MAX) return null;
    const node = tpl.content.firstElementChild.cloneNode(true);
    seq++;
    node.querySelectorAll("[data-k]").forEach((el) => (el.id = `v${seq}-${el.dataset.k}`));
    node.querySelectorAll("label[data-for]").forEach((l) => (l.htmlFor = `v${seq}-${l.dataset.for}`));
    if (vals) Object.entries(vals).forEach(([k, v]) => { const el = node.querySelector(`[data-k="${k}"]`); if (el) el.value = v; });
    box.appendChild(node);
    renumber();
    return node;
  }
  add.addEventListener("click", () => { const n = addRow(); if (n) n.querySelector('[data-k="ind"]').focus(); schedule(); });
  box.addEventListener("click", (e) => { const rm = e.target.closest("[data-remove]"); if (rm && box.children.length > 1) { rm.closest(".sv-row").remove(); renumber(); schedule(); } });

  function read() {
    return {
      rows: [...box.children].map((n) => ({ ind: n.querySelector('[data-k="ind"]').value, sales: won(n.querySelector('[data-k="sales"]')) })).filter((r) => r.sales > 0),
      open: $("sv-open").value,
      card: won($("sv-card")),
      purchase: won($("sv-buy")),
      prepaid: won($("sv-pre")),
      einv: Math.floor(num($("sv-einv"))),
      efile: $("sv-efile").checked,
      prevOver: $("sv-prev").checked,
    };
  }

  const line = (k, why, v, cls = "") => `<div${cls ? ` class="${cls}"` : ""}><span class="k">${esc(k)}${why ? `<small class="kp-why">${esc(why)}</small>` : ""}</span><span class="v">${v}</span></div>`;

  function render(h, r) {
    const days = S.daysLeft(new Date());
    const due = days >= 0 ? `신고 기한 2027년 1월 25일(월)${days > 0 ? `, ${days}일 남음` : ", 오늘까지"}` : "2027년 1월 25일 기한이 지났습니다. 기한 후 신고는 홈택스에서 확인하세요";
    const hero = r.exempt
      ? `<div class="result-hero"><div class="k">2026년분 1월 부가세: 납부면제</div><div class="v accent">0원<small>신고는 해야 합니다</small></div></div>`
      : `<div class="result-hero"><div class="k">2026년분 1월 부가세 예상 납부세액</div><div class="v ${r.payable ? "" : "accent"}">${r.payable ? "약 " + W(r.payable) : "0원"}<small>${r.payable ? "신고하고 납부" : "공제로 0원, 신고는 해야 합니다"}</small></div></div>`;
    const stats = `<div class="stats cols-3 sv-stats">
      <div class="stat"><div class="k">2026년 매출 (부가세 포함)</div><div class="v">${MAN(r.sales)}</div></div>
      <div class="stat"><div class="k">${r.months < 12 ? `12개월 환산 (${r.months}개월 영업)` : "면제 판정 매출"}</div><div class="v">${MAN(r.annual)}</div></div>
      <div class="stat"><div class="k">납부면제 기준</div><div class="v">${r.exempt ? "미만" : "이상"}<small>4,800만 원</small></div></div>
    </div>`;

    const steps = [];
    for (const x of r.lines) steps.push(line(`${x.label} 매출 × ${x.rate}% × 10%`, `${MAN(x.sales)} × ${(x.rate / 10).toFixed(1)}%`, W(x.tax)));
    if (r.lines.length > 1) steps.push(line("업종별 세액 합계", "", W(r.gross)));
    if (r.cr.purchase) steps.push(line("매입 공제 (0.5%)", `${MAN(h.purchase)} × 0.5%`, "−" + W(r.cr.purchase)));
    if (r.cr.cardRaw) steps.push(line("카드·현금영수증 매출 공제 (1.3%)", r.cr.cardCapped ? `${W(r.cr.cardRaw)}이지만 연 1,000만 원 한도까지` : `${MAN(h.card)} × 1.3%`, "−" + W(r.cr.card)));
    if (!r.cardOk && h.card) steps.push(line("카드·현금영수증 매출 공제", "고른 업종은 공제 대상이 아닐 수 있어 빼고 계산", "0원"));
    if (r.cr.einv) steps.push(line("전자세금계산서 발급 공제", `${h.einv}건 × 200원 (연 100만 원까지)`, "−" + W(r.cr.einv)));
    if (r.cr.efile) steps.push(line("전자신고 공제", "홈택스·손택스로 직접 신고할 때", "−" + W(r.cr.efile)));
    if (r.lost) steps.push(line("공제 중 세금을 넘는 부분", "간이과세자는 돌려받지 못합니다", "0원 처리"));
    steps.push(line("공제 후 세액", "", W(r.afterCredits)));
    if (r.prepaid && !r.exempt) steps.push(line("7월에 이미 낸 세액", "", "−" + W(Math.min(r.prepaid, r.afterCredits))));
    if (r.exempt) steps.push(line("납부면제 적용", `${r.months < 12 ? "12개월 환산 매출" : "매출"} ${W(r.annual)} < 48,000,000원`, "0원"));
    steps.push(line("1월에 낼 세금", "", `<b>${W(r.payable)}</b>`));
    const calcHtml = `<h3 class="tx-h">계산 과정</h3><div class="kv">${steps.join("")}</div>`;

    const warn = [due + "."];
    warn.push(r.exempt ? "납부면제여도 신고서는 내야 합니다. 홈택스 신고 화면에서 매출을 넣으면 면제가 반영되는지 확인하세요." : "카드 매출과 매입은 홈택스에서 불러온 금액이 기준입니다. 넣은 금액과 다르면 세액도 달라집니다.");
    if (r.warn.includes("annualized")) warn.push(`2026년 ${13 - r.months}월 개업으로 보고 ${r.months}개월 매출 ${MAN(r.sales)}을 12개월 ${MAN(r.annual)}으로 환산해 판정했습니다. 세금 자체는 실제 매출로 계산합니다.`);
    if (r.warn.includes("card-over-sales")) warn.push("카드·현금영수증 매출이 전체 매출보다 큽니다. 매출에는 카드 매출까지 모두 넣어야 합니다.");
    if (r.warn.includes("over-simple")) warn.push("12개월 기준 매출이 1억 400만 원 이상이라 2027년 7월 1일부터 일반과세자로 바뀝니다(관할 세무서 통지). 일반과세자는 1월·7월 두 번 신고합니다.");
    if (r.warn.includes("invoice-next")) warn.push("2026년 매출(신규는 12개월 환산)이 4,800만 원 이상이라 2027년 7월 1일부터 영수증 대신 세금계산서를 발급하는 간이과세자가 됩니다.");
    if (r.warn.includes("rent-over")) warn.push("부동산임대업은 연 매출이 4,800만 원 이상이면 간이과세를 받을 수 없어 2027년 7월 1일부터 일반과세자로 바뀝니다.");
    if (r.warn.includes("card-not-eligible")) warn.push("2025년 매출이 4,800만 원 이상인 간이과세자는 소매·음식점·숙박·미용·여객운송처럼 주로 소비자를 상대하는 업종만 카드 매출 공제를 받습니다. 고른 업종이 소비자 대상이라면 공제를 받을 수 있으니 홈택스 신고 화면의 공제액을 확인하세요.");
    if (r.warn.includes("card-check")) warn.push("2025년 매출이 4,800만 원 이상이면 카드 매출 공제는 주로 소비자를 상대하는 업종만 받습니다. 사업자에게 주로 파는 업종이면 공제가 빠질 수 있습니다.");
    if (r.warn.includes("einv-not-eligible")) warn.push("2026년에 개업했거나 2025년 매출이 4,800만 원 미만이면 영수증 발급 간이과세자라 전자세금계산서 발급 공제를 받지 않습니다.");
    if (r.warn.includes("excluded-industry")) warn.push("고른 업종은 업종·규모에 따라 간이과세를 받을 수 없는 경우가 있습니다. 사업자등록증의 과세유형이 '간이과세자'인지 확인하세요.");
    if (r.prepaidOver && r.exempt) warn.push(`납부면제라 7월에 낸 ${W(r.prepaidOver)}은 돌려받습니다(부가가치세법 제69조④). 홈택스 신고서에서 확인하세요.`);
    else if (r.prepaidOver) warn.push(`이미 낸 ${W(r.prepaidOver)}이 이번 세액보다 많습니다. 돌려받는지는 홈택스 신고서의 '차감 납부할 세액'에서 확인하세요(이 계산기에서 확인하지 못한 부분입니다).`);
    const warnHtml = `<div class="tx-warn" role="note"><h3>확인할 것</h3><ul>${warn.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;

    const hometax = `<details class="tx-fold"><summary>홈택스 신고 순서</summary><div class="tx-fold-body"><ol class="tx-ul">
      <li>홈택스나 손택스 앱에 로그인합니다.</li>
      <li>세금신고 → 부가가치세 신고 → 간이과세자 정기신고(확정)로 들어갑니다(메뉴 이름은 바뀔 수 있습니다).</li>
      <li>사업자 정보와 업종을 확인하고, 카드·현금영수증 매출은 불러오기, 현금 매출은 직접 넣습니다.</li>
      <li>매입 세금계산서와 사업용 카드 내역을 불러와 매입 공제를 채웁니다.</li>
      <li>공제와 납부할 세액이 위 계산과 비슷한지 보고 신고서를 제출합니다. 접수증을 저장하세요.</li>
      <li>${r.payable ? `${W(r.payable)} 안팎의 세금을 1월 25일까지 납부합니다.` : "낼 세금이 없으면 신고서 제출로 끝납니다."}</li>
    </ol></div></details>`;
    const may = `<details class="tx-fold"><summary>5월 종합소득세 준비</summary><div class="tx-fold-body"><ul class="tx-ul">
      <li>2026년 사업소득은 2027년 5월 1~31일에 종합소득세로 신고합니다. 직장인은 근로소득과 합쳐 신고합니다.</li>
      <li>이번 부가세 신고서의 매출 ${MAN(r.sales)}을 5월에 다시 씁니다. 신고서와 접수증을 저장해 두세요.</li>
      <li>경비 증빙(세금계산서, 사업용 카드, 지출증빙 현금영수증)을 모아 둡니다.</li>
      <li>장부(간편장부)로 할지 경비율로 할지는 5월 국세청 안내문의 유형을 보고 정합니다.</li>
    </ul></div></details>`;
    const foot = `<p class="note">${esc(DISC)} 신고는 <a href="https://www.hometax.go.kr" rel="noopener" target="_blank">홈택스</a>에서 직접 합니다.</p>`;
    out.innerHTML = hero + stats + calcHtml + warnHtml + hometax + may + foot;
  }

  let timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(run, 160); }
  function run() {
    const h = read();
    out.hidden = false;
    if (!h.rows.length) { out.innerHTML = `<p class="note">업종을 고르고 2026년 매출을 넣으면 바로 계산합니다. 4,800만 원 미만이면 납부면제입니다.</p>`; return; }
    const r = S.calc(h);
    if (r.error) { out.innerHTML = `<p class="note">입력값을 다시 확인해 주세요.</p>`; return; }
    render(h, r);
    N.bump(out);
  }
  form.addEventListener("input", schedule);
  form.addEventListener("change", schedule);
  form.addEventListener("submit", (e) => { e.preventDefault(); run(); out.scrollIntoView({ behavior: "smooth", block: "start" }); });

  // 예시: 설명 카드의 예시와 같은 숫자 (test/simple-vat.test.mjs 와 같다)
  const EX = {
    store: { open: "1", rows: [{ ind: "retail", sales: "3000" }], card: "2800", buy: "2000" },
    food: { open: "before", rows: [{ ind: "food", sales: "6000" }], card: "5500", buy: "2500" },
  };
  form.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ex]"); if (!b) return;
    const x = EX[b.dataset.ex];
    form.reset();
    box.innerHTML = "";
    x.rows.forEach((r) => addRow(r));
    $("sv-open").value = x.open; $("sv-card").value = x.card; $("sv-buy").value = x.buy;
    run();
  });
  addRow();
})();
