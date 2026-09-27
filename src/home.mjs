import { ymd, CATS } from "./layout.mjs";

export function home(all) {
  const by = (cat) => all.filter((c) => c.cat === cat);
  const find = (s) => all.find((c) => c.slug === s);
  const tile = (slug, cls = "", live = "") => { const c = find(slug); return `<a class="tile bz rv ${cls}" href="/${c.slug}/"><div class="t">${c.title}</div><p class="sub">${c.short}</p>${live ? `<div class="live" id="${live}">&nbsp;</div>` : ""}</a>`; };
  const row = (slug, live = "") => { const c = find(slug); return `<a class="rv" href="/${c.slug}/"><div><div class="t">${c.title}</div><p class="sub">${c.short}</p></div>${live ? `<span class="live" id="${live}"></span>` : ""}</a>`; };
  // 생년월일과 연동되는 카드: 제목 + 결과 한 줄. 링크는 ?d= 를 달고 이동
  const lk = (slug, label) => { const c = find(slug); return `<a class="lk bz rv" href="/${c.slug}/" data-slug="${c.slug}"><div class="k">${label || c.title}<iconify-icon icon="solar:arrow-right-linear"></iconify-icon></div><div class="v" data-v="${c.slug}">생년월일을 입력하면 표시</div><div class="s" data-s="${c.slug}"></div></a>`; };
  const linked = ["age", "man-age", "birthyear-zodiac", "zodiac-gap", "adult", "school", "samjae", "indian-name", "joseon-name"];
  const tables = ["age-table", "age-terms", "zodiac-age", "birthyear-age", "student-age", "today"];
  const dateRows = ["d-day", "solar-to-lunar", "lunar-to-solar", "lunar-yearly", "today-lunar", "anniversary", "date-add", "date-diff", "suneung", "holidays", "son-eomneun-nal", "baby-100"];

  return `<section class="hero wrap">
  <div class="hero-grid">
    <div>
      <span class="eyebrow rise"><iconify-icon icon="solar:calendar-linear"></iconify-icon> 생활계산기 ${all.length}종</span>
      <h1 class="rise d1">나이도 날짜도 음력도<br>한 번에 <em>셈하기</em></h1>
      <p class="lede rise d2">만나이부터 디데이, 양력 음력 변환까지. 생년월일 하나로 오늘 필요한 숫자를 바로 봅니다.</p>
      <form class="quick rise d3" id="quick" autocomplete="off">
        ${ymd("qb", "생년월일", "입력하면 아래 나이·띠·사람 항목 전부가 함께 계산됩니다")}
        <div class="result" id="quick-result" hidden></div>
      </form>
    </div>
    <div class="today-panel bz bz-in rise d3" aria-label="오늘">
      <p class="lbl">오늘</p>
      <p class="big" id="t-solar"></p>
      <div class="row"><span>음력</span><b id="t-lunar"></b></div>
      <div class="row"><span>간지</span><b id="t-ganji"></b></div>
      <div class="row"><span>올해</span><b id="t-doy"></b></div>
      <div class="row"><span>다음 공휴일</span><b id="t-hol"></b></div>
      <div class="row"><span>손없는 날</span><b id="t-son"></b></div>
    </div>
  </div>
</section>

<section class="section wrap" id="age">
  <div class="section-head rv"><h2>${CATS.age.name}</h2><span class="count">${by("age").length}개</span></div>

  <h3 class="sub-head rv">내 생년월일로 보기 <span class="who" id="who"></span></h3>
  <div class="lks">
    ${linked.map((s) => lk(s)).join("\n    ")}
    <div class="lk bz rv lk-form" data-slug="zodiac-match">
      <div class="k"><a href="/zodiac-match/">띠궁합<iconify-icon icon="solar:arrow-right-linear"></iconify-icon></a></div>
      <div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="년"><input id="zm-y" type="text" inputmode="numeric" maxlength="4" placeholder="상대 출생연도" autocomplete="off" aria-label="상대 출생연도"></div></div>
      <div class="v" data-v="zodiac-match">상대 출생연도를 입력하면 표시</div><div class="s" data-s="zodiac-match"></div>
    </div>
  </div>

  <h3 class="sub-head rv">표로 보기</h3>
  <div class="rows rows-3">
    ${tables.map((s) => row(s)).join("\n    ")}
  </div>
</section>

<section class="section wrap" id="date">
  <div class="section-head rv"><h2>${CATS.date.name}</h2><span class="count">${by("date").length}개</span></div>
  <div class="rows">
    ${row("d-day")}
    ${row("solar-to-lunar", "l-lunar")}
    ${row("suneung", "l-suneung")}
    ${row("holidays", "l-hol")}
    ${dateRows.filter((s) => !["d-day", "solar-to-lunar", "suneung", "holidays"].includes(s)).map((s) => row(s)).join("\n    ")}
  </div>
</section>
`;
}

