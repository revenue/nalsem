# 날셈 (nalsem)

나이·날짜·음력 생활계산기. 서버 없이 동작하는 정적 사이트입니다. 모든 계산은 브라우저 안에서 처리됩니다.

- 계산기 28개: 나이·띠·사람 16, 날짜·음력 12
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

## 디자인 (Supanova Design Skill 적용)

- Vibe: Vantablack Luxe(다크 기본 `#0a0a0a`) / 라이트 토글은 Clean Structural. OS 설정과 무관하게 다크가 기본, 토글은 localStorage 저장
- 폰트 Pretendard Variable(jsdelivr) · 강조색 1개 Warm Amber(`--accent`, 채도 <80%) · 아이콘 Iconify Solar
- 컴포넌트: Double-Bezel 카드(`.bz`, 바깥 링 + 안쪽 코어) · pill CTA + 원형 화살표 · 플로팅 글래스 내비(z 40) · 노이즈 오버레이(z 60) · 메시 그라디언트 오브
- 모션: 모든 전환 `0.5s cubic-bezier(.16,1,.3,1)` · 스크롤 진입 fadeInUp(blur) + 80ms 스태거(IntersectionObserver) · transform/opacity 만 · reduced-motion 시 정지
- 타이포: 한국어 `word-break: keep-all`, 헤드라인 `line-height 1.15~1.25`, 본문 65ch
- Supanova 원본은 Tailwind CDN + 단일 HTML 을 전제하지만, 31페이지 정적 사이트라 같은 규칙을 `site.css` 토큰으로 옮겨 적용했다
- 페이지: 좌 도구 / 우 설명(7:5), 모바일은 세로 스택. 결과는 입력 즉시 갱신, URL 쿼리로 공유·북마크

## 라이선스

MIT. 띠궁합·삼재·손없는 날은 민속 참고 자료이며 법률·행정 판단의 근거가 아닙니다.
