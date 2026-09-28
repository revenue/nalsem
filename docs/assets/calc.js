/* 날셈 공용 엔진. 의존: KoreanLunarCalendar (vendor, 한국천문연구원 기준 1000~2050). */
(function (global) {
  "use strict";

  const DAY = 86400000;
  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
  const ZODIAC = ["원숭이", "닭", "개", "돼지", "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양"]; // year % 12
  const ZODIAC_HANJA = ["申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未"];
  const JIJI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]; // 자=쥐 순서
  const ZODIAC_BY_JIJI = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
  const CHEONGAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const CHEONGAN_COLOR = ["푸른", "푸른", "붉은", "붉은", "노란", "노란", "흰", "흰", "검은", "검은"];

  // 날짜 유틸 (UTC 기준으로 통일해 DST·시간대 오차 제거)
  const mk = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const today = () => { const n = new Date(); return mk(n.getFullYear(), n.getMonth() + 1, n.getDate()); };
  const isValid = (y, m, d) => { if (![y, m, d].every(Number.isInteger)) return false; const t = mk(y, m, d); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
  const Y = (t) => t.getUTCFullYear(), M = (t) => t.getUTCMonth() + 1, D = (t) => t.getUTCDate(), W = (t) => t.getUTCDay();
  const addDays = (t, n) => new Date(t.getTime() + n * DAY);
  const addMonths = (t, n) => { const y = Y(t), m = M(t) - 1 + n, d = D(t); const first = new Date(Date.UTC(y, m, 1)); const last = new Date(Date.UTC(Y(first), M(first), 0)).getUTCDate(); return new Date(Date.UTC(Y(first), M(first) - 1, Math.min(d, last))); };
  const diffDays = (a, b) => Math.round((b - a) / DAY);
  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dayOfYear = (t) => diffDays(mk(Y(t), 1, 1), t) + 1;
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (t) => `${Y(t)}-${pad(M(t))}-${pad(D(t))}`;
  const fmt = (t, week = true) => `${Y(t)}년 ${M(t)}월 ${D(t)}일` + (week ? `(${WEEK[W(t)]})` : "");
  const fmtShort = (t) => `${M(t)}월 ${D(t)}일(${WEEK[W(t)]})`;
  const comma = (n) => Number(n).toLocaleString("ko-KR");
  const parseISO = (s) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s || ""); if (!m) return null; const y = +m[1], mo = +m[2], d = +m[3]; return isValid(y, mo, d) ? mk(y, mo, d) : null; };

  // 년·월·일 차이 (a <= b). 개월 계산은 "같은 날짜 도달" 기준
  function diffYMD(a, b) {
    if (b < a) return null;
    // 같은 날짜(또는 말일 보정)에 도달하는 개월 수를 세고 나머지를 일수로
    let months = (Y(b) - Y(a)) * 12 + (M(b) - M(a));
    if (addMonths(a, months) > b) months -= 1;
    const d = diffDays(addMonths(a, months), b);
    return { y: Math.floor(months / 12), m: months % 12, d, days: diffDays(a, b) };
  }

  // 나이 3종: 만나이 / 세는나이(한국나이) / 연나이
  function ages(birth, base) {
    base = base || today();
    const full = diffYMD(birth, base);
    const man = full ? full.y : null;
    const korean = Y(base) - Y(birth) + 1;
    const yearAge = Y(base) - Y(birth);
    return { man, korean, yearAge, full };
  }
  function nextBirthday(birth, base) {
    base = base || today();
    let y = Y(base);
    const bm = M(birth), bd = D(birth);
    const make = (yy) => (bm === 2 && bd === 29 && !isLeap(yy)) ? mk(yy, 2, 28) : mk(yy, bm, bd);
    let nb = make(y);
    if (nb < base) nb = make(y + 1);
    return { date: nb, days: diffDays(base, nb) };
  }

  // 띠·간지 (입춘이 아닌 양력 1월 1일 기준: 관습적 띠 표기. 주의 문구는 페이지에서)
  const zodiacOf = (year) => ZODIAC[((year % 12) + 12) % 12];
  const zodiacHanja = (year) => ZODIAC_HANJA[((year % 12) + 12) % 12];
  const jijiIndexOf = (year) => (((year - 4) % 12) + 12) % 12; // 자=0 (서기 4년 = 갑자)
  const ganjiOf = (year) => { const c = (((year - 4) % 10) + 10) % 10, j = jijiIndexOf(year); return { cheongan: CHEONGAN[c], jiji: JIJI[j], name: CHEONGAN[c] + JIJI[j], color: CHEONGAN_COLOR[c], animal: ZODIAC_BY_JIJI[j] }; };
  const yearsOfZodiac = (jijiIdx, from, to) => { const out = []; for (let y = from; y <= to; y++) if (jijiIndexOf(y) === jijiIdx) out.push(y); return out; };

  // 띠궁합 (민속 참고: 삼합·육합·충·원진·해)
  const SAMHAP = [[8, 0, 4], [5, 9, 1], [2, 6, 10], [11, 3, 7]]; // 신자진 사유축 인오술 해묘미
  const YUKHAP = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  const CHUNG = (a, b) => (a + 6) % 12 === b;
  const WONJIN = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 9, 9: 2, 3: 8, 8: 3, 4: 11, 11: 4, 5: 10, 10: 5 };
  const HAE = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
  function zodiacMatch(ja, jb) {
    if (ja === jb) return { grade: "보통", label: "같은 띠", desc: "같은 띠끼리는 성향이 비슷해 편하지만, 서로 양보가 필요하다고 봅니다." };
    if (SAMHAP.some((g) => g.includes(ja) && g.includes(jb))) return { grade: "좋음", label: "삼합", desc: "세 띠가 서로 끌어당기는 조합으로, 전통적으로 가장 잘 맞는다고 봅니다." };
    if (YUKHAP[ja] === jb) return { grade: "좋음", label: "육합", desc: "둘이 짝을 이루어 서로를 보완하는 조합으로 봅니다." };
    if (CHUNG(ja, jb)) return { grade: "주의", label: "충", desc: "정반대에 놓인 조합으로, 부딪히기 쉽다고 보는 관계입니다." };
    if (WONJIN[ja] === jb) return { grade: "주의", label: "원진", desc: "이유 없이 서로 미워하기 쉽다고 전해지는 조합입니다." };
    if (HAE[ja] === jb) return { grade: "주의", label: "해", desc: "서로를 방해하기 쉽다고 보는 조합입니다." };
    return { grade: "보통", label: "무난", desc: "특별한 합도 충도 없는 무난한 조합입니다." };
  }

  // 삼재: 띠 그룹별 삼재 3년 (들삼재·눌삼재·날삼재)
  const SAMJAE = [
    { group: [8, 0, 4], years: [2, 3, 4] },   // 신자진 -> 인묘진
    { group: [5, 9, 1], years: [11, 0, 1] },  // 사유축 -> 해자축
    { group: [2, 6, 10], years: [8, 9, 10] }, // 인오술 -> 신유술
    { group: [11, 3, 7], years: [5, 6, 7] },  // 해묘미 -> 사오미
  ];
  function samjae(jiji, year) {
    const g = SAMJAE.find((s) => s.group.includes(jiji));
    const yj = jijiIndexOf(year);
    const idx = g.years.indexOf(yj);
    const names = ["들삼재", "눌삼재", "날삼재"];
    // 다음 삼재 시작 연도
    let next = year; while (jijiIndexOf(next) !== g.years[0]) next++;
    return { active: idx >= 0, phase: idx >= 0 ? names[idx] : null, years: g.years.map((j) => ZODIAC_BY_JIJI[j] + "띠 해"), nextStart: next, jijiYears: g.years };
  }

  // 음력 (vendor 래퍼)
  function lunar() { return new global.KoreanLunarCalendar(); }
  function toLunar(t) { const c = lunar(); if (!c.setSolarDate(Y(t), M(t), D(t))) return null; const l = c.getLunarCalendar(); return { year: l.year, month: l.month, day: l.day, leap: !!l.intercalation, gapja: c.getKoreanGapja(), gapjaHanja: c.getChineseGapja() }; }
  function toSolar(y, m, d, leap) { const c = lunar(); if (!c.setLunarDate(y, m, d, !!leap)) return null; const s = c.getSolarCalendar(); return mk(s.year, s.month, s.day); }
  const LUNAR_MIN = 1000, LUNAR_MAX = 2050;

  // 공휴일 (관공서의 공휴일에 관한 규정 + 대체공휴일 규정 2021.8~, 2023.5~ 부처님오신날·성탄절 포함)
  function holidays(year) {
    const list = [];
    const push = (t, name, sub) => list.push({ date: t, name, sub: !!sub });
    push(mk(year, 1, 1), "신정");
    push(mk(year, 3, 1), "삼일절");
    push(mk(year, 5, 5), "어린이날");
    push(mk(year, 6, 6), "현충일");
    push(mk(year, 8, 15), "광복절");
    push(mk(year, 10, 3), "개천절");
    push(mk(year, 10, 9), "한글날");
    push(mk(year, 12, 25), "성탄절");
    const seol = toSolar(year, 1, 1, false), chuseok = toSolar(year, 8, 15, false), buddha = toSolar(year, 4, 8, false);
    // 설 전날은 전년도 음력 12월 말일
    if (seol) { push(addDays(seol, -1), "설날 연휴"); push(seol, "설날"); push(addDays(seol, 1), "설날 연휴"); }
    if (chuseok) { push(addDays(chuseok, -1), "추석 연휴"); push(chuseok, "추석"); push(addDays(chuseok, 1), "추석 연휴"); }
    if (buddha) push(buddha, "부처님오신날");
    list.sort((a, b) => a - b || a.date - b.date);
    const has = (t) => list.some((h) => h.date.getTime() === t.getTime());
    // 대체공휴일: 설·추석은 일요일과 겹칠 때, 나머지 지정 공휴일은 토·일과 겹칠 때 다음 첫 평일
    const SUB_SAT = ["삼일절", "어린이날", "광복절", "개천절", "한글날", "부처님오신날", "성탄절"];
    const SUB_SUN = SUB_SAT.concat(["설날", "설날 연휴", "추석", "추석 연휴"]);
    const subs = [];
    list.forEach((h) => {
      const w = W(h.date);
      const eligible = (w === 0 && SUB_SUN.includes(h.name)) || (w === 6 && SUB_SAT.includes(h.name));
      if (!eligible) return;
      let t = addDays(h.date, 1);
      while (W(t) === 0 || W(t) === 6 || has(t) || subs.some((s) => s.date.getTime() === t.getTime())) t = addDays(t, 1);
      subs.push({ date: t, name: "대체공휴일(" + h.name.replace(" 연휴", "") + ")", sub: true });
    });
    const all = list.concat(subs).sort((a, b) => a.date - b.date);
    return all;
  }

  // 손없는 날: 음력 날짜 끝자리 9·0
  const isSonEomneun = (lunarDay) => lunarDay % 10 === 9 || lunarDay % 10 === 0;

  // 수능: 2027학년도 = 2026-11-19 (교육부 발표). 이후는 11월 셋째 목요일 관행으로 추정 표시
  const SUNEUNG = { 2026: mk(2025, 11, 13), 2027: mk(2026, 11, 19) };
  function suneung(hakyear) {
    if (SUNEUNG[hakyear]) return { date: SUNEUNG[hakyear], confirmed: true };
    const y = hakyear - 1; let t = mk(y, 11, 1); while (W(t) !== 4) t = addDays(t, 1); t = addDays(t, 14);
    return { date: t, confirmed: false };
  }

  // 학교 입학·졸업 (2009년 이후 입학 기준: 만 6세가 되는 해의 다음 해 3월 입학)
  function school(birthYear) {
    const e = birthYear + 7;
    return { elemIn: e, elemOut: e + 6, midIn: e + 6, midOut: e + 9, highIn: e + 9, highOut: e + 12, univIn: e + 12, univOut: e + 16 };
  }

  // 나이 용어 (세는나이 기준 관용)
  const AGE_TERMS = [
    [1, "돌", "첫 생일"], [10, "충년(沖年)", "열 살 무렵"], [15, "지학(志學)", "학문에 뜻을 두는 나이"], [16, "과년(瓜年)", "혼기에 이른 나이(여자)"],
    [20, "약관(弱冠)", "갓을 쓰는 나이(남자)"], [30, "이립(而立)", "뜻을 세우는 나이"], [40, "불혹(不惑)", "미혹되지 않는 나이"],
    [48, "상수(桑壽)", "桑을 파자하면 48"], [50, "지천명(知天命)", "하늘의 뜻을 아는 나이"], [60, "이순(耳順)", "귀가 순해지는 나이"],
    [61, "환갑(還甲)·회갑", "만 60세, 갑자가 한 바퀴"], [62, "진갑(進甲)", "환갑 다음 해"], [66, "미수(美壽)", "美를 파자하면 66"],
    [70, "고희(古稀)·종심", "예로부터 드문 나이"], [71, "망팔(望八)", "80을 바라보는 나이"], [77, "희수(喜壽)", "喜의 초서가 七十七"],
    [80, "산수(傘壽)", "傘을 파자하면 80"], [81, "망구(望九)", "90을 바라보는 나이"], [88, "미수(米壽)", "米를 파자하면 88"],
    [90, "졸수(卒壽)", "卒의 약자가 九十"], [91, "망백(望百)", "100을 바라보는 나이"], [99, "백수(白壽)", "百에서 一을 빼면 白"],
    [100, "상수(上壽)·기이", "백 살"],
  ];

  // 인디언식 이름 (인터넷 밈 표). 출생 연도 끝자리·월·일로 조합
  const INDIAN = {
    y: ["시끄러운", "푸른", "적색", "조용한", "웅크린", "백색", "지혜로운", "용감한", "날카로운", "욕심 많은"],
    m: ["늑대", "태양", "양", "매", "황소", "불꽃", "나무", "달빛", "말", "돼지", "하늘", "바람"],
    d: ["와(과) 함께 춤을", "의 기상", "은(는) 그림자 속에", "", "", "", "의 환생", "의 죽음", "아래에서", "을(를) 보라", "이(가) 노래하다", "의 그림자", "의 일격", "에게 쫓기는 남자", "의 행진", "의 왕", "의 유령", "을(를) 죽인 자", "은(는) 맨날 잠잔다", "처럼", "의 고향", "의 전사", "은(는) 나의 친구", "의 노래", "의 정령", "의 파수꾼", "의 악마", "와(과) 같은 사나이", "을(를) 쓰러뜨린 자", "은(는) 몰라", "의 매력"],
  };
  // 조선식 이름 (자체 표): 성은 실제 성씨, 이름은 출생 월·일로 조합
  const JOSEON = {
    m: ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계", "돌", "쇠"],
    d: ["돌", "쇠", "복", "순", "이", "봉", "석", "만", "길", "동", "철", "수", "옥", "남", "녀", "덕", "삼", "월", "화", "선", "희", "성", "재", "용", "실", "분", "례", "자", "말", "종", "천"],
  };

  // 폼 헬퍼
  function ymdInputs(root) {
    const ins = root.querySelectorAll("input");
    ins.forEach((el, i) => {
      el.addEventListener("input", () => {
        const max = el.dataset.len ? +el.dataset.len : 2;
        if (el.value.length >= max && ins[i + 1]) ins[i + 1].focus();
      });
    });
    return () => {
      const [y, m, d] = [...ins].map((x) => parseInt(x.value, 10));
      return isValid(y, m, d) ? mk(y, m, d) : null;
    };
  }
  function setYMD(root, t) { const ins = root.querySelectorAll("input"); if (!t) return; ins[0].value = Y(t); ins[1].value = M(t); ins[2].value = D(t); }
  function showErr(field, msg) { field.classList.toggle("is-error", !!msg); const e = field.querySelector(".err"); if (e && msg) e.textContent = msg; }
  // GA4 이벤트. 개인정보(생년월일·입력 날짜·이름 등 입력값)는 절대 넣지 않는다: 계산기 이름·동작 종류만.
  function track(name, params) { try { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); } catch (e) {} }
  const calcName = () => location.pathname.replace(/^\/|\/$/g, "") || "home";
  let touched = false, lastCalc = 0;
  if (typeof document !== "undefined") ["input", "change", "click", "submit"].forEach((t) => document.addEventListener(t, () => { touched = true; }, true));
  // 결과가 갱신될 때 1회 집계 (자동 렌더는 제외, 연속 입력은 5초에 1번)
  function calcEvent(extra) { if (!touched) return; const now = Date.now(); if (now - lastCalc < 5000) return; lastCalc = now; track("calculate", Object.assign({ calculator: calcName() }, extra || {})); }
  function bump(el) { el.hidden = false; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); calcEvent(); }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function setQS(obj) { const p = new URLSearchParams(location.search); Object.entries(obj).forEach(([k, v]) => v == null || v === "" ? p.delete(k) : p.set(k, v)); history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "")); }
  async function share(title, text) {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title, text, url }); return "shared"; } catch (e) { return "cancel"; } }
    await navigator.clipboard.writeText(url); return "copied";
  }
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  global.N = { DAY, WEEK, ZODIAC, JIJI, ZODIAC_BY_JIJI, CHEONGAN, AGE_TERMS, INDIAN, JOSEON, LUNAR_MIN, LUNAR_MAX,
    mk, today, isValid, Y, M, D, W, addDays, addMonths, diffDays, isLeap, daysInMonth, dayOfYear, pad, iso, fmt, fmtShort, comma, parseISO,
    diffYMD, ages, nextBirthday, zodiacOf, zodiacHanja, jijiIndexOf, ganjiOf, yearsOfZodiac, zodiacMatch, samjae,
    toLunar, toSolar, holidays, isSonEomneun, suneung, school,
    ymdInputs, setYMD, showErr, bump, track, calcEvent, qs, setQS, share, el, esc };
})(window);
