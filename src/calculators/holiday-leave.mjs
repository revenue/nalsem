// 날짜·음력: 연차 황금연휴 계산기 (2027·2028년, 기본 2027년. 2026년은 남은 공휴일이 성탄절뿐이라 뺐다).
// 계산은 docs/assets/leave-plan.js(엔진)와 docs/assets/leave-plan-ui.js(화면)가 브라우저 안에서 한다. 공휴일은 calc.js 의 N.holidays.
// 아래 설명 카드의 2027년 숫자는 엔진 결과와 같아야 한다(test/leave-plan.test.mjs 가 대조).
// 공휴일 근거: 관공서의 공휴일에 관한 규정(대통령령 제36290호, 2026.4.30. 개정) — 2026년부터 노동절·제헌절 공휴일, 대체공휴일 적용.
import { ARROW } from "../layout.mjs";
import { COUPANG_DISCLOSURE, pickCard } from "../affiliate.mjs";

const CHECKED = "2026-11-26";
const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="tx-ul">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const a = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const LAW = a("https://www.law.go.kr/법령/관공서의공휴일에관한규정", "관공서의 공휴일에 관한 규정");

// 2027년 공휴일별 연차 꿀조합 (엔진 LP.ladder(2027) 결과에서 고른 것). [공휴일, 연차 없이, 연차, 쉬는 기간, 엔진 대조용 {시작,끝,연차,일수}]
export const COMBOS_2027 = [
  ["설날", "2/6(토)~2/9(화) 4일", "3일(2/10~2/12)", "2/6(토)~2/14(일) 9일", ["2027-02-06", "2027-02-14", 3, 9]],
  ["삼일절", "2/27(토)~3/1(월) 3일", "4일(3/2~3/5)", "2/27(토)~3/7(일) 9일", ["2027-02-27", "2027-03-07", 4, 9]],
  ["노동절·어린이날", "5/1(토)~5/3(월) 3일", "1일(5/4)", "5/1(토)~5/5(수) 5일", ["2027-05-01", "2027-05-05", 1, 5]],
  ["노동절·어린이날", "5/1(토)~5/3(월) 3일", "3일(5/4, 5/6, 5/7)", "5/1(토)~5/9(일) 9일", ["2027-05-01", "2027-05-09", 3, 9]],
  ["부처님오신날", "5/13(목) 1일", "1일(5/14)", "5/13(목)~5/16(일) 4일", ["2027-05-13", "2027-05-16", 1, 4]],
  ["제헌절", "7/17(토)~7/19(월) 3일", "4일(7/20~7/23)", "7/17(토)~7/25(일) 9일", ["2027-07-17", "2027-07-25", 4, 9]],
  ["광복절", "8/14(토)~8/16(월) 3일", "4일(8/17~8/20)", "8/14(토)~8/22(일) 9일", ["2027-08-14", "2027-08-22", 4, 9]],
  ["추석", "9/14(화)~9/16(목) 3일", "2일(9/13, 9/17)", "9/11(토)~9/19(일) 9일", ["2027-09-11", "2027-09-19", 2, 9]],
  ["개천절~한글날", "10/2(토)~10/4(월) 3일", "4일(10/5~10/8)", "10/2(토)~10/11(월) 10일", ["2027-10-02", "2027-10-11", 4, 10]],
  ["성탄절", "12/25(토)~12/27(월) 3일", "4일(12/28~12/31)", "12/25(토)~2028/1/2(일) 9일", ["2027-12-25", "2028-01-02", 4, 9]],
];

const sp = (x) => x.replace(/~/g, " ~ ");
const COMBO_TABLE = `<div class="tbl-wrap"><table class="tbl lp-tbl"><thead><tr><th>공휴일</th><th>연차</th><th>쉬는 기간</th></tr></thead><tbody>${COMBOS_2027.map(([h, base, leave, total]) => `<tr><td>${h}<small class="lp-sub">연차 없이 ${sp(base)}</small></td><td>${sp(leave)}</td><td><b>${sp(total)}</b></td></tr>`).join("")}</tbody></table></div>`;

