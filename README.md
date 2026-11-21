# 날셈 (nalsem)

나이·날짜·음력 생활계산기와 맞벌이 연말정산 몰아주기 계산기. 서버 없이 동작하는 정적 사이트입니다. 모든 계산은 브라우저 안에서 처리됩니다.

- 계산기 32개: 나이·띠·사람 16, 날짜·음력 12, 연말정산 4
- 연말정산: 2026년 귀속 소득세법·조세특례제한법 현행 조문 기준(2026-11-21 대조). 부부의 결정세액을 계산해 부양가족·예정 의료비 결제자·12월 카드 배분을 전수 계산으로 추천. 이미 낸 돈은 낸 사람에게 고정
- 음력 변환: [korean-lunar-calendar](https://github.com/usingsky/korean_lunar_calendar_js) (MIT, 한국천문연구원 기준, 1000~2050년) 번들
- 공휴일: 관공서의 공휴일에 관한 규정 + 대체공휴일 규칙으로 연도별 자동 계산 (임시공휴일 미포함)

## 구조

```
build.mjs              src/ 정의 → docs/ HTML 생성
src/layout.mjs         페이지 셸(헤더·검색·푸터), 폼 헬퍼
src/home.mjs           메인 페이지
src/calculators/       계산기 정의 (slug·제목·설명·폼·설명 카드·클라이언트 스크립트)
docs/                  빌드 결과 = 배포 대상 (GitHub Pages: docs/ 폴더)
docs/assets/calc.js    공용 계산 엔진 (나이·간지·삼재·궁합·공휴일·음력 래퍼)
docs/assets/site.css   디자인 토큰·컴포넌트
test/engine.test.mjs   엔진 검증 (공표된 공휴일·수능일·간지와 대조)
src/calculators/tax.mjs  연말정산 4페이지 정의(폼·설명 카드)
docs/assets/tax.js     연말정산 엔진 (순수 함수, 전역 TAX). 조문 출처 주석 포함
docs/assets/tax-ui.js  연말정산 화면 (금액 입력값은 주소·저장소·통계에 넣지 않음)
test/tax.test.mjs      연말정산 엔진 검증 (국세청 신고안내 사례 대조, 손계산 가구, 설명 카드 예시 숫자)
src/calculators/kepco.mjs  생활 지원금: 한전 고효율 가전 지원금 계산기 정의(설명 카드·쿠팡 파트너스 링크 칸 COUPANG)
docs/assets/kepco.js   지원금 엔진 (전역 KEPCO). 지원율·누적 한도·품목별 등급·적용기준 시행일
docs/assets/kepco-ui.js  지원금 화면 (복지할인 유형·금액은 주소·저장소·통계에 넣지 않음)
test/kepco.test.mjs    지원금 엔진 검증 (공식 품목표 대조, 손계산 가구)
```

## 명령

```bash
npm run build   # docs/ 생성
npm test        # 빌드 + 엔진 검증
npm run serve   # 로컬 미리보기 http://localhost:4173
```

## 해마다 손볼 것

| 항목 | 위치 | 언제 |
|---|---|---|
| 수능 날짜 (교육부 확정치) | `docs/assets/calc.js` 의 `SUNEUNG` | 매년 3월 교육부 발표 후 |
| 임시공휴일 | 현재 미지원. 필요하면 `holidays()` 에 연도별 예외 추가 | 정부 지정 시 |
| 연말정산 세법 연도 | `docs/assets/tax.js` 의 `YEAR`, `RULES`, 자녀세액공제 나이(2027 10세 … 2029 12세), 카드 한도, 4대보험 요율. 설명 카드 문구(`src/calculators/tax.mjs`)와 `test/tax.test.mjs` 의 예시 숫자 | 매년 12월 세법 개정 통과 후, 1월 국세청 연말정산 신고안내 책자 발간 후 |
| 한전 고효율 가전 지원사업 | `docs/assets/kepco.js` 의 `YEAR`, `DEADLINE`, `BUDGET`(잔여예산·확인일), `TYPES`, `ITEMS`(등급·적용기준 시행일). 설명 카드(`src/calculators/kepco.mjs`)와 `test/kepco.test.mjs` | 매년 2월 새 공고 후(2025년 2-17, 2026년 2-9 시작). 12월에는 잔여예산을 주 1회 다시 확인 |

## 디자인 (Supanova Design Skill 적용)

- 배경: 라이트 블루(`#e6f0fb`) 기본 / 토글 시 네이비 다크(`#0a0f18`). OS 설정과 무관, 토글은 localStorage 저장
- 폰트 Pretendard Variable(jsdelivr) · 강조색 1개 Blue(`--accent` #2d6bd6, 다크 #5b9cff) · 아이콘 Iconify Solar
- 컴포넌트: Double-Bezel 카드(`.bz`, 바깥 링 + 안쪽 코어) · pill CTA + 원형 화살표 · 플로팅 글래스 내비(z 40) · 노이즈 오버레이(z 60) · 메시 그라디언트 오브
- 모션: 모든 전환 `0.5s cubic-bezier(.16,1,.3,1)` · 스크롤 진입 fadeInUp(blur) + 80ms 스태거(IntersectionObserver) · transform/opacity 만 · reduced-motion 시 정지
- 타이포: 한국어 `word-break: keep-all`, 헤드라인 `line-height 1.15~1.25`, 본문 65ch
- Supanova 원본은 Tailwind CDN + 단일 HTML 을 전제하지만, 31페이지 정적 사이트라 같은 규칙을 `site.css` 토큰으로 옮겨 적용했다
- 페이지: 좌 도구 / 우 설명(7:5), 모바일은 세로 스택. 결과는 입력 즉시 갱신, URL 쿼리로 공유·북마크

## 방문 통계 (GA4)

- 측정 ID `G-7V7PNG5749` (속성: 날셈, 스트림: suik.me). `src/layout.mjs` 의 `GA_ID`. 끄려면 `GA_ID= npm run build`
- 자동 수집(향상된 측정): 페이지뷰·유입 경로·스크롤·외부 링크·체류
- 맞춤 이벤트 (`docs/assets/calc.js` `N.track`, `site.js`): `calculate`(calculator) · `select_content`(item_id·area·from·검색어) · `search_open`/`search_close` · `share_click` · `theme_toggle`. 페이지 그룹 `content_group` = age / date / home / info
- 🔴 **입력값(생년월일·날짜·이름)은 절대 이벤트에 넣지 않는다**

## 배포

- 도메인: **https://nalsem.suik.me** (`docs/CNAME`). 이전 도메인 nalsem.unitblack.kr 은 2026-09-28 이전 완료 후 사용 중지. `src/layout.mjs` 의 `SITE.url` 이 canonical·OG·sitemap·llms.txt 전부의 기준
- 호스팅: GitHub Pages, `main` 브랜치 `/docs` 폴더
- DNS: `suik.me` (가비아 DNS) 에 `nalsem CNAME revenue.github.io.` 추가. 반영 후 Pages 설정에서 "Enforce HTTPS" 켜기
- 배포 = `npm run build` 후 `docs/` 커밋·푸시. 별도 CI 없음

## 라이선스

MIT. 띠궁합·삼재·손없는 날은 민속 참고 자료이며 법률·행정 판단의 근거가 아닙니다.
