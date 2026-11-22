// 생활 지원금: 한전 고효율 가전제품 구매비용 지원금 계산기 (2026년분).
// 계산은 docs/assets/kepco.js(엔진)와 docs/assets/kepco-ui.js(화면)가 브라우저 안에서 한다.
// 복지할인 유형과 금액은 민감한 정보라 주소·통계·저장소에 넣지 않는다.
// 규칙 출처(2026-11-22 확인): 한전 고효율 가전 지원사업 사업안내·지원품목·신청방법·자주묻는질문. 본부 저장소 ventures/kepco-appliance/benchmark.md
// 예시의 숫자는 kepco.js 로 계산한 값이다(test/kepco.test.mjs 의 "수급자 30%" 테스트와 같다).
import { ARROW } from "../layout.mjs";

// 쿠팡 파트너스 링크: 품목 id → 대표 제품 하나 {url, name, model, grade}. 비어 있으면 쿠팡 버튼·제품표·대가성 문구를 내지 않는다.
// 고른 방법(본부 저장소 ventures/kepco-appliance/coupang-links.md): 쿠팡 파트너스 검색(쿠팡랭킹순)에서 리뷰가 많은 제품 중
// 한국에너지공단 효율등급 사이트에서 모델명으로 조회해 현재 기준 등급이 지원 대상인 것만 넣는다. "1등급" 검색 결과에도 2·3등급이 섞여 있었다.
// 품목 id → 대상 제품 목록(앞의 것이 대표). 표와 계산 결과에 이 순서로 보인다.
export const COUPANG = {
  fridge: [{ url: "https://link.coupang.com/a/iR8TBSr8uG", name: "삼성전자 일반 306L 2도어 냉장고", model: "RB30D4051S9", grade: 1, img: "https://t4c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/34224491800435-03ecfea4-15c6-4713-987a-6bee62c9aa37.jpg" }],
  kimchi: [{ url: "https://link.coupang.com/a/iR80zPdNHo", name: "삼성전자 김치플러스 202L 뚜껑형 김치냉장고", model: "RP20C3111EG", grade: 1, img: "https://thumbnail13.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/34224569294063-d2984d96-0d33-4771-87eb-0f14e962e4a6.jpg" }],
  "ac-wall": [{ url: "https://link.coupang.com/a/iSNpx9hXQy", name: "TCL 인버터 벽걸이 에어컨 5.7평", model: "TAC-08CSD", grade: 1, img: "https://t5a.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/71175740537336-fabd56a5-660f-43f0-a9b0-f6e41a8c74a4.jpg" }],
  "ac-other": [{ url: "https://link.coupang.com/a/iSNqw0dONg", name: "캐리어 인버터 스탠드 에어컨 23.4평", model: "OAMB-0851NAWSD", grade: 3, img: "https://thumbnail6.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2025/04/22/9/0/3d842043-ff83-4082-8592-675ea3b409a9.jpg" }],
  washer: [{ url: "https://link.coupang.com/a/iR88QylOAS", name: "삼성전자 그랑데 통버블 세탁기 16kg", model: "WA16CG6441BY", grade: 2, img: "https://t2c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/34223277602881-1394d57e-fad8-44a8-8b24-5c5764c02859.jpg" }],
  drum: [{ url: "https://link.coupang.com/a/iR89M1rR12", name: "삼성전자 그랑데 드럼 세탁기 19kg", model: "WF19T6000KW", grade: 1, img: "https://thumbnail10.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/34224353028803-efa8e9b9-6984-46c4-b9e6-fbe8ca543fd3.jpg" }],
  rice: [{ url: "https://link.coupang.com/a/iR9bt66oFw", name: "쿠쿠 전기보온 에그밥솥 6인용", model: "CR-0675FW", grade: 1, img: "https://thumbnail15.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/dc57/ff0f92d0e66b5fe69d6f0cdce47d52ea6c9335fc264b7107041c0c87afd8.jpg" }],
  vacuum: [{ url: "https://link.coupang.com/a/iSNq2aJijk", name: "LG전자 싸이킹3 싸이클론 진공청소기", model: "K83IGY", grade: 3, img: "https://t2c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/1759001647059995-195f6f24-69a9-44f2-be3d-286817c4c417.jpg" }],
  purifier: [{ url: "https://link.coupang.com/a/iR9eahYhZQ", name: "위닉스 타워 엣지 공기청정기 43㎡", model: "AT8E430-MSK", grade: 1, img: "https://thumbnail1.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/167929895859531-595230e2-1ffb-4a32-b505-7a6886b4a2b9.png" }],
  tv: [{ url: "https://link.coupang.com/a/iR81TzyTlY", name: "삼성전자 4K UHD Mini LED TV 55인치", model: "KU55MH70AFXKR", grade: 1, img: "https://thumbnail10.coupangcdn.com/thumbnails/remote/212x212ex/image/rs_quotation_api/xtj5pkrt/e37079c99ab24af2b9af990f2ba4d074.jpg" }],
  dehumid: [{ url: "https://link.coupang.com/a/iR83vwodXg", name: "윈세이 1등급 제습기 24L", model: "W24L1A", grade: 1, img: "https://thumbnail4.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2025/05/21/12/7/4d1d0b11-af36-4462-93f7-0d28cb2f45cf.jpg" }],
  dryer: [{ url: "https://link.coupang.com/a/iSMZWpFWRE", name: "LG전자 트롬 건조기 20kg 릴리 화이트 (2026년 1등급 모델)", model: "RD20WNR", grade: 1, img: "https://thumbnail5.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2026/10/30/14/0/4d780dbd-112d-44a3-a917-889c639dd49c.jpg" }],
  dishwasher: [{ url: "https://link.coupang.com/a/iR84plEv48", name: "LG전자 디오스 오브제컬렉션 빌트인 식기세척기 12인용", model: "DUE1BGLE", grade: 1, img: "https://thumbnail5.coupangcdn.com/thumbnails/remote/212x212ex/image/rs_quotation_api/qfm6nvqm/a11d406ca6444659a8493064ccc61ceb.jpg" }],
};
const PICKED = "2026-11-22";
const HAS_LINKS = Object.values(COUPANG).some((list) => list.some((p) => p && p.url));
export const DISCLOSURE = "이 페이지의 쿠팡 링크는 쿠팡 파트너스 활동의 일환으로, 구매가 일어나면 날셈이 일정액의 수수료를 받습니다. 구매 가격은 같습니다.";

