// 페이지 셸. 모든 페이지가 같은 헤더·검색·푸터를 공유한다.
export const SITE = { name: "날셈", url: "https://nalsem.app", tagline: "나이·날짜·음력 생활계산기" };

const ICON = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.4A5.5 5.5 0 0 1 13.4 3.1C13 3 12.5 3 12 3z"/></svg>',
};

export function shell({ title, description, path, body, script = "", nav = "", jsonld = null }) {
  const fullTitle = path === "/" ? `${SITE.name}: ${SITE.tagline}` : `${title} | ${SITE.name}`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE.url}${path}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE.url}${path}">
<meta property="og:site_name" content="${SITE.name}">
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f0f11" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head>
<body>
<header class="hdr">
  <div class="wrap">
    <a class="brand" href="/" aria-label="${SITE.name} 홈"><span class="brand-mark" aria-hidden="true">날</span>${SITE.name}</a>
    <nav class="nav" aria-label="카테고리">
      <a href="/#age" ${nav === "age" ? 'aria-current="page"' : ""}>나이·띠</a>
      <a href="/#date" ${nav === "date" ? 'aria-current="page"' : ""}>날짜·음력</a>
      <a href="/#stats" ${nav === "stats" ? 'aria-current="page"' : ""}>통계</a>
    </nav>
    <div class="hdr-right">
      <button class="icon-btn" id="open-search" type="button" aria-label="계산기 검색 (/)">${ICON.search}</button>
      <button class="icon-btn" id="toggle-theme" type="button" aria-label="다크 모드 전환">${ICON.theme}</button>
    </div>
  </div>
</header>
<dialog class="search-dlg" id="search">
  <form class="search-box" method="dialog">
    <input id="search-input" type="search" placeholder="계산기 이름으로 찾기" autocomplete="off" aria-label="계산기 검색">
    <div class="search-list" id="search-list"></div>
  </form>
</dialog>
<main>
${body}
</main>
<footer class="ftr">
  <div class="wrap">
    <p>음력 변환은 한국천문연구원 음양력 자료를 따르는 <a href="https://github.com/usingsky/korean_lunar_calendar_js" rel="noopener">korean-lunar-calendar</a>(MIT)를 사용합니다. 띠궁합·삼재·손없는 날은 민속 참고 자료이며, 법률·행정 판단은 관련 기관에서 확인하세요.</p>
    <p>© ${new Date().getFullYear()} ${SITE.name}. 모든 계산은 브라우저 안에서 처리되며 입력값은 서버로 전송되지 않습니다.</p>
  </div>
</footer>
<script src="/assets/vendor/korean-lunar-calendar.min.js"></script>
<script src="/assets/calc.js"></script>
<script src="/assets/site.js"></script>
${script ? `<script>(function(){"use strict";\n${script}\n})();</script>` : ""}
</body>
</html>`;
}

export function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// 년·월·일 입력 그룹
export function ymd(id, label, help = "", { year = "", month = "", day = "" } = {}) {
  return `<div class="field" id="${id}">
  <label for="${id}-y">${label}</label>
  <div class="ymd">
    <div class="unit" data-unit="년"><input id="${id}-y" type="text" inputmode="numeric" pattern="\\d*" maxlength="4" data-len="4" placeholder="1990" value="${year}" autocomplete="off"></div>
    <div class="unit" data-unit="월"><input id="${id}-m" type="text" inputmode="numeric" pattern="\\d*" maxlength="2" data-len="2" placeholder="5" value="${month}" autocomplete="off" aria-label="${label} 월"></div>
    <div class="unit" data-unit="일"><input id="${id}-d" type="text" inputmode="numeric" pattern="\\d*" maxlength="2" data-len="2" placeholder="3" value="${day}" autocomplete="off" aria-label="${label} 일"></div>
  </div>
  ${help ? `<p class="help">${help}</p>` : ""}
  <p class="err" role="alert"></p>
</div>`;
}

export function yearField(id, label, help = "") {
  return `<div class="field" id="${id}">
  <label for="${id}-y">${label}</label>
  <div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="년"><input id="${id}-y" type="text" inputmode="numeric" pattern="\\d*" maxlength="4" placeholder="1990" autocomplete="off"></div></div>
  ${help ? `<p class="help">${help}</p>` : ""}
  <p class="err" role="alert"></p>
</div>`;
}

// 계산기 페이지 본문
export function calcPage(c, all) {
  const cat = CATS[c.cat];
  const related = (c.related || []).map((s) => all.find((x) => x.slug === s)).filter(Boolean);
  return `<div class="page wrap">
  <nav class="crumb" aria-label="경로"><a href="/">홈</a><span class="sep">/</span><a href="/#${c.cat}">${cat.name}</a></nav>
  <h1>${c.title}</h1>
  <p class="lede">${c.lede}</p>
  <div class="page-grid">
    <section class="tool" aria-label="${c.title}">
      ${c.form}
      <div class="result" id="result" hidden></div>
    </section>
    <aside class="aside">
      ${c.info}
      ${related.length ? `<div class="card"><h2>함께 보기</h2><div class="related">${related.map((r) => `<a href="/${r.slug}/">${r.title}</a>`).join("")}</div></div>` : ""}
    </aside>
  </div>
</div>`;
}

export const CATS = {
  age: { name: "나이·띠·사람", id: "age" },
  date: { name: "날짜·음력", id: "date" },
  stats: { name: "통계", id: "stats" },
};
