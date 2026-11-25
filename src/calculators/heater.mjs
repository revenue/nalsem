// 전기요금·생활비: 난방기(전기장판·온수매트·히터·가습기) 전기요금 계산기 (주택용 저압, 2026년 겨울).
// 계산은 docs/assets/heater.js(엔진)와 docs/assets/heater-ui.js(화면)가 브라우저 안에서 한다.
// 요금 출처와 검산은 heater.js 머리말, 예시 숫자는 test/heater.test.mjs 와 같다.
import { ARROW } from "../layout.mjs";

// 쿠팡 파트너스 링크: 그룹 id → 제품 목록(앞의 것이 대표). 비어 있으면 제품표·대가성 문구를 내지 않는다.
// 고른 방법(본부 저장소 research/시즌_고수수료_교집합_2026-11-26.md): 쿠팡 파트너스 검색에서 리뷰가 많은 쿠팡 직매입 상품.
// 전기장판·히터·가습기는 에너지효율등급 대상이 아니어서 '전기를 덜 쓰는 제품'이라고 하지 않는다.
export const LINKS = {
  mat: [
    { url: "https://link.coupang.com/a/iYnajY6ZsO", name: "HanilMedical 탄소열선 고급 전기요", img: "https://t2a.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/213045621520415-179662fb-0af6-47d8-8b45-f87ce362a55b.jpg" },
    { url: "https://link.coupang.com/a/iYna3HS4OG", name: "HanilMedical 고급 전기요 곰인형", img: "https://thumbnail8.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2025/10/21/12/0/06abe2c5-7241-499f-89b7-1dbd18cb1486.jpg" },
  ],
  water: [
    { url: "https://link.coupang.com/a/iYnbP0H4Ee", name: "일월 숲속애 온수매트", img: "https://t1c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/51226420484993-dad509cf-2c95-4f75-977a-cbed748ff122.jpg" },
    { url: "https://link.coupang.com/a/iYncz1jG0a", name: "HanilMedical 프리미엄 워셔블 온수매트", img: "https://thumbnail1.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/262675462567929-a2fbbe7e-8e29-435a-8beb-8ed8f1627098.jpg" },
  ],
  carbon: [
    { url: "https://link.coupang.com/a/iYndjNOMvc", name: "곰표한일 EMF 카본 탄소매트", img: "https://thumbnail11.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/317902468830510-87ea94e8-011d-40ce-b4f7-5691f0fc19c8.jpg" },
    { url: "https://link.coupang.com/a/iYnecBdsS4", name: "일월 워셔블 카본 전기매트", img: "https://t3c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/95743574789240-65056824-4517-4c02-b7b3-92d68471027e.jpg" },
  ],
  heater: [
    { url: "https://link.coupang.com/a/iYne5ATkMm", name: "신일 석영관 전기히터", img: "https://t5a.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/873688261973204-02c72f9d-40d1-430c-9f75-f39dfffe9ffe.jpg" },
    { url: "https://link.coupang.com/a/iYnfUh8kbk", name: "홈플래닛 PTC 타워 온풍기", img: "https://t1c.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/5570926200647505-ef582000-4ce0-469a-8bce-af81e14285dc.jpg" },
    { url: "https://link.coupang.com/a/iYngEAUgRo", name: "홈플래닛 리모컨 컨벡션 히터", img: "https://thumbnail6.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/4263455229786188-38839181-a2b0-4095-b618-d1aa9b743c9d.jpg" },
  ],
  humid: [
    { url: "https://link.coupang.com/a/iYnhwSgu0i", name: "홈플래닛 초음파 가습기 4L", img: "https://thumbnail1.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/26159416953419-37907c07-742f-4851-af1e-1d2a176b996f.jpg" },
    { url: "https://link.coupang.com/a/iYnipCPMjI", name: "한경희 초저소음 초음파 가습기", img: "https://t2a.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/2387699048520-bd715af0-e594-4c04-882e-276447a04f8e.jpg" },
  ],
};
const PICKED = "2026-11-26";
const HAS_LINKS = Object.values(LINKS).some((list) => list.some((p) => p && p.url));
export const DISCLOSURE = "이 페이지의 쿠팡 링크는 쿠팡 파트너스 활동의 일환으로, 구매가 일어나면 날셈이 일정액의 수수료를 받습니다. 구매 가격은 같습니다.";
const CHECKED = "2026-11-26";

