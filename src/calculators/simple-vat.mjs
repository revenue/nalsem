// 사업자 세금: 간이과세자 부가가치세 계산기 (2026년 귀속, 2027-01-25 확정신고분).
// 계산은 docs/assets/simple-vat.js(엔진)와 docs/assets/simple-vat-ui.js(화면)가 브라우저 안에서 한다. 매출·매입 금액은 주소·통계·저장소에 넣지 않는다.
// 조문 출처·확인 날짜: 본부 저장소 ventures/simple-vat/benchmark.md (2026-11-22 국가법령정보센터 대조)
// 예시의 숫자는 simple-vat.js 로 계산한 값이다(test/simple-vat.test.mjs 의 "스마트스토어 3,000만", "배달 음식점 6,000만" 테스트와 같다).
// 세무사법: 계산과 공식 자료 안내만 한다. 상담·신고 대리·"절세 전략" 같은 표현을 쓰지 않는다.
import { ARROW } from "../layout.mjs";

export const DISCLAIMER = "참고용 추정입니다. 최종 세액은 홈택스 신고서 화면에서 확인하세요. 날셈은 세무 상담이나 신고 대리를 하지 않습니다.";
const CHECKED = "2026-11-22";

const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const OL = (items) => `<ol class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const LAW = {
  vat: a("https://www.law.go.kr/법령/부가가치세법", "부가가치세법"),
  exempt: a("https://www.law.go.kr/법령/부가가치세법/제69조", "부가가치세법 제69조"),
  tax: a("https://www.law.go.kr/법령/부가가치세법/제63조", "제63조"),
  card: a("https://www.law.go.kr/법령/부가가치세법/제46조", "제46조"),
  file: a("https://www.law.go.kr/법령/부가가치세법/제67조", "제67조"),
  dec: a("https://www.law.go.kr/법령/부가가치세법시행령", "부가가치세법 시행령 제109조·제111조"),
  efile: a("https://www.law.go.kr/법령/조세특례제한법시행령/제104조의5", "조세특례제한법 시행령 제104조의5"),
  nts: a("https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7693&mi=22", "국세청 부가가치세 안내"),
  ntsCase: a("https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?nttSn=1330029", "국세청 「사례로 배우는 부가가치세 전자신고 방법」(간이, 2024.1)"),
};

// 업종 목록: simple-vat.js 의 INDUSTRIES 와 같은 순서·값 (test/simple-vat.test.mjs 가 시행령 표와 대조)
const IND = [
  ["retail", "소매업 (온라인 판매·스마트스토어 포함)", 15], ["food", "음식점업 (배달 전문점·카페 포함)", 15], ["recycle", "재생용 재료수집 및 판매업", 15],
  ["mfg", "제조업", 20], ["agri", "농업·임업·어업", 20], ["parcel", "소화물 전문 운송업", 20], ["lodging", "숙박업", 25],
  ["build", "건설업", 30], ["transport", "운수 및 창고업", 30], ["ict", "정보통신업", 30], ["service", "그 밖의 서비스업 (미용·세탁·수리 등)", 30],
  ["rent", "부동산임대업", 40], ["pro", "전문·과학·기술서비스업, 사업지원·임대서비스업 등", 40],
];
const IND_OPTS = IND.map(([v, l, r]) => `<option value="${v}">${l} · ${r}%</option>`).join("");
const OPEN_OPTS = `<option value="before">2025년 이전 (2026년 1년 내내 영업)</option>` + Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">2026년 ${i + 1}월</option>`).join("");

