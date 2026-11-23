// 날셈 결혼 준비 계산기 2개: 화면 입력 → 결혼 시트 엔진(wedding-engine.js) 입력 변환과 결과 정리.
// 계산 규칙은 엔진에만 있다(본부 저장소 ventures/wedding-sheet/template/engine.mjs 를 그대로 복사, 엑셀 수식과 53개 상황 대조).
// 이 파일은 간단한 화면 입력을 엔진 입력으로 바꾸고 결과를 묶기만 한다.
// 브라우저(wedding-ui.js)와 Node 테스트(test/wedding.test.mjs)가 같이 쓴다. 입력값은 어디로도 보내지 않는다.
import { guests, compute, excelSerial, METHODS } from "./wedding-engine.js";

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