const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const SRC = {
  rate: a("https://online.kepco.co.kr/PRM004D00", "한전ON 주택용 전기요금표"),
  calc: a("https://online.kepco.co.kr/PRM075D00", "한전ON 사용제품 요금계산"),
};

const KIND_OPTS = [["mat", "전기장판·전기요"], ["water", "온수매트"], ["carbon", "카본매트"], ["heater", "전기히터·온풍기"], ["radiator", "라디에이터"], ["hum-heat", "가습기 (가열식)"], ["hum-sonic", "가습기 (초음파식)"], ["etc", "그 밖의 기기"]]
  .map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
const MONTH_OPTS = [[11, "11월"], [12, "12월"], [1, "1월"], [2, "2월"], [3, "3월"]].map(([v, l]) => `<option value="${v}"${v === 12 ? " selected" : ""}>${l}</option>`).join("");

const unitInput = (attr, unit, ph = "") => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input ${attr} type="text" inputmode="decimal" autocomplete="off"${ph ? ` placeholder="${ph}"` : ""}></div></div>`;

const ROW_TPL = `<template id="ht-tpl"><div class="tx-dep ht-row">
  <div class="tx-dep-head"><b class="ht-name">기기</b><button type="button" class="tx-x" data-remove aria-label="이 기기 빼기"><iconify-icon icon="solar:close-circle-linear"></iconify-icon></button></div>
  <div class="form-row cols-2">
    <div class="field"><label data-for="kind">기기 종류</label><select data-k="kind">${KIND_OPTS}</select></div>
    <div class="field"><label data-for="w">소비전력</label>${unitInput(`data-k="w"`, "W", "300")}<p class="help ht-hint"></p></div>
  </div>
  <div class="form-row cols-3">
    <div class="field"><label data-for="hours">하루 사용 시간</label>${unitInput(`data-k="hours"`, "시간", "8")}</div>
    <div class="field"><label data-for="days">한 달 사용 일수</label>${unitInput(`data-k="days"`, "일", "30")}</div>
    <div class="field"><label data-for="duty">켜져 있는 비율</label>${unitInput(`data-k="duty"`, "%", "100")}</div>
  </div>
</div></template>`;

const FORM = `<form id="hf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>우리 집 평소 전기 사용량</legend>
    <div class="form-row cols-2">
      <div class="field"><label for="ht-usual">난방기 없이 한 달 사용량</label>${unitInput(`id="ht-usual"`, "kWh", "250")}<p class="help">가을(9~10월) 고지서의 '사용량(kWh)'을 넣으세요. 누진 구간을 맞추는 데 필요합니다.</p></div>
      <div class="field"><label for="ht-month">계산할 달</label><select id="ht-month">${MONTH_OPTS}</select><p class="help">12~2월은 1,000kWh를 넘으면 슈퍼유저 요금이 붙습니다.</p></div>
    </div>
  </fieldset>
  <fieldset class="tx-group"><legend>쓸 난방기·가습기 (최대 5개)</legend>
    <div id="ht-rows" class="tx-deps"></div>
    <div class="actions"><button class="btn btn-ghost btn-sm" type="button" id="ht-add"><iconify-icon icon="solar:add-circle-linear"></iconify-icon> 기기 더하기</button></div>
    <p class="help">소비전력은 제품 라벨이나 상세페이지의 '정격 소비전력'을 넣으세요. 온수매트는 물을 데울 때 기준입니다.</p>
  </fieldset>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button><button class="btn btn-ghost btn-sm" type="button" id="ht-example"><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> 예시로 채우기</button><button class="btn btn-ghost btn-sm" type="button" data-share=""><iconify-icon icon="solar:share-linear"></iconify-icon> 공유</button></div>
  <p class="note tx-privacy">입력값은 이 브라우저 안에서만 계산하고 어디에도 보내거나 저장하지 않습니다. 공유 버튼은 페이지 주소만 보냅니다.</p>
