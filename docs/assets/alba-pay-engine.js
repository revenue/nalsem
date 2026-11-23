// 2027 소규모 매장 급여대장 계산 엔진 (단일 진실, 의존성 없음)
//
// 규칙 원본: ../rules-2027.md (0장 요율표, 2~7장 규칙, 8장 테스트 T1~T19)
// 엑셀(build-xlsx.mjs)의 수식은 이 파일과 같은 순서·같은 끝수 처리로 계산하고,
// verify-xlsx.mjs가 두 결과가 같은지 확인한다.
//
// 참고용 계산이다. 노무·세무 자문이 아니다.
//
// 시간은 모두 "분" 정수로 다룬다(부동소수 오차를 줄이려고). 금액은 원 단위.

// ---------------------------------------------------------------------------
// 0. 요율표 (rules-2027.md 0장과 4장 표를 그대로 옮김)
//    confirmed: false = 2027 값이 아직 확정되지 않음 → 엑셀 `설정` 시트에서 노란 칸
// ---------------------------------------------------------------------------
export const RATES_2027 = Object.freeze({
  minimumWage: {
    value: 10700, unit: '원/시간', confirmed: true, label: '최저임금 시급',
    source: '고용노동부 고시 제2026-60호 (2026-08-05)',
  },
  monthlyStandardHours: {
    value: 209, unit: '시간', confirmed: true, label: '주 40시간 월 환산(주휴 포함)',
    source: '(40+8)×365÷7÷12 = 208.57 → 209',
  },
  pensionEmployee: {
    value: 0.05, unit: '%', confirmed: true, label: '국민연금 근로자',
    source: '복지부 연금개혁 Q&A (2027 10.0%)',
  },
  pensionEmployer: {
    value: 0.05, unit: '%', confirmed: true, label: '국민연금 사업주',
    source: '복지부 연금개혁 Q&A (2027 10.0%)',
  },
  pensionBaseFloor: {
    value: 410000, unit: '원', confirmed: true, label: '국민연금 기준소득월액 하한',
    source: '복지부 고시 제2026-31호 (2026-07 ~ 2027-06). 2027-07부터 새 값',
  },
  pensionBaseCeiling: {
    value: 6590000, unit: '원', confirmed: true, label: '국민연금 기준소득월액 상한',
    source: '복지부 고시 제2026-31호 (2026-07 ~ 2027-06). 2027-07부터 새 값',
  },
  healthTotal: {
    value: 0.0719, unit: '%', confirmed: true, label: '건강보험료율(노사 합계)',
    source: '정책브리핑 2026-09-11 (2027 동결 7.19%)',
  },
  healthEmployee: {
    value: 0.03595, unit: '%', confirmed: true, label: '건강보험 근로자',
    source: '7.19% ÷ 2',
  },
  healthEmployer: {
    value: 0.03595, unit: '%', confirmed: true, label: '건강보험 사업주',
    source: '7.19% ÷ 2',
  },
  ltcIncomeRate: {
    value: 0.009994, unit: '%', confirmed: true, label: '장기요양보험료율(소득 대비)',
    source: '정책브리핑 2026-11-02 (0.9994%, 건강보험료 대비 13.90%)',
  },
  healthPremiumMaxTotal: {
    value: 9183480, unit: '원', confirmed: false, label: '건강보험 월 보험료 상한(노사 합계)',
    source: '2026 값. 2027 고시 전',
  },
  healthPremiumMinTotal: {
    value: 20160, unit: '원', confirmed: false, label: '건강보험 월 보험료 하한(노사 합계)',
    source: '2026 값. 2027 고시 전(하한 개편안 검토 중)',
  },
  employmentCurrent: {
    value: 0.009, unit: '%', confirmed: false, label: '고용보험 실업급여 근로자·사업주 각각 (현행)',
    source: '현행 1.8% (노사 각 0.9%)',
  },
  employmentProposal: {
    value: 0.01, unit: '%', confirmed: false, label: '고용보험 실업급여 근로자·사업주 각각 (정부안)',
    source: '고용노동부 보도자료 2026-09-01, 시행령 입법예고 2026-09-22. 공포 확인 전',
  },
  employmentStability: {
    value: 0.0025, unit: '%', confirmed: true, label: '고용안정·직업능력개발(사업주, 150인 미만)',
    source: '현행 유지로 봄(요약만)',
  },
  industrialAccident: {
    value: 0, unit: '%', confirmed: false, label: '산재보험(사업주, 업종별)',
    source: '사용자가 입력. 2027 업종별 요율은 12월 말 고시',
  },
  localIncomeTax: {
    value: 0.1, unit: '%', confirmed: true, label: '지방소득세(소득세 대비)',
    source: '지방세법',
  },
  dailyWorkerDeduction: {
    value: 150000, unit: '원', confirmed: true, label: '일용근로 1일 근로소득공제',
    source: '국세청 일용근로소득 원천징수 안내',
  },
  dailyWorkerTaxRate: {
    value: 0.06, unit: '%', confirmed: true, label: '일용근로 세율',
    source: '국세청 일용근로소득 원천징수 안내',
  },
  dailyWorkerTaxCredit: {
    value: 0.55, unit: '%', confirmed: true, label: '일용근로 근로소득세액공제',
    source: '국세청 일용근로소득 원천징수 안내',
  },
  smallAmountExemption: {
    value: 1000, unit: '원', confirmed: true, label: '소액부징수 기준(미만이면 0원)',
    source: '소득세법 제86조',
  },
});

