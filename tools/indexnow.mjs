// 새·바뀐 페이지를 네이버(서치어드바이저)와 IndexNow 공용 창구(빙 등)에 알린다.
//   npm run indexnow                              → docs/sitemap.xml 의 모든 주소
//   npm run indexnow -- /simple-vat/ /alba-pay/   → 고른 주소만 (경로나 전체 URL)
// 배포(푸시) 뒤 GitHub Pages 반영이 끝난 다음에 돌린다. 키 파일이 실제 주소에서 안 열리면 멈춘다.
import { readFileSync } from "node:fs";
import { SITE } from "../src/layout.mjs";
import { INDEXNOW_KEY } from "../src/indexnow.mjs";

const host = new URL(SITE.url).host;
const keyLocation = `${SITE.url}/${INDEXNOW_KEY}.txt`;
const ENDPOINTS = ["https://searchadvisor.naver.com/indexnow", "https://api.indexnow.org/indexnow"];

const args = process.argv.slice(2);
const urls = args.length
  ? args.map((a) => (a.startsWith("http") ? a : `${SITE.url}${a.startsWith("/") ? "" : "/"}${a}`))
  : [...readFileSync(new URL("../docs/sitemap.xml", import.meta.url), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const bad = urls.filter((u) => new URL(u).host !== host);
if (bad.length) { console.error(`다른 도메인 주소는 보낼 수 없습니다: ${bad.join(", ")}`); process.exit(1); }

const keyRes = await fetch(keyLocation);
if (!keyRes.ok || (await keyRes.text()).trim() !== INDEXNOW_KEY) {
  console.error(`키 파일이 아직 안 열립니다(${keyRes.status}): ${keyLocation}\n배포가 끝난 뒤 다시 돌리세요.`);
  process.exit(1);
}

let failed = 0;
for (const ep of ENDPOINTS) {
  const res = await fetch(ep, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation, urlList: urls }),
  });
  const ok = res.status === 200 || res.status === 202;
  if (!ok) failed++;
  console.log(`${ok ? "접수" : "실패"} ${res.status} ${ep} (${urls.length}개)${ok ? "" : " " + (await res.text()).slice(0, 200)}`);
}
process.exit(failed ? 1 : 0);
