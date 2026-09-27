// 정적 빌드: src/ 정의 → docs/ HTML. `npm run build`
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { shell, calcPage, faqOf, CATS, SITE, BUILD_DATE } from "./src/layout.mjs";
import { home } from "./src/home.mjs";
import { calculators } from "./src/calculators/index.mjs";

const OUT = "docs";
const all = calculators;
const index = all.map((c) => ({ slug: c.slug, title: c.title, cat: CATS[c.cat].name, keys: (c.keys || []).map((k) => k.toLowerCase()) }));
const indexScript = `window.NALSEM_INDEX=${JSON.stringify(index)};`;

// 홈
mkdirSync(OUT, { recursive: true });
const ORG = { "@type": "Organization", name: SITE.name, url: SITE.url, logo: `${SITE.url}/assets/og.png`, sameAs: ["https://github.com/revenue/nalsem"] };
writeFileSync(join(OUT, "index.html"), shell({ title: SITE.name, description: `${SITE.tagline}. 만나이·세는나이, 디데이, 양력 음력 변환, 날짜 계산, 띠와 삼재, 공휴일까지 ${all.length}가지 생활 계산을 한곳에서.`, path: "/", body: home(all), script: indexScript + home.script(all), keywords: ["생활계산기", "만나이 계산기", "디데이 계산기", "양력 음력 변환", "공휴일", "띠"],
  jsonld: [
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url, inLanguage: "ko", description: SITE.tagline, publisher: ORG },
    { "@context": "https://schema.org", "@type": "ItemList", name: `${SITE.name} 계산기 목록`, numberOfItems: all.length, itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title, url: `${SITE.url}/${c.slug}/` })) },
  ] }));

// 계산기
for (const c of all) {
  const dir = join(OUT, c.slug);
  mkdirSync(dir, { recursive: true });
  const faq = faqOf(c);
  const ld = [
    { "@context": "https://schema.org", "@type": "WebApplication", name: c.title, url: `${SITE.url}/${c.slug}/`, applicationCategory: "UtilitiesApplication", operatingSystem: "Web", browserRequirements: "Requires JavaScript", inLanguage: "ko", description: c.description, dateModified: BUILD_DATE, isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" }, publisher: ORG },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: SITE.url + "/" }, { "@type": "ListItem", position: 2, name: CATS[c.cat].name, item: `${SITE.url}/#${c.cat}` }, { "@type": "ListItem", position: 3, name: c.title, item: `${SITE.url}/${c.slug}/` }] },
  ];
  if (faq.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  writeFileSync(join(dir, "index.html"), shell({ title: c.title, description: c.description, path: `/${c.slug}/`, nav: c.cat, body: calcPage(c, all), script: indexScript + (c.script || ""), keywords: c.keys || [], jsonld: ld }));
}

// sitemap · robots
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE.url}/</loc><lastmod>${BUILD_DATE}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n${all.map((c) => `<url><loc>${SITE.url}/${c.slug}/</loc><lastmod>${BUILD_DATE}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join("\n")}\n</urlset>\n`);
// 검색·생성형 AI 크롤러 모두 허용 (GEO)
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\n${["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "anthropic-ai", "PerplexityBot", "Google-Extended", "Bingbot", "Yeti", "Daum"].map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n")}\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
// llms.txt: 생성형 엔진이 사이트 구조를 한 번에 읽는 안내 파일
writeFileSync(join(OUT, "llms.txt"), `# ${SITE.name}\n\n> ${SITE.tagline}. 서버 없이 브라우저에서 계산하는 무료 정적 사이트. 음력은 한국천문연구원 기준(korean-lunar-calendar), 공휴일은 관공서의 공휴일에 관한 규정과 대체공휴일 규칙으로 계산.\n\n${Object.entries(CATS).map(([k, v]) => `## ${v.name}\n\n${all.filter((c) => c.cat === k).map((c) => `- [${c.title}](${SITE.url}/${c.slug}/): ${c.description}`).join("\n")}`).join("\n\n")}\n\n## 참고\n\n- 소스: https://github.com/revenue/nalsem (MIT)\n- 띠궁합·삼재·손없는 날은 민속 참고 자료이며 법률·행정 판단의 근거가 아님\n`);
// 404
writeFileSync(join(OUT, "404.html"), shell({ title: "페이지를 찾을 수 없습니다", description: "요청한 페이지가 없습니다.", path: "/404.html", body: `<div class="page wrap"><h1>페이지를 찾을 수 없습니다</h1><p class="lede">주소가 바뀌었거나 없는 페이지입니다. 홈에서 계산기를 찾아 주세요.</p><p style="margin-top:24px"><a class="btn btn-primary" href="/">홈으로</a></p></div>`, script: indexScript }).replace('<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">', '<meta name="robots" content="noindex">'));
writeFileSync(join(OUT, ".nojekyll"), "");
// 애드센스 판매자 인증
writeFileSync(join(OUT, "ads.txt"), "google.com, pub-2298882938781262, DIRECT, f08c47fec0942fa0\n");

// 사전 점검: 화면에 보이는 문자열에 em-dash 금지 (taste-skill §9.G)
const bad = [];
for (const c of all) for (const k of ["title", "lede", "description", "form", "info"]) if (/[—–]/.test(c[k] || "")) bad.push(`${c.slug}.${k}`);
if (/[—–]/.test(home(all))) bad.push("home");
if (bad.length) { console.error("em-dash 발견:", bad.join(", ")); process.exit(1); }
console.log(`built ${all.length + 1} pages → ${OUT}/`);
