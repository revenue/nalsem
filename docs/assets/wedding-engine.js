// 결혼 준비 결제 일정 + 양가 분담 + 하객·식대 계산 엔진 (순수 계산, 의존성 없음)
// build-xlsx.mjs의 수식과 같은 순서·끝수 처리를 따른다. verify-xlsx.mjs가 두 결과를 대조한다.
//
// 날짜는 모두 엑셀 일련번호(1899-12-30 = 0)로 다룬다. 빈 값은 null.
// 반올림은 엑셀 ROUND와 같게 "유효숫자 15자리로 먼저 정리한 뒤 0.5는 0에서 먼 쪽"으로 한다.

export const CATEGORIES = ['식대', '예식장', '스튜디오', '드레스', '메이크업', '스냅·영상', '본식 부대', '예물·예단', '혼수', '신혼여행', '청첩장·답례품', '한복', '기타'];
export const METHODS = ['반반', '비율', '하객 비율', '신랑측 전액', '신부측 전액'];
export const PAYERS = ['분담대로', '신랑측', '신부측'];
export const SIDES = ['신랑측', '신부측'];
export const PAID = 'O';
export const ITEM_COUNT = 40;   // 결제일정 40줄 (1줄은 식대 자동)
export const GROUP_COUNT = 20;  // 하객 그룹 20줄
export const MONTH_COUNT = 24;  // 월별 24개월
export const ITEM_ROW0 = 5;     // 결제일정 첫 줄의 엑셀 행 번호 (ROW()를 쓰는 정렬 키에 필요)
export const NONE = 1e9;        // "날짜 없음" 표시용 큰 수 (엑셀 수식과 같음)
export const SOON_DAYS = 14;    // 이 날수 이내면 "임박"

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
export function excelSerial(iso) {
  if (iso === null || iso === undefined || iso === '') return null;
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - EXCEL_EPOCH) / 86400000;
}
export function serialToIso(n) {
  return new Date(EXCEL_EPOCH + n * 86400000).toISOString().slice(0, 10);
}
/** 엑셀 DATE(YEAR(x),MONTH(x),1) */
export function monthStartOf(serial) {
  const d = new Date(EXCEL_EPOCH + serial * 86400000);
  return (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - EXCEL_EPOCH) / 86400000;
}
/** 엑셀 EDATE(x, n) (x가 1일이면 말일 처리가 필요 없다) */
export function edate(serial, n) {
  const d = new Date(EXCEL_EPOCH + serial * 86400000);
  const y = d.getUTCFullYear(); const m = d.getUTCMonth() + n; const day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return (Date.UTC(y, m, Math.min(day, last)) - EXCEL_EPOCH) / 86400000;
}

/** 유효숫자 15자리 정리 (엑셀·HyperFormula가 사칙연산 결과에 하는 것과 같은 목적) */
export const p15 = (x) => (Number.isFinite(x) && x !== 0 ? Number(x.toPrecision(15)) : x);
/** 스프레드시트 ROUND(x, n): 0.5는 0에서 먼 쪽 (HyperFormula·LibreOffice와 같은 계산 방식) */
const roundN = (x, n) => { const m = 10 ** n; return x < 0 ? -Math.round(-x * m) / m : Math.round(x * m) / m; };
/**
 * 시트 수식 ROUND(ROUND(x,6),0)과 같다.
 * 1,455,575 × 0.7은 장부상 1,018,902.5인데 이진 부동소수로는 1,018,902.4999999999가 된다.
 * 프로그램마다 이 끝수를 다르게 다루므로(엑셀·리브레는 보정, HyperFormula는 보정 안 함),
 * 소수 6자리에서 먼저 반올림해 어느 프로그램에서나 1,018,903이 나오게 한다(NOTES.md 3장).
 */
export function xround(x) {
  return roundN(roundN(x, 6), 0);
}