</form>${ROW_TPL}`;

const won = (n) => n.toLocaleString("ko-KR") + "원";
const RATE_TABLE = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>구간 (7~8월 빼고)</th><th>기본요금</th><th>kWh당</th></tr></thead><tbody>
  <tr><td>200kWh 이하</td><td>910원</td><td>120.0원</td></tr><tr><td>201~400kWh</td><td>1,600원</td><td>214.6원</td></tr><tr><td>400kWh 초과</td><td>7,300원</td><td>307.3원</td></tr>
</tbody></table></div>`;
const KIND_TABLE = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>기기</th><th>흔한 소비전력</th><th>하루 8시간·30일</th></tr></thead><tbody>
  ${[["전기장판·전기요", 300], ["온수매트(데울 때)", 300], ["카본매트", 200], ["전기히터·온풍기", 1500], ["라디에이터", 2000], ["가습기 가열식", 300], ["가습기 초음파식", 30]].map(([l, w]) => `<tr><td>${l}</td><td>${w.toLocaleString("ko-KR")}W</td><td>${Math.round(w * 8 * 30 / 100) / 10}kWh</td></tr>`).join("")}
</tbody></table></div>`;

const GROUP_LABEL = { mat: "전기요·전기장판", water: "온수매트", carbon: "카본매트", heater: "전기히터·온풍기", humid: "가습기" };
const PICK_CARD = HAS_LINKS ? card("많이 사는 난방·가습 제품",
  `<p class="kp-disc kp-disc-top">${DISCLOSURE}</p>` + P(`쿠팡에서 리뷰가 많은 쿠팡 직매입 상품을 종류별로 골랐습니다(${PICKED} 확인). 전기장판·히터·가습기는 에너지효율등급 대상이 아니어서 제품마다 소비전력이 다릅니다. 사기 전에 상세페이지의 정격 소비전력을 위 계산기에 넣어 한 달 요금을 미리 보세요.`)
  + `<div class="tbl-wrap"><table class="tbl kp-pick"><thead><tr><th>종류</th><th>제품 (쿠팡에서 보기)</th></tr></thead><tbody>${Object.entries(LINKS).flatMap(([id, list]) => list.filter((p) => p && p.url).map((p, i, arr) => `<tr>${i === 0 ? `<td class="kp-c" rowspan="${arr.length}">${GROUP_LABEL[id]}</td>` : ""}<td class="kp-p"><a class="kp-buy" href="${p.url}" target="_blank" rel="sponsored nofollow noopener">${p.img ? `<img class="kp-img" src="${p.img}" alt="" width="64" height="64" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}${p.name}</a></td></tr>`)).join("")}</tbody></table></div>`
  + P("가격과 재고는 쿠팡에서 수시로 바뀝니다.")) : "";

const INFO = [
  card("전기장판을 하루 8시간 쓰면 한 달에 얼마 더 나오나?", P("300W 전기장판을 하루 8시간, 30일 쓰면 72kWh입니다. 같은 72kWh라도 <b>평소 사용량에 따라 늘어나는 요금이 다릅니다.</b> 누진제 때문에 많이 쓰는 집일수록 1kWh가 비싸집니다(12월 기준, 부가세·기금 포함).")
    + UL([`평소 150kWh: ${won(23670)} → ${won(37670)}, <b>${won(14000)}</b> 늘어남 (1구간 → 2구간)`, `평소 250kWh: ${won(44880)} → ${won(63420)}, <b>${won(18540)}</b> 늘어남`, `평소 350kWh: ${won(70640)} → ${won(97910)}, <b>${won(27270)}</b> 늘어남 (2구간 → 3구간)`])
    + P("온도조절기가 껐다 켜기를 반복하면 실제 사용량은 이보다 적습니다. 계산기의 '켜져 있는 비율'로 조정할 수 있습니다."), `${SRC.rate} (${CHECKED} 확인)`),
  card("주택용 전기요금 누진 구간은 어떻게 나뉘나?", P("주택용(저압)은 한 달 사용량에 따라 3구간으로 나뉩니다. 겨울(11~2월)은 7~8월을 뺀 '기타계절' 구간을 씁니다.") + RATE_TABLE
    + P("7~8월은 300kWh·450kWh에서 구간이 바뀝니다. 12~2월과 7~8월에 한 달 1,000kWh를 넘으면 넘는 사용량에 kWh당 736.2원(슈퍼유저 요금)이 붙습니다."), `${SRC.rate}, 2024-01-01 적용분 (${CHECKED} 확인)`),
  card("고지서 금액은 어떻게 계산되나?", UL([
    "<b>전기요금</b> = 기본요금 + 전력량요금 + 기후환경요금(kWh당 9원) + 연료비조정요금(kWh당 5원, 2026년 4분기)",
    "<b>청구금액</b> = 전기요금 + 부가가치세(10%, 원 미만 반올림) + 전력산업기반기금(2.7%, 10원 미만 버림), 10원 미만 버림",
    "복지할인·대가족 할인·TV 수신료는 넣지 않았습니다. 아파트 단지 계약이나 고압 주택은 단가가 달라 고지서와 차이가 날 수 있습니다.",
  ]), `${SRC.rate} 일반사항 (${CHECKED} 확인)`),
  card("기기별 소비전력은 얼마나 되나?", P("계산기의 기본값은 흔한 제품의 정격 소비전력입니다. 전기장판 300W는 한전의 사용제품 요금계산 예시값입니다. 제품마다 차이가 크니 라벨 값으로 바꾸세요.") + KIND_TABLE
    + P("전기히터는 1시간만 써도 1.5kWh 안팎이라 매트류 5시간과 비슷합니다. 가습기는 가열식이 초음파식보다 10배쯤 전기를 씁니다."), `${SRC.calc} (${CHECKED} 확인)`),
  card("난방기 전기요금을 줄이려면?", UL([
    "<b>누진 경계를 확인하세요.</b> 평소 사용량이 200kWh·400kWh 바로 아래라면, 난방기 때문에 구간이 올라가 kWh당 단가와 기본요금이 함께 뛸 수 있습니다.",
    "매트류는 잠들기 전에 데우고 온도를 낮추거나 타이머를 쓰면 켜져 있는 시간이 줄어듭니다.",
    "전기히터는 넓은 공간을 오래 데우기보다 짧게, 사람 가까이에서 쓰는 편이 사용량이 적습니다.",
    "가습기는 초음파식(약 30W)이 가열식(약 300W)보다 전기를 훨씬 덜 씁니다. 대신 세척을 자주 해야 합니다.",
  ])),
  PICK_CARD,
  card("이 페이지에 대해", UL([
    "날셈은 <b>한국전력공사 공식 사이트가 아닙니다.</b> 공개된 요금표로 계산한 예상 요금이고, 실제 요금은 검침일·계약 조건에 따라 다릅니다.",
    `요금표는 ${CHECKED}에 한전ON에서 확인했습니다. 연료비조정단가는 분기마다 바뀔 수 있습니다.`,
    HAS_LINKS ? DISCLOSURE : "이 페이지에는 광고 수수료를 받는 쇼핑 링크가 없습니다.",
  ])),
].join("");

export const heater = [
  {
    slug: "heater-electricity", cat: "bill", title: "전기장판·난방기 전기요금 계산기", short: "전기장판·히터·가습기, 한 달 전기세 얼마",
    lede: `전기장판·온수매트·전기히터·가습기를 쓰면 한 달 전기요금이 얼마나 늘어나는지 누진 구간까지 넣어 계산합니다. 주택용 저압, 2026년 겨울 요금 기준입니다.${HAS_LINKS ? ` <span class="kp-disc">${DISCLOSURE}</span>` : ""}`,
    description: "전기장판·전기요·온수매트·카본매트·전기히터·라디에이터·가습기의 소비전력과 사용 시간을 넣으면 한 달 전기요금이 얼마나 늘어나는지 계산합니다. 평소 사용량을 넣어 누진 구간(200·400kWh), 부가세·전력산업기반기금까지 반영한 주택용 저압 2026년 겨울 기준 예상 요금입니다.",
    keys: ["전기장판 전기세", "전기장판 전기요금", "온수매트 전기세", "카본매트 전기세", "전기히터 전기요금", "라디에이터 전기세", "가습기 전기세", "난방기 전기요금 계산기", "전기요금 누진세 계산"],
    form: FORM, assets: ["heater.js", "heater-ui.js"],
    script: `window.HEATER_LINKS=${JSON.stringify(LINKS)};`,
    related: ["kepco-appliance"],
    info: INFO,
  },
];
