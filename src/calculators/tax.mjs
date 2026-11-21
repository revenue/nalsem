// 연말정산: 맞벌이 부부 공제 몰아주기 계산기 4종.
// 계산은 docs/assets/tax.js(엔진)와 docs/assets/tax-ui.js(화면)가 브라우저 안에서 한다. 금액 입력값은 주소·통계·저장소에 넣지 않는다.
// 세법 출처·확인 날짜: 본부 저장소 ventures/nalsem-dual-income/tax-rules.md (2026-11-21 대조)
// 예시 가구의 숫자는 tax.js 로 계산한 값이다(test/tax.test.mjs 의 "설명 카드 예시" 테스트가 다시 확인한다).
import { ARROW } from "../layout.mjs";

const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const SRC = {
  itax: a("https://www.law.go.kr/법령/소득세법", "소득세법"),
  child: a("https://www.law.go.kr/법령/소득세법/제59조의2", "소득세법 제59조의2"),
  special: a("https://www.law.go.kr/법령/소득세법/제59조의4", "소득세법 제59조의4"),
  personal: a("https://www.law.go.kr/법령/소득세법/제50조", "소득세법 제50조"),
  card: a("https://www.law.go.kr/법령/조세특례제한법/제126조의2", "조세특례제한법 제126조의2"),
  nts: a("https://www.nts.go.kr/", "국세청 「2025년 연말정산 신고안내」 부록 4 맞벌이 부부 연말정산"),
};
export const DISCLAIMER = "2026년 귀속 세법 기준 추정. 실제 결과는 1월 홈택스 '맞벌이 근로자 절세 안내'에서 확인하세요.";

