/* 날셈 연차 황금연휴 계산기 엔진: 공휴일(N.holidays) + 토·일을 쉬는 날로 보고, 연차를 어디에 붙이면 가장 길게 쉬는지 찾는다.
   - 대상: 토·일 쉬고 관공서 공휴일에 쉬는 직장인(5인 이상 사업장은 근로기준법 제55조②로 관공서 공휴일이 유급휴일).
   - 범위: 그해 1월 1일 ~ 다음 해 1월 10일(연말에 시작하는 연휴까지). 시작일이 그해인 연휴만 센다.
   - 연휴(window)는 앞뒤 날이 모두 '출근하는 날'인 가장 긴 구간만 본다. 구간 안의 평일(공휴일 아닌 월~금)이 쓸 연차다.
   - 임시공휴일, 회사 휴무일, 반차는 넣지 않는다. 계산은 브라우저 안에서만 한다. */
(function (global) {
  "use strict";
  const N = global.N;
  const MAX_SPAN = 21; // 한 번 연휴로 보는 최대 길이(일)

  function days(year) {
    const hs = N.holidays(year).concat(N.holidays(year + 1));
    const name = new Map();
    hs.forEach((h) => { const k = N.iso(h.date); name.set(k, name.has(k) ? name.get(k) + "·" + h.name : h.name); });
    const out = [];
    for (let t = N.mk(year, 1, 1), end = N.mk(year + 1, 1, 10); t <= end; t = N.addDays(t, 1)) {
      const k = N.iso(t), w = N.W(t), hol = name.get(k) || "";
      out.push({ date: t, iso: k, w, hol, off: w === 0 || w === 6 || !!hol });
    }
    return out;
  }

  // 앞뒤가 출근일이고 양 끝이 원래 쉬는 날인 구간. leave = 구간 안의 출근일 수(쓸 연차).
  function windows(year, maxLeave) {
    const ds = days(year), out = [];
    for (let s = 1; s < ds.length - 1; s++) {
      if (N.Y(ds[s].date) !== year) break;
      for (let e = s; e < Math.min(ds.length - 1, s + MAX_SPAN); e++) {
        const span = ds.slice(s, e + 1);
        const leave = span.filter((d) => !d.off).length;
        if (leave > maxLeave) break;
        if (ds[s - 1].off || ds[e + 1].off) continue; // 더 늘릴 수 있는 구간은 빼기
        if (!span[0].off || !span[span.length - 1].off) continue; // 끝에 붙이는 연차는 하루만 늘어 효율이 낮다
        const hol = span.filter((d) => d.hol);
        if (!hol.length) continue; // 공휴일 없는 주말은 빼기
        out.push({
          start: span[0].date, end: span[span.length - 1].date, total: span.length, leave,
          leaveDays: span.filter((d) => !d.off).map((d) => d.date),
          holidays: hol.map((d) => ({ date: d.date, name: d.hol })),
        });
      }
    }
    return out;
  }

  // 공휴일 묶음별 사다리: 연차 0~maxLeave일을 쓰면 각각 최대 며칠(더 길어지지 않는 단계는 뺀다).
  function ladder(year, maxLeave = 4) {
    const groups = new Map();
    windows(year, maxLeave).forEach((w) => {
      const k = N.iso(w.holidays[0].date);
      if (!groups.has(k)) groups.set(k, { first: w.holidays[0], steps: {} });
      const g = groups.get(k), cur = g.steps[w.leave];
      if (!cur || w.total > cur.total) g.steps[w.leave] = w;
    });
    const rows = [];
    groups.forEach((g) => {
      let best = 0;
      const steps = [];
      for (let l = 0; l <= maxLeave; l++) { const w = g.steps[l]; if (w && w.total > best) { steps.push(w); best = w.total; } }
      if (steps.length) rows.push({ first: g.first, steps });
    });
    return rows.sort((a, b) => a.first.date - b.first.date);
  }

  // 연차 budget일로 쉬는 날을 가장 많이 묶는 조합: 겹치지 않는 구간 고르기(예산 있는 구간 스케줄링 DP).
  // 점수 = 고른 연휴들의 총 일수. 같으면 연차를 덜 쓰는 쪽.
  function plan(year, budget) {
    budget = Math.max(0, Math.min(25, Math.floor(budget) || 0));
    const ws = windows(year, Math.min(budget, 10)).filter((w) => w.leave >= 1 && w.total >= w.leave + 2)
      .sort((a, b) => a.end - b.end || a.start - b.start);
    const n = ws.length;
    const p = ws.map((w, i) => { for (let j = i - 1; j >= 0; j--) if (ws[j].end < w.start) return j; return -1; });
    const better = (x, y) => x[0] > y[0] || (x[0] === y[0] && x[1] > y[1]);
    const dp = [Array.from({ length: budget + 1 }, () => [0, 0])];
    const take = [];
    for (let i = 0; i < n; i++) {
      const row = [], tk = [], w = ws[i];
      for (let b = 0; b <= budget; b++) {
        let best = dp[i][b], t = false;
        if (w.leave <= b) {
          const prev = dp[p[i] + 1][b - w.leave];
          const cand = [prev[0] + w.total, prev[1] - w.leave];
          if (better(cand, best)) { best = cand; t = true; }
        }
        row.push(best); tk.push(t);
      }
      dp.push(row); take.push(tk);
    }
    const chosen = [];
    for (let i = n, b = budget; i > 0;) {
      if (take[i - 1][b]) { const w = ws[i - 1]; chosen.push(w); b -= w.leave; i = p[i - 1] + 1; } else i--;
    }
    chosen.reverse();
    return { year, budget, used: chosen.reduce((s, w) => s + w.leave, 0), total: chosen.reduce((s, w) => s + w.total, 0), chosen };
  }

  // 연차 n일 이하로 만들 수 있는 그해 가장 긴 연휴(같으면 연차가 적은 쪽, 그다음 빠른 쪽)
  function longest(year, n) {
    let best = null;
    windows(year, n).forEach((w) => { if (!best || w.total > best.total || (w.total === best.total && w.leave < best.leave)) best = w; });
    return best;
  }

  function yearStats(year) {
    const ds = days(year).filter((d) => N.Y(d.date) === year);
    return { offDays: ds.filter((d) => d.off).length, weekdayHolidays: ds.filter((d) => d.hol && d.w > 0 && d.w < 6).length };
  }

  global.LP = { windows, ladder, plan, longest, yearStats };
})(typeof window !== "undefined" ? window : globalThis);