export const HOL_2027 = [
  ["1/1(금)", "신정"], ["2/6(토)~2/8(월)", "설날 연휴"], ["2/9(화)", "대체공휴일(설날)"], ["3/1(월)", "삼일절"],
  ["5/1(토)", "노동절"], ["5/3(월)", "대체공휴일(노동절)"], ["5/5(수)", "어린이날"], ["5/13(목)", "부처님오신날"], ["6/6(일)", "현충일"],
  ["7/17(토)", "제헌절"], ["7/19(월)", "대체공휴일(제헌절)"], ["8/15(일)", "광복절"], ["8/16(월)", "대체공휴일(광복절)"],
  ["9/14(화)~9/16(목)", "추석 연휴"], ["10/3(일)", "개천절"], ["10/4(월)", "대체공휴일(개천절)"], ["10/9(토)", "한글날"],
  ["10/11(월)", "대체공휴일(한글날)"], ["12/25(토)", "성탄절"], ["12/27(월)", "대체공휴일(성탄절)"],
];
const HOL_TABLE = `<div class="tbl-wrap"><table class="tbl lp-tbl"><thead><tr><th>날짜</th><th>공휴일</th></tr></thead><tbody>${HOL_2027.map(([d, n]) => `<tr><td>${sp(d)}</td><td>${n}</td></tr>`).join("")}</tbody></table></div>`;

// 쿠팡 파트너스 묶음(2026-11-26): 연휴에 떠나는 사람용 여행 짐. 대가 문구는 머리말과 묶음 맨 위.
export const TRAVEL_PICKS = [
  { label: "기내용 캐리어", items: [
    { url: "https://link.coupang.com/a/iYxobl9gQu", name: "보튼캐리어 CL15 어드벤쳐 하드 캐리어", img: "https://thumbnail7.coupangcdn.com/thumbnails/remote/212x212ex/image/retail/images/146991957687811-67bac7d5-d5a1-48d3-b771-184a068cf10f.jpg" },
    { url: "https://link.coupang.com/a/iYxnAJ5yxM", name: "스위스밀리터리 확장형 캐리어 솔리오", img: "https://thumbnail10.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/6d7b/e9b9aae49e33641413b884463dbeb4c859c02f3555a14a7486bec482cbfb.jpg" },
  ] },
  { label: "여행용 압축 파우치", items: [
    { url: "https://link.coupang.com/a/iYxpofj5s4", name: "어반트립 부피제로 압축 파우치 5종", img: "https://thumbnail1.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/65d9/6ce17ca9494b5b265e0978fd08255922539405674852dff7653a0128b09c.png" },
    { url: "https://link.coupang.com/a/iYxoNpOG8O", name: "라멜리 캐리어 압축팩 7종 세트", img: "https://t4c.coupangcdn.com/thumbnails/remote/212x212ex/image/vendor_inventory/13d7/31250d15b98c7eff0613cb431d7f96ba0ce42b1d8723c9cfc8981f84541b.png" },
  ] },
];

const FORM = `<form id="lp" autocomplete="off">
  <div class="form-row cols-2">
    <div class="field"><label for="lp-y">연도</label><select id="lp-y"><option value="2027" selected>2027년</option><option value="2028">2028년</option></select></div>
    <div class="field"><label for="lp-n">쓸 수 있는 연차</label><div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="일"><input id="lp-n" type="text" inputmode="numeric" maxlength="2" value="5" autocomplete="off"></div></div><p class="help">1~25일. 공휴일에 붙여 쓸 날만 넣으세요.</p><p class="err" role="alert"></p></div>
  </div>
  <button class="btn btn-primary" type="submit">연휴 찾기${ARROW}</button>
</form>`;