const unitInput = (attr, unit = "만 원", ph = "") => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input ${attr} type="text" inputmode="decimal" autocomplete="off"${ph ? ` placeholder="${ph}"` : ""}></div></div>`;
const money = (id, label, help = "", ph = "") => `<div class="field"><label for="${id}">${label}</label>${unitInput(`id="${id}"`, "만 원", ph)}${help ? `<p class="help">${help}</p>` : ""}</div>`;

const ROW_TPL = `<template id="sv-tpl"><div class="tx-dep sv-row">
  <div class="tx-dep-head"><b class="sv-name">업종</b><button type="button" class="tx-x" data-remove aria-label="이 업종 빼기"><iconify-icon icon="solar:close-circle-linear"></iconify-icon></button></div>
  <div class="form-row cols-2">
    <div class="field"><label data-for="ind">업종 (사업자등록증의 업태·종목)</label><select data-k="ind">${IND_OPTS}</select></div>
    <div class="field"><label data-for="sales">2026년 매출 (부가세 포함 금액)</label>${unitInput(`data-k="sales"`, "만 원", "3000")}</div>
  </div>
</div></template>`;

const FORM = `<form id="vf" autocomplete="off" novalidate>
  <fieldset class="tx-group"><legend>2026년 매출</legend>
    <div id="sv-rows" class="tx-deps"></div>
    <div class="actions"><button class="btn btn-ghost btn-sm" type="button" id="sv-add"><iconify-icon icon="solar:add-circle-linear"></iconify-icon> 업종 더하기</button></div>
    <p class="help">매출은 손님에게 받은 돈 그대로(부가세 포함, '공급대가')를 1~12월 합계로 넣습니다. 스마트스토어는 정산금이 아니라 결제 금액 기준이고, 홈택스의 신용카드·현금영수증·판매대행 매출 조회로 맞춰 볼 수 있습니다. 업종이 둘 이상이면 업종을 더합니다(최대 3개).</p>
    <div class="field"><label for="sv-open">개업 시기</label><select id="sv-open">${OPEN_OPTS}</select><p class="help">2026년에 개업했다면 4,800만 원 기준을 12개월로 늘려(환산) 판정합니다. 개업한 달은 하루만 영업해도 한 달로 셉니다.</p></div>
  </fieldset>
  <fieldset class="tx-group"><legend>공제에 쓰는 금액</legend>
    ${money("sv-card", "매출 중 카드·현금영수증·간편결제로 받은 금액", "신용카드·체크카드·현금영수증·네이버페이 같은 결제대행 매출입니다. 1.3%를 세금에서 뺍니다(2026년분, 연 1,000만 원까지). 2025년 매출이 4,800만 원 이상인 기존 사업자는 주로 소비자를 상대하는 업종만 받습니다.", "2800")}
    ${money("sv-buy", "매입 중 세금계산서·사업용 카드·지출증빙 현금영수증을 받은 금액", "부가세 포함 금액입니다. 0.5%를 세금에서 뺍니다. 면세품(농축수산물 등) 매입, 접대비, 사업과 관계없는 지출은 빼고 넣으세요. 영수증만 발급하는 간이과세자 가게나 미용실·택시·입장권처럼 카드로 결제해도 공제가 안 되는 곳도 있으니 홈택스에서 불러온 금액을 기준으로 하세요.", "2000")}
  </fieldset>
  <details class="tx-fold"><summary>더 정확하게 (선택)</summary><div class="tx-fold-body">
    ${money("sv-pre", "2026년 7월에 이미 낸 부가세 (예정고지·예정신고)", "고지서를 받아 냈다면 넣습니다. 2026년에 개업했다면 보통 없습니다.")}
    <div class="field"><label for="sv-einv">2026년에 발급한 전자세금계산서 건수</label>${unitInput(`id="sv-einv"`, "건", "0")}<p class="help">건당 200원, 연 100만 원까지 뺍니다. 2026년에 개업한 간이과세자는 첫 해에 세금계산서를 발급하지 않으므로 보통 0건입니다.</p></div>
    <div class="tx-checks"><label><input type="checkbox" id="sv-prev"> 2025년 이전 개업이고 2025년 매출(부가세 포함)이 4,800만 원 이상이었다</label></div>
    <p class="help">해당하면 카드 매출 공제는 주로 소비자를 상대하는 업종만 받고, 전자세금계산서 발급 공제를 받을 수 있습니다.</p>
    <div class="tx-checks"><label><input type="checkbox" id="sv-efile" checked> 홈택스·손택스로 직접 신고 (전자신고세액공제 5천 원)</label></div>
  </div></details>
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button><button class="btn btn-ghost btn-sm" type="button" data-ex="store"><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> 예시: 스마트스토어 3천만</button><button class="btn btn-ghost btn-sm" type="button" data-ex="food"><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> 예시: 배달 음식점 6천만</button><button class="btn btn-ghost btn-sm" type="button" data-share=""><iconify-icon icon="solar:share-linear"></iconify-icon> 공유</button></div>
  <p class="note tx-privacy">입력한 금액은 이 브라우저 안에서만 계산하고 어디에도 보내거나 저장하지 않습니다. 공유 버튼은 페이지 주소만 보냅니다. ${DISCLAIMER}</p>
