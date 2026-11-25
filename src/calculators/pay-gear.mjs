// 급여 계산기 4종(/alba-pay/, /juhyu-pay/, /insurance/, /severance/)의 제휴 묶음: 사장님용 장비와 노무·급여 실무서.
// 근거: 본부 저장소 ops/operating-policy.md 5·6장, research/제휴플랫폼_국내_2026-11-26.md 4장 아이디어 2 (사용자 "시작해", 2026-11-26).
// 링크: 쿠팡 파트너스(장비 3개)와 링크프라이스 예스24 딥링크(책 2권). 만든 날 2026-11-26, 모두 해당 상품 페이지로 이동 확인.
// 지킬 것: 대가 문구는 묶음 맨 위, 가격은 저장하지 않는다, 플로팅·커버형 배너 없음, 노무·세무 상담 알선 없음, 과장 문구 없음.
// 순서: 각 페이지에서 급여대장 판매 카드(우리 상품) 바로 아래에 한 번만 넣는다. 클릭은 화면 스크립트가 affiliate_click(계산기·상품 id·플랫폼)만 보낸다.
export const PAY_GEAR = [
  { id: "timeclock-tf1300", net: "coupang", url: "https://link.coupang.com/a/iYqpBjsynA", name: "카피어랜드 지문인식 출퇴근기록기 TF1300", note: "직원 출퇴근 시각을 지문으로 남겨요. 근무기록은 주휴·연장수당을 계산하는 기본 자료예요.", img: "https://t4c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2026/03/09/14/3/0d509f95-a918-4be4-80e8-715e23ad08ec.jpg" },
  { id: "receipt-srp330iii", net: "coupang", url: "https://link.coupang.com/a/iYqrOfl8KG", name: "빅솔론 영수증 프린터 SRP-330III", note: "포스·배달 주문서를 뽑는 감열 영수증 프린터예요.", img: "https://thumbnail2.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/image_audit/prod/7a761f9f-65bb-4e0b-a627-c7c68226a987_fixing_v2.png" },
  { id: "label-lwk200", net: "coupang", url: "https://link.coupang.com/a/iYqteQbUM8", name: "엡손 라벨 프린터 LW-K200BK", note: "가격표·보관 라벨·서류철 이름표를 뽑아요.", img: "https://thumbnail6.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/a5e8/e2aa338751370075e338a55090ecb4e36e1f4d71f094a315b20d890e06b1.jpg" },
  { id: "book-labor-manual", net: "linkprice", url: "https://app.ac/vEwgXUS83", name: "근로기준법 급여수당관리·휴일휴가근태 인사노무관리 실무설명서 (손원준, 지식만들기, 2026)", note: "수당·휴일·휴가·근태 규정을 실무 사례로 정리한 책이에요.", img: "https://image.yes24.com/goods/139939505/M" },
  { id: "book-wage-insurance-2026", net: "linkprice", url: "https://app.ac/lEwgXSS73", name: "2026 임금설계를 통한 급여와 4대보험 실무 (김경하, 삼일인포마인)", note: "급여 구성과 4대보험·원천징수를 함께 다룬 실무서예요.", img: "https://image.yes24.com/goods/187840785/M" },
];

export const GEAR_DISCLOSURE = "이 묶음은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 책 링크는 링크프라이스(예스24) 제휴 링크로, 구매가 일어나면 날셈이 수수료를 받습니다. 구매 가격은 같습니다.";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const row = (p) => `<a class="kp-buy kp-buy-row" href="${esc(p.url)}" target="_blank" rel="sponsored nofollow noopener" data-aff-link data-aff-id="${p.id}" data-aff-net="${p.net}"><img class="kp-thumb" src="${esc(p.img)}" alt="" width="48" height="48" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span>${esc(p.name)}<small class="kp-why">${esc(p.note)}</small></span></a>`;

/** 안내 카드 하나. 대가 문구가 맨 위에 온다. */
export function gearCard() {
  const gear = PAY_GEAR.filter((p) => p.net === "coupang"), books = PAY_GEAR.filter((p) => p.net === "linkprice");
  return `<div class="card bz" id="pay-gear"><h2>작은 매장 사장님이 쓰는 도구와 책</h2>`
    + `<p class="kp-disc">${GEAR_DISCLOSURE}</p>`
    + `<p>근무기록과 급여를 직접 관리하는 매장에서 쓰는 장비와 실무서예요. 가격과 재고는 판매처에서 확인하세요.</p>`
    + `<div class="kp-buys"><small class="kp-buys-h">장비 (쿠팡)</small>${gear.map(row).join("")}</div>`
    + `<div class="kp-buys" style="margin-top:14px"><small class="kp-buys-h">실무서 (예스24)</small>${books.map(row).join("")}</div>`
    + `</div>`;
}
