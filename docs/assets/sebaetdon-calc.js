// 날셈 2027 설 세뱃돈 계산기 엔진. 금액은 모두 만 원 단위 정수다.
// 토스 미니앱 '설날 세뱃돈 계산기'(toss-miniapp 저장소 apps/sebaetdon/src/lib/amounts.ts·calc.ts·dday.ts)와 같은 표·규칙을 JS로 옮겼다.
// 금액표 근거: 본부 저장소 ventures/sebaetdon/hypothesis.md "금액표", 출처는 benchmark.md (2026-11-22 확인). 2027년 1월 새 조사가 나오면 갱신한다.
// 브라우저(sebaetdon-ui.js)와 Node 테스트(test/sebaetdon.test.mjs), 빌드(src/calculators/sebaetdon.mjs)가 같이 쓴다. 입력값은 어디로도 보내지 않는다.

/** 어린 나이대부터. 예산에 맞출 때 "앞 나이대 금액 이상" 규칙이 이 순서를 쓴다. */
export const AGE_GROUPS = [
  { id: "preschool", label: "미취학" },
  { id: "elementaryLow", label: "초등 1~3학년" },
  { id: "elementaryHigh", label: "초등 4~6학년" },
  { id: "middle", label: "중학생" },
  { id: "high", label: "고등학생" },
  { id: "college", label: "대학생·취준생" },
];

export const LEVELS = [
  { value: "thrifty", label: "알뜰하게" },
  { value: "normal", label: "보통" },
  { value: "generous", label: "넉넉하게" },
];
export const DEFAULT_LEVEL = "normal";

/** 아이 1인당 세뱃돈 (만 원) */
export const KID_AMOUNTS = {
  preschool: { thrifty: 1, normal: 2, generous: 3 },
  elementaryLow: { thrifty: 2, normal: 3, generous: 5 },
  elementaryHigh: { thrifty: 3, normal: 5, generous: 7 },
  middle: { thrifty: 3, normal: 5, generous: 10 },
  high: { thrifty: 5, normal: 7, generous: 10 },
  college: { thrifty: 5, normal: 10, generous: 20 },
};
/** 어른(부모님 등) 1분당 용돈 (만 원) */
export const ADULT_AMOUNTS = { thrifty: 10, normal: 20, generous: 30 };

export const MAX_KIDS_PER_GROUP = 10;
export const MAX_ADULTS = 6;
export const MAX_MANWON = 9999;

/** 2027 설날: 2월 7일(일). 연휴 2/6~2/8, 2/7이 일요일과 겹쳐 대체공휴일 2/9(화). 출처: 한국천문연구원 월력 자료 2027 */
export const SEOLLAL = { year: 2027, month: 2, day: 7 };
export const HOLIDAY_TEXT = "2027년 2월 6일(토)~9일(화), 2월 9일은 대체공휴일";

export const SOURCES = [
  "카카오페이 송금봉투 분석 (파이낸셜뉴스 2025년 1월 24일 보도): 2024년 설 중고생 세뱃돈 평균 7.4만 원, 부모님 용돈 평균 약 20만 원",
  "카카오페이 투표 (같은 기사): 중고생 세뱃돈 적정액으로 65%가 5만 원",
  "당근 설문 (같은 기사): 조카 용돈 5만 원 38%, 부모님 용돈 30만 원 31%",
  "2026 설 보도 요약 (세계일보 2026년 2월 13일, 매일신문 2026년 2월 12일 등): 미취학·초등 저학년 1만~3만 원, 고학년 3만~5만 원, 중고생 5만~10만 원, 대학생·취준생 10만~20만 원",
];

export const EXAMPLE = {
  kids: { preschool: 1, elementaryLow: 0, elementaryHigh: 2, middle: 0, high: 1, college: 1 },
  adults: 2, level: "normal", budget: 25, travel: 12, gifts: 30,
};

export const emptyKids = () => ({ preschool: 0, elementaryLow: 0, elementaryHigh: 0, middle: 0, high: 0, college: 0 });
export const levelLabel = (level) => (LEVELS.find((o) => o.value === level) || LEVELS[1]).label;
export const kidAmount = (group, level) => KID_AMOUNTS[group][level];

const clampInt = (v, max) => {
  const n = typeof v === "string" ? Number(v.replace(/[^0-9]/g, "")) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, Math.trunc(n)));
};
/** 선택 입력(만 원): 1 이상이면 그 값(최대 9,999), 0·빈 값은 넣지 않음(null) */
export const normalizeManwon = (v) => { const n = clampInt(v, MAX_MANWON); return n > 0 ? n : null; };

export function clampInputs(raw) {
  const kids = emptyKids();
  for (const g of AGE_GROUPS) kids[g.id] = clampInt((raw.kids || {})[g.id], MAX_KIDS_PER_GROUP);
  return {
    kids,
    adults: clampInt(raw.adults, MAX_ADULTS),
    level: LEVELS.some((o) => o.value === raw.level) ? raw.level : DEFAULT_LEVEL,
    budget: normalizeManwon(raw.budget),
    travel: normalizeManwon(raw.travel),
    gifts: normalizeManwon(raw.gifts),
  };
}

export const totalKids = (kids) => AGE_GROUPS.reduce((s, g) => s + kids[g.id], 0);
const sumRows = (rows) => rows.reduce((s, r) => s + r.subtotal, 0);

