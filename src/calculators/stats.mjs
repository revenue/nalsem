import { readFileSync } from "node:fs";
const S = JSON.parse(readFileSync(new URL("../data/stats.json", import.meta.url), "utf8"));
const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const c = (n) => Number(n).toLocaleString("ko-KR");
const src = `<a href="${S.sourceUrl}" rel="noopener">${S.source}</a>`;
const nat = S.population[0], natAge = S.averageAge[0];

export const stats = [
  {
    slug: "population", cat: "stats", title: "대한민국 인구통계", short: "주민등록 인구, 세대수, 남녀 비율",
    lede: `${S.asOf} 주민등록 기준 전국과 시도별 인구, 세대수, 세대당 인구, 남녀 인구와 성비입니다. 행정안전부 공표 수치를 그대로 옮겼습니다.`,
    description: `대한민국 인구통계 (${S.asOf}). 주민등록 총인구 ${c(nat[1])}명, 시도별 인구·세대수·남녀 비율을 행정안전부 자료로 확인하세요.`,
    keys: ["인구", "인구통계", "대한민국인구", "시도별인구", "남녀비율"], related: ["average-age", "age-table"],
    form: `<div class="result" id="pop" style="display:grid"><div class="result-hero" style="border-top:0;padding-top:0"><div class="k">전국 주민등록 인구 (${S.asOf})</div><div class="v accent">${c(nat[1])}<small>명</small></div></div>
<div class="stats cols-3"><div class="stat"><div class="k">세대수</div><div class="v">${c(nat[2])}</div></div><div class="stat"><div class="k">세대당 인구</div><div class="v">${nat[3]}<small>명</small></div></div><div class="stat"><div class="k">남녀 비율</div><div class="v">${nat[6]}</div></div></div>
<div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>행정기관</th><th class="num">총 인구</th><th class="num">세대수</th><th class="num">세대당</th><th class="num">남자</th><th class="num">여자</th><th class="num">남녀비</th></tr></thead><tbody>${S.population.slice(1).map((r) => `<tr><td>${r[0]}</td><td class="num">${c(r[1])}</td><td class="num">${c(r[2])}</td><td class="num">${r[3]}</td><td class="num">${c(r[4])}</td><td class="num">${c(r[5])}</td><td class="num">${r[6]}</td></tr>`).join("")}</tbody></table></div></div>`,
    info: card("자료 설명", P("주민등록 인구는 주민등록표에 등록된 사람 수로, 통계청 추계인구(실제 거주 추정)와 다릅니다. 매월 말일 기준으로 다음 달 1일 이후 공표됩니다.") + P("남녀 비율은 여자 100명당 남자 수를 소수로 나타낸 값입니다(0.99 = 여자 100명당 남자 99명)."), src),
  },
  {
    slug: "average-age", cat: "stats", title: "대한민국 평균연령", short: "전국·시도별 평균연령, 남녀 차이",
    lede: `${S.asOf} 주민등록 기준 전국 평균연령은 ${natAge[1]}세입니다. 시도별로 가장 젊은 곳과 나이 든 곳, 남녀 평균연령 차이를 확인하세요.`,
    description: `대한민국 평균연령 (${S.asOf}). 전국 ${natAge[1]}세, 남자 ${natAge[2]}세, 여자 ${natAge[3]}세. 시도별 평균연령을 행정안전부 자료로 확인하세요.`,
    keys: ["평균연령", "평균나이", "시도별평균연령", "고령화"], related: ["population", "age-table", "age-terms"],
    form: (() => { const sorted = S.averageAge.slice(1).sort((a, b) => a[1] - b[1]); return `<div class="result" id="avg" style="display:grid"><div class="result-hero" style="border-top:0;padding-top:0"><div class="k">전국 평균연령 (${S.asOf})</div><div class="v accent">${natAge[1]}<small>세</small></div></div>
<div class="stats cols-3"><div class="stat"><div class="k">남자</div><div class="v">${natAge[2]}<small>세</small></div></div><div class="stat"><div class="k">여자</div><div class="v">${natAge[3]}<small>세</small></div></div><div class="stat"><div class="k">가장 젊은 시도</div><div class="v" style="font-size:17px">${sorted[0][0]} ${sorted[0][1]}세</div></div></div>
<div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>행정기관</th><th class="num">평균연령</th><th class="num">남자</th><th class="num">여자</th><th class="num">남녀 차</th></tr></thead><tbody>${sorted.map((r) => `<tr><td>${r[0]}</td><td class="num">${r[1].toFixed(1)}</td><td class="num">${r[2].toFixed(1)}</td><td class="num">${r[3].toFixed(1)}</td><td class="num">${(r[3] - r[2]).toFixed(1)}</td></tr>`).join("")}</tbody></table></div><p class="note">평균연령 낮은 순 정렬.</p></div>`; })(),
    info: card("자료 설명", P("주민등록 인구의 연령을 평균한 값입니다. 여자의 평균연령이 높은 것은 기대수명 차이 때문입니다.") + P("내 나이가 평균보다 높은지 궁금하면 <a href=\"/age/\" style=\"text-decoration:underline\">나이 계산기</a>에서 만나이를 확인해 보세요."), src),
  },
];
