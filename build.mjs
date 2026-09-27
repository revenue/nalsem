// 정적 빌드: src/ 정의 → docs/ HTML. `npm run build`
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { shell, calcPage, CATS, SITE } from "./src/layout.mjs";
import { home } from "./src/home.mjs";
import { calculators } from "./src/calculators/index.mjs";

const OUT = "docs";
const all = calculators;
const index = all.map((c) => ({ slug: c.slug, title: c.title, cat: CATS[c.cat].name, keys: (c.keys || []).map((k) => k.toLowerCase()) }));
const indexScript = `window.NALSEM_INDEX=${JSON.stringify(index)};`;

// 홈
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), shell({ title: SITE.name, description: `${SITE.tagline}. 만나이·세는나이, 디데이, 양력 음력 변환, 날짜 계산, 띠와 삼재, 공휴일까지 ${all.length}가지 생활 계산을 한곳에서.`, path: "/", body: home(all), script: indexScript + home.script(all), jsonld: { "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url } }));

// 계산기
for (const c of all) {
  const dir = join(OUT, c.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), shell({ title: c.title, description: c.description, path: `/${c.slug}/`, nav: c.cat, body: calcPage(c, all), script: indexScript + (c.script || ""), jsonld: { "@context": "https://schema.org", "@type": "WebApplication", name: c.title, url: `${SITE.url}/${c.slug}/`, applicationCategory: "UtilitiesApplication", operatingSystem: "Web", description: c.description, offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" } } }));
}

// sitemap · robots
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE.url}/</loc></url>\n${all.map((c) => `<url><loc>${SITE.url}/${c.slug}/</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
writeFileSync(join(OUT, ".nojekyll"), "");

// 사전 점검: 화면에 보이는 문자열에 em-dash 금지 (taste-skill §9.G)
const bad = [];
for (const c of all) for (const k of ["title", "lede", "description", "form", "info"]) if (/[—–]/.test(c[k] || "")) bad.push(`${c.slug}.${k}`);
if (/[—–]/.test(home(all))) bad.push("home");
if (bad.length) { console.error("em-dash 발견:", bad.join(", ")); process.exit(1); }
console.log(`built ${all.length + 1} pages → ${OUT}/`);