/** 봉투 하나(amount 만 원)에 드는 지폐: 5만 원권 먼저, 나머지는 1만 원권 */
export function billsForEnvelope(amount) {
  const whole = Math.max(0, Math.trunc(amount));
  return { fiveMan: Math.floor(whole / 5), oneMan: whole % 5 };
}
export function countBills(envelopes) {
  const t = { fiveMan: 0, oneMan: 0 };
  for (const { perPerson, count } of envelopes) {
    const one = billsForEnvelope(perPerson);
    t.fiveMan += one.fiveMan * count;
    t.oneMan += one.oneMan * count;
  }
  return t;
}

export function baseRows(kids, level) {
  return AGE_GROUPS.filter((g) => kids[g.id] > 0).map((g) => {
    const perPerson = kidAmount(g.id, level), count = kids[g.id];
    return { group: g.id, label: g.label, perPerson, count, subtotal: perPerson * count };
  });
}

/**
 * 세뱃돈을 예산에 맞춰 다시 나눈다 (토스 앱 calc.ts fitBudget와 같음). 어른 용돈은 건드리지 않는다.
 * 기준 합계 ≤ 예산이면 그대로(within). 넘으면 1인 금액 × 예산/합계를 1만 원 단위로 내리고(최소 1만 원),
 * 나이가 많은 쪽이 앞 나이대보다 적어지지 않게 맞춘다(fitted). 그래도 넘으면 short. 남는 돈은 다시 나누지 않는다.
 */
export function fitBudget(rows, budget) {
  const total = sumRows(rows);
  if (rows.length === 0 || total === 0) return { status: "no-kids", rows: [], kidsTotal: 0, diff: budget };
  if (total <= budget) return { status: "within", rows: rows.map((r) => ({ ...r })), kidsTotal: total, diff: budget - total };
  let previous = 0;
  const fitted = rows.map((r) => {
    const scaled = Math.max(1, Math.floor((r.perPerson * budget) / total));
    const perPerson = Math.max(scaled, previous);
    previous = perPerson;
    return { ...r, perPerson, subtotal: perPerson * r.count };
  });
  const kidsTotal = sumRows(fitted);
  return { status: kidsTotal <= budget ? "fitted" : "short", rows: fitted, kidsTotal, diff: budget - kidsTotal };
}

/** raw: { kids:{그룹:인원}, adults, level, budget, travel, gifts } (금액은 만 원). 사람이 0명이면 { error } */
export function sebaetdon(raw) {
  const inputs = clampInputs(raw);
  if (totalKids(inputs.kids) + inputs.adults === 0) return { error: "세뱃돈 줄 아이나 용돈 드릴 어른을 한 명 이상 넣어 주세요." };
  const rows = baseRows(inputs.kids, inputs.level);
  const kidsTotal = sumRows(rows);
  const adultPerPerson = ADULT_AMOUNTS[inputs.level];
  const adultTotal = adultPerPerson * inputs.adults;
  const travel = inputs.travel || 0, gifts = inputs.gifts || 0;
  const fixed = adultTotal + travel + gifts;
  const adultEnvelopes = { perPerson: adultPerPerson, count: inputs.adults };
  let budgetPlan = null;
  if (inputs.budget) {
    const fit = fitBudget(rows, inputs.budget);
    budgetPlan = { ...fit, budget: inputs.budget, grandTotal: fit.kidsTotal + fixed, bills: countBills([...fit.rows, adultEnvelopes]) };
  }
  return {
    inputs, level: inputs.level, rows, kidsCount: totalKids(inputs.kids), kidsTotal,
    adults: inputs.adults, adultPerPerson, adultTotal, travel, gifts,
    grandTotal: kidsTotal + fixed,
    bills: countBills([...rows, adultEnvelopes]),
    budgetPlan,
  };
}

export const formatManwon = (v) => `${Number(v).toLocaleString("ko-KR")}만 원`;

export function budgetMessage(plan) {
  switch (plan.status) {
    case "no-kids": return "세뱃돈 줄 아이를 넣으면 예산에 맞춰 나눠 드려요.";
    case "within": return plan.diff === 0 ? "예산과 딱 맞아요." : `예산보다 ${formatManwon(plan.diff)} 적어요.`;
    case "fitted": return plan.diff === 0 ? "예산에 딱 맞췄어요." : `예산에 맞췄어요. ${formatManwon(plan.diff)} 남아요.`;
    default: return `1인 최소 1만 원으로 줄여도 예산이 ${formatManwon(-plan.diff)} 모자라요.`;
  }
}

// ── 설날까지 남은 날 (한국 표준시) ──
const KST = 9 * 3600 * 1000, DAY = 86400000;
const dayNum = (d) => Math.round(Date.UTC(d.year, d.month - 1, d.day) / DAY);
export function kstDate(ms) { const s = new Date(ms + KST); return { year: s.getUTCFullYear(), month: s.getUTCMonth() + 1, day: s.getUTCDate() }; }
export const daysUntilSeollal = (nowMs, seollal = SEOLLAL) => dayNum(seollal) - dayNum(kstDate(nowMs));
export function ddayLabel(nowMs, seollal = SEOLLAL) {
  const d = daysUntilSeollal(nowMs, seollal);
  if (d > 0) return `${seollal.year} 설날까지 D-${d}`;
  if (d === 0) return "오늘이 설날이에요";
  return "설날이 지났어요";
}