// ── 입력 칸 ──
const unitInput = (attr, unit = "만 원", ph = "") => `<div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="${unit}"><input ${attr} type="text" inputmode="numeric" autocomplete="off"${ph ? ` placeholder="${ph}"` : ""}></div></div>`;
const money = (id, label, help = "", ph = "") => `<div class="field"><label for="${id}">${label}</label>${unitInput(`id="${id}"`, "만 원", ph)}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const pair = (key, l0, l1, help = "", ph = ["", ""]) => `<div class="form-row cols-2">${money("s0-" + key, l0, "", ph[0])}${money("s1-" + key, l1, "", ph[1])}</div>${help ? `<p class="help">${help}</p>` : ""}`;
const group = (legend, body) => `<fieldset class="tx-group"><legend>${legend}</legend>${body}</fieldset>`;
const fold = (title, body, open = false) => `<details class="tx-fold"${open ? " open" : ""}><summary>${title}</summary><div class="tx-fold-body">${body}</div></details>`;
const depMoney = (k, label, help = "") => `<div class="field"><label data-for="${k}">${label}</label>${unitInput(`data-k="${k}"`)}${help ? `<p class="help">${help}</p>` : ""}</div>`;
const depSelect = (k, label, opts) => `<div class="field"><label data-for="${k}">${label}</label><select data-k="${k}">${opts}</select></div>`;
const WHO = `<option value="0">나</option><option value="1">배우자</option>`;

const SEC = {
  income: () => group("총급여 (연봉에서 비과세를 뺀 금액)", pair("sal", "나", "배우자", "원천징수영수증의 '총급여'입니다. 모르면 연봉에서 식대 등 비과세(보통 월 20만 원)를 빼서 넣으세요. 2026년 1~12월 예상치면 됩니다.", ["6000", "4000"])),
  deps: () => `<div class="tx-sec" data-sec="deps">${group("부양가족 (자녀·부모님)", `<div id="deps" class="tx-deps"></div>
    <div class="actions"><button class="btn btn-ghost btn-sm" type="button" data-add="child"><iconify-icon icon="solar:add-circle-linear"></iconify-icon> 자녀</button><button class="btn btn-ghost btn-sm" type="button" data-add="parent"><iconify-icon icon="solar:add-circle-linear"></iconify-icon> 부모님</button><button class="btn btn-ghost btn-sm" type="button" data-add="other"><iconify-icon icon="solar:add-circle-linear"></iconify-icon> 형제자매</button></div>
    <p class="help">부부 중 한 사람만 공제받을 수 있는 가족을 넣습니다. 출생연도만 넣어도 계산되고, 이 가족에게 쓴 돈은 펼쳐서 넣습니다. 최대 6명.</p>`)}</div>`,
  medical: () => `<div class="tx-sec" data-sec="medical">${group("부부 본인 의료비", pair("medSelf", "나 본인 (이미 낸 것)", "배우자 본인 (이미 낸 것)") + pair("medSp", "내가 낸 배우자 의료비", "배우자가 낸 내 의료비", "실손보험으로 돌려받은 금액은 빼고 넣으세요. 자녀·부모님 의료비는 가족 칸에 넣습니다.") + pair("medPlan", "나 본인, 12월에 낼 예정", "배우자 본인, 12월에 낼 예정", "예정된 치료·검진·안경 등. 누가 결제하면 유리한지 계산합니다."))}</div>`,
  card: () => `<div class="tx-sec" data-sec="card">${group("1~11월 카드·현금영수증 사용액 (예상 포함)", `<div class="tx-cardgrid">
      <div><p class="tx-who">나</p>${money("s0-credit", "신용카드")}${money("s0-debit", "체크카드·현금영수증")}${money("s0-market", "전통시장·대중교통")}</div>
      <div><p class="tx-who">배우자</p>${money("s1-credit", "신용카드")}${money("s1-debit", "체크카드·현금영수증")}${money("s1-market", "전통시장·대중교통")}</div>
    </div><p class="help">카드사 앱이나 홈택스 '연말정산 미리보기'에서 1~9월 금액을 볼 수 있습니다. 보험료·세금·공과금·해외 사용은 빼고 넣으세요. 전통시장·대중교통 사용분은 신용·체크 칸에서 빼고 이 칸에만 넣습니다.</p>`)}
    ${group("12월에 쓸 예정 금액 (부부 합계)", `${money("dec-amt", "12월 예정 사용액", "", "300")}<div class="field"><label id="dec-kind-l">결제 수단</label><div class="seg" id="dec-kind" role="group" aria-labelledby="dec-kind-l"><button type="button" data-v="credit" aria-pressed="true">신용카드</button><button type="button" data-v="debit" aria-pressed="false">체크·현금</button></div></div><p class="help">0%~100%를 10% 단위로 나눠 부부 합산이 가장 유리한 비율을 찾습니다.</p>`)}</div>`,
  more: () => fold("더 정확하게 (선택)", `${pair("other", "나: 그 밖의 세액공제 합계", "배우자: 그 밖의 세액공제 합계", "연금저축·IRP, 월세, 기부금, 결혼세액공제 등으로 줄어드는 세액을 대략 넣습니다. 한쪽 세금이 0원에 가까우면 추천이 바뀔 수 있어 있는 칸입니다.")}
    ${pair("culture", "나: 도서·공연·영화·체육시설", "배우자: 도서·공연·영화·체육시설", "총급여 7천만 원 이하만 공제율 30%(초과자는 신용카드분으로 계산). 신용·체크 칸에서 뺀 금액을 넣으세요.")}
    ${pair("social", "나: 4대보험 근로자 부담 연간 합계", "배우자: 4대보험 근로자 부담 연간 합계", "비우면 2026년 요율(국민연금 4.75%, 건강 3.595%, 장기요양, 고용 0.9%)로 추정합니다.")}
    <div class="tx-checks"><label><input type="checkbox" id="s0-woman"> 나는 여성(부녀자공제 확인용)</label><label><input type="checkbox" id="s1-woman"> 배우자는 여성(부녀자공제 확인용)</label></div>
    <p class="help">부녀자공제 50만 원은 배우자가 있는 여성 근로자 중 근로소득금액 3천만 원(총급여 약 4,147만 원) 이하에게 적용됩니다.</p>`),
};

// 가족 한 명 (화면 스크립트가 복제하고 id 를 붙인다)
const DEP_TPL = `<template id="dep-tpl"><div class="tx-dep">
  <div class="tx-dep-head"><b class="dep-name">가족</b><button type="button" class="tx-x" data-remove aria-label="이 가족 빼기"><iconify-icon icon="solar:close-circle-linear"></iconify-icon></button></div>
  <div class="form-row cols-2">
    ${depSelect("rel", "관계", `<option value="child">자녀·손자녀</option><option value="parent">부모·조부모</option><option value="other">형제자매</option>`)}
    <div class="field tx-by"><label data-for="by">출생연도</label>${unitInput(`data-k="by" maxlength="4"`, "년", "2015")}<p class="err" role="alert"></p></div>
  </div>
  <div class="tx-checks"><label><input type="checkbox" data-k="dis"> 장애인</label><label><input type="checkbox" data-k="inc" checked> 연 소득 100만 원 이하 (근로소득만 있으면 총급여 500만 원 이하)</label></div>
  <div class="only-child">${depSelect("bo", "2026년에 출생·입양", `<option value="0">아니요</option><option value="1">예, 첫째</option><option value="2">예, 둘째</option><option value="3">예, 셋째 이상</option>`)}</div>
  <details class="tx-fold"><summary>이 가족에게 쓴 돈 (선택)</summary><div class="tx-fold-body">
    <div class="form-row cols-2">${depMoney("m0", "의료비: 내가 이미 낸 것")}${depMoney("m1", "의료비: 배우자가 이미 낸 것")}</div>
    ${depMoney("mp", "의료비: 12월에 낼 예정", "기본공제 받는 사람이 결제해야 공제됩니다. 결과에 누가 결제할지 나옵니다.")}
    <div class="form-row cols-2">${depMoney("ea", "교육비 (낸 금액)")}${depSelect("ek", "교육 단계", `<option value="pre">취학 전</option><option value="school" selected>초·중·고</option><option value="univ">대학</option>`)}</div>
    <div class="form-row cols-2">${depSelect("ep", "교육비 낸 사람", WHO)}${depMoney("ia", "보장성보험료 (낸 금액)")}</div>
    <div class="form-row cols-2">${depSelect("ip", "보험 계약자(낸 사람)", WHO)}${depMoney("cd", "이 가족 명의 카드 사용액")}</div>
  </div></details>