const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const OFFICIAL = {
  info: a("https://en-ter.co.kr/support/info/info01/info.do", "한전 고효율 가전 지원사업 사업안내"),
  items: a("https://en-ter.co.kr/support/info/info03/info.do", "지원대상 제품"),
  apply: a("https://en-ter.co.kr/support/info/info02/info.do", "신청방법"),
  faq: a("https://en-ter.co.kr/support/bbs/faq/info.do", "자주묻는질문"),
};
const CHECKED = "2026-11-22";

// 품목표: kepco.js 의 ITEMS 와 같은 값(test/kepco.test.mjs 가 공식 표와 대조)
const ITEM_ROWS = [
  ["냉장고", "1등급", "21.10.01"], ["김치냉장고", "1등급", "23.05.01"], ["에어컨 벽걸이", "1등급", "21.10.01"], ["에어컨 그 외(스탠드·투인원, 시스템 에어컨 제외)", "3등급까지", "21.10.01"],
  ["세탁기 일반", "2등급까지", "22.11.01"], ["세탁기 드럼", "1등급", "22.11.01"], ["전기밥솥", "1등급", "18.04.01"], ["진공청소기(유선)", "3등급까지", "19.01.01"],
  ["공기청정기", "1등급", "18.01.01"], ["TV", "1등급", "22.01.01"], ["제습기", "1등급", "24.07.01"], ["의류건조기", "1등급", "20.03.01"], ["식기세척기", "1등급", "25.01.01"],
];

const TYPE_OPTS = `<option value="">고지서의 복지할인 유형 고르기</option>
  <optgroup label="지원율 30%"><option value="disabled">장애인(중증)</option><option value="merit">유공자</option><option value="basic">기초생활수급자</option><option value="facility">사회복지시설</option><option value="nearpoor">차상위계층</option><option value="lifesupport">생명유지장치 사용</option></optgroup>
  <optgroup label="지원율 15%"><option value="multichild">다자녀 가구</option><option value="bigfamily">대가족 가구</option><option value="birth">출산 가구</option></optgroup>`;
const ITEM_OPTS = [["fridge", "냉장고"], ["kimchi", "김치냉장고"], ["ac-wall", "에어컨 (벽걸이)"], ["ac-other", "에어컨 (스탠드·투인원 등)"], ["washer", "세탁기 (일반)"], ["drum", "세탁기 (드럼·콤보)"], ["rice", "전기밥솥"], ["vacuum", "진공청소기 (유선)"], ["purifier", "공기청정기"], ["tv", "TV"], ["dehumid", "제습기"], ["dryer", "의류건조기"], ["dishwasher", "식기세척기"]]
  .map(([v, l]) => `<option value="${v}">${l}</option>`).join("");

