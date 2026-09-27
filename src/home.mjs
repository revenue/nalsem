import { ymd, CATS } from "./layout.mjs";

export function home(all) {
  const by = (cat) => all.filter((c) => c.cat === cat);
  const find = (s) => all.find((c) => c.slug === s);
  const tile = (slug, cls = "", live = "") => { const c = find(slug); return `<a class="tile bz rv ${cls}" href="/${c.slug}/"><div class="t">${c.title}</div><p class="sub">${c.short}</p>${live ? `<div class="live" id="${live}">&nbsp;</div>` : ""}</a>`; };
  const row = (slug, live = "") => { const c = find(slug); return `<a class="rv" href="/${c.slug}/"><div><div class="t">${c.title}</div><p class="sub">${c.short}</p></div>${live ? `<span class="live" id="${live}"></span>` : ""}</a>`; };
  const ageTiles = ["age", "man-age", "zodiac-age", "zodiac-match", "samjae", "age-table", "age-terms", "birthyear-zodiac", "birthyear-age", "zodiac-gap", "adult", "school", "student-age", "today", "indian-name", "joseon-name"];
  const dateRows = ["d-day", "solar-to-lunar", "lunar-to-solar", "lunar-yearly", "today-lunar", "anniversary", "date-add", "date-diff", "suneung", "holidays", "son-eomneun-nal", "baby-100"];

  return `<section class="hero wrap">
  <div class="hero-grid">
    <div>
      <span class="eyebrow rise"><iconify-icon icon="solar:calendar-linear"></iconify-icon> 생활계산기 ${all.length}종</span>
      <h1 class="rise d1">나이도 날짜도 음력도<br>한 번에 <em>셈하기</em></h1>
      <p class="lede rise d2">만나이부터 디데이, 양력 음력 변환까지. 생년월일 하나로 오늘 필요한 숫자를 바로 봅니다.</p>
      <form class="quick rise d3" id="quick" autocomplete="off">
        ${ymd("qb", "생년월일", "숫자만 입력하면 바로 계산됩니다")}
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
  <div class="tiles">
    ${tile("age", "wide featured", "l-age")}
    ${tile("zodiac-age", "accent", "l-zodiac")}
    ${tile("man-age")}
    ${tile("zodiac-match")}
    ${tile("samjae", "soft", "l-samjae")}
    ${tile("age-table", "half")}
    ${tile("age-terms", "half")}
    ${ageTiles.slice(7).map((s) => tile(s)).join("\n    ")}
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

<section class="section wrap" id="stats">
  <div class="section-head rv"><h2>${CATS.stats.name}</h2><span class="count">${by("stats").length}개</span></div>
  <div class="duo">
    ${tile("population", "", "l-pop")}
    ${tile("average-age", "", "l-avg")}
  </div>
</section>`;
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
const gj = N.ganjiOf(y);
$("l-age").textContent = \`\${y}년생은 0세, 세는나이 1살\`;
$("l-zodiac").textContent = \`\${y}년은 \${gj.color} \${gj.animal}띠 해\`;
const sj = N.samjae(0, y); // 대표: 신자진 그룹 표시 대신 올해 삼재 띠 안내
const groups = [[8,0,4],[5,9,1],[2,6,10],[11,3,7]].find((g) => N.samjae(g[0], y).active);
$("l-samjae").textContent = groups ? \`올해 삼재: \${groups.map((j) => N.ZODIAC_BY_JIJI[j]).join("·")}띠\` : "";
$("l-lunar").textContent = L ? \`오늘 음력 \${L.month}.\${L.day}\` : "";
const su = N.suneung(y + 1);
const sd = N.diffDays(t, su.date);
$("l-suneung").textContent = sd >= 0 ? \`D-\${sd}\` : "";
$("l-hol").textContent = next ? \`다음 \${N.fmtShort(next.date)}\` : "";
$("l-pop").textContent = "5,108만 명";
$("l-avg").textContent = "46.2세";

// 즉석 나이 계산
const q = $("qb"), get = N.ymdInputs(q), out = $("quick-result");
function run() {
  const b = get();
  if (!b) { out.hidden = true; return; }
  if (b > t) { N.showErr(q, "오늘 이전 날짜를 입력해 주세요"); out.hidden = true; return; }
  N.showErr(q, "");
  const a = N.ages(b, t), nb = N.nextBirthday(b, t), z = N.ganjiOf(N.Y(b));
  out.innerHTML = \`<div class="stats cols-3">
    <div class="stat"><div class="k">만나이</div><div class="v">\${a.man}<small>세</small></div></div>
    <div class="stat"><div class="k">세는나이</div><div class="v">\${a.korean}<small>살</small></div></div>
    <div class="stat"><div class="k">띠</div><div class="v">\${z.animal}</div></div>
  </div>
  <p class="note">다음 생일 \${N.fmtShort(nb.date)}까지 <b>\${nb.days}일</b>, 살아온 날 <b>\${N.comma(a.full.days)}일</b>. <a href="/age/?d=\${N.iso(b)}" style="text-decoration:underline;text-underline-offset:3px">자세히 보기</a></p>\`;
  N.bump(out);
}
q.addEventListener("input", run);
document.getElementById("quick").addEventListener("submit", (e) => { e.preventDefault(); run(); });
`;
