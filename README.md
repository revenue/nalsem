# 날셈 (nalsem)

나이·날짜·음력 생활계산기. 서버 없이 동작하는 정적 사이트입니다. 모든 계산은 브라우저 안에서 처리됩니다.

- 계산기 30개: 나이·띠·사람 16, 날짜·음력 12, 통계 2
- 음력 변환: [korean-lunar-calendar](https://github.com/usingsky/korean_lunar_calendar_js) (MIT, 한국천문연구원 기준, 1000~2050년) 번들
- 공휴일: 관공서의 공휴일에 관한 규정 + 대체공휴일 규칙으로 연도별 자동 계산 (임시공휴일 미포함)
- 통계: 행정안전부 주민등록 인구통계 수치 (`src/data/stats.json`, 출처·기준월 명시)

## 구조

```
build.mjs              src/ 정의 → docs/ HTML 생성
src/layout.mjs         페이지 셸(헤더·검색·푸터), 폼 헬퍼
src/home.mjs           메인 페이지
src/calculators/       계산기 정의 (slug·제목·설명·폼·설명 카드·클라이언트 스크립트)
src/data/stats.json    인구·평균연령 (수동 갱신)
docs/                  빌드 결과 = 배포 대상 (GitHub Pages: docs/ 폴더)
docs/assets/calc.js    공용 계산 엔진 (나이·간지·삼재·궁합·공휴일·음력 래퍼)
docs/assets/site.css   디자인 토큰·컴포넌트
test/engine.test.mjs   엔진 검증 (공표된 공휴일·수능일·간지와 대조)
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
| 인구·평균연령 | `src/data/stats.json` | 원하는 주기 (매월 1일 이후 공표) |
| 임시공휴일 | 현재 미지원. 필요하면 `holidays()` 에 연도별 예외 추가 | 정부 지정 시 |

## 디자인

- 폰트 Wanted Sans Variable, 강조색 1개(`--accent`), 라이트/다크 자동 + 수동 토글
- 모서리 규칙: 카드 16px · 입력 10px · 버튼/칩 pill
- 페이지: 좌 도구 / 우 설명(7:5), 모바일은 세로 스택. 결과는 입력 즉시 갱신, URL 쿼리로 공유·북마크

## 라이선스

MIT. 띠궁합·삼재·손없는 날은 민속 참고 자료이며 법률·행정 판단의 근거가 아닙니다.