const unitInput = (attr, unit = "만 원", ph = "") => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input ${attr} type="text" inputmode="decimal" autocomplete="off"${ph ? ` placeholder="${ph}"` : ""}></div></div>`;

const ROW_TPL = `<template id="kp-tpl"><div class="tx-dep kp-row">
  <div class="tx-dep-head"><b class="kp-name">제품</b><button type="button" class="tx-x" data-remove aria-label="이 제품 빼기"><iconify-icon icon="solar:close-circle-linear"></iconify-icon></button></div>
  <div class="form-row cols-2">
    <div class="field"><label data-for="item">품목</label><select data-k="item">${ITEM_OPTS}</select></div>
    <div class="field"><label data-for="price">구매 가격 (결제 금액)</label>${unitInput(`data-k="price"`, "만 원", "150")}</div>
  </div>
  <div class="form-row cols-2">
    <div class="field"><label data-for="grade">라벨의 효율등급</label><select data-k="grade"><option value="1">1등급</option><option value="2">2등급</option><option value="3">3등급</option><option value="4">4등급</option><option value="5">5등급</option></select></div>
    <div class="field"><label data-for="date">라벨의 적용기준 시행일</label><select data-k="date"><option value="unknown">아직 모름</option><option value="yes">기준일과 같거나 나중</option><option value="no">기준일보다 이전</option></select><p class="help kp-since"></p></div>
  </div>
</div></template>`;

const FORM = `<form id="kf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>우리 집 복지할인 유형</legend>
    <div class="field"><label for="kp-type">전기요금 복지할인 유형</label><select id="kp-type">${TYPE_OPTS}</select><p class="help">전기요금 고지서나 한전ON에서 확인할 수 있습니다. 복지할인을 신청하지 않았다면 이 지원을 받을 수 없습니다.</p></div>
    <div class="field"><label for="kp-prior">이 사업으로 이미 받은 지원금 (예전 연도 포함)</label>${unitInput(`id="kp-prior"`, "만 원", "0")}<p class="help">한도 30만 원은 해마다 새로 생기지 않고 예전에 받은 금액을 뺀 만큼만 남습니다. 처음이면 비워 두세요.</p></div>
  </fieldset>
  <fieldset class="tx-group"><legend>살 제품 (최대 4개)</legend>
    <div id="kp-rows" class="tx-deps"></div>
    <div class="actions"><button class="btn btn-ghost btn-sm" type="button" id="kp-add"><iconify-icon icon="solar:add-circle-linear"></iconify-icon> 제품 더하기</button></div>
    <p class="help">같은 품목을 여러 개 사도 됩니다. 지원금은 위에서부터 남은 한도 안에서 채웁니다.</p>
  </fieldset>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button><button class="btn btn-ghost btn-sm" type="button" id="kp-example"><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> 예시로 채우기</button><button class="btn btn-ghost btn-sm" type="button" data-share=""><iconify-icon icon="solar:share-linear"></iconify-icon> 공유</button></div>
  <p class="note tx-privacy">복지할인 유형과 금액은 이 브라우저 안에서만 계산하고 어디에도 보내거나 저장하지 않습니다. 공유 버튼은 페이지 주소만 보냅니다.</p>
</form>${ROW_TPL}`;

const ITEM_TABLE = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>품목</th><th>효율등급</th><th>적용기준 시행일</th></tr></thead><tbody>${ITEM_ROWS.map(([i, g, d]) => `<tr><td>${i}</td><td>${g}</td><td>${d} 이후</td></tr>`).join("")}</tbody></table></div>`;