const n0 = (v) => (v === null || v === undefined || v === '' ? 0 : v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// ---------------------------------------------------------------------------
// 하객·식대
// ---------------------------------------------------------------------------
/**
 * @param {{guarantee?:number, mealPrice?:number, mealRate?:number|null,
 *          groups: {side:string, name?:string, invited?:number, rate?:number|null, gift?:number}[]}} g
 */
export function guests(g) {
  const mealRate = isNum(g.mealRate) ? g.mealRate : 1;
  const rows = (g.groups || []).map((r) => {
    const rate = isNum(r.rate) ? r.rate : 1;
    const attend = xround(n0(r.invited) * rate);
    const gift = attend * n0(r.gift);
    const warn = n0(r.invited) > 0 && !SIDES.includes(r.side) ? '측 선택' : '';
    return { attend, gift, warn };
  });
  const side = (s) => {
    const pick = (g.groups || []).map((r, i) => [r, rows[i]]).filter(([r]) => r.side === s);
    const invited = pick.reduce((a, [r]) => a + n0(r.invited), 0);
    const attend = pick.reduce((a, [, x]) => a + x.attend, 0);
    const gift = pick.reduce((a, [, x]) => a + x.gift, 0);
    return { invited, attend, eat: xround(attend * mealRate), gift };
  };
  const groom = side('신랑측'); const bride = side('신부측');
  const eatTotal = groom.eat + bride.eat;
  const guarantee = n0(g.guarantee); const price = n0(g.mealPrice);
  const billed = Math.max(guarantee, eatTotal);
  const mealTotal = billed * price;
  const shortfall = Math.max(0, guarantee - eatTotal) * price;
  const share = eatTotal === 0 ? 0.5 : p15(groom.eat / eatTotal);
  groom.meal = xround(mealTotal * share);
  bride.meal = mealTotal - groom.meal;
  groom.net = groom.gift - groom.meal;
  bride.net = bride.gift - bride.meal;
  const total = {
    invited: groom.invited + bride.invited, attend: groom.attend + bride.attend, eat: eatTotal,
    gift: groom.gift + bride.gift, meal: mealTotal, net: groom.net + bride.net,
  };
  return { rows, groom, bride, total, mealRate, billed, mealTotal, shortfall, share };
}

// ---------------------------------------------------------------------------
// 전체 계산
// ---------------------------------------------------------------------------
/**
 * input = {
 *   settings: { weddingDate, today, budget, defaultRatio, monthStart },   // 날짜는 일련번호, today는 필수
 *   guests: {...},                                                       // guests() 입력
 *   items: [{ category, name, total, method, ratio, payer,
 *             dep:{amount,date,paid}, mid:{amount,date,paid}, bal:{date,paid} }]
 * }
 * items[0]은 식대 줄이다. 총액은 입력을 무시하고 하객·식대 탭의 식대 총액을 쓴다.
 */
export function compute(input) {
  const st = input.settings;
  const today = st.today;
  const defaultRatio = isNum(st.defaultRatio) ? st.defaultRatio : 0.5;
  const wedding = isNum(st.weddingDate) ? st.weddingDate : null;
  const monthStart = isNum(st.monthStart) ? monthStartOf(st.monthStart) : monthStartOf(today);
  const G = guests(input.guests || { groups: [] });

  const items = [];
  for (let i = 0; i < ITEM_COUNT; i++) {
    const it = (input.items || [])[i] || {};
    const total = i === 0 ? G.mealTotal : n0(it.total);
    const dep = { amount: n0(it.dep?.amount), date: isNum(it.dep?.date) ? it.dep.date : null, paid: it.dep?.paid === PAID };
    const mid = { amount: n0(it.mid?.amount), date: isNum(it.mid?.date) ? it.mid.date : null, paid: it.mid?.paid === PAID };
    const balAmount = total - dep.amount - mid.amount;
    const balDate = isNum(it.bal?.date) ? it.bal.date : wedding;
    const bal = { amount: balAmount, date: balDate, paid: it.bal?.paid === PAID };
    const parts = [dep, mid, bal];
    const active = total !== 0 || dep.amount !== 0 || mid.amount !== 0;

    const paidSum = parts.reduce((a, p) => a + (p.paid ? p.amount : 0), 0);
    const unpaid = total - paidSum;
    const minDate = Math.min(...parts.map((p) => (p.amount > 0 && !p.paid && p.date !== null ? p.date : NONE)));
    const next = minDate === NONE ? '' : minDate;
    const nextAmount = next === '' ? '' : parts.reduce((a, p) => a + (p.amount > 0 && !p.paid && p.date === next ? p.amount : 0), 0);
    const dday = next === '' ? '' : next - today;
    let status = '';
    if (active) {
      if (balAmount < 0) status = '금액 확인';
      else if (unpaid <= 0) status = '완료';
      else if (next === '') status = '날짜 입력';
      else if (dday < 0) status = '연체';
      else if (dday <= SOON_DAYS) status = '임박';
      else status = '예정';
    }
    let share;
    switch (it.method) {
      case '반반': share = 0.5; break;
      case '비율': share = isNum(it.ratio) ? it.ratio : defaultRatio; break;
      case '하객 비율': share = G.share; break;
      case '신랑측 전액': share = 1; break;
      case '신부측 전액': share = 0; break;
      default: share = defaultRatio;
    }
    const groom = xround(total * share);
    const bride = total - groom;
    const gDep = xround(dep.amount * share);
    const gMid = xround(mid.amount * share);
    const gBal = groom - gDep - gMid;
    const groomShould = xround(paidSum * share);
    const groomPaid = it.payer === '신랑측' ? paidSum : it.payer === '신부측' ? 0 : groomShould;
    const bridePaid = paidSum - groomPaid;
    const key = next === '' ? '' : p15(next + (ITEM_ROW0 + i) / 10000);
    items.push({
      category: it.category ?? (i === 0 ? '식대' : ''), name: it.name ?? '', active, total, dep, mid, bal,
      balAmount, balDate: balDate === null ? '' : balDate, paid: paidSum, unpaid, minDate, next, nextAmount, dday, status,
      share, groom, bride, gDep, gMid, gBal, groomPaid, bridePaid, groomShould, key,
    });
  }

  // ---- 월별 ------------------------------------------------------------
  // 각 회차: [금액, 날짜, 납부, 신랑측 몫]
  const inst = items.flatMap((x) => [
    [x.dep.amount, x.dep.date, x.dep.paid, x.gDep],
    [x.mid.amount, x.mid.date, x.mid.paid, x.gMid],
    [x.balAmount, x.bal.date, x.bal.paid, x.gBal],
  ]);
  const bucket = (pred) => {
    let total = 0; let groom = 0; let unpaid = 0;
    for (const [amt, date, paid, g] of inst) {
      if (date === null || !pred(date)) continue;
      total += amt; groom += g; if (!paid) unpaid += amt;
    }
    return { total, groom, bride: total - groom, unpaid };
  };
  const months = [];
  const before = bucket((d) => d < monthStart);
  for (let k = 0; k < MONTH_COUNT; k++) {
    const a = edate(monthStart, k); const b = edate(monthStart, k + 1);
    months.push({ month: a, ...bucket((d) => d >= a && d < b) });
  }
  const endAll = edate(monthStart, MONTH_COUNT);
  const after = bucket((d) => d >= endAll);
  const all = { total: 0, groom: 0, unpaid: 0 };
  for (const [amt, , paid, g] of inst) { all.total += amt; all.groom += g; if (!paid) all.unpaid += amt; }
  const dated = [before, ...months, after].reduce((s, x) => ({ total: s.total + x.total, groom: s.groom + x.groom, unpaid: s.unpaid + x.unpaid }), { total: 0, groom: 0, unpaid: 0 });
  const noDate = { total: all.total - dated.total, groom: all.groom - dated.groom, unpaid: all.unpaid - dated.unpaid };
  noDate.bride = noDate.total - noDate.groom;
  const monthTotal = { total: all.total, groom: all.groom, bride: all.total - all.groom, unpaid: all.unpaid };
  let run = before.total;
  const cumulative = months.map((m) => (run += m.total));

  // ---- 양가 분담 --------------------------------------------------------
  const sum = (f) => items.reduce((a, x) => a + f(x), 0);
  const split = {
    groomBurden: sum((x) => x.groom), brideBurden: sum((x) => x.bride),
    groomGift: G.groom.gift, brideGift: G.bride.gift,
    groomPaid: sum((x) => x.groomPaid), bridePaid: sum((x) => x.bridePaid),
    groomShould: sum((x) => x.groomShould),
  };
  split.totalBurden = split.groomBurden + split.brideBurden;
  split.groomNet = split.groomBurden - split.groomGift;
  split.brideNet = split.brideBurden - split.brideGift;
  split.paidTotal = split.groomPaid + split.bridePaid;
  split.brideShould = split.paidTotal - split.groomShould;
  split.diff = split.groomPaid - split.groomShould;   // +면 신랑측이 더 냈다 → 신부측이 보낸다
  split.direction = split.diff > 0 ? '신부측 → 신랑측' : split.diff < 0 ? '신랑측 → 신부측' : '정산할 돈 없음';
  split.settleAmount = Math.abs(split.diff);

  // ---- 요약 ------------------------------------------------------------
  const thisMonthEnd = edate(monthStartOf(today), 1);
  const unpaidWhere = (pred) => inst.reduce((a, [amt, date, paid]) => a + (date !== null && !paid && pred(date) ? amt : 0), 0);
  const keys = items.map((x) => x.key).filter((k) => k !== '').sort((a, b) => a - b);
  const upcoming = [];
  for (let k = 0; k < 5; k++) {
    if (k >= keys.length) { upcoming.push(null); continue; }
    const x = items.find((it) => it.key === keys[k]);
    upcoming.push({ date: Math.floor(keys[k]), name: x.name, amount: x.nextAmount, dday: x.dday, status: x.status });
  }
  const contractTotal = sum((x) => x.total);
  const dashboard = {
    weddingDate: wedding === null ? '' : wedding,
    weddingDday: wedding === null ? '' : wedding - today,
    today, budget: isNum(st.budget) ? st.budget : '',
    contractTotal, budgetLeft: isNum(st.budget) ? st.budget - contractTotal : '',
    paid: sum((x) => x.paid), unpaid: sum((x) => x.unpaid),
    overdueAmount: unpaidWhere((d) => d < today),
    thisMonthDue: unpaidWhere((d) => d >= today && d < thisMonthEnd),
    overdueCount: items.filter((x) => x.status === '연체').length,
    soonCount: items.filter((x) => x.status === '임박').length,
    upcoming,
    categories: CATEGORIES.map((c) => {
      const xs = items.filter((x) => x.category === c);
      return { category: c, total: xs.reduce((a, x) => a + x.total, 0), paid: xs.reduce((a, x) => a + x.paid, 0), unpaid: xs.reduce((a, x) => a + x.unpaid, 0) };
    }),
  };

  return {
    settings: { today, defaultRatio, monthStart, weddingDday: dashboard.weddingDday },
    guests: G, items, monthly: { before, months, after, noDate, total: monthTotal, cumulative }, split, dashboard,
  };
}