</form>${ROW_TPL}`;

const RATE_TABLE = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>업종</th><th>부가가치율</th><th>매출 대비 세금</th></tr></thead><tbody>${[
  ["소매업, 재생용 재료수집 및 판매업, 음식점업", 15], ["제조업, 농업·임업·어업, 소화물 전문 운송업", 20], ["숙박업", 25],
  ["건설업, 운수 및 창고업(소화물 전문 운송업 제외), 정보통신업", 30], ["금융·보험 관련 서비스업, 전문·과학·기술서비스업(인물사진·행사용 영상 촬영업 제외), 사업시설관리·사업지원·임대서비스업, 부동산 관련 서비스업, 부동산임대업", 40], ["그 밖의 서비스업", 30],
].map(([l, r]) => `<tr><td>${l}</td><td>${r}%</td><td>${(r / 10).toFixed(1)}%</td></tr>`).join("")}</tbody></table></div>`;

const INFO = [
  card("1월 부가세가 0원인 사람은 누구인가요?", UL([
    "간이과세자는 <b>2026년 1~12월 매출(부가세 포함)이 4,800만 원 미만</b>이면 부가세를 내지 않습니다(납부의무 면제). 정확히 4,800만 원이면 면제가 아닙니다.",
    "<b>2026년에 개업했다면</b> 개업한 달부터 12월까지의 매출을 12개월로 늘려서 봅니다. 7월에 개업해 2,500만 원을 벌었다면 5,000만 원으로 보아 면제가 아닙니다. 개업한 달은 며칠만 영업해도 한 달로 셉니다.",
    "<b>면제여도 신고는 해야 합니다.</b> 신고 기한은 <b>2027년 1월 25일(월)</b>입니다. 기한이 주말이 아니라 미뤄지지 않습니다.",
    "면제가 아닌 사람도 카드 매출·매입 공제로 세금이 0원이 될 수 있습니다. 다만 공제가 세금보다 많아도 남는 공제는 돌려받지 못합니다(간이과세자는 환급이 없습니다).",
  ]), `${LAW.exempt}·${LAW.file}, ${LAW.nts} (${CHECKED} 확인)`),
  card("간이과세자 부가세는 어떻게 계산하나요?", P("<b>납부세액 = 매출(공급대가) × 업종별 부가가치율 × 10% − 공제세액</b>. 둘 이상 업종이면 업종별로 계산해 더합니다.") + RATE_TABLE
    + UL([
      "<b>매입 공제</b>: 세금계산서·사업용 카드·지출증빙 현금영수증으로 받은 매입(부가세 포함)의 0.5%",
      "<b>카드 매출 공제</b>: 카드·현금영수증·결제대행으로 받은 매출의 1.3%, 연 1,000만 원까지(2026년 12월 31일까지 발급분). 2026년 개업자와 2025년 매출 4,800만 원 미만인 간이과세자는 업종과 관계없이, 그 밖에는 주로 소비자를 상대하는 업종만 받습니다",
      "<b>전자신고 공제</b>: 홈택스로 직접 신고하면 5천 원(2026년 2월 시행령 개정으로 1만 원에서 줄었습니다)",
      "<b>전자세금계산서 발급 공제</b>: 건당 200원, 연 100만 원까지(영수증만 발급하는 간이과세자는 제외)",
    ]), `${LAW.tax}·${LAW.card}, ${LAW.dec}, ${LAW.efile} (${CHECKED} 확인)`),
  card("스마트스토어 매출 3,000만 원이면 부가세는?", P("2026년 1월에 개업한 온라인 판매(소매업 15%) 간이과세자가 1년 동안 3,000만 원을 팔았고, 그중 2,800만 원이 카드·간편결제, 사업용 매입이 2,000만 원이라고 하면 이렇게 됩니다.")
    + UL(["매출 3,000만 원은 4,800만 원 미만이라 <b>납부면제, 낼 세금 0원</b>입니다.", "면제가 없었다면 3,000만 원 × 15% × 10% = 45만 원에서 매입 공제 10만 원, 카드 공제 36.4만 원, 전자신고 5천 원을 빼 역시 0원입니다.", "그래도 <b>2027년 1월 25일까지 신고</b>는 해야 합니다."])),
  card("배달 음식점 매출 6,000만 원이면 부가세는?", P("2025년 이전에 개업한 배달 음식점(음식점업 15%)이 2026년에 6,000만 원을 팔았고, 그중 5,500만 원이 카드·배달앱 결제, 식자재 등 공제되는 매입이 2,500만 원이라고 하면 이렇게 됩니다.")
    + UL(["6,000만 원 × 15% × 10% = <b>90만 원</b>", "매입 2,500만 원 × 0.5% = 12.5만 원, 카드 5,500만 원 × 1.3% = 71.5만 원, 전자신고 5천 원을 빼면", "<b>납부할 세액 5만 5천 원</b>입니다."])),
  card("홈택스에서는 어떤 순서로 신고하나요?", OL([
    "홈택스(hometax.go.kr)나 손택스 앱에 로그인합니다(간편인증·공동인증서).",
    "<b>세금신고 → 부가가치세 신고 → 간이과세자 정기신고(확정)</b>로 들어갑니다. 메뉴 이름은 국세청 2024년 1월 안내 기준이라 조금 다를 수 있습니다.",
    "사업자 정보와 업종을 확인하고 저장합니다.",
    "매출: 카드·현금영수증 발행금액은 불러오기로 채우고, 현금 등 나머지 매출을 넣습니다.",
    "매입: 매입처별 세금계산서합계표(전자세금계산서 불러오기)와 신용카드매출전표 등 수령명세서(사업용 카드 불러오기)를 작성합니다.",
    "카드 매출 공제(1.3%)와 전자신고 공제가 자동으로 들어갔는지 보고, 납부할 세액을 확인한 뒤 신고서를 제출하고 접수증을 확인합니다.",
    "낼 세금이 있으면 2027년 1월 25일까지 홈택스에서 납부합니다. 납부면제라면 신고서 제출로 끝납니다.",
  ]), `${LAW.ntsCase} (${CHECKED} 확인)`),
  card("5월 종합소득세는 무엇을 준비하나요?", UL([
    "부가세 신고와 별개로, 2026년에 번 사업소득은 <b>2027년 5월 1~31일</b>에 종합소득세로 신고합니다. 회사에 다니면 회사 연말정산(근로소득)과 부업 사업소득을 합쳐 5월에 다시 신고합니다.",
    "부가세 신고서의 매출 합계를 5월에 다시 쓰니 신고서와 접수증을 저장해 두세요.",
    "경비 증빙(세금계산서, 사업용 카드 내역, 지출증빙 현금영수증)을 모아 둡니다. 사업용 카드는 홈택스에 등록하면 내역을 불러올 수 있습니다.",
    "장부를 쓸지(간편장부) 경비율로 계산할지는 5월에 국세청이 보내는 신고 안내문의 유형을 보고 정합니다.",
    "직장가입자는 월급 외 소득(매출이 아니라 경비를 뺀 소득금액 기준)이 연 2,000만 원을 넘으면 건강보험료가 더 붙을 수 있습니다. 국민건강보험공단 안내로 확인하세요.",
    "회사 취업규칙의 겸업 규정도 확인해 두세요.",
  ])),
  card("이 계산기로 계산할 수 없는 경우는?", UL([
    "2026년 7월 1일에 간이과세자에서 일반과세자로 바뀐 사람(1~6월분을 7월에 신고)과 일반과세자",
    "2026년 7월 1일에 일반과세자에서 간이과세자로 바뀐 사람(7~12월분을 6개월 환산), 2026년에 휴업·폐업한 사람",
    "과세사업과 면세사업을 함께 하는 경우, 일반과세자에서 간이과세자로 바뀌며 생기는 재고납부세액, 가산세",
    "광업, 제조업·건설업(최종소비자 대상 제외), 도매업, 부동산매매업, 변호사·세무사 같은 전문자격사업, 전문·과학·기술서비스업과 사업지원서비스업(최종소비자 대상 제외), 복식부기의무자 등은 간이과세를 받을 수 없습니다. 사업자등록증의 과세유형이 '간이과세자'인지 먼저 보세요.",
    "사업자등록 없이 3.3%를 떼고 받는 프리랜서(인적용역)는 보통 부가세 신고 대상이 아니고 5월 종합소득세만 신고합니다.",
  ]), `${LAW.vat} 제61조·제62조, ${LAW.dec}`),
  card("날셈은 국세청 사이트인가요?", UL([
    "날셈은 <b>국세청 공식 사이트가 아니며</b>, 세무 상담이나 신고 대리를 하지 않습니다. 공개된 법령과 국세청 안내로 만든 계산기입니다.",
    `${DISCLAIMER} 기준 확인일 ${CHECKED}(국가법령정보센터 현행 조문).`,
    "카드 매출 공제의 1.3%·연 1,000만 원은 2026년 12월 31일 발급분까지이고, 현행법으로는 2027년 발급분부터 1%·연 500만 원입니다. 2026년 8월 정부 세제개편안에 1.2%로 하는 안이 있다고 보도됐습니다. 2026년 매출을 신고하는 2027년 1월에는 영향이 없고, 국회 통과 내용을 확인해 고칠 예정입니다.",
    "이 페이지에는 광고 수수료를 받는 쇼핑·제휴 링크가 없습니다.",
  ])),
].join("");