const INFO = [
  card("2027년 연차 꿀조합 한눈에", P("2027년은 노동절·제헌절이 공휴일이 된 뒤 처음 맞는 한 해이고, 공휴일이 주말에 많이 걸려 대체공휴일이 7일 생깁니다. 토·일 쉬는 직장인은 1년에 119일을 쉽니다. 공휴일마다 연차를 붙이면 아래처럼 길어집니다.") + COMBO_TABLE
    + P("연차 2일로 9일을 쉬는 <b>추석</b>과, 연차 4일로 10일을 쉬는 <b>개천절~한글날</b>이 가장 효율이 좋습니다. 연차 1일이면 노동절~어린이날 5일, 추석 6일을 만들 수 있습니다."), `${LAW} (${CHECKED} 확인), 날셈 계산`),
  card("2027년 공휴일과 대체공휴일", HOL_TABLE + P("2027년 공휴일은 모두 24일이고 이 가운데 평일은 15일입니다. 현충일(일요일)과 신정은 대체공휴일 대상이 아닙니다. 선거일과 임시공휴일은 아직 정해진 것이 없습니다."), `${LAW}, 공휴일 대체 규정 제3조 (${CHECKED} 확인)`),
  card("2026년부터 노동절·제헌절도 공휴일", UL([
    "관공서의 공휴일에 관한 규정이 2026년 4월 30일 바뀌어 <b>노동절(5월 1일)</b>은 2026년 5월 1일부터, <b>제헌절(7월 17일)</b>은 2026년 5월 11일부터 공휴일입니다. 제헌절은 2008년 공휴일에서 빠졌다가 다시 들어갔습니다.",
    "두 날도 토·일요일이나 다른 공휴일과 겹치면 대체공휴일이 생깁니다. 2027년은 두 날 모두 토요일이라 5월 3일(월), 7월 19일(월)이 대체공휴일입니다.",
  ]), `${LAW} 제2조·제3조, 인사혁신처 보도자료(2026-04-29)`),
  card("우리 회사도 이렇게 쉬나요?", UL([
    "상시 5명 이상 사업장은 관공서 공휴일과 대체공휴일이 유급휴일입니다(근로기준법 제55조 제2항). 5명 미만 사업장은 회사 규칙에 따라 다를 수 있습니다.",
    "교대근무, 주 6일 근무, 회사 창립기념일 같은 회사 휴무일은 계산에 넣지 않았습니다. 연차는 회사와 협의해 쓰는 것이라 원하는 날에 쓰지 못할 수도 있습니다.",
    "정부가 임시공휴일을 지정하면 연휴가 더 길어질 수 있습니다. 지정되면 이 페이지에 반영합니다.",
  ])),
  pickCard({ title: "연휴 여행 짐 챙기기", intro: `긴 연휴에 여행을 간다면 많이 챙기는 기내용 캐리어와 압축 파우치를 골랐습니다(${CHECKED} 확인). 항공사마다 기내 반입 크기가 달라서, 캐리어는 예약한 항공사의 규정을 먼저 확인하세요.`, groups: TRAVEL_PICKS }),
  card("이 페이지에 대해", UL([
    "날셈은 정부 공식 사이트가 아닙니다. 공개된 법령으로 공휴일을 계산하고, 토·일과 공휴일을 쉬는 날로 보고 연차를 붙인 결과를 보여 줍니다.",
    "계산은 브라우저 안에서만 하고 입력값을 서버로 보내지 않습니다. 연도와 연차 일수는 공유하기 쉽게 주소에 남습니다.",
    COUPANG_DISCLOSURE,
  ])),
].join("");

export const holidayLeave = [
  {
    slug: "holiday-leave", cat: "date", title: "2027 연차 황금연휴 계산기", short: "연차 며칠로 최대 며칠 쉬나, 꿀조합 추천",
    lede: `가진 연차 일수를 넣으면 2027년 공휴일·대체공휴일에 어디를 붙여야 가장 길게 쉬는지 조합을 찾아 줍니다. 노동절·제헌절(2026년부터 공휴일)과 대체공휴일 7일을 반영했고, 2028년도 볼 수 있습니다. <span class="kp-disc">${COUPANG_DISCLOSURE}</span>`,
    description: "2027 연차 황금연휴 계산기. 연차 일수를 넣으면 2027년 공휴일·대체공휴일(노동절·제헌절 포함)에 연차를 어디에 붙여야 가장 길게 쉬는지 추천합니다. 추석 연차 2일로 9일, 개천절~한글날 연차 4일로 10일 같은 꿀조합과 공휴일별 연차 사다리를 보여 줍니다.",
    keys: ["2027 연휴", "2027 황금연휴", "2027 연차 꿀조합", "연차 꿀조합", "2027 공휴일", "2027 대체공휴일", "징검다리 연휴", "연차 계산 연휴", "노동절 공휴일", "제헌절 공휴일"],
    related: ["holidays", "annual-leave", "d-day"],
    form: FORM, assets: ["leave-plan.js", "leave-plan-ui.js"],
    info: INFO,
  },
];
