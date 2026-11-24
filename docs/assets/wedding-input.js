// 날셈 결혼 준비 계산기 3개(식대·축의금, 양가 분담, 결제 일정): 화면 입력 → 결혼 시트 엔진(wedding-engine.js) 입력 변환과 결과 정리.
// 계산 규칙은 엔진에만 있다(본부 저장소 ventures/wedding-sheet/template/engine.mjs 를 그대로 복사, 엑셀 수식과 53개 상황 대조).
// 이 파일은 간단한 화면 입력을 엔진 입력으로 바꾸고 결과를 묶기만 한다.
// 브라우저(wedding-ui.js)와 Node 테스트(test/wedding.test.mjs)가 같이 쓴다. 입력값은 어디로도 보내지 않는다.
import { guests, compute, excelSerial, serialToIso, METHODS } from "./wedding-engine.js";

export { METHODS };
export const SHEET = { href: "https://suikster0.gumroad.com/l/szoblx", price: "9,900원", name: "2027 결혼 준비 결제 일정·양가 분담 엑셀" };
export const SIDES = ["신랑측", "신부측"];
export const PAYER_OPTS = [["아직", "아직 안 냄"], ["신랑측", "신랑측이 냄"], ["신부측", "신부측이 냄"], ["분담대로", "분담대로 나눠 냄"]];
export const MAX_ROWS = 15;

const n = (v) => (typeof v === "number" && isFinite(v) && v > 0 ? v : 0);
const pct = (v) => (typeof v === "number" && isFinite(v) && v >= 0 ? v / 100 : null);

// ── 식대·축의금 ──────────────────────────────────────────────
// 시트 예시판과 같은 값(하객 그룹 8개, 보증 200명, 1인 66,000원, 식사 비율 90%)
export const MEAL_EXAMPLE = {
  guarantee: 200, mealPrice: 66000, mealRatePct: 90,
  groups: [
    { side: "신랑측", name: "친구", invited: 50, ratePct: 80, gift: 100000 },
    { side: "신랑측", name: "직장", invited: 40, ratePct: 60, gift: 70000 },
    { side: "신랑측", name: "친척", invited: 35, ratePct: 90, gift: 150000 },
    { side: "신랑측", name: "부모님 지인", invited: 90, ratePct: 60, gift: 100000 },
    { side: "신부측", name: "친구", invited: 55, ratePct: 80, gift: 100000 },
    { side: "신부측", name: "직장", invited: 30, ratePct: 60, gift: 70000 },
    { side: "신부측", name: "친척", invited: 30, ratePct: 90, gift: 150000 },
    { side: "신부측", name: "부모님 지인", invited: 75, ratePct: 60, gift: 100000 },
  ],
};

/**
 * h = { guarantee, mealPrice, mealRatePct (빈칸 null = 100%), groups:[{side, name, invited, ratePct (빈칸 null = 100%), gift}] }
 * 돌려주는 것: 엔진 guests() 결과 + 참석자 1인당 식대(손익분기 축의금), 보증을 채우려면 더 필요한 식사 인원
 */
export function mealCalc(h) {
  const groups = (h.groups || []).map((g) => ({ side: g.side, name: g.name || "", invited: n(g.invited), rate: pct(g.ratePct), gift: n(g.gift) }));
  if (!n(h.mealPrice)) return { error: "1인 식대를 넣어 주세요." };
  if (!groups.some((g) => g.invited > 0)) return { error: "초대 인원을 한 그룹 이상 넣어 주세요." };
  if (groups.some((g) => g.rate !== null && g.rate > 1)) return { error: "참석률은 100% 이하로 넣어 주세요." };
  const mealRate = pct(h.mealRatePct);
  if (mealRate !== null && mealRate > 1) return { error: "식사 비율은 100% 이하로 넣어 주세요." };
  const G = guests({ guarantee: n(h.guarantee), mealPrice: n(h.mealPrice), mealRate, groups });
  const breakEven = G.total.attend > 0 ? Math.ceil(G.mealTotal / G.total.attend) : 0;
  const toFill = Math.max(0, n(h.guarantee) - G.total.eat);
  return { ...G, breakEven, toFill, guarantee: n(h.guarantee), mealPrice: n(h.mealPrice) };
}

// ── 양가 분담 정산 ───────────────────────────────────────────
export const SPLIT_EXAMPLE = {
  defaultRatioPct: 50, guestsGroom: 135, guestsBride: 121,
  rows: [
    { name: "예식장 대관·부대비용", amount: 3500000, method: "하객 비율", ratioPct: null, payer: "신랑측" },
    { name: "스드메 패키지", amount: 2940000, method: "반반", ratioPct: null, payer: "신부측" },
    { name: "예물", amount: 4000000, method: "신랑측 전액", ratioPct: null, payer: "신랑측" },
    { name: "예단", amount: 2000000, method: "신부측 전액", ratioPct: null, payer: "신부측" },
    { name: "신혼여행", amount: 6000000, method: "비율", ratioPct: 60, payer: "신랑측" },
    { name: "청첩장·답례품", amount: 1200000, method: "반반", ratioPct: null, payer: "아직" },
  ],
};