/** 요율 값만 꺼낸 평면 객체. overrides로 일부를 바꿔 계산할 수 있다. */
export function rateValues(overrides = {}) {
  const out = {};
  for (const [k, v] of Object.entries(RATES_2027)) out[k] = v.value;
  return { ...out, ...overrides };
}

// 규칙상 고정 기준 (요율이 아니라 법 조문 기준)
export const LIMITS = Object.freeze({
  weeklyThresholdHours: 15,  // 근로기준법 제18조③, 퇴직급여법 제4조①, 4대보험 월 60h ≈ 주 15h
  employmentMonths: 3,       // 고용보험: 60h 미만이라도 3개월 이상 계속 근로하면 적용
  dailyLimitMin: 8 * 60,     // 근로기준법 제50조②
  weeklyLimitMin: 40 * 60,   // 근로기준법 제50조①
  maxHolidayHours: 8,        // 주휴 1일 상한 8시간
  // 야간 22:00~06:00. 하루를 넘기는 근무를 위해 0시 기준 분으로 세 구간을 둔다.
  nightWindows: [[0, 360], [1320, 1800], [2760, 3240]],
});

// ---------------------------------------------------------------------------
// 공통 유틸
// ---------------------------------------------------------------------------

/** 'HH:MM' 또는 분(숫자) → 0시 기준 분 */
export function toMinutes(t) {
  if (t === null || t === undefined || t === '') return null;
  if (typeof t === 'number') return Math.round(t);
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
  if (!m) throw new Error(`시간 형식이 아니에요: ${t}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 엑셀 ROUND(x, 6)과 같은 목적: 곱셈 부동소수 오차 제거 */
function round6(x) {
  return Math.round(x * 1e6) / 1e6;
}

/**
 * 10원 미만 버림. 엑셀 수식 ROUNDDOWN(ROUND(x,6),-1)과 같다.
 * 근거: 국고금 관리법 제47조① (국고금의 수입·지출에서 10원 미만 끝수는 계산하지 않음).
 * 4대보험료(건강·장기요양·연금·고용·산재)와 원천징수 세액에 공통으로 쓴다.
 * rules-2027.md 4장 "템플릿은 각 보험료를 10원 미만 버림으로 처리"와 같다.
 */
export function floor10(x) {
  return Math.floor(round6(x) / 10) * 10;
}

/** 원 단위 반올림 (임금 금액). 엑셀 ROUND(x,0)과 같다(양수 0.5는 올림). */
function roundWon(x) {
  return Math.round(x);
}

function overlap(a1, a2, b1, b2) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function nightOverlap(startMin, endMin) {
  return LIMITS.nightWindows.reduce((s, [w1, w2]) => s + overlap(startMin, endMin, w1, w2), 0);
}

// 날짜: 'YYYY-MM-DD' ↔ 일 번호(UTC). 엑셀 일련번호 = 일 번호 + 25569
const DAY_MS = 86400000;
export function dayNumber(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}
export function excelSerial(dateStr) {
  return dayNumber(dateStr) + 25569;
}
function fromDayNumber(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}
/** 월=1 … 일=7 (엑셀 WEEKDAY(x,2)) */
function weekdayMon1(n) {
  const js = new Date(n * DAY_MS).getUTCDay(); // 일=0
  return js === 0 ? 7 : js;
}
/** 엑셀 EDATE: n개월 뒤 같은 날, 말일을 넘으면 그 달 말일 */
export function edate(dateStr, months) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}
function monthBounds(month) {
  // month: 'YYYY-MM'
  const [y, m] = month.split('-').map(Number);
  const start = Date.UTC(y, m - 1, 1) / DAY_MS;
  const end = Date.UTC(y, m, 0) / DAY_MS;
  return { start, end };
}

function isFivePlus(scale) {
  if (scale === '5plus' || scale === '5인 이상') return true;
  if (scale === 'under5' || scale === '5인 미만') return false;
  throw new Error(`사업장 규모 값이 잘못됐어요: ${scale}`);
}

// ---------------------------------------------------------------------------
// 1. 최저임금 월 환산 (T5)
// ---------------------------------------------------------------------------

/**
 * 월 소정근로시간(주휴 포함) = (주 소정 + 주휴시간) × 365 ÷ 7 ÷ 12, 정수로 반올림.
 * 주 40h → (40+8) × 365/84 = 208.57 → 209 (고용노동부 고시 보도자료).
 */
export function monthlyPaidHours(weeklyHours, { shopDays = 5, irregular = false } = {}) {
  const holiday = weeklyHours >= LIMITS.weeklyThresholdHours
    ? weeklyHolidayHours({ weeklyHours, shopDays, irregular })
    : 0;
  return Math.round(((weeklyHours + holiday) * 365) / 7 / 12);
}

export function monthlySalaryForWeeklyHours(weeklyHours, wage = RATES_2027.minimumWage.value, opts = {}) {
  const hours = monthlyPaidHours(weeklyHours, opts);
  return { hours, amount: hours * wage };
}

// ---------------------------------------------------------------------------
// 2. 주휴수당 (rules-2027.md 2장)
// ---------------------------------------------------------------------------

/**
 * 1일 주휴시간.
 * - 기본: 주 소정근로시간 ÷ 통상근로자 주 소정근로일수(5일제 5, 6일제 6)
 *   (시행령 별표2: 4주 소정근로시간 합 ÷ 통상근로자 4주 소정근로일수와 같음)
 * - 불규칙 근로: (주 소정근로시간 ÷ 40) × 8 (근로기준정책과-5943)
 * - 상한 8시간
 * 15시간 요건·개근 요건은 weeklyHolidayAllowance에서 본다.
 */
export function weeklyHolidayHours({ weeklyHours, shopDays = 5, irregular = false }) {
  if (shopDays !== 5 && shopDays !== 6) throw new Error('근무일 체계는 5 또는 6이에요');
  const h = irregular ? (weeklyHours / 40) * 8 : weeklyHours / shopDays;
  return Math.min(LIMITS.maxHolidayHours, h);
}

/** 주휴 분 (엑셀 `주별계산` 시트와 같은 식): MIN(480, 1일 주휴시간 × 60) */
function weeklyHolidayMinutes({ weeklyHours, shopDays, irregular }) {
  const h = irregular ? (weeklyHours / 40) * 8 : weeklyHours / shopDays;
  return Math.min(480, h * 60);
}

/**
 * 주휴수당 (한 주).
 * 요건: 계약상 주 소정근로시간 15시간 이상(제18조③) + 그 주 소정근로일 개근(시행령 제30조①).
 * 지각·조퇴는 결근이 아니다 → fullAttendance는 "결근 0일"을 뜻한다.
 */
export function weeklyHolidayAllowance({
  weeklyHours, wage = RATES_2027.minimumWage.value, shopDays = 5, irregular = false, fullAttendance = true,
}) {
  const eligible = weeklyHours >= LIMITS.weeklyThresholdHours && fullAttendance;
  if (!eligible) return { eligible: false, hours: 0, amount: 0 };
  const minutes = weeklyHolidayMinutes({ weeklyHours, shopDays, irregular });
  return { eligible: true, hours: minutes / 60, amount: roundWon((minutes * wage) / 60) };
}

// ---------------------------------------------------------------------------
// 3. 하루 근무 지표 (엑셀 `근무기록` 시트의 계산 열과 같은 식)
// ---------------------------------------------------------------------------

/**
 * 하루 한 줄 근무기록 → 분 단위 지표.
 * rec: { start:'HH:MM', end:'HH:MM', breakMin, breakStart?:'HH:MM', holiday?:bool, absent?:bool }
 * - 퇴근 ≤ 출근이면 다음 날 퇴근으로 본다(최대 24시간).
 * - 야간 = 22:00~06:00과 겹친 시간. 휴게 시작을 넣으면 휴게 중 야간분을 뺀다.
 *   휴게 시작을 비우면 휴게가 야간 밖에 있었다고 본다.
 * - 휴일근무 날은 1일 8h 초과분을 "연장"이 아니라 "휴일 8h 초과"로 센다(가산 중복 없음).
 */
export function dayMetrics(rec) {
  const zero = { workedMin: 0, nightMin: 0, holidayMin: 0, holidayOver8Min: 0, dailyOTMin: 0, within8Min: 0 };
  const inM0 = toMinutes(rec.start);
  const outM0 = toMinutes(rec.end);
  if (rec.absent || inM0 === null || outM0 === null) return zero;
  const inM = inM0;
  const outM = outM0 <= inM ? outM0 + 1440 : outM0;
  const breakMin = rec.breakMin || 0;
  const workedMin = Math.max(0, outM - inM - breakMin);

  let breakNight = 0;
  const bs0 = toMinutes(rec.breakStart);
  if (bs0 !== null && breakMin > 0) {
    const bs = bs0 < inM ? bs0 + 1440 : bs0;
    breakNight = nightOverlap(bs, bs + breakMin);
  }
  const nightMin = Math.max(0, nightOverlap(inM, outM) - breakNight);
  const holiday = !!rec.holiday;
  return {
    workedMin,
    nightMin,
    holidayMin: holiday ? workedMin : 0,
    holidayOver8Min: holiday ? Math.max(0, workedMin - LIMITS.dailyLimitMin) : 0,
    dailyOTMin: holiday ? 0 : Math.max(0, workedMin - LIMITS.dailyLimitMin),
    within8Min: holiday ? 0 : Math.min(workedMin, LIMITS.dailyLimitMin),
  };
}

/**
 * 가산수당 (rules-2027.md 3장).
 * 5인 이상 (근로기준법 제56조):
 *   연장(1일 8h·1주 40h 초과, 단시간 근로자의 계약시간 초과 포함) 50%,
 *   야간 50%(연장·휴일과 겹쳐도 따로 더함), 휴일 8h 이내 50%·8h 초과 100%.
 *   → 휴일가산 = (휴일시간 + 휴일 8h 초과시간) × 50%
 * 5인 미만: 가산 없음(제56조 미적용). 일한 시간의 시급 100%는 기본급에 들어 있다.
 * 금액은 항목별로 원 단위 반올림: ROUND(분 × 시급 ÷ 120).
 */
export function premiums({ overtimeMin = 0, nightMin = 0, holidayMin = 0, holidayOver8Min = 0 }, wage, scale) {
  if (!isFivePlus(scale)) return { overtime: 0, night: 0, holiday: 0 };
  return {
    overtime: roundWon((overtimeMin * wage) / 120),
    night: roundWon((nightMin * wage) / 120),
    holiday: roundWon(((holidayMin + holidayOver8Min) * wage) / 120),
  };
}

/** 하루치 임금 (T8~T13 확인용). 주 40h 초과·단시간 초과는 주 단위라 여기서는 0으로 본다. */
export function dayPay(rec, wage, scale) {
  const m = dayMetrics(rec);
  const base = roundWon((m.workedMin * wage) / 60);
  const p = premiums({ overtimeMin: m.dailyOTMin, nightMin: m.nightMin, holidayMin: m.holidayMin, holidayOver8Min: m.holidayOver8Min }, wage, scale);
  return { metrics: m, base, ...p, total: base + p.overtime + p.night + p.holiday };
}

/**
 * 한 주(월~일) 집계.
 * - 주 40h 초과(분) = MAX(0, 휴일 아닌 날의 1일 8h 이내 시간 합 − 2400)
 * - 단시간 초과(분) = 계약 주 0 < h < 40이면 MAX(0, MIN(위 합, 2400) − 계약시간×60)
 *   (기간제법 제6조, 5인 이상만 가산. 하루 계약시간 초과는 판단하지 않고 주 단위로만 본다)
 * - 휴일근무 시간은 휴일가산으로 처리하므로 위 두 합에서 뺀다(T10).
 */
export function weekSummary(dayRecs, { weeklyHours, shopDays = 5, irregular = false }) {
  let count = 0; let absences = 0; let within = 0;
  for (const r of dayRecs) {
    count += 1;
    if (r.absent) absences += 1;
    within += dayMetrics(r).within8Min;
  }
  const weeklyOTMin = Math.max(0, within - LIMITS.weeklyLimitMin);
  const shortExcessMin = weeklyHours > 0 && weeklyHours < 40
    ? Math.max(0, Math.min(within, LIMITS.weeklyLimitMin) - weeklyHours * 60)
    : 0;
  const holidayOk = count > 0 && absences === 0 && weeklyHours >= LIMITS.weeklyThresholdHours;
  const weeklyHolidayMin = holidayOk ? weeklyHolidayMinutes({ weeklyHours, shopDays, irregular }) : 0;
  return { count, absences, within8Min: within, weeklyOTMin, shortExcessMin, weeklyHolidayMin };
}

// ---------------------------------------------------------------------------
// 4. 4대보험 (rules-2027.md 4장)
// ---------------------------------------------------------------------------

/**
 * 적용 여부 자동 판정 (사용자가 덮어쓸 수 있음).
 * - 연금·건강: 주 소정 15h 이상(월 60h ≈ 주 15h, rules-2027.md 4장)
 * - 고용: 주 15h 이상, 또는 입사 후 3개월 이상 계속 근로(EDATE(입사일,3) ≤ 그 달 말일)
 * - 산재: 시간과 관계없이 적용
 * - 주휴·퇴직금 대상(참고): 주 15h 이상 (퇴직금은 1년 이상 요건이 따로 있음)
 * overrides: { pension|health|employment|accident: '자동'|'가입'|'제외' }
 */
export function eligibility({ weeklyHours, hireDate = null, monthEnd = null, monthsEmployed = null, overrides = {} }) {
  const over15 = weeklyHours >= LIMITS.weeklyThresholdHours;
  let threeMonths = false;
  if (monthsEmployed !== null) threeMonths = monthsEmployed >= LIMITS.employmentMonths;
  else if (hireDate && monthEnd) threeMonths = dayNumber(edate(hireDate, LIMITS.employmentMonths)) <= dayNumber(monthEnd);
  const auto = { pension: over15, health: over15, employment: over15 || threeMonths, accident: true };
  const pick = (k) => {
    const o = overrides[k];
    if (o === '가입') return true;
    if (o === '제외') return false;
    return auto[k];
  };
  return {
    pension: pick('pension'),
    health: pick('health'),
    employment: pick('employment'),
    accident: overrides.accident === '제외' ? false : true,
    weeklyHoliday: over15,
    severance: over15,
  };
}

/** 국민연금 기준소득월액: 천 원 미만 절사 후 하한·상한 적용 */
export function pensionBase(gross, rates = rateValues()) {
  const b = Math.floor(gross / 1000) * 1000;
  return Math.min(Math.max(b, rates.pensionBaseFloor), rates.pensionBaseCeiling);
}

/**
 * 4대보험료 (월).
 * 끝수: 각 보험료를 부담자별로 계산하고 10원 미만 버림(floor10).
 * - 연금 = 기준소득월액 × 5.0% (기준소득월액이 천 원 단위라 끝수가 생기지 않음)
 * - 건강 = 보수월액 × 3.595%, 10원 미만 버림, 월 보험료 하한·상한(노사 합계 ÷ 2)으로 제한
 * - 장기요양 = 건강보험료 × ROUND(장기요양 0.9994% ÷ 건강 7.19%, 소수 넷째 자리) = 건강보험료 × 13.90%, 10원 미만 버림
 *   (2026-11 보험료부터 비율을 소수점 다섯째 자리에서 반올림. 4대사회보험 정보연계센터 공지 2026-11-12
 *    https://www.4insure.or.kr/pbiz/ntcn/selectInstNtcMttrDetail.do?pstSn=2056025)
 * - 고용 근로자 = 보수 × 실업급여율 / 사업주 = 보수 × (실업급여율 + 고용안정 0.25%)
 * - 산재 = 보수 × 업종 요율 (사업주)
 * 보수(gross)는 비과세 없이 월 지급총액 전체로 본다. 지급총액이 0이면 모두 0.
 *
 * settings: { employmentRate (0.009|0.01), accidentRate, rates? }
 */
export function socialInsurance(gross, elig, { employmentRate, accidentRate = 0, rates = rateValues() } = {}) {
  const r = rates;
  const empRate = employmentRate ?? r.employmentCurrent;
  const zeroEe = { pension: 0, health: 0, ltc: 0, employment: 0, total: 0 };
  const zeroEr = { pension: 0, health: 0, ltc: 0, employment: 0, accident: 0, total: 0 };
  if (!(gross > 0)) return { employee: zeroEe, employer: zeroEr, pensionBase: 0 };

  const base = pensionBase(gross, r);
  const clampHealth = (x) => Math.min(Math.max(x, r.healthPremiumMinTotal / 2), r.healthPremiumMaxTotal / 2);
  const health = (rate) => clampHealth(floor10(gross * rate));
  const ltcRatio = Math.round((r.ltcIncomeRate / r.healthTotal) * 10000) / 10000;
  const ltc = (h) => floor10(h * ltcRatio);

  const ee = {
    pension: elig.pension ? floor10(base * r.pensionEmployee) : 0,
    health: elig.health ? health(r.healthEmployee) : 0,
    employment: elig.employment ? floor10(gross * empRate) : 0,
  };
  ee.ltc = ltc(ee.health);
  ee.total = ee.pension + ee.health + ee.ltc + ee.employment;

  const er = {
    pension: elig.pension ? floor10(base * r.pensionEmployer) : 0,
    health: elig.health ? health(r.healthEmployer) : 0,
    employment: elig.employment ? floor10(gross * (empRate + r.employmentStability)) : 0,
    accident: elig.accident ? floor10(gross * accidentRate) : 0,
  };
  er.ltc = ltc(er.health);
  er.total = er.pension + er.health + er.ltc + er.employment + er.accident;
  return { employee: ee, employer: er, pensionBase: elig.pension ? base : 0 };
}

/** 지방소득세 = 소득세 × 10%, 10원 미만 버림 */
export function localIncomeTax(incomeTax, rates = rateValues()) {
  return incomeTax > 0 ? floor10(incomeTax * rates.localIncomeTax) : 0;
}

// ---------------------------------------------------------------------------
// 5. 일용근로자 원천징수 (rules-2027.md 5장, 엔진 전용)
// ---------------------------------------------------------------------------

/**
 * 1일 세액 = (일급 − 150,000) × 6% × (1 − 55%)
 * 지급 건 세액 = 1일 세액 × 일수 → 10원 미만 버림 → 1,000원 미만이면 0(소액부징수, 지급 건 단위)
 * 지방소득세 = 소득세 × 10%, 10원 미만 버림 (소득세를 떼지 않으면 0)
 */
export function dailyWorkerWithholding({ dailyWage, days = 1, rates = rateValues() }) {
  const perDay = Math.max(0, (dailyWage - rates.dailyWorkerDeduction) * rates.dailyWorkerTaxRate * (1 - rates.dailyWorkerTaxCredit));
  let incomeTax = floor10(perDay * days);
  if (incomeTax < rates.smallAmountExemption) incomeTax = 0;
  return { perDay: round6(perDay), incomeTax, localTax: localIncomeTax(incomeTax, rates) };
}

// ---------------------------------------------------------------------------
// 6. 퇴직금 (rules-2027.md 6장)
// ---------------------------------------------------------------------------

/**
 * 퇴직금 추정 = 1일 평균임금 × 30 × (재직일수 ÷ 365), 원 단위 반올림.
 * 1일 평균임금 = 퇴직 전 3개월 임금 총액 ÷ 그 기간 총 일수 (근로기준법 제2조①6)
 * 요건: 계속근로 1년 이상 + 4주 평균 주 15h 이상 (퇴직급여법 제4조①)
 */
export function severanceEstimate({ wagesLast3Months, daysLast3Months, serviceDays, weeklyHours = 40 }) {
  const avgDailyWage = wagesLast3Months / daysLast3Months;
  const eligible = serviceDays >= 365 && weeklyHours >= LIMITS.weeklyThresholdHours;
  const amount = eligible ? roundWon((avgDailyWage * 30 * serviceDays) / 365) : 0;
  return { eligible, avgDailyWage, amount };
}

/** 월 퇴직금 적립 참고값 = 월 지급총액 ÷ 12 (근사, 원 단위 반올림) */
export function monthlySeveranceAccrual(gross) {
  return roundWon(gross / 12);
}

// ---------------------------------------------------------------------------
// 7. 월 급여대장 (엑셀 `월급여` 시트와 같은 결과) + 사장님 월 인건비
// ---------------------------------------------------------------------------

/**
 * 사장님 월 인건비 (rules-2027.md 7장)
 * = 월 지급총액 + 사업주 부담(연금·건강·장기요양·고용·산재) [+ 참고: 퇴직금 적립 1/12]
 */
export function ownerCostForGross(gross, elig, settings) {
  const ins = socialInsurance(gross, elig, settings);
  const accrual = elig.severance ? monthlySeveranceAccrual(gross) : 0;
  return { gross, employer: ins.employer, ownerCost: gross + ins.employer.total, accrual, withAccrual: gross + ins.employer.total + accrual };
}

/**
 * 한 달 급여대장.
 * input = {
 *   month: 'YYYY-MM',
 *   settings: { scale:'5인 미만'|'5인 이상', shopDays:5|6, employmentRate, accidentRate, rates? },
 *   employees: [{ name, wage, weeklyHours, daysPerWeek?, hireDate?, irregular?, overrides?, otherAllowance?, incomeTax? }],
 *   records:   [{ name, date:'YYYY-MM-DD', start, end, breakMin?, breakStart?, holiday?, absent? }],
 * }
 * 귀속 규칙 (엑셀과 같음):
 * - 하루 단위(기본급·야간·휴일·1일 8h 초과)는 날짜가 그 달인 기록
 * - 주 단위(주휴·주 40h 초과·단시간 초과)는 "일요일이 그 달에 있는 주(월~일)". 주의 앞 며칠이
 *   지난달이어도 그 주 전체 기록을 본다. 그 주에 기록(결근 포함)이 하나도 없으면 주휴 0.
 */
export function monthlyPayroll({ month, settings, employees, records }) {
  const rates = settings.rates ?? rateValues();
  const five = isFivePlus(settings.scale);
  const shopDays = settings.shopDays ?? 5;
  const { start, end } = monthBounds(month);
  const monthEndStr = fromDayNumber(end);
  const firstSun = start + ((7 - weekdayMon1(start)) % 7);
  const sundays = [];
  for (let s = firstSun; s <= end; s += 7) sundays.push(s);

  const rows = employees.map((e) => {
    const recs = records.filter((r) => r.name === e.name);
    const inMonth = recs.filter((r) => { const d = dayNumber(r.date); return d >= start && d <= end; });
    const sum = (k) => inMonth.reduce((s, r) => s + dayMetrics(r)[k], 0);
    const workedMin = sum('workedMin');
    const nightMin = sum('nightMin');
    const holidayMin = sum('holidayMin');
    const holidayOver8Min = sum('holidayOver8Min');
    const dailyOTMin = sum('dailyOTMin');

    let weeklyOTMin = 0; let shortExcessMin = 0; let weeklyHolidayMin = 0;
    for (const sun of sundays) {
      const wk = recs.filter((r) => { const d = dayNumber(r.date); return d >= sun - 6 && d <= sun; });
      const w = weekSummary(wk, { weeklyHours: e.weeklyHours, shopDays, irregular: !!e.irregular });
      weeklyOTMin += w.weeklyOTMin;
      shortExcessMin += w.shortExcessMin;
      weeklyHolidayMin += w.weeklyHolidayMin;
    }

    const wage = e.wage;
    const basePay = roundWon((workedMin * wage) / 60);
    const weeklyHolidayPay = roundWon((weeklyHolidayMin * wage) / 60);
    const p = premiums({ overtimeMin: dailyOTMin + weeklyOTMin + shortExcessMin, nightMin, holidayMin, holidayOver8Min }, wage, five ? '5plus' : 'under5');
    const otherAllowance = e.otherAllowance || 0;
    const gross = basePay + weeklyHolidayPay + p.overtime + p.night + p.holiday + otherAllowance;

    const elig = eligibility({ weeklyHours: e.weeklyHours, hireDate: e.hireDate || null, monthEnd: monthEndStr, overrides: e.overrides || {} });
    const ins = socialInsurance(gross, elig, { employmentRate: settings.employmentRate, accidentRate: settings.accidentRate || 0, rates });
    const incomeTax = e.incomeTax || 0;
    const localTax = localIncomeTax(incomeTax, rates);
    const deductions = ins.employee.total + incomeTax + localTax;
    const accrual = elig.severance ? monthlySeveranceAccrual(gross) : 0;
    const ownerCost = gross + ins.employer.total;
    return {
      name: e.name, wage,
      workedMin, nightMin, holidayMin, holidayOver8Min, dailyOTMin, weeklyOTMin, shortExcessMin, weeklyHolidayMin,
      basePay, weeklyHolidayPay,
      overtimePremium: p.overtime, nightPremium: p.night, holidayPremium: p.holiday,
      otherAllowance, gross, eligibility: elig,
      employee: ins.employee, incomeTax, localTax, deductions, netPay: gross - deductions,
      employer: ins.employer, ownerCost, severanceAccrual: accrual, ownerCostWithAccrual: ownerCost + accrual,
    };
  });

  const total = {};
  const keys = ['workedMin', 'weeklyHolidayMin', 'basePay', 'weeklyHolidayPay', 'overtimePremium', 'nightPremium', 'holidayPremium',
    'otherAllowance', 'gross', 'incomeTax', 'localTax', 'deductions', 'netPay', 'ownerCost', 'severanceAccrual', 'ownerCostWithAccrual'];
  for (const k of keys) total[k] = rows.reduce((s, r) => s + r[k], 0);
  total.employee = {}; total.employer = {};
  for (const k of ['pension', 'health', 'ltc', 'employment', 'total']) total.employee[k] = rows.reduce((s, r) => s + r.employee[k], 0);
  for (const k of ['pension', 'health', 'ltc', 'employment', 'accident', 'total']) total.employer[k] = rows.reduce((s, r) => s + r.employer[k], 0);
  return { month, rows, total, ownerMonthlyCost: total.ownerCost, ownerMonthlyCostWithAccrual: total.ownerCostWithAccrual };
}
