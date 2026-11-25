/* 날셈 연차 황금연휴 계산기 화면: #lp 폼(연도·연차 일수)을 읽어 LP 엔진으로 계산하고 #result 에 그린다.
   입력은 연도와 연차 일수뿐이라 주소(?y=&n=)에 넣어 공유할 수 있다. 통계는 계산기 이름만(N.bump). */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("lp"), out = $("result");
  if (!form || !out || !window.LP || !window.N) return;
  const N = window.N, LP = window.LP;
  const ys = $("lp-y"), ni = $("lp-n");
  const f = (t) => `${N.M(t)}/${N.D(t)}(${N.WEEK[N.W(t)]})`;
  const range = (w) => `${f(w.start)} ~ ${f(w.end)}`;
  const hols = (w) => [...new Set(w.holidays.map((h) => h.name.replace(/대체공휴일\((.+)\)/, "$1 대체")))].join("·");

  function read() {
    const y = parseInt(ys.value, 10), n = Math.floor(parseFloat(String(ni.value).replace(/[^0-9.]/g, "")));
    return { y: y >= 2027 && y <= 2028 ? y : 2027, n: n >= 1 && n <= 25 ? n : 0 };
  }

  function render() {
    const { y, n } = read();
    if (!n) { N.showErr(ni.closest(".field"), "연차는 1~25일로 넣어 주세요"); out.hidden = true; return; }
    N.showErr(ni.closest(".field"), "");
    const p = LP.plan(y, n), st = LP.yearStats(y), lad = LP.ladder(y, 4);
    const best = [1, 2, 3, 4, 5].map((k) => [k, LP.longest(y, k)]).filter(([, w]) => w);
    const hero = `<div class="result-hero"><div class="k">${y}년 연차 ${n}일 추천 조합</div><div class="v accent">${p.total}<small>일 연휴 (연차 ${p.used}일 사용)</small></div></div>`;
    const stats = `<div class="stats cols-3"><div class="stat"><div class="k">${y}년 쉬는 날</div><div class="v">${st.offDays}<small>일</small></div></div><div class="stat"><div class="k">평일 공휴일</div><div class="v">${st.weekdayHolidays}<small>일</small></div></div><div class="stat"><div class="k">연차 1일로 최장</div><div class="v">${best[0] ? best[0][1].total : 0}<small>일</small></div></div></div>`;
    const chosen = p.chosen.length
      ? `<div class="tbl-wrap"><table class="tbl lp-tbl"><thead><tr><th>연휴</th><th>쉬는 날</th><th>연차 쓸 날</th></tr></thead><tbody>${p.chosen.map((w) => `<tr><td>${range(w)}<small class="lp-sub">${hols(w)}</small></td><td><b>${w.total}일</b></td><td>${w.leaveDays.map(f).join(", ")}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="help">이 연차 일수로 공휴일과 이어 쓸 수 있는 조합이 없습니다.</p>`;
    const left = n - p.used;
    const note = left > 0 ? `<p class="help">남은 연차 ${left}일은 공휴일과 붙여도 연휴가 크게 늘지 않아 추천에서 뺐습니다. 원하는 날에 따로 쓰세요.</p>` : "";
    const ladRows = lad.map((r) => `<tr><td>${f(r.first.date)}<small class="lp-sub">${r.first.name.split("·")[0]}</small></td><td>${r.steps.map((w) => `<span class="lp-step">${w.leave ? `연차 ${w.leave}일` : "연차 없이"} → <b>${w.total}일</b> <small>${range(w)}</small></span>`).join("")}</td></tr>`).join("");
    const ladder = `<h3 class="lp-h">공휴일마다 연차 붙이면 며칠?</h3><div class="tbl-wrap"><table class="tbl lp-tbl"><thead><tr><th>공휴일</th><th>연차 0~4일을 붙이면</th></tr></thead><tbody>${ladRows}</tbody></table></div>`;
    const longest = `<h3 class="lp-h">연차 일수별 가장 긴 연휴</h3><div class="kv">${best.map(([k, w]) => `<div><span class="k">연차 ${k}일 이하</span><span class="v">${w.total}일 · ${range(w)}</span></div>`).join("")}</div>`;
    out.innerHTML = hero + stats + `<h3 class="lp-h">추천 조합 (연차 ${n}일)</h3>` + chosen + note + longest + ladder
      + `<p class="help">토·일과 관공서 공휴일에 쉬는 직장인 기준입니다. 임시공휴일, 회사 창립기념일 같은 회사 휴무일, 반차는 넣지 않았습니다.</p>`;
    N.setQS({ y, n });
    N.bump(out);
  }

  const qy = N.qs && N.qs("y"), qn = N.qs && N.qs("n");
  if (qy && ys.querySelector(`option[value="${qy}"]`)) ys.value = qy;
  if (qn) ni.value = qn;
  form.addEventListener("submit", (e) => { e.preventDefault(); render(); });
  ys.addEventListener("change", render);
  ni.addEventListener("input", () => { if (read().n) render(); });
  render();
})();