</div></template>`;

function form(focus) {
  const order = { all: ["deps", "medical", "card"], deps: ["deps", "medical", "card"], medical: ["medical", "deps", "card"], card: ["card", "deps", "medical"] }[focus];
  const titles = { deps: "부양가족", medical: "의료비", card: "카드 사용액과 12월 계획" };
  const hint = { deps: "자녀가 있으면 카드 공제 한도가 오릅니다", medical: "수술·검진 예정이 있으면", card: "12월에 카드를 더 쓴다면" };
  const open = { all: ["deps"], deps: ["deps"], medical: ["medical", "deps"], card: ["card"] }[focus];
  const secs = order.map((k) => (open.includes(k) ? SEC[k]() : fold(`${titles[k]} (선택) <span class="tx-hint">${hint[k]}</span>`, SEC[k]()))).join("");
  return `<form id="tf" autocomplete="off" novalidate data-focus="${focus}">
  ${SEC.income()}
  ${secs}
  ${SEC.more()}
  <div class="actions"><button class="btn btn-primary" type="submit">계산${ARROW}</button><button class="btn btn-ghost btn-sm" type="button" id="tx-example"><iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> 예시로 채우기</button><button class="btn btn-ghost btn-sm" type="button" data-share=""><iconify-icon icon="solar:share-linear"></iconify-icon> 공유</button></div>
  <p class="note tx-privacy">입력한 금액은 이 브라우저 안에서만 계산하고 어디에도 보내거나 저장하지 않습니다. 공유 버튼은 페이지 주소만 보냅니다.</p>