const TODAY = excelSerial("2026-11-24"); // 정산에는 날짜가 쓰이지 않는다. 엔진이 요구하는 기준일 자리만 채운다.

/**
 * h = { defaultRatioPct (신랑측 %, 빈칸 50), guestsGroom, guestsBride (하객 비율에만 쓴다),
 *       rows:[{ name, amount, method: METHODS 중 하나, ratioPct (비율일 때 신랑측 %), payer: '아직'|'신랑측'|'신부측'|'분담대로' }] }
 * 낸 항목은 전액을 낸 것으로 본다(계약금·잔금을 나눠 적는 것은 시트에서). 아직 안 낸 항목은 부담에는 들어가고 정산에서는 빠진다.
 */
export function splitCalc(h) {
  const rows = (h.rows || []).filter((r) => n(r.amount) > 0).slice(0, MAX_ROWS);
  if (!rows.length) return { error: "항목과 금액을 한 줄 이상 넣어 주세요." };
  const defaultRatio = pct(h.defaultRatioPct);
  if ((defaultRatio !== null && defaultRatio > 1) || rows.some((r) => r.method === "비율" && pct(r.ratioPct) !== null && pct(r.ratioPct) > 1)) return { error: "신랑측 비율은 100% 이하로 넣어 주세요." };
  const items = [{}].concat(rows.map((r) => {
    const paid = r.payer !== "아직";
    return {
      category: "기타", name: r.name || "", total: n(r.amount), method: METHODS.includes(r.method) ? r.method : "반반", ratio: pct(r.ratioPct),
      payer: paid ? r.payer : "분담대로",
      dep: paid ? { amount: n(r.amount), date: TODAY, paid: "O" } : {},
    };
  }));
  const R = compute({
    settings: { today: TODAY, defaultRatio: defaultRatio === null ? 0.5 : defaultRatio },
    guests: { guarantee: 0, mealPrice: 0, mealRate: 1, groups: [{ side: "신랑측", invited: n(h.guestsGroom), rate: 1 }, { side: "신부측", invited: n(h.guestsBride), rate: 1 }] },
    items,
  });
  const lines = rows.map((r, i) => {
    const x = R.items[i + 1];
    return { name: r.name || `항목 ${i + 1}`, amount: x.total, method: items[i + 1].method, share: x.share, groom: x.groom, bride: x.bride, payer: r.payer };
  });
  const usesGuests = rows.some((r) => r.method === "하객 비율");
  return { lines, split: R.split, guestShare: R.guests.share, usesGuests, noGuests: usesGuests && !(n(h.guestsGroom) + n(h.guestsBride)) };
}