const ITEM_LABEL = Object.fromEntries([["fridge", "냉장고"], ["kimchi", "김치냉장고"], ["ac-wall", "에어컨 벽걸이"], ["ac-other", "에어컨 스탠드 등"], ["washer", "세탁기 일반"], ["drum", "세탁기 드럼"], ["rice", "전기밥솥"], ["vacuum", "진공청소기(유선)"], ["purifier", "공기청정기"], ["tv", "TV"], ["dehumid", "제습기"], ["dryer", "의류건조기"], ["dishwasher", "식기세척기"]]);
const PICK_CARD = HAS_LINKS ? card("품목별로 많이 사는 대상 제품",
  P(`쿠팡에서 리뷰가 많은 제품 가운데, 한국에너지공단 효율등급 사이트에서 모델명으로 조회해 <b>지금 기준으로 지원 대상 등급인 것</b>만 품목별로 하나씩 골랐습니다(${PICKED} 확인). 쿠팡에서 "1등급"으로 검색해도 2·3등급 제품이 섞여 나오니 다른 제품을 살 때도 모델명을 꼭 조회하세요.`)
  + `<div class="tbl-wrap"><table class="tbl kp-pick"><thead><tr><th>품목</th><th>제품 (쿠팡에서 보기)</th><th>등급</th></tr></thead><tbody>${Object.entries(COUPANG).flatMap(([id, list]) => list.filter((p) => p && p.url).map((p, i, a) => `<tr>${i === 0 ? `<td class="kp-c" rowspan="${a.length}">${ITEM_LABEL[id]}</td>` : ""}<td class="kp-p"><a class="kp-buy" href="${p.url}" target="_blank" rel="sponsored nofollow noopener">${p.img ? `<img class="kp-img" src="${p.img}" alt="" width="64" height="64" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}${p.name}</a><small class="kp-model">${p.model}</small></td><td class="kp-g">${p.grade}등급</td></tr>`)).join("")}</tbody></table></div>`
  + P("가격과 재고는 쿠팡에서 수시로 바뀝니다. 색상·용량 옵션을 바꾸면 모델명이 달라져 대상이 아닐 수 있으니, 주문 전 모델명을 다시 보고 받은 뒤에는 실물 라벨을 확인하세요. 대상 여부는 한전 검수로 정해집니다.")
  + `<p class="kp-disc">${DISCLOSURE}</p>`) : "";

const INFO = [
  card("누가 받을 수 있나", UL([
    "<b>전기요금 복지할인을 받는 가구</b>만 받습니다. 장애인(중증)·유공자·기초생활수급자·사회복지시설·차상위계층·생명유지장치 가구는 구매 가격의 <b>30%</b>, 다자녀·대가족·출산 가구는 <b>15%</b>입니다.",
    "<b>한도는 가구당 30만 원</b>이고 해마다 새로 생기지 않습니다. 예전에 15만 원을 받았다면 올해는 15만 원까지만 받습니다.",
    "복지할인 대상자 본인이나 <b>주민등록상 같은 가구원</b>이 신청할 수 있습니다. 가구원이 신청하면 2026년에 발급한 주민등록등본을 냅니다.",
    "<b>개인사업자·법인은 받을 수 없습니다.</b> 법인카드로 사거나 법인 계좌로 받는 것도 안 됩니다.",
    "한전이 아닌 구역전기사업자에게 전기를 받는 아파트는 그 사업자에게 문의해야 합니다.",
  ]), `${OFFICIAL.info}, ${OFFICIAL.faq} (${CHECKED} 확인)`),
  card("지원 품목과 등급 기준", P("11개 품목은 라벨의 <b>효율등급</b>과 <b>적용기준 시행일</b>이 둘 다 맞아야 합니다. 1등급이어도 라벨의 적용기준 시행일이 아래 날짜보다 이전이면 대상이 아닙니다.") + ITEM_TABLE
    + P("시스템에어컨, 이동식 에어컨, 냉난방기, 멀티전기히트펌프시스템, 냉동고, 냉온수기는 대상이 아닙니다. 구독·렌탈 제품과 둥근 모양의 옛 효율등급 라벨이 붙은 제품도 빠집니다.")
    + P(`판정은 제품에 붙은 실물 라벨로 합니다. 쇼핑몰 상세페이지의 등급 표시는 증빙이 되지 않으니 받은 뒤 라벨을 꼭 확인하세요. 모델별 등급은 ${a("https://eep.energy.or.kr/certification/certi_intro.aspx", "한국에너지공단 효율등급 제품검색")}에서 미리 볼 수 있습니다(참고용).`), `${OFFICIAL.items} (${CHECKED} 확인)`),
  PICK_CARD,
  card("예시: 수급자 가구가 냉장고를 살 때", P("기초생활수급자 가구(30%)가 2025년에 이 사업으로 10만 원을 받았고, 이번에 1등급 냉장고를 150만 원에 산다고 하면 이렇게 됩니다.")
    + UL(["150만 원의 30%는 45만 원입니다.", "남은 한도는 30만 원에서 10만 원을 뺀 <b>20만 원</b>이라, 지원금은 20만 원에서 멈춥니다.", "실제 부담은 150만 원에서 20만 원을 뺀 <b>130만 원</b>이고, 남은 한도는 0원이 됩니다."])),
  card("신청 방법과 서류", UL([
    "<b>온라인으로만 신청합니다.</b> 한전 고효율 가전 지원사업 홈페이지에서 회원가입, 계좌 등록, 구매 정보 입력, 서류 올리기 순서입니다. 문의는 1551-1212입니다.",
    "<b>필수 서류 5가지</b>: 신분증, 효율등급 라벨 사진, 제조번호(명판) 사진, 거래내역서(구매내역서), 영수증(카드매출전표·현금영수증). 가구원이 신청하면 주민등록등본을 더합니다.",
    "거래내역서에는 구매자 이름·품목·모델명·판매처·금액·날짜가, 영수증에는 승인번호가 있어야 하고 두 서류의 금액이 같아야 합니다. 쿠팡 같은 온라인몰 주문 내역도 거래내역서로 쓸 수 있습니다.",
    "지원금은 <b>신청자 본인 계좌</b>로만 들어옵니다. 정부 보조금 전용 통장은 쓸 수 없습니다.",
    "보완 요청 문자를 받으면 2주 안에 보완해야 하고, 지나면 무효가 되어 다시 신청해야 합니다.",
  ]), `${OFFICIAL.apply}, ${OFFICIAL.faq} (${CHECKED} 확인)`),
  card("자주 틀리는 점", UL([
    "<b>2026년 1월 1일 이전에 산 제품</b>은 대상이 아닙니다. 신청은 2026년 12월 31일까지이고, 예산이 떨어지면 더 일찍 끝납니다.",
    "<b>포인트·상품권</b>: 영수증 승인 금액에 들어간 포인트만 인정합니다. 상생페이백 등으로 받은 디지털 온누리상품권은 구매 금액으로 보지 않습니다.",
    "<b>설치비</b>: TV 벽걸이·에어컨 배관처럼 함께 결제한 기본 구성품은 들어가지만, 설치 기사에게 따로 낸 돈은 빠집니다.",
    "<b>세트 상품</b>: 냉장고+냉동고 세트라면 냉장고 금액만 지원됩니다. 구성품별 금액이 증빙에 보여야 합니다.",
    "<b>여러 제품을 한 번에 결제</b>했다면 제품별 금액이 나온 증빙이 필요합니다. 따로 결제하는 편이 서류가 쉽습니다.",
  ]), `${OFFICIAL.faq} (${CHECKED} 확인)`),
  card("이 페이지에 대해", UL([
    "날셈은 <b>한국전력공사 공식 사이트가 아닙니다.</b> 공식 자료를 정리한 계산기이고, 실제 지원 여부와 금액은 한전 검수 결과로 정해집니다.",
    `지원금 계산은 공식 기준(구매 가격 × 지원율, 남은 한도까지)으로 하며 원 단위 끊는 방식은 공개 자료에 없어 '약'으로 표시합니다. 기준 확인일 ${CHECKED}.`,
    HAS_LINKS ? DISCLOSURE : "이 페이지에는 광고 수수료를 받는 쇼핑 링크가 없습니다.",
  ])),
].join("");

export const kepco = [
  {
    slug: "kepco-appliance", cat: "benefit", title: "한전 고효율 가전 지원금 계산기", short: "복지할인 가구, 가전 사면 얼마 돌려받나",
    lede: `전기요금 복지할인 가구가 냉장고·세탁기·TV 같은 고효율 가전을 사면 한전에서 얼마를 돌려받는지, 실제 부담은 얼마인지 계산합니다. 품목별 등급과 적용기준 시행일로 대상인지도 확인합니다. 2026년 신청은 12월 31일까지입니다.${HAS_LINKS ? ` <span class="kp-disc">${DISCLOSURE}</span>` : ""}`,
    description: "한전 고효율 가전제품 구매비용 지원금 계산기. 복지할인 유형(30%·15%)과 이미 받은 금액을 넣으면 30만 원 누적 한도 안에서 받을 지원금과 실구매가를 계산하고, 11개 품목의 등급·적용기준 시행일 기준으로 대상 여부를 알려 줍니다. 2026년 기준.",
    keys: ["한전 고효율 가전 지원", "고효율 가전 환급", "고효율 가전제품 구매비용 지원", "복지할인 가전 지원", "1등급 가전 환급", "에너지효율 1등급 지원금", "고효율 가전 환급 계산기"],
    form: FORM, assets: ["kepco.js", "kepco-ui.js"],
    script: `window.KEPCO_LINKS=${JSON.stringify(COUPANG)};`,
    info: INFO,
  },
];