home.script = (all) => `
const t = N.today(), y = N.Y(t);
const L = N.toLunar(t);
const $ = (id) => document.getElementById(id);
$("t-solar").textContent = N.fmt(t);
$("t-lunar").textContent = L ? \`\${L.year}년 \${L.leap ? "윤" : ""}\${L.month}월 \${L.day}일\` : "범위 밖";
$("t-ganji").textContent = L ? \`\${L.gapja.year} \${L.gapja.month} \${L.gapja.day}\` : "";
const doy = N.dayOfYear(t), total = N.isLeap(y) ? 366 : 365;
$("t-doy").textContent = \`\${doy}일째, \${total - doy}일 남음\`;
const next = N.holidays(y).concat(N.holidays(y + 1)).find((h) => h.date > t);
$("t-hol").textContent = next ? \`\${N.fmtShort(next.date)} \${next.name}\` : "";
$("t-son").textContent = L ? (N.isSonEomneun(L.day) ? "오늘이 손없는 날" : "아님") : "";
$("l-lunar").textContent = L ? \`오늘 음력 \${L.month}.\${L.day}\` : "";
const sd = N.diffDays(t, N.suneung(y + 1).date);
$("l-suneung").textContent = sd >= 0 ? \`D-\${sd}\` : "";
$("l-hol").textContent = next ? \`다음 \${N.fmtShort(next.date)}\` : "";

// 생년월일 연동: 아래 카드 전부 갱신
const q = $("qb"), get = N.ymdInputs(q), out = $("quick-result"), zm = $("zm-y");
const V = (s, v, sub) => { const a = document.querySelector('[data-v="' + s + '"]'), b = document.querySelector('[data-s="' + s + '"]'); a.textContent = v; b.textContent = sub || ""; a.parentElement.classList.toggle("on", !!v && !/입력하면/.test(v)); };
const at = (b, n) => { const yy = N.Y(b) + n; return (N.M(b) === 2 && N.D(b) === 29 && !N.isLeap(yy)) ? N.mk(yy, 3, 1) : N.mk(yy, N.M(b), N.D(b)); };
const dd = (d) => { const n = N.diffDays(t, d); return n === 0 ? "오늘" : n > 0 ? "D-" + n : "지남"; };
let cur = null;
function match() {
  const yb = parseInt(zm.value, 10);
  if (!cur || !(yb > 0)) { V("zodiac-match", cur ? "상대 출생연도를 입력하면 표시" : "생년월일을 먼저 입력해 주세요"); return; }
  const ja = N.jijiIndexOf(N.Y(cur)), jb = N.jijiIndexOf(yb), m = N.zodiacMatch(ja, jb), gb = N.ganjiOf(yb);
  V("zodiac-match", m.label + " · " + m.grade, N.ganjiOf(N.Y(cur)).animal + "띠와 " + gb.animal + "띠(" + yb + "년생), " + Math.abs(N.Y(cur) - yb) + "살 차이");
  document.querySelector('[data-slug="zodiac-match"] a').href = "/zodiac-match/?a=" + N.Y(cur) + "&b=" + yb;
}
function run() {
  const b = get();
  if (!b) { cur = null; out.hidden = true; $("who").textContent = ""; document.querySelectorAll(".lk[data-v], .lk .v").forEach(() => {}); ["age","man-age","birthyear-zodiac","zodiac-gap","adult","school","samjae","indian-name","joseon-name"].forEach((s) => V(s, "생년월일을 입력하면 표시")); document.querySelectorAll("a.lk").forEach((a) => a.href = "/" + a.dataset.slug + "/"); match(); return; }
  if (b > t) { N.showErr(q, "오늘 이전 날짜를 입력해 주세요"); out.hidden = true; return; }
  N.showErr(q, ""); cur = b;
  const by = N.Y(b), a = N.ages(b, t), nb = N.nextBirthday(b, t), g = N.ganjiOf(by), s = N.samjae(N.jijiIndexOf(by), y), sc = N.school(by), I = N.INDIAN, J = N.JOSEON;
  $("who").textContent = N.fmt(b, false) + "생";
  out.innerHTML = \`<p class="note">만 <b>\${a.man}세</b> · 세는나이 <b>\${a.korean}살</b> · \${g.color} \${g.animal}띠. 아래 항목이 이 날짜로 계산됐습니다.</p>\`; N.bump(out);
  V("age", \`만 \${a.man}세 · 세는 \${a.korean}살 · 연 \${a.yearAge}세\`, \`살아온 날 \${N.comma(a.full.days)}일, 다음 생일 \${dd(nb.date)}\`);
  V("man-age", \`\${a.man}세 \${a.full.m}개월 \${a.full.d}일\`, \`올해 생일 \${N.mk(y, N.M(b), N.D(b)) <= t ? "지남" : "아직"}\`);
  V("birthyear-zodiac", \`\${g.color} \${g.animal}띠\`, \`\${g.name}년 · 태어난 요일 \${N.WEEK[N.W(b)]}요일\`);
  V("zodiac-gap", [by - 24, by - 12, by + 12, by + 24].filter((v) => v <= y).join(" · ") + "년생", "12살 터울 같은 띠");
  V("adult", a.man >= 19 ? "성년" : "미성년", a.man >= 19 ? \`만 19세 \${N.fmt(at(b, 19), false)}\` : \`민법 성년 \${N.fmt(at(b, 19), false)} (\${dd(at(b, 19))})\`);
  V("school", \`\${String(sc.univIn).slice(2)}학번\`, \`초등 \${sc.elemIn} · 중 \${sc.midIn} · 고 \${sc.highIn} · 대학 \${sc.univIn}년 입학\`);
  V("samjae", s.active ? \`올해 \${s.phase}\` : "올해 삼재 아님", s.active ? s.years.join(" · ") : \`다음 삼재 \${s.nextStart}년부터\`);
  V("indian-name", \`\${I.y[by % 10]} \${I.m[N.M(b) - 1]}\${I.d[N.D(b) - 1]}\`, "연도 끝자리 · 월 · 일 조합");
  V("joseon-name", \`김\${J.m[N.M(b) - 1]}\${J.d[N.D(b) - 1]}\`, "성은 페이지에서 바꿀 수 있습니다");
  document.querySelectorAll("a.lk").forEach((el) => { const sl = el.dataset.slug; el.href = "/" + sl + "/?" + (["birthyear-zodiac", "zodiac-gap", "samjae", "school"].includes(sl) ? "y=" + by : sl === "zodiac-gap" ? "a=" + by : "d=" + N.iso(b)) + (sl === "zodiac-gap" ? "" : ""); });
  document.querySelector('a.lk[data-slug="zodiac-gap"]').href = "/zodiac-gap/?a=" + by;
  try { localStorage.setItem("birth", N.iso(b)); } catch (e) {}
  match();
}
q.addEventListener("input", run);
zm.addEventListener("input", match);
$("quick").addEventListener("submit", (e) => { e.preventDefault(); run(); });
try { const sv = localStorage.getItem("birth"), d = sv && N.parseISO(sv); if (d) { N.setYMD(q, d); } } catch (e) {}
run();
`;
