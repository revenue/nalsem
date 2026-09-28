// 사이트 전수 점검: docs/ (= 배포본) 의 모든 HTML 이 같은 공통 요소를 갖는지, 내부 링크가 살아 있는지. `node test/site.audit.mjs`
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "docs";
const HOST = readFileSync(join(ROOT, "CNAME"), "utf8").trim();
const BASE = `https://${HOST}`;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : []; });
const files = walk(ROOT);
const pathOf = (f) => "/" + relative(ROOT, f).replace(/index\.html$/, "");

// 모든 페이지가 가져야 하는 것
const REQUIRED = [
  ["canonical", (h, p) => h.includes(`<link rel="canonical" href="${BASE}${p}">`)],
  ["og:url", (h, p) => h.includes(`<meta property="og:url" content="${BASE}${p}">`)],
  ["og:image", (h) => h.includes(`content="${BASE}/assets/og.png"`)],
  ["애드센스 스크립트", (h) => h.includes("adsbygoogle.js?client=ca-pub-2298882938781262")],
  ["애드센스 계정 메타", (h) => h.includes('name="google-adsense-account" content="ca-pub-2298882938781262"')],
  ["Search Console 태그", (h) => h.includes("4xD7Nv4vd_ABr-AbzHS7bG4BPbM-FVy0nVW8v0wqTwU")],
  ["공통 CSS", (h) => /\/assets\/site\.css\?v=/.test(h)],
  ["공통 JS", (h) => h.includes("/assets/site.js?v=") && h.includes("/assets/calc.js?v=")],
  ["상단 메뉴", (h) => h.includes('href="/#age"') && h.includes('href="/#date"')],
  ["검색 버튼", (h) => h.includes('id="open-search"')],
  ["테마 토글", (h) => h.includes('id="toggle-theme"')],
  ["푸터 링크 3종", (h) => ["/about/", "/privacy/", "/contact/"].every((l) => h.includes(`href="${l}"`))],
  ["JSON-LD", (h) => h.includes("application/ld+json") || false],
  ["lang=ko", (h) => h.includes('<html lang="ko">')],
];
const OLD_HOSTS = ["nalsem.unitblack.kr", "nalsem.app"];
// GA_ID 로 빌드했으면 모든 페이지에 GA 가 있어야 한다
const GA = (readFileSync(join(ROOT, "index.html"), "utf8").match(/gtag\/js\?id=(G-[A-Z0-9]+)/) || [])[1];
if (GA) REQUIRED.push(["GA4 " + GA, (h) => h.includes(`gtag/js?id=${GA}`) && h.includes(`gtag("config","${GA}"`)]);

const problems = [];
const internal = new Set();
for (const f of files) {
  const h = readFileSync(f, "utf8"), p = pathOf(f);
  const is404 = f.endsWith("404.html");
  for (const [name, ok] of REQUIRED) {
    if (is404 && ["canonical", "og:url", "JSON-LD"].includes(name)) continue;
    if (!ok(h, p)) problems.push(`${p}: ${name} 없음`);
  }
  for (const o of OLD_HOSTS) if (h.includes(o)) problems.push(`${p}: 예전 도메인 ${o} 남음`);
  if (/[—–]/.test(h.replace(/<script[\s\S]*?<\/script>/g, ""))) problems.push(`${p}: em-dash`);
  for (const m of h.matchAll(/href="(\/[^"#?]*)/g)) internal.add(m[1]);
}
// 내부 링크 → 실제 파일
for (const l of internal) {
  const t = l.endsWith("/") ? join(ROOT, l, "index.html") : join(ROOT, l);
  if (!existsSync(t)) problems.push(`깨진 내부 링크: ${l}`);
}
// sitemap 은 404 를 뺀 모든 페이지를 담아야 함
const sm = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
for (const f of files) { if (f.endsWith("404.html")) continue; const u = BASE + pathOf(f); if (!sm.includes(`<loc>${u}</loc>`)) problems.push(`sitemap 누락: ${u}`); }
// llms.txt · robots · ads.txt
const llms = readFileSync(join(ROOT, "llms.txt"), "utf8");
for (const f of files) { if (f.endsWith("404.html") || pathOf(f) === "/") continue; if (!llms.includes(BASE + pathOf(f))) problems.push(`llms.txt 누락: ${pathOf(f)}`); }
if (!readFileSync(join(ROOT, "robots.txt"), "utf8").includes(`${BASE}/sitemap.xml`)) problems.push("robots.txt sitemap 주소");
if (!readFileSync(join(ROOT, "ads.txt"), "utf8").includes("pub-2298882938781262")) problems.push("ads.txt");

console.log(`점검 페이지 ${files.length}개 · 내부 링크 ${internal.size}개 · 도메인 ${HOST}`);
if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
console.log("문제 없음");
