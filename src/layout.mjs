// 페이지 셸. 모든 페이지가 같은 헤더·검색·푸터를 공유한다.
export const V = Date.now().toString(36); // 자산 캐시 무효화
export const SITE = { name: "날셈", url: "https://nalsem.unitblack.kr", tagline: "나이·날짜·음력 생활계산기" };

// 아이콘: Iconify Solar 세트만 사용
const ICON = {
  search: '<iconify-icon icon="solar:magnifier-linear"></iconify-icon>',
  theme: '<iconify-icon icon="solar:sun-linear" id="theme-icon"></iconify-icon>',
};
export const ARROW = '<span class="ico" aria-hidden="true"><iconify-icon icon="solar:arrow-right-linear"></iconify-icon></span>';

export const BUILD_DATE = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST 기준
export function shell({ title, description, path, body, script = "", nav = "", jsonld = null, keywords = [] }) {
  const fullTitle = path === "/" ? `${SITE.name}: ${SITE.tagline}` : `${title} | ${SITE.name}`;
  const ld = Array.isArray(jsonld) ? jsonld : jsonld ? [jsonld] : [];
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(", "))}">` : ""}
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="author" content="${SITE.name}">
<link rel="canonical" href="${SITE.url}${path}">
<link rel="alternate" hreflang="ko" href="${SITE.url}${path}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE.url}${path}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:image" content="${SITE.url}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${SITE.name}: ${SITE.tagline}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE.url}/assets/og.png">
<meta name="theme-color" content="#e6f0fb">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preconnect" href="https://code.iconify.design" crossorigin>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css?v=${V}">
<script>try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.dataset.theme="dark";}catch(e){}</script>
<script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js" defer></script>
${ld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
<div class="orbs" aria-hidden="true"><div class="orb orb-1"></div><div class="orb orb-2"></div></div>
<div class="noise" aria-hidden="true"></div>
<header class="hdr">
  <div class="pill">
    <a class="brand" href="/" aria-label="${SITE.name} 홈"><span class="brand-mark" aria-hidden="true">날</span>${SITE.name}</a>
    <nav class="nav" aria-label="카테고리">
      <a href="/#age" ${nav === "age" ? 'aria-current="page"' : ""}>나이·띠</a>
      <a href="/#date" ${nav === "date" ? 'aria-current="page"' : ""}>날짜·음력</a>
    </nav>
    <div class="hdr-right">
      <button class="icon-btn" id="open-search" type="button" aria-label="계산기 검색 (/)">${ICON.search}</button>
      <button class="icon-btn" id="toggle-theme" type="button" aria-label="라이트/다크 전환">${ICON.theme}</button>
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
<script src="/assets/calc.js?v=${V}"></script>
<script src="/assets/site.js?v=${V}"></script>
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
// 설명 카드(h2 + 본문)를 FAQ 로 변환: 생성형 검색·리치 결과용
export function faqOf(c) {
  const strip = (h) => h.replace(/<\/p>/g, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const josa = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? ((c - 0xac00) % 28 ? "은" : "는") : "은(는)"; };
  const out = [];
  for (const m of c.info.matchAll(/<div class="card[^"]*"><h2>(.*?)<\/h2>([\s\S]*?)(?:<p class="src">|<\/div>)/g)) {
    const q = strip(m[1]), a = strip(m[2]);
    if (q && a.length > 20) out.push({ q: /[?？]$/.test(q) ? q : q + josa(q) + " 무엇인가요?", a });
  }
  return out;
}
export function calcPage(c, all) {
  const cat = CATS[c.cat];
  const related = (c.related || []).map((s) => all.find((x) => x.slug === s)).filter(Boolean);
  return `<article class="page wrap">
  <nav class="crumb" aria-label="경로"><a href="/">홈</a><span class="sep">/</span><a href="/#${c.cat}">${cat.name}</a></nav>
  <h1>${c.title}</h1>
  <p class="lede">${c.lede}</p>
  <div class="page-grid">
    <section class="tool bz bz-in" aria-label="${c.title}">
      ${c.form}
      <div class="result" id="result" hidden></div>
    </section>
    <aside class="aside">
      <div class="card bz summary"><h2>핵심 요약</h2><p>${c.description}</p><p class="src">${SITE.name} · 기준일 ${BUILD_DATE} 빌드 · 계산은 브라우저에서 실시간</p></div>
      ${c.info}
      ${related.length ? `<div class="card bz"><h2>함께 보기</h2><div class="related">${related.map((r) => `<a href="/${r.slug}/">${r.title}<iconify-icon icon="solar:arrow-right-linear"></iconify-icon></a>`).join("")}</div></div>` : ""}
    </aside>
  </div>
</article>`;
}

export const CATS = {
  age: { name: "나이·띠·사람", id: "age" },
  date: { name: "날짜·음력", id: "date" },
};