</form>${DEP_TPL}`;
}

// ── 설명 카드: 페이지마다 다른 내용 ──
const CHANGES_2026 = card("2026년에 바뀐 것", UL([
  "<b>자녀세액공제 나이</b>: 8세 이상에서 <b>9세 이상</b>(2017년 이전 출생)으로 올라갔고, 2029년 12세까지 해마다 한 살씩 오릅니다. 2017년생은 개정 부칙의 문언상 2026년에 빠지는 것으로 읽혀, 국세청 안내가 나올 때까지 확인이 필요합니다.",
  "<b>카드 공제 한도</b>: 20세 이하 자녀를 기본공제 받는 사람은 기본한도가 자녀 1명 50만 원, 2명 이상 100만 원 오릅니다(총급여 7천만 원 초과는 25만·50만 원). 자녀를 누구에게 올리느냐가 카드 한도까지 바꿉니다.",
  "<b>교육비</b>: 가족의 소득 요건이 없어졌고, 초등 1~2학년(9세 미만) 예체능 학원·체육시설 수강료가 새로 공제됩니다.",
  "<b>결혼세액공제</b>: 2026년 12월 31일까지 혼인신고한 부부가 받는 마지막 해입니다(처음 받는 사람 각 50만 원). 누구에게 몰지와는 관계없습니다.",
]), `${SRC.child}와 부칙(2026.4.21 개정), ${SRC.card} ⑩, ${SRC.special} ③`);

const LIMITS = card("이 계산기의 범위와 한계", P(DISCLAIMER) + UL([
  "원 단위까지 맞추는 계산이 아니라 <b>누구에게 몰면 유리한지</b>를 고르는 계산입니다. 금액은 만 원 단위로 반올림해 보여 줍니다.",
  "이미 낸 의료비·카드·교육비·보험료는 낸 사람 것으로 고정합니다. 다른 사람 이름으로 공제받으면 부당공제가 되어 가산세 대상입니다.",
  "4대보험료는 2026년 요율로 추정하고, 연금저축·주택자금·월세·기부금은 '그 밖의 세액공제 합계' 하나로 받습니다. 형제끼리 부모님을 나누는 경우, 난임시술비(30%)·산후조리원 한도는 따로 계산하지 않습니다.",
  "국세청의 2026년 귀속 연말정산 안내 책자는 12~1월에 나옵니다. 그 전까지는 소득세법·조세특례제한법 현행 조문과 2025년 귀속 책자를 기준으로 했고, 책자가 나오면 다시 맞춰 봅니다.",
]), `${SRC.itax}, ${SRC.card}, ${SRC.nts}. 대조일 2026-11-21`);

const INFO = {
  all: card("세 가지를 누구에게 몰까", P("맞벌이 부부가 연말정산에서 실제로 고를 수 있는 것은 세 가지입니다.") + UL([
      "<b>부양가족</b>: 자녀·부모님은 부부 중 한 사람만 기본공제(1명 150만 원)를 받습니다. 자녀세액공제, 그 가족의 교육비·보험료·의료비·카드 사용액, 카드 한도 상향이 함께 따라갑니다.",
      "<b>의료비</b>: 총급여의 3%를 넘는 금액부터 15% 세액공제입니다. 문턱이 총급여에 비례해 소득이 낮은 쪽이 넘기 쉽지만, 그 사람의 세금이 적으면 공제가 다 쓰이지 못합니다.",
      "<b>12월 카드</b>: 총급여의 25%를 넘는 사용액부터 공제됩니다. 이미 문턱을 넘은 쪽 카드로 쓰는 것이 보통 유리하고, 한도에 닿았으면 반대입니다.",
    ]) + P("계산기는 이 세 가지의 가능한 조합을 전부 계산해 부부 합산 세금(결정세액 + 지방소득세)이 가장 적은 조합을 고릅니다. '소득 높은 쪽에 몰아라' 같은 규칙을 정해 두지 않습니다."), SRC.nts),
  deps: card("부양가족 공제 규칙 (2026년 귀속)", UL([
      "<b>기본공제 1명 150만 원</b>, 부부 중 한 사람만. 둘 다 올리면 나중에 한쪽이 취소하고 가산세를 낼 수 있습니다.",
      "<b>나이</b>: 자녀 20세 이하(2006년 이후 출생), 부모님 60세 이상(1966년 이전 출생). 그 해 중 한 번이라도 그 나이였으면 됩니다. 장애인은 나이 제한이 없습니다.",
      "<b>소득</b>: 연 소득금액 100만 원 이하(근로소득만 있으면 총급여 500만 원 이하). 부모님의 공적연금·임대소득도 소득금액에 들어갑니다.",
      "<b>추가공제</b>: 70세 이상 경로우대 100만 원(1956년 이전 출생), 장애인 200만 원. 기본공제 받는 사람이 같이 받습니다.",
      "<b>자녀세액공제</b>: 9세 이상(2017년 이전 출생) 기본공제 자녀 1명 25만, 2명 55만, 셋째부터 1명당 40만 원. 2026년에 태어나거나 입양한 자녀는 첫째 30만, 둘째 50만, 셋째 이상 70만 원.",
    ]), `${SRC.personal}·제51조, ${SRC.child}`),
  medical: card("의료비 세액공제 계산법", UL([
      "<b>문턱</b>: 총급여의 3%. 총급여 5천만 원이면 150만 원을 넘게 쓴 부분부터 공제됩니다.",
      "<b>공제율</b>: 15%(난임시술비 30%, 미숙아·선천성이상아 20%).",
      "<b>한도</b>: 본인, 65세 이상, 장애인, 6세 이하(2026년 1월 1일 기준이라 2019년생 포함), 중증질환자는 한도가 없고, 그 밖의 가족(배우자 포함)은 합쳐 700만 원까지입니다.",
      "<b>3% 빼는 순서</b>: 한도 있는 의료비에서 먼저 빼고, 모자라면 한도 없는 의료비에서 뺍니다.",
      "<b>대상</b>: 시력교정용 안경·콘택트렌즈(1명 50만 원), 산후조리원(출산 1회 200만 원), 보청기 등이 들어가고 미용·성형, 건강기능식품, 실손보험으로 돌려받은 금액은 빠집니다.",
    ]), SRC.special),
  card: card("카드 공제 계산법 (2026년 사용분)", `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>수단</th><th>공제율</th></tr></thead><tbody><tr><td>신용카드</td><td class="num">15%</td></tr><tr><td>체크카드·현금영수증</td><td class="num">30%</td></tr><tr><td>도서·공연·영화·체육시설 (총급여 7천만 원 이하)</td><td class="num">30%</td></tr><tr><td>전통시장·대중교통</td><td class="num">40%</td></tr></tbody></table></div>` +
      P("총급여의 25%까지는 공제가 없고, 넘는 부분만 공제됩니다. 25%는 신용카드 사용액부터 채운 것으로 봅니다. 그래서 문턱 안쪽은 어떤 수단으로 써도 같고, 문턱을 넘은 뒤에는 체크카드가 신용카드의 두 배입니다.") +
      `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>기본한도</th><th>총급여 7천만 원 이하</th><th>초과</th></tr></thead><tbody><tr><td>자녀 없음</td><td class="num">300만 원</td><td class="num">250만 원</td></tr><tr><td>20세 이하 자녀 1명</td><td class="num">350만 원</td><td class="num">275만 원</td></tr><tr><td>2명 이상</td><td class="num">400만 원</td><td class="num">300만 원</td></tr></tbody></table></div>` +
      P("한도를 넘으면 전통시장·대중교통(7천만 원 이하는 문화체육 포함) 공제분으로 300만 원(초과자 200만 원)까지 더 받습니다. 부부 사용액은 합칠 수 없습니다."), `${SRC.card} ①②⑩⑪, 2025.12.23 개정`),
};

const EXAMPLE = {
  all: card("예시: 연봉 차이가 큰 부부", P("나 총급여 9,000만 원, 배우자 3,500만 원. 10살 자녀(2016년생), 68세 어머니(1958년생). 1~11월 카드는 나 1,600만 원, 배우자 1,200만 원이고 12월에 300만 원을 더 쓸 예정입니다.") + UL([
      "<b>자녀·어머니는 나에게</b>: 내 과세표준은 약 6,300만 원으로 24% 구간, 배우자는 약 1,870만 원으로 15% 구간입니다. 같은 150만 원 공제가 나에게서는 약 36만 원, 배우자에게서는 약 22만 원의 세금을 줄입니다(지방소득세 포함 한 명당 약 15만 원 차이).",
      "<b>12월 카드는 배우자 카드로</b>: 내 문턱은 2,250만 원(9,000만 원의 25%)이라 300만 원을 더 써도 공제가 없습니다. 배우자는 문턱 875만 원을 이미 넘어 300만 원 전부가 15% 공제 대상입니다(약 7만 원 차이).",
      "<b>합계</b>: 가장 불리하게 나눌 때(가족은 배우자에게, 12월 카드는 나)보다 부부 합산 약 47만 원 덜 냅니다. 전부 소득 높은 쪽으로 몰았을 때보다도 약 7만 원 덜 냅니다. 12월 카드까지 소득 높은 쪽으로 몰면 손해이기 때문입니다.",
    ])),
  deps: card("예시: 자녀 둘과 아버지", P("나 총급여 9,000만 원, 배우자 4,800만 원. 자녀 2014년생(12세)·2019년생(7세), 아버지 1952년생(74세).") + UL([
      "<b>세 명 모두 나에게</b>: 내 과세표준은 24% 구간, 배우자는 15% 구간이라 소득공제는 나에게서 효과가 큽니다. 아버지는 경로우대 100만 원이 더해져 250만 원 공제가 되므로 차이가 가장 큽니다(약 25만 원).",
      "<b>자녀세액공제</b>: 12세 자녀만 받습니다(25만 원). 7세 자녀는 2026년 기준 9세 미만이라 자녀세액공제가 없고 기본공제 150만 원만 따라갑니다. 이 25만 원은 둘 다 세금이 충분히 남아 있어 누구에게 가도 같습니다.",
      "<b>합계</b>: 셋 다 배우자에게 올릴 때보다 부부 합산 약 54만 원 덜 냅니다.",
      "<b>뒤집히는 경우</b>: 배우자도 과세표준이 8,800만 원을 넘어 24% 구간이거나, 공제가 많아 내 세금이 이미 0원에 가까우면 결과가 바뀝니다. 그래서 규칙 대신 매번 전부 계산합니다.",
    ])),
  medical: card("예시: 배우자 수술비와 아이 병원비", P("나 총급여 7,000만 원, 배우자 3,000만 원. 4살 자녀 병원비 150만 원을 배우자가 이미 냈고, 12월에 배우자 수술비 800만 원을 낼 예정입니다.") + UL([
      "<b>수술비는 내가 결제</b>: 배우자 본인이 내면 문턱(90만 원)이 낮아 공제 대상이 710만 원이지만, 배우자의 세금이 50만 원 안팎이라 세액공제(약 107만 원)의 절반 이상이 사라집니다. 내가 내면 '배우자를 위해 낸 의료비'가 되어 문턱 210만 원을 넘는 590만 원이 공제되고(약 89만 원), 내 세금에서 전부 쓰입니다. 차이는 약 44만 원입니다.",
      "<b>아이 기본공제는 나에게</b>: 배우자가 이미 낸 150만 원은 아이를 배우자에게 올려야 공제되지만, 그러면 배우자의 산출세액이 130만 원 아래로 내려가 근로소득세액공제(산출세액의 55%)도 함께 줄어듭니다. 이 손해를 넣고도 나에게 올리는 쪽이 약 6만 원 유리합니다. 계산기는 이렇게 공제받지 못하는 이미 낸 돈도 결과에 따로 적어 줍니다.",
    ])),
  card: card("예시: 12월에 300만 원 더 쓸 때", P("나 총급여 6,000만 원(1~11월 신용 1,300만 원), 배우자 4,000만 원(신용 1,400만 원). 12월에 300만 원을 쓸 예정입니다.") + UL([
      "<b>내 카드</b>: 문턱 1,500만 원까지 200만 원이 남아 300만 원 중 100만 원만 공제 대상입니다. 15만 원 소득공제, 세금은 약 2.5만 원 줄어듭니다.",
      "<b>배우자 카드</b>: 문턱 1,000만 원을 이미 넘어 300만 원 전부 공제 대상입니다. 45만 원 소득공제, 세금은 약 7.4만 원 줄어듭니다.",
      "<b>추천</b>: 배우자 카드로 전부, 약 5만 원 차이입니다. 배우자 체크카드로 쓰면 공제율이 30%라 약 15만 원까지 줄어듭니다.",
    ])),
};

const MISTAKES = {
  all: card("자주 틀리는 점", UL([
      "<b>소득 낮은 쪽에 의료비·카드를 몰면 무조건 이득</b>: 그 사람의 결정세액이 이미 0원에 가까우면 공제가 사라집니다. 결정세액은 0원 밑으로 내려가지 않습니다.",
      "<b>둘 다 아이를 올리기</b>: 회사마다 따로 연말정산을 해서 생기는 실수입니다. 나중에 한쪽이 취소하고 덜 낸 세금과 가산세를 냅니다.",
      "<b>배우자 이름으로 의료비·카드 옮기기</b>: 공제는 실제로 낸 사람이 받습니다. 바꿀 수 있는 건 앞으로 낼 돈의 결제자뿐입니다.",
      "<b>작년과 같게 하기</b>: 2026년에는 자녀세액공제 나이와 카드 한도가 바뀌었고, 연봉이 바뀌면 유리한 쪽도 바뀝니다.",
    ])),
  deps: card("자주 틀리는 점", UL([
      "<b>아이를 올리면 자녀세액공제만 따라간다고 생각하기</b>: 그 아이의 교육비·보험료·의료비, 아이 명의 카드, 카드 한도 상향까지 함께 따라갑니다. 그런데 교육비·의료비는 기본공제 받는 사람이 직접 낸 것만 공제됩니다.",
      "<b>보험 계약자와 공제받는 사람이 다름</b>: 아이 보험을 배우자가 계약해 내는데 아이를 내가 올리면, 그 보험료는 부부 둘 다 공제받지 못합니다.",
      "<b>부모님 소득</b>: 국민연금 같은 공적연금도 소득금액으로 계산합니다. 연금만 있어도 소득금액이 100만 원을 넘으면 기본공제가 안 됩니다. 이때도 부모님 의료비는 낸 사람이 공제받을 수 있습니다.",
      "<b>형제와 부모님 중복</b>: 형제자매 중 한 사람만 부모님을 올릴 수 있습니다. 이 계산기는 부부 사이 배분만 다룹니다.",
    ]), SRC.nts),
  medical: card("누가 공제받나 (자주 틀리는 점)", UL([
      "<b>배우자 의료비</b>: 소득이 있는 배우자를 위해 내가 낸 의료비는 <b>내가</b> 공제받습니다. 그래서 수술비·검진비 같은 큰 지출은 누가 결제할지 미리 정할 가치가 있습니다.",
      "<b>자녀·부모님 의료비</b>: 그 가족을 <b>기본공제 받는 사람이 낸 것만</b> 공제됩니다. 아이를 남편이 올렸는데 병원비를 아내가 냈다면 그 병원비는 누구도 공제받지 못합니다(국세청 예규 재소득-649).",
      "<b>이미 낸 돈</b>: 다른 사람이 낸 것으로 바꿀 수 없습니다. 이 계산기는 이미 낸 돈을 옮기라고 하지 않고, 기본공제 배정과 앞으로 낼 돈의 결제자만 추천합니다.",
      "<b>간소화 자료에 없는 의료비</b>: 안경점·산후조리원 영수증은 직접 챙겨 회사에 내야 하는 경우가 많습니다.",
    ]), `${SRC.nts}, ${SRC.special} ②`),
  card: card("12월에 할 수 있는 것 (자주 틀리는 점)", UL([
      "<b>부부 사용액은 합칠 수 없음</b>: 소득이 있는 배우자의 카드 사용액은 내 공제에 넣을 수 없습니다. 각자 자기 문턱을 넘어야 합니다.",
      "<b>가족카드</b>: 결제 계좌 주인이 아니라 카드를 쓴 사람 기준입니다. 배우자가 내 가족카드를 쓰면 배우자 사용액입니다.",
      "<b>자녀 명의 카드·현금영수증</b>: 그 자녀를 기본공제 받는 사람이 공제받습니다. 나이 제한은 없고 소득 요건만 봅니다.",
      "<b>한도에 닿았으면</b>: 더 써도 공제가 늘지 않습니다. 남은 사용은 혜택 많은 카드나 전통시장·대중교통(추가 한도)으로 돌리는 편이 낫습니다.",
      "<b>공제 안 되는 사용</b>: 보험료, 세금·공과금, 아파트 관리비, 상품권, 해외 결제 등은 빠집니다.",
    ]), `${SRC.card}, ${SRC.nts}`),
};

const BASE_KEYS = ["맞벌이 연말정산", "연말정산 계산기", "맞벌이 부부 공제", "연말정산 몰아주기"];
const ASSETS = ["tax.js", "tax-ui.js"];

export const tax = [
  {
    slug: "dual-income", cat: "tax", title: "맞벌이 연말정산 몰아주기 계산기", short: "부양가족·의료비·12월 카드를 누구에게",
    lede: "부부 총급여와 가족을 넣으면 부양가족, 의료비, 12월 카드를 누구에게 몰아야 둘이 합쳐 세금을 가장 덜 내는지 모든 경우를 계산해 보여 줍니다. 로그인이 없고, 입력값은 브라우저 밖으로 나가지 않습니다.",
    description: "맞벌이 부부 연말정산 몰아주기 계산기. 부양가족·의료비·12월 카드 배분의 모든 경우를 계산해 부부 합산 세금이 가장 적은 방법과 이유를 보여 줍니다. 2026년 귀속 세법 기준.",
    keys: [...BASE_KEYS, "맞벌이 몰아주기", "부부 연말정산", "연말정산 미리보기"], related: ["dual-income-dependents", "dual-income-medical", "dual-income-card"],
    form: form("all"), assets: ASSETS,
    info: INFO.all + EXAMPLE.all + MISTAKES.all + CHANGES_2026 + LIMITS,
  },
  {
    slug: "dual-income-dependents", cat: "tax", title: "맞벌이 부양가족 누구에게 올릴까", short: "자녀·부모님 기본공제를 남편? 아내?",
    lede: "자녀와 부모님을 부부 중 누구의 기본공제로 올려야 유리한지 계산합니다. 자녀세액공제, 교육비·보험료·의료비, 카드 한도 상향처럼 함께 따라가는 공제까지 넣어 비교합니다.",
    description: "맞벌이 부양가족 공제 계산기. 자녀·부모님을 남편과 아내 중 누구에게 올릴지 모든 경우를 계산하고, 자녀세액공제·교육비·카드 한도까지 따라가는 효과와 이유를 보여 줍니다.",
    keys: [...BASE_KEYS, "부양가족 공제", "자녀 공제 누구", "부모님 공제 누구", "자녀세액공제 2026"], related: ["dual-income", "dual-income-medical", "dual-income-card"],
    form: form("deps"), assets: ASSETS,
    info: INFO.deps + EXAMPLE.deps + MISTAKES.deps + CHANGES_2026 + LIMITS,
  },
  {
    slug: "dual-income-medical", cat: "tax", title: "맞벌이 의료비 몰아주기 계산기", short: "의료비는 누가 결제하고 누가 공제받을까",
    lede: "부부와 가족의 의료비를 넣으면 앞으로 낼 의료비를 누가 결제하고 아이·부모님을 누가 기본공제 받아야 유리한지 계산합니다. 이미 낸 의료비는 낸 사람 것으로 고정합니다.",
    description: "맞벌이 의료비 세액공제 계산기. 총급여 3% 문턱과 결정세액 0원 한계를 반영해, 배우자·자녀·부모님 의료비를 누가 결제하고 공제받아야 부부 합산 세금이 적은지 보여 줍니다.",
    keys: [...BASE_KEYS, "맞벌이 의료비 공제", "의료비 세액공제 계산", "의료비 몰아주기", "배우자 의료비 공제"], related: ["dual-income", "dual-income-dependents", "dual-income-card"],
    form: form("medical"), assets: ASSETS,
    info: INFO.medical + MISTAKES.medical + EXAMPLE.medical + CHANGES_2026 + LIMITS,
  },
  {
    slug: "dual-income-card", cat: "tax", title: "12월 카드 누구 걸로 쓸까", short: "연말 카드 사용, 부부 중 누구 카드로",
    lede: "1~11월 카드 사용액과 12월에 쓸 금액을 넣으면, 남은 12월 사용을 부부 중 누구 카드로 몇 대 몇 나눠 써야 공제가 가장 큰지 계산합니다. 12월 31일까지만 쓸모 있는 계산입니다.",
    description: "맞벌이 신용카드 몰아주기 계산기. 총급여 25% 문턱, 2026년 자녀 수별 공제 한도, 결정세액 0원 한계를 반영해 12월 카드 사용을 부부 중 누구 카드로 나눠 쓸지 알려 줍니다.",
    keys: [...BASE_KEYS, "맞벌이 신용카드 몰아주기", "연말 카드", "신용카드 소득공제 계산", "카드 25%"], related: ["dual-income", "dual-income-dependents", "dual-income-medical"],
    form: form("card"), assets: ASSETS,
    info: INFO.card + EXAMPLE.card + MISTAKES.card + CHANGES_2026 + LIMITS,
  },
];
