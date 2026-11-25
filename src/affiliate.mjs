// 쿠팡 파트너스 상품 묶음 (세금 계산기 등에서 같이 쓴다).
// 지킬 것(본부 저장소 ops/operating-policy.md 5장, research/제휴플랫폼_국내_2026-11-26.md 5장):
// - 대가 문구는 묶음 위에 확정 표현으로 둔다("받습니다"). 플로팅·커버형 배너, 자동 이동은 쓰지 않는다.
// - 가격은 페이지에 적지 않는다(쿠팡에서 수시로 바뀜, API 가격 저장 금지).
// - 신용카드·대출·보험 같은 금융상품, 세무 대리·상담 알선은 넣지 않는다.
import { esc } from "./layout.mjs";

export const COUPANG_DISCLOSURE = "이 페이지의 쿠팡 링크는 쿠팡 파트너스 활동의 일환으로, 구매가 일어나면 날셈이 일정액의 수수료를 받습니다. 구매 가격은 같습니다.";

export const hasLinks = (groups) => groups.some((g) => g.items.some((p) => p && p.url));

// groups: [{ label, items: [{ url, name, img }] }] — 앞의 것이 대표.
export function pickCard({ title, intro, groups, note = "가격과 재고는 쿠팡에서 수시로 바뀝니다." }) {
  if (!hasLinks(groups)) return "";
  const rows = groups.flatMap((g) => {
    const list = g.items.filter((p) => p && p.url);
    return list.map((p, i) => `<tr>${i === 0 ? `<td class="kp-c" rowspan="${list.length}">${esc(g.label)}</td>` : ""}<td class="kp-p"><a class="kp-buy" href="${esc(p.url)}" target="_blank" rel="sponsored nofollow noopener">${p.img ? `<img class="kp-img" src="${esc(p.img)}" alt="" width="64" height="64" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}${esc(p.name)}</a></td></tr>`);
  }).join("");
  return `<div class="card bz"><h2>${title}</h2>`
    + `<p class="kp-disc kp-disc-top">${COUPANG_DISCLOSURE}</p>`
    + `<p>${intro}</p>`
    + `<div class="tbl-wrap"><table class="tbl kp-pick"><thead><tr><th>종류</th><th>제품 (쿠팡에서 보기)</th></tr></thead><tbody>${rows}</tbody></table></div>`
    + `<p>${note}</p></div>`;
}