// ── 결제 일정 (계약금·중도금·잔금) ─────────────────────────
// 시트 예시판 결제일정 탭과 같은 항목. 식대 줄은 하객·식대 탭 대신 금액(16,896,000원)을 바로 넣었다.
// 기준일 2026-11-23이면 시트 예시판 요약 탭과 같은 값이 나온다(D-173, 계약 총액 39,236,000, 낸 돈 1,800,000, 다음 결제 12-01 D-8).
export const PAY_BASE = "2026-11-23";
const P = (amount, date, paid = false) => ({ amount, date, paid });
export const PAY_EXAMPLE = {
  today: PAY_BASE, wedding: "2027-05-15", budget: 42000000,
  rows: [
    { name: "식대 (보증 200명 기준)", total: 16896000, dep: P(null, ""), mid: P(null, ""), bal: { date: "", paid: false } },
    { name: "예식장 대관료·연출", total: 3500000, dep: P(1000000, "2026-10-10", true), mid: P(null, ""), bal: { date: "", paid: false } },
    { name: "스드메 패키지", total: 2940000, dep: P(300000, "2026-11-05", true), mid: P(1300000, "2027-02-20"), bal: { date: "2027-05-01", paid: false } },
    { name: "본식 스냅·영상", total: 1800000, dep: P(500000, "2026-11-20", true), mid: P(null, ""), bal: { date: "2027-05-08", paid: false } },
    { name: "예물(반지·시계)", total: 4000000, dep: P(1000000, "2026-12-05"), mid: P(null, ""), bal: { date: "2027-03-20", paid: false } },
    { name: "예단", total: 2000000, dep: P(null, ""), mid: P(null, ""), bal: { date: "2027-02-14", paid: false } },
    { name: "신혼여행 (항공·숙소)", total: 6000000, dep: P(1000000, "2026-12-01"), mid: P(null, ""), bal: { date: "2027-04-15", paid: false } },
    { name: "청첩장·답례품", total: 600000, dep: P(null, ""), mid: P(null, ""), bal: { date: "2027-03-10", paid: false } },
    { name: "혼주 한복 대여", total: 800000, dep: P(null, ""), mid: P(null, ""), bal: { date: "2027-05-10", paid: false } },
    { name: "사회·축가·헬퍼", total: 700000, dep: P(null, ""), mid: P(null, ""), bal: { date: "", paid: false } },
  ],
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ser = (iso) => (typeof iso === "string" && ISO.test(iso) ? excelSerial(iso) : null);

// "예시로 채우기": 오늘이 기준일과 같은 위치가 되도록 모든 날짜를 같은 날수만큼 옮긴다(D-day와 상태가 예시 카드와 같게 나온다).
export function payExampleFor(todayIso) {
  const t = ser(todayIso);
  const shift = t === null ? 0 : t - excelSerial(PAY_BASE);
  const mv = (iso) => (ser(iso) === null ? "" : serialToIso(ser(iso) + shift));
  return {
    today: t === null ? PAY_BASE : todayIso, wedding: mv(PAY_EXAMPLE.wedding), budget: PAY_EXAMPLE.budget,
    rows: PAY_EXAMPLE.rows.map((r) => ({ name: r.name, total: r.total, dep: { ...r.dep, date: mv(r.dep.date) }, mid: { ...r.mid, date: mv(r.mid.date) }, bal: { ...r.bal, date: mv(r.bal.date) } })),
  };
}

/**
 * h = { today: 'YYYY-MM-DD', wedding: 'YYYY-MM-DD' | '', budget,
 *       rows:[{ name, total, dep:{amount, date, paid}, mid:{amount, date, paid}, bal:{date ('' = 예식일), paid} }] }
 * 잔금 = 총액 − 계약금 − 중도금 (엔진). 돌려주는 것: 요약(D-day·계약 총액·낸 돈·남은 돈·연체·이번 달), 다음 결제 5건, 항목별 상태, 달마다 낼 돈.
 */
export function payCalc(h) {
  const today = ser(h.today);
  if (today === null) return { error: "기준일을 확인해 주세요." };
  const rows = (h.rows || []).filter((r) => n(r.total) > 0).slice(0, MAX_ROWS);
  if (!rows.length) return { error: "항목과 총액을 한 줄 이상 넣어 주세요." };
  const part = (p) => ({ amount: n(p?.amount), date: ser(p?.date), paid: p?.paid ? "O" : null });
  const items = [{}].concat(rows.map((r) => ({
    name: r.name || "", total: n(r.total), method: "반반",
    dep: part(r.dep), mid: part(r.mid), bal: { date: ser(r.bal?.date), paid: r.bal?.paid ? "O" : null },
  })));
  const wedding = ser(h.wedding);
  const R = compute({ settings: { today, weddingDate: wedding, budget: n(h.budget) || null, defaultRatio: 0.5 }, guests: { groups: [] }, items });
  const D = R.dashboard;
  const iso = (s) => (s === "" || s === null ? "" : serialToIso(s));
  const lines = rows.map((r, i) => {
    const x = R.items[i + 1];
    return { name: r.name || `항목 ${i + 1}`, total: x.total, paid: x.paid, unpaid: x.unpaid, balAmount: x.balAmount, next: iso(x.next), nextAmount: x.nextAmount, dday: x.dday, status: x.status };
  });
  const M = R.monthly;
  const months = M.months.map((m) => ({ month: serialToIso(m.month).slice(0, 7), total: m.total, unpaid: m.unpaid })).map((m, k) => ({ ...m, cumulative: M.cumulative[k] }));
  const lastUsed = months.reduce((a, m, k) => (m.total !== 0 ? k : a), -1);
  return {
    today: h.today, wedding: iso(wedding), weddingDday: D.weddingDday,
    contractTotal: D.contractTotal, paid: D.paid, unpaid: D.unpaid,
    budget: D.budget, budgetLeft: D.budgetLeft,
    overdueAmount: D.overdueAmount, thisMonthDue: D.thisMonthDue, overdueCount: D.overdueCount, soonCount: D.soonCount,
    upcoming: D.upcoming.filter(Boolean).map((u) => ({ ...u, date: iso(u.date) })),
    lines, months: months.slice(0, lastUsed + 1),
    before: M.before, after: M.after, noDate: M.noDate,
    amountIssues: lines.filter((x) => x.status === "금액 확인").map((x) => x.name),
    noDateItems: lines.filter((x) => x.status === "날짜 입력").map((x) => x.name),
  };
}
