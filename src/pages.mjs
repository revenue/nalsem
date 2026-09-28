// 사이트 정보 페이지: 개인정보처리방침 · 소개 · 문의
import { SITE } from "./layout.mjs";

const EFFECTIVE = "2026년 9월 28일";
import { GA_ID } from "./layout.mjs";
const REPO = "https://github.com/revenue/nalsem";
const sec = (h, body) => `<section class="doc-sec"><h2>${h}</h2>${body}</section>`;
const P = (s) => `<p>${s}</p>`;
const UL = (items) => `<ul class="doc-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const wrap = (title, lede, body) => `<article class="page wrap doc">
  <nav class="crumb" aria-label="경로"><a href="/">홈</a></nav>
  <h1>${title}</h1>
  <p class="lede">${lede}</p>
  <div class="doc-body bz bz-in">${body}</div>
</article>`;

export const pages = [
  {
    slug: "privacy",
    title: "개인정보처리방침",
    description: `${SITE.name}의 개인정보처리방침. 입력값은 서버로 전송되지 않으며, 광고(Google AdSense)와 브라우저 저장소 사용 내용을 안내합니다.`,
    body: wrap("개인정보처리방침", `${SITE.name}(이하 "사이트")는 이용자의 개인정보를 소중히 다루며, 어떤 정보를 어떻게 쓰는지 아래와 같이 알립니다. 시행일: ${EFFECTIVE}`,
      sec("1. 수집하는 개인정보", P("사이트는 회원가입, 로그인, 문의 양식이 없으며 이용자의 이름·연락처 등 개인정보를 직접 수집하지 않습니다.") +
        P("생년월일·날짜 등 계산기에 입력한 값은 <b>이용자의 브라우저 안에서만 계산</b>되고 사이트 운영자의 서버로 전송되지 않습니다. 사이트는 계산 결과를 저장하는 서버나 데이터베이스를 운영하지 않습니다.")) +
      sec("2. 브라우저 저장소(localStorage) 사용", P("편의를 위해 아래 두 가지를 <b>이용자 기기의 브라우저에만</b> 저장합니다. 운영자는 이 값을 볼 수 없습니다.") +
        UL(["<b>마지막으로 입력한 생년월일</b>: 홈 화면에 다시 방문했을 때 계산 결과를 바로 보여주기 위함", "<b>화면 테마(라이트/다크)</b>: 선택한 화면 모드를 유지하기 위함"]) +
        P("아래 버튼을 누르거나 브라우저의 사이트 데이터 삭제 기능으로 언제든 지울 수 있습니다.") +
        `<p><button class="btn btn-ghost btn-sm" type="button" id="clear-local">이 기기에 저장된 값 지우기</button> <span class="note" id="clear-msg" role="status"></span></p>`) +
      sec("3. 광고와 쿠키 (Google AdSense)", P("사이트는 운영 비용을 위해 Google AdSense 광고를 게재합니다. Google 및 제휴 광고 사업자는 쿠키 등을 사용해 이용자의 이 사이트 및 다른 사이트 방문 기록을 바탕으로 광고를 제공할 수 있습니다.") +
        UL([
          'Google 의 광고 쿠키 사용으로 Google 과 파트너가 이용자의 방문 기록에 기반한 광고를 게재할 수 있습니다.',
          '맞춤 광고는 <a href="https://adssettings.google.com" rel="noopener">Google 광고 설정</a>에서 끌 수 있습니다.',
          '제3자 광고 사업자의 맞춤 광고 쿠키는 <a href="https://www.aboutads.info/choices/" rel="noopener">www.aboutads.info</a>에서 거부할 수 있습니다.',
          '자세한 내용: <a href="https://policies.google.com/technologies/ads?hl=ko" rel="noopener">Google 광고 정책</a>, <a href="https://policies.google.com/technologies/partner-sites?hl=ko" rel="noopener">Google 파트너 사이트의 데이터 사용 방식</a>',
        ])) +
      (GA_ID ? sec("3-1. 방문 통계 (Google Analytics 4)", P("사이트 개선을 위해 Google Analytics 4 로 방문 통계를 수집합니다. 수집 항목은 방문 경로(검색·링크 등 유입 경로), 본 페이지, 머문 시간, 스크롤, 기기·브라우저 종류, 대략적 지역(국가·도시 수준)과 사이트 안에서의 동작(어떤 계산기를 썼는지, 검색·공유·링크 클릭 여부)입니다.") +
        P("<b>계산기에 입력한 생년월일·날짜·이름 등 입력값은 통계로 보내지 않습니다.</b> Google 은 IP 주소를 저장하지 않으며, 수집된 통계는 개인을 식별하지 않는 형태로 Google 서버에 보관됩니다.") +
        UL(['거부 방법: <a href="https://tools.google.com/dlpage/gaoptout?hl=ko" rel="noopener">Google Analytics 차단 브라우저 부가기능</a>을 설치하거나 브라우저에서 쿠키를 차단하세요.', '자세한 내용: <a href="https://policies.google.com/privacy?hl=ko" rel="noopener">Google 개인정보처리방침</a>'])) : "") +
      sec("4. 외부 서비스", P("사이트 제공을 위해 아래 외부 서비스를 이용하며, 각 서비스는 접속 시 IP 주소·브라우저 정보 등 기술 정보를 자체 정책에 따라 처리할 수 있습니다.") +
        UL(["<b>GitHub Pages</b> (웹 호스팅): 접속 로그", "<b>Cloudflare</b> (도메인 네임 서비스)", "<b>jsDelivr, Iconify</b> (글꼴·아이콘 파일 제공)", "<b>Google AdSense</b> (광고)", ...(GA_ID ? ["<b>Google Analytics 4</b> (방문 통계)"] : []), "<b>Google Search Console</b> (검색 노출 분석, 개인 식별 정보 없음)"])) +
      sec("5. 쿠키 거부 방법", P("브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 쿠키를 거부해도 계산기는 모두 정상적으로 이용할 수 있으며, 광고가 맞춤형이 아닌 일반 광고로 바뀝니다.")) +
      sec("6. 아동의 개인정보", P("사이트는 만 14세 미만 아동을 대상으로 개인정보를 수집하지 않습니다.")) +
      sec("7. 문의", P(`개인정보 관련 문의는 <a href="/contact/">문의 페이지</a>의 안내를 따라 주세요.`)) +
      sec("8. 방침의 변경", P(`이 방침이 바뀌면 이 페이지에 변경 내용과 시행일을 게시합니다. 현재 버전 시행일: ${EFFECTIVE}`))),
    script: `const b=document.getElementById("clear-local"),m=document.getElementById("clear-msg");b.addEventListener("click",()=>{try{localStorage.removeItem("birth");localStorage.removeItem("theme");m.textContent="지웠습니다.";}catch(e){m.textContent="이 브라우저에서는 저장소에 접근할 수 없습니다.";}});`,
  },
  {
    slug: "about",
    title: "사이트 소개",
    description: `${SITE.name}은 만나이, 디데이, 양력 음력 변환, 공휴일, 띠 등 생활 속 날짜와 나이 계산을 한곳에 모은 무료 계산기 사이트입니다.`,
    body: wrap("사이트 소개", `${SITE.name}은 나이와 날짜에 관한 생활 계산을 한곳에 모은 무료 계산기 사이트입니다.`,
      sec("무엇을 할 수 있나요", P("만나이·세는나이·연나이, 띠와 띠궁합, 삼재, 학교 입학·졸업 연도, 디데이와 기념일, 날짜 더하기·빼기, 양력·음력 변환, 올해와 내년 공휴일, 손없는 날, 아기 백일까지 28가지 계산기를 제공합니다.") +
        P("홈 화면에 생년월일을 한 번 입력하면 나이·띠·사람에 관한 항목이 함께 계산됩니다.")) +
      sec("계산 기준과 출처", UL([
        '<b>음력 변환</b>: 한국천문연구원 음양력 자료를 따르는 <a href="https://github.com/usingsky/korean_lunar_calendar_js" rel="noopener">korean-lunar-calendar</a> 라이브러리를 사용합니다. 1000년부터 2050년까지 지원합니다.',
        '<b>공휴일</b>: 「관공서의 공휴일에 관한 규정」과 대체공휴일 규칙으로 계산합니다. 정부가 따로 정하는 임시공휴일은 포함하지 않습니다.',
        '<b>나이</b>: 2023년 6월 28일 시행된 만나이 통일 규정(행정기본법 제7조의2)을 반영합니다.',
        '<b>수능일</b>: 교육부 발표 일정을 쓰고, 발표 전 연도는 추정치로 표시합니다.',
      ]) + P("띠궁합·삼재·손없는 날은 민속 참고 자료입니다. 법률·행정·의료 판단의 근거로 쓰지 마세요.")) +
      sec("개인정보", P('입력한 값은 브라우저 안에서만 계산되며 서버로 전송되지 않습니다. 자세한 내용은 <a href="/privacy/">개인정보처리방침</a>을 참고하세요.')) +
      sec("오류 제보", P('계산 결과가 공식 자료와 다르면 <a href="/contact/">문의 페이지</a>로 알려 주세요. 확인 후 고치겠습니다.'))),
  },
  {
    slug: "contact",
    title: "문의",
    description: `${SITE.name} 이용 문의, 계산 오류 제보, 기능 제안 방법을 안내합니다.`,
    body: wrap("문의", "계산 오류 제보, 기능 제안, 개인정보 관련 문의를 받습니다.",
      sec("문의 방법", P(`<a href="${REPO}/issues/new" rel="noopener">GitHub 이슈 등록</a>으로 남겨 주세요. GitHub 계정이 필요하며, 남긴 내용은 공개됩니다.`) +
        P("개인정보(주민등록번호, 연락처, 실제 생년월일 등)는 적지 마세요. 오류 제보 시에는 계산기 이름, 입력한 값(예시 값이면 충분), 기대한 결과만 알려 주시면 됩니다.")) +
      sec("답변", P("확인하는 대로 이슈에 답변을 남깁니다. 계산 오류는 공식 자료와 대조한 뒤 수정합니다."))),
  },
];