export const simpleVat = [
  {
    slug: "simple-vat", cat: "biz", title: "간이과세자 부가세 계산기 (납부면제 판정)", short: "1월 부가세 0원인지, 내야 하면 얼마인지",
    lede: `2026년 간이과세자가 업종과 매출·매입·카드 매출을 넣으면 1월 부가세가 납부면제(4,800만 원 미만)인지, 내야 하면 대략 얼마인지 계산 과정과 함께 보여 줍니다. 2026년에 개업했다면 12개월로 환산해 판정합니다. 신고 기한은 2027년 1월 25일입니다. ${DISCLAIMER}`,
    description: "간이과세자 부가가치세 계산기. 2026년 매출(공급대가)·업종·매입·카드 매출·개업 시기를 넣으면 4,800만 원 납부면제 여부(신규 개업자는 12개월 환산), 업종별 부가가치율로 계산한 납부세액, 매입 0.5%·카드 1.3% 공제를 보여 주고 2027년 1월 25일 홈택스 신고 순서와 5월 종합소득세 준비를 안내합니다. 2026년 귀속 기준 참고용 추정.",
    keys: ["간이과세자 부가세 계산기", "간이과세자 부가세", "간이과세자 납부면제", "간이과세자 4800만원", "간이과세자 부가세 신고", "간이과세자 업종별 부가가치율", "부가세 신고 1월", "스마트스토어 간이과세자 부가세"],
    form: FORM, assets: ["simple-vat.js", "simple-vat-ui.js"],
    info: INFO,
  },
];
