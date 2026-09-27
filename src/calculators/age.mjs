import { ymd, yearField } from "../layout.mjs";

const card = (h2, body, src = "") => `<div class="card"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const btns = (label = "계산") => `<div class="actions"><button class="btn btn-primary" type="submit">${label}</button><button class="btn btn-ghost btn-sm" type="button" data-share="">공유</button></div>`;
const pre = `const $=(i)=>document.getElementById(i);const T=N.today();const TY=N.Y(T);const out=$("result");`;
const AGE_INFO = card("나이 셈법 3가지", P("<b>만나이</b>는 태어난 날 0세, 생일마다 1세씩 더합니다. 국제 표준이며 2023년 6월 28일부터 법령·계약·공문서의 나이는 특별한 규정이 없으면 만나이입니다.") + P("<b>세는나이(한국나이)</b>는 태어난 해 1살, 매년 1월 1일에 1살씩 더하는 관습 셈법입니다.") + P("<b>연나이</b>는 올해에서 출생연도를 뺀 나이입니다. 병역법·청소년보호법 등 일부 법률이 씁니다."), '<a href="https://www.law.go.kr/법령/행정기본법" rel="noopener">행정기본법 제7조의2</a>');
const ZODIAC_NOTE = P("띠는 관습적으로 양력 1월 1일 기준으로 표기합니다. 명리학에서는 입춘(2월 4일 무렵)을 기준으로 삼기도 하므로 1월생·2월 초생은 해석이 달라질 수 있습니다.");
const ymdForm = (id, label, help) => `<form id="f" autocomplete="off">${ymd(id, label, help)}${btns()}</form>`;
const restore = (id, run) => `const q=N.qs("d"),qd=q&&N.parseISO(q);if(qd){N.setYMD($("${id}"),qd);${run}();}`;

const zodiacPicker = (id) => `<div class="field"><label>띠 고르기</label><div class="chips" id="${id}">${["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"].map((z, i) => `<button class="chip" type="button" data-j="${i}" aria-pressed="false">${z}</button>`).join("")}</div></div>`;

export const age = [
  {
    slug: "age", cat: "age", title: "나이 계산기", short: "만나이·세는나이·연나이를 한 번에",
    lede: "생년월일을 넣으면 만나이, 세는나이, 연나이와 띠, 다음 생일까지 남은 날을 함께 보여줍니다.",
    description: "생년월일로 만나이·세는나이(한국나이)·연나이를 동시에 계산하고 띠, 살아온 날수, 다음 생일 디데이까지 확인하세요.",
    keys: ["만나이", "한국나이", "세는나이", "연나이", "나이계산"], related: ["man-age", "zodiac-gap", "adult", "birthyear-zodiac"],
    form: `<form id="f" autocomplete="off">${ymd("b", "생년월일", "오늘 이전 날짜를 입력해 주세요")}<div class="field"><label for="base">기준일 (비우면 오늘)</label><div class="ymd" id="base">${["y", "m", "d"].map((k, i) => `<div class="unit" data-unit="${["년", "월", "일"][i]}"><input id="base-${k}" type="text" inputmode="numeric" maxlength="${i ? 2 : 4}" data-len="${i ? 2 : 4}" placeholder="${i ? "" : "선택"}" autocomplete="off" aria-label="기준일 ${["년", "월", "일"][i]}"></div>`).join("")}</div></div>${btns()}</form>`,
    info: AGE_INFO + card("띠 표기 기준", ZODIAC_NOTE),
    script: pre + `const f=$("b"),get=N.ymdInputs(f),getBase=N.ymdInputs($("base"));
function run(){const b=get();if(!b){out.hidden=true;return;}const base=getBase()||T;if(b>base){N.showErr(f,"기준일 이전 날짜를 입력해 주세요");out.hidden=true;return;}N.showErr(f,"");
const a=N.ages(b,base),nb=N.nextBirthday(b,base),g=N.ganjiOf(N.Y(b)),w=N.WEEK[N.W(b)];
out.innerHTML=\`<div class="result-hero"><div class="k">만나이</div><div class="v accent">\${a.man}<small>세</small> <small>\${a.full.m}개월 \${a.full.d}일</small></div></div>
<div class="stats cols-3"><div class="stat"><div class="k">세는나이</div><div class="v">\${a.korean}<small>살</small></div></div><div class="stat"><div class="k">연나이</div><div class="v">\${a.yearAge}<small>세</small></div></div><div class="stat"><div class="k">띠</div><div class="v">\${g.animal}<small>\${g.name}년</small></div></div></div>
<div class="kv"><div><span class="k">태어난 요일</span><span class="v">\${w}요일</span></div><div><span class="k">살아온 날</span><span class="v">\${N.comma(a.full.days)}일 (\${N.comma(Math.floor(a.full.days/7))}주)</span></div><div><span class="k">다음 생일</span><span class="v">\${N.fmt(nb.date)}, \${nb.days===0?"오늘":"D-"+nb.days}</span></div><div><span class="k">기준일</span><span class="v">\${N.fmt(base)}</span></div></div>\`;
N.bump(out);N.setQS({d:N.iso(b)});}
f.addEventListener("input",run);$("base").addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});${restore("b", "run")}`,
  },
  {
    slug: "man-age", cat: "age", title: "만나이 계산기", short: "법정 나이, 생일 지났는지까지",
    lede: "2023년 6월부터 법과 행정은 만나이가 기준입니다. 생일이 지났는지에 따라 달라지는 만나이를 정확히 계산합니다.",
    description: "만나이 통일법 기준 만나이 계산기. 생년월일과 기준일을 넣으면 생일 경과 여부를 반영한 만나이와 개월 수를 계산합니다.",
    keys: ["만나이", "만나이통일", "법정나이"], related: ["age", "adult", "baby-100"],
    form: ymdForm("b", "생년월일", "숫자만 입력하면 바로 계산됩니다"),
    info: card("만나이 셈법", P("올해 생일이 지났으면 <b>올해 − 출생연도</b>, 아직이면 <b>올해 − 출생연도 − 1</b>입니다.") + P("2023년 6월 28일 시행된 행정기본법·민법 개정으로 별도 규정이 없는 한 나이는 만나이로 계산하고 표시합니다. 단 초등학교 취학 연령, 병역 판정, 청소년보호법의 술·담배 구매 연령은 연나이를 유지합니다."), '<a href="https://www.law.go.kr/법령/행정기본법" rel="noopener">행정기본법 제7조의2</a>'),
    script: pre + `const f=$("b"),get=N.ymdInputs(f);
function run(){const b=get();if(!b){out.hidden=true;return;}if(b>T){N.showErr(f,"오늘 이전 날짜를 입력해 주세요");out.hidden=true;return;}N.showErr(f,"");
const a=N.ages(b,T),nb=N.nextBirthday(b,T),passed=N.mk(TY,N.M(b),N.D(b))<=T;
out.innerHTML=\`<div class="result-hero"><div class="k">오늘 기준 만나이</div><div class="v accent">\${a.man}<small>세 \${a.full.m}개월</small></div></div>
<div class="kv"><div><span class="k">올해 생일</span><span class="v">\${passed?"지났음":"아직"} (\${N.fmtShort(N.mk(TY,N.M(b),N.D(b)))})</span></div><div><span class="k">계산식</span><span class="v">\${TY} − \${N.Y(b)}\${passed?"":" − 1"} = \${a.man}</span></div><div><span class="k">다음 생일까지</span><span class="v">\${nb.days===0?"오늘":nb.days+"일"}</span></div><div><span class="k">세는나이 · 연나이</span><span class="v">\${a.korean}살 · \${a.yearAge}세</span></div></div>\`;
N.bump(out);N.setQS({d:N.iso(b)});}
f.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});${restore("b", "run")}`,
  },
  {
    slug: "zodiac-age", cat: "age", title: "띠별 나이", short: "띠를 고르면 출생연도와 올해 나이",
    lede: "띠를 고르면 그 띠에 해당하는 출생연도와 올해의 세는나이·만나이를 표로 보여줍니다.",
    description: "띠별 나이표. 12띠 중 하나를 고르면 해당 띠의 출생연도, 올해 세는나이, 만나이, 간지를 한눈에 확인할 수 있습니다.",
    keys: ["띠별나이", "띠나이", "몇년생"], related: ["birthyear-zodiac", "age-table", "zodiac-match"],
    form: `<form id="f" autocomplete="off">${zodiacPicker("zp")}</form>`,
    info: card("올해 띠", P('<span id="year-zodiac"></span>') + ZODIAC_NOTE),
    script: pre + `const zp=$("zp");const gj=N.ganjiOf(TY);$("year-zodiac").innerHTML=\`\${TY}년은 <b>\${gj.name}년, \${gj.color} \${gj.animal}띠</b> 해입니다.\`;
function run(j){zp.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",String(+c.dataset.j===j)));
const ys=N.yearsOfZodiac(j,TY-108,TY).reverse();
out.innerHTML=\`<div class="result-hero"><div class="k">\${N.ZODIAC_BY_JIJI[j]}띠</div><div class="v">\${ys.slice(0,3).join(" · ")}<small>년생 …</small></div></div><div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>출생연도</th><th>간지</th><th class="num">세는나이</th><th class="num">만나이(생일 후)</th></tr></thead><tbody>\${ys.map(y=>\`<tr class="\${y===TY?"hl":""}"><td>\${y}년</td><td>\${N.ganjiOf(y).name}년</td><td class="num">\${TY-y+1}살</td><td class="num">\${TY-y}세</td></tr>\`).join("")}</tbody></table></div><p class="note">만나이는 올해 생일이 지난 경우입니다. 생일 전이면 1세 적습니다.</p>\`;
N.bump(out);N.setQS({z:j});}
zp.addEventListener("click",e=>{const c=e.target.closest(".chip");if(c)run(+c.dataset.j);});
const q=N.qs("z");run(q!=null&&!isNaN(+q)?+q:N.jijiIndexOf(TY));`,
  },
  {
    slug: "birthyear-zodiac", cat: "age", title: "출생년도별 띠", short: "몇 년생이 무슨 띠인지",
    lede: "출생연도를 넣으면 띠와 간지(육십갑자), 오행 색깔을 알려주고 앞뒤 연도 띠도 함께 보여줍니다.",
    description: "출생년도로 띠 찾기. 연도를 입력하면 12지 띠, 육십갑자 간지, 색깔 띠(청·적·황·백·흑)를 확인할 수 있습니다.",
    keys: ["띠", "간지", "육십갑자", "무슨띠"], related: ["zodiac-age", "zodiac-match", "samjae"],
    form: `<form id="f" autocomplete="off">${yearField("y", "출생연도", "예: 1990")}${btns("찾기")}</form>`,
    info: card("색깔 띠", P("천간(갑을병정무기경신임계)은 오행에 따라 색이 정해집니다. 갑·을은 푸른색, 병·정은 붉은색, 무·기는 노란색, 경·신은 흰색, 임·계는 검은색입니다. 예를 들어 2026년 병오년은 붉은 말띠 해입니다.") + ZODIAC_NOTE),
    script: pre + `const f=$("y"),inp=$("y-y");
function run(){const y=parseInt(inp.value,10);if(!(y>=1&&y<=9999)){out.hidden=true;return;}const g=N.ganjiOf(y);
out.innerHTML=\`<div class="result-hero"><div class="k">\${y}년생</div><div class="v accent">\${g.color} \${g.animal}띠</div></div><div class="kv"><div><span class="k">간지</span><span class="v">\${g.name}년 (\${N.zodiacHanja(y)})</span></div><div><span class="k">올해 나이</span><span class="v">세는나이 \${TY-y+1}살 · 만 \${TY-y-1}~\${TY-y}세</span></div><div><span class="k">같은 띠 연도</span><span class="v">\${[y-24,y-12,y+12,y+24].join(", ")}</span></div></div>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>연도</th><th>띠</th><th>간지</th></tr></thead><tbody>\${Array.from({length:7},(_,i)=>y-3+i).map(v=>{const gg=N.ganjiOf(v);return \`<tr class="\${v===y?"hl":""}"><td>\${v}년</td><td>\${gg.color} \${gg.animal}띠</td><td>\${gg.name}년</td></tr>\`;}).join("")}</tbody></table></div>\`;
N.bump(out);N.setQS({y});}
inp.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});const q=N.qs("y");if(q){inp.value=q;run();}`,
  },
  {
    slug: "age-table", cat: "age", title: "올해 나이표", short: "출생연도별 만나이·세는나이·띠 한 표로",
    lede: "올해 기준으로 출생연도마다 만나이, 세는나이, 연나이, 띠를 정리한 표입니다. 내 연도를 누르면 강조됩니다.",
    description: "올해 나이표. 출생연도별 만나이(생일 전·후), 세는나이, 연나이, 띠, 간지를 한 표에서 확인하세요.",
    keys: ["나이표", "나이일람표", "연도별나이"], related: ["birthyear-age", "zodiac-age", "student-age"],
    form: `<form id="f" autocomplete="off"><div class="field"><label for="ty">기준 연도</label><div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="년"><input id="ty" type="text" inputmode="numeric" maxlength="4" autocomplete="off"></div></div></div></form>`,
    info: AGE_INFO,
    script: pre + `const inp=$("ty");inp.value=TY;
function run(){const y=parseInt(inp.value,10)||TY;const rows=[];for(let b=y;b>=y-110;b--){const g=N.ganjiOf(b);rows.push(\`<tr><td>\${b}년</td><td class="num">\${y-b-1<0?0:y-b-1} / \${y-b}</td><td class="num">\${y-b+1}</td><td class="num">\${y-b}</td><td>\${g.color} \${g.animal}띠</td><td>\${g.name}</td></tr>\`);}
out.innerHTML=\`<p class="note">\${y}년 기준. 만나이는 <b>생일 전 / 생일 후</b>입니다.</p><div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>출생연도</th><th class="num">만나이</th><th class="num">세는나이</th><th class="num">연나이</th><th>띠</th><th>간지</th></tr></thead><tbody>\${rows.join("")}</tbody></table></div>\`;out.hidden=false;}
inp.addEventListener("input",run);run();`,
  },
  {
    slug: "age-terms", cat: "age", title: "나이별 용어와 출생연도", short: "환갑·고희·희수·미수는 몇 살, 몇 년생",
    lede: "약관, 불혹, 환갑, 고희, 희수, 미수처럼 나이를 부르는 한자 용어와 올해 그 나이가 되는 출생연도를 정리했습니다.",
    description: "나이 용어 모음. 지학·약관·이립·불혹·지천명·이순·환갑·고희·희수·산수·미수·백수의 뜻과 올해 해당 출생연도를 확인하세요.",
    keys: ["환갑", "고희", "희수", "미수", "백수", "칠순", "팔순", "나이용어"], related: ["age-table", "age", "anniversary"],
    form: `<form id="f" autocomplete="off"><div class="field"><label for="ty">기준 연도</label><div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="년"><input id="ty" type="text" inputmode="numeric" maxlength="4" autocomplete="off"></div></div><p class="help">용어의 나이는 세는나이 기준 관용 표기입니다. 환갑은 만 60세(세는나이 61)입니다.</p></div></form>`,
    info: card("칠순·팔순·구순", P("칠순(70)·팔순(80)·구순(90)은 세는나이로 부르는 것이 관례이고, 요즘은 만나이로 잔치를 하는 집도 많습니다. 가족과 기준을 먼저 맞추는 것이 좋습니다.") + P("환갑은 태어난 해의 간지가 60년 만에 돌아오는 해라 만 60세입니다. 진갑은 그 다음 해입니다.")),
    script: pre + `const inp=$("ty");inp.value=TY;
function run(){const y=parseInt(inp.value,10)||TY;out.innerHTML=\`<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">세는나이</th><th>용어</th><th>뜻</th><th>\${y}년 기준 출생연도</th></tr></thead><tbody>\${N.AGE_TERMS.map(([a,t,d])=>\`<tr><td class="num">\${a}</td><td><b>\${t}</b></td><td style="white-space:normal">\${d}</td><td>\${y-a+1}년생</td></tr>\`).join("")}</tbody></table></div>\`;out.hidden=false;}
inp.addEventListener("input",run);run();`,
  },
  {
    slug: "birthyear-age", cat: "age", title: "출생년도별 나이 일람표", short: "이 사람은 몇 년도에 몇 살이었나",
    lede: "출생연도를 넣으면 해마다 몇 살이었고 몇 살이 되는지, 환갑·고희 같은 기념 나이가 언제인지 표로 보여줍니다.",
    description: "출생년도 나이 일람표. 출생연도를 입력하면 연도별 만나이·세는나이와 환갑·칠순·팔순이 되는 해를 확인할 수 있습니다.",
    keys: ["연도별나이", "나이일람", "환갑년도"], related: ["age-table", "age-terms", "school"],
    form: `<form id="f" autocomplete="off">${yearField("y", "출생연도", "예: 1965")}${btns("보기")}</form>`,
    info: card("표 읽는 법", P("만나이는 그 해 생일이 지난 뒤의 나이입니다. 생일 전이면 1세 적습니다.") + P("기념 나이 열에는 세는나이 기준 용어를 표시합니다.")),
    script: pre + `const inp=$("y-y");const terms=new Map(N.AGE_TERMS.map(([a,t])=>[a,t]));
function run(){const y=parseInt(inp.value,10);if(!(y>=1000&&y<=TY)){out.hidden=true;return;}const rows=[];for(let v=y;v<=y+100;v++){const k=v-y+1;rows.push(\`<tr class="\${v===TY?"hl":""}"><td>\${v}년</td><td class="num">\${v-y}세</td><td class="num">\${k}살</td><td>\${terms.get(k)||""}</td></tr>\`);}
out.innerHTML=\`<div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>연도</th><th class="num">만나이</th><th class="num">세는나이</th><th>기념 나이</th></tr></thead><tbody>\${rows.join("")}</tbody></table></div>\`;N.bump(out);N.setQS({y});}
inp.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});const q=N.qs("y");if(q){inp.value=q;run();}`,
  },
  {
    slug: "zodiac-match", cat: "age", title: "띠궁합", short: "삼합·육합·충·원진으로 보는 궁합",
    lede: "두 사람의 출생연도를 넣으면 전통 띠궁합(삼합·육합·충·원진·해)을 알려줍니다. 재미로 보는 민속 참고 자료입니다.",
    description: "띠궁합 계산기. 두 사람의 출생연도로 삼합·육합(좋은 궁합)과 충·원진·해(주의 궁합)를 확인해 보세요.",
    keys: ["띠궁합", "궁합", "삼합", "육합", "원진"], related: ["birthyear-zodiac", "samjae", "zodiac-gap"],
    form: `<form id="f" autocomplete="off"><div class="form-row cols-2">${yearField("a", "첫 번째 출생연도")}${yearField("b", "두 번째 출생연도")}</div>${btns("궁합 보기")}</form>`,
    info: card("궁합 용어", P("<b>삼합</b>: 신자진·사유축·인오술·해묘미. 세 띠가 서로 돕는 조합입니다.") + P("<b>육합</b>: 자축·인해·묘술·진유·사신·오미. 둘이 짝을 이루는 조합입니다.") + P("<b>충</b>: 정반대 위치(자오·축미·인신·묘유·진술·사해). <b>원진</b>·<b>해</b>는 서로 꺼리는 조합으로 전해집니다.") + P("과학적 근거가 있는 것은 아니며, 실제 관계는 두 사람이 만듭니다.")),
    script: pre + `const a=$("a-y"),b=$("b-y");
function run(){const ya=parseInt(a.value,10),yb=parseInt(b.value,10);if(!(ya>0&&yb>0)){out.hidden=true;return;}const ja=N.jijiIndexOf(ya),jb=N.jijiIndexOf(yb),m=N.zodiacMatch(ja,jb),ga=N.ganjiOf(ya),gb=N.ganjiOf(yb);
out.innerHTML=\`<div class="result-hero"><div class="k">\${ga.animal}띠 · \${gb.animal}띠</div><div class="v \${m.grade==="좋음"?"accent":""}">\${m.label}<small>\${m.grade}</small></div></div><p class="note">\${m.desc}</p><div class="kv"><div><span class="k">\${ya}년생</span><span class="v">\${ga.color} \${ga.animal}띠 (\${ga.name}년)</span></div><div><span class="k">\${yb}년생</span><span class="v">\${gb.color} \${gb.animal}띠 (\${gb.name}년)</span></div><div><span class="k">나이 차</span><span class="v">\${Math.abs(ya-yb)}살\${Math.abs(ya-yb)%12===0&&ya!==yb?" (띠동갑)":""}</span></div></div>\`;N.bump(out);N.setQS({a:ya,b:yb});}
[a,b].forEach(i=>i.addEventListener("input",run));$("f").addEventListener("submit",e=>{e.preventDefault();run();});if(N.qs("a")&&N.qs("b")){a.value=N.qs("a");b.value=N.qs("b");run();}`,
  },
  {
    slug: "zodiac-gap", cat: "age", title: "띠동갑 계산기", short: "나와 띠동갑인 연도 찾기",
    lede: "출생연도를 넣으면 12년 차이 나는 띠동갑 연도들과 두 사람의 나이 차가 띠동갑인지 확인할 수 있습니다.",
    description: "띠동갑 계산기. 출생연도로 같은 띠의 12살·24살 터울 연도를 찾고, 두 연도가 띠동갑인지 확인하세요.",
    keys: ["띠동갑", "12살차이"], related: ["zodiac-match", "birthyear-zodiac", "zodiac-age"],
    form: `<form id="f" autocomplete="off"><div class="form-row cols-2">${yearField("a", "내 출생연도")}${yearField("b", "상대 출생연도 (선택)")}</div>${btns("확인")}</form>`,
    info: card("띠동갑이란", P("같은 띠이면서 나이가 12살(또는 12의 배수) 차이 나는 사이를 띠동갑이라고 합니다. 12살 위면 '띠동갑 형', 24살 차이도 띠동갑입니다.")),
    script: pre + `const a=$("a-y"),b=$("b-y");
function run(){const ya=parseInt(a.value,10),yb=parseInt(b.value,10);if(!(ya>0)){out.hidden=true;return;}const g=N.ganjiOf(ya);let head="";
if(yb>0){const d=Math.abs(ya-yb);head=\`<div class="result-hero"><div class="k">\${ya}년생과 \${yb}년생</div><div class="v \${d%12===0&&d>0?"accent":""}">\${d%12===0&&d>0?"띠동갑":"띠동갑 아님"}<small>\${d}살 차이</small></div></div>\`;}
out.innerHTML=head+\`<div class="kv"><div><span class="k">내 띠</span><span class="v">\${g.color} \${g.animal}띠</span></div><div><span class="k">띠동갑 연도</span><span class="v">\${[ya-36,ya-24,ya-12,ya+12,ya+24,ya+36].filter(v=>v<=TY).join(", ")}</span></div></div>\`;N.bump(out);N.setQS({a:ya,b:yb||null});}
[a,b].forEach(i=>i.addEventListener("input",run));$("f").addEventListener("submit",e=>{e.preventDefault();run();});if(N.qs("a")){a.value=N.qs("a");b.value=N.qs("b")||"";run();}`,
  },
  {
    slug: "adult", cat: "age", title: "성년·미성년 나이 계산기", short: "언제 성인이 되는지, 법별 기준 날짜",
    lede: "생년월일을 넣으면 민법상 성년이 되는 날과 선거·운전면허·청소년보호법 등 법마다 다른 기준 나이 도달일을 계산합니다.",
    description: "성년 계산기. 만 19세 성년일, 만 18세 선거권·운전면허·혼인, 청소년보호법(연나이 19) 기준일을 생년월일로 확인하세요.",
    keys: ["성년", "성인", "미성년자", "만19세", "청소년"], related: ["age", "man-age", "school"],
    form: ymdForm("b", "생년월일"),
    info: card("법마다 다른 기준", P("<b>민법 성년</b>은 만 19세가 되는 생일부터입니다.") + P("<b>청소년보호법</b>(술·담배 구매 등)은 연나이 기준으로, 만 19세가 되는 해의 1월 1일부터 청소년에서 벗어납니다.") + P("<b>선거권·운전면허(1·2종 보통)·혼인</b>은 만 18세, <b>주민등록증 발급</b>은 만 17세입니다.") + P("여기 표시된 날짜는 참고용이며, 개별 법령의 예외는 관련 기관에서 확인하세요."), '<a href="https://www.law.go.kr/법령/민법" rel="noopener">민법 제4조·제807조</a>, 청소년보호법 제2조, 공직선거법 제15조, 도로교통법 제82조'),
    script: pre + `const f=$("b"),get=N.ymdInputs(f);const at=(b,n)=>{const y=N.Y(b)+n;return (N.M(b)===2&&N.D(b)===29&&!N.isLeap(y))?N.mk(y,3,1):N.mk(y,N.M(b),N.D(b));};
function run(){const b=get();if(!b){out.hidden=true;return;}if(b>T){N.showErr(f,"오늘 이전 날짜를 입력해 주세요");out.hidden=true;return;}N.showErr(f,"");const a=N.ages(b,T);const adult=at(b,19),yo=N.mk(N.Y(b)+19,1,1);
const rows=[["주민등록증 발급 (만 17세)",at(b,17)],["선거권 · 운전면허 · 혼인 (만 18세)",at(b,18)],["청소년보호법 성인 (연나이 19, 1월 1일)",yo],["민법 성년 (만 19세)",adult]];
out.innerHTML=\`<div class="result-hero"><div class="k">오늘 기준</div><div class="v \${a.man>=19?"accent":""}">\${a.man>=19?"성년":"미성년"}<small>만 \${a.man}세</small></div></div><div class="kv">\${rows.map(([k,d])=>\`<div><span class="k">\${k}</span><span class="v">\${N.fmt(d)} \${d<=T?"<span class=\\"tag neutral\\">지남</span>":"<span class=\\"tag\\">D-"+N.diffDays(T,d)+"</span>"}</span></div>\`).join("")}</div>\`;N.bump(out);N.setQS({d:N.iso(b)});}
f.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});${restore("b", "run")}`,
  },
  {
    slug: "samjae", cat: "age", title: "삼재", short: "내 띠의 삼재 해와 들·눌·날삼재",
    lede: "출생연도를 넣으면 올해 삼재인지, 다음 삼재가 언제인지 들삼재·눌삼재·날삼재로 나눠 보여줍니다. 민속 참고 자료입니다.",
    description: "삼재 계산기. 띠별 삼재 연도(들삼재·눌삼재·날삼재)를 출생연도로 확인하고 올해가 삼재인지 알아보세요.",
    keys: ["삼재", "들삼재", "날삼재", "눌삼재"], related: ["birthyear-zodiac", "zodiac-match", "holidays"],
    form: `<form id="f" autocomplete="off">${yearField("y", "출생연도")}${btns("확인")}</form>`,
    info: card("삼재 규칙", P("삼재는 12년마다 3년씩 든다는 민간 속설입니다. 첫해를 들삼재, 둘째 해를 눌삼재, 마지막 해를 날삼재라 부릅니다.") + P("신·자·진(원숭이·쥐·용)띠는 인·묘·진년, 사·유·축(뱀·닭·소)띠는 해·자·축년, 인·오·술(호랑이·말·개)띠는 신·유·술년, 해·묘·미(돼지·토끼·양)띠는 사·오·미년이 삼재입니다.") + P("근거가 있는 예측은 아니며, 마음가짐의 참고로만 보세요.")),
    script: pre + `const inp=$("y-y");
function run(){const y=parseInt(inp.value,10);if(!(y>0)){out.hidden=true;return;}const j=N.jijiIndexOf(y),s=N.samjae(j,TY),g=N.ganjiOf(y);const ys=[];for(let v=TY-2;v<=TY+13;v++){const r=N.samjae(j,v);if(r.active)ys.push([v,r.phase]);}
out.innerHTML=\`<div class="result-hero"><div class="k">\${g.animal}띠, \${TY}년</div><div class="v \${s.active?"accent":""}">\${s.active?s.phase:"삼재 아님"}</div></div><div class="kv"><div><span class="k">삼재 드는 해</span><span class="v">\${s.years.join(" · ")}</span></div><div><span class="k">다음 삼재 시작</span><span class="v">\${s.active?"진행 중":s.nextStart+"년"}</span></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>연도</th><th>구분</th></tr></thead><tbody>\${ys.map(([v,p])=>\`<tr class="\${v===TY?"hl":""}"><td>\${v}년 (\${N.ganjiOf(v).name})</td><td>\${p}</td></tr>\`).join("")}</tbody></table></div>\`;N.bump(out);N.setQS({y});}
inp.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});const q=N.qs("y");if(q){inp.value=q;run();}`,
  },
  {
    slug: "school", cat: "age", title: "학교 입학·졸업 년도 계산기", short: "초·중·고·대학 입학과 졸업 연도",
    lede: "출생연도를 넣으면 초등학교부터 대학교까지 입학·졸업 연도를 계산합니다. 2009년 이후 취학 기준(1월생 조기입학 폐지)입니다.",
    description: "입학 졸업 년도 계산기. 출생연도로 초등학교·중학교·고등학교·대학교 입학 연도와 졸업 연도, 학번을 확인하세요.",
    keys: ["입학년도", "졸업년도", "학번", "취학"], related: ["student-age", "suneung", "age"],
    form: `<form id="f" autocomplete="off">${yearField("y", "출생연도")}<div class="field"><label>학제 기준</label><div class="seg" id="mode"><button type="button" data-v="normal" aria-pressed="true">정상 취학</button><button type="button" data-v="early" aria-pressed="false">1년 빠름</button><button type="button" data-v="late" aria-pressed="false">1년 늦음</button></div><p class="help">재수·휴학·유급은 반영하지 않습니다.</p></div></form>`,
    info: card("취학 기준", P("초·중등교육법에 따라 만 6세가 되는 날이 속한 해의 다음 해 3월 1일에 초등학교에 입학합니다. 즉 출생연도 + 7년입니다.") + P("2008년 이전에는 3월 1일~다음 해 2월 말 출생을 한 학년으로 묶어 1·2월생이 한 해 먼저 입학했습니다(이른바 빠른 년생). 그 경우 '1년 빠름'을 고르세요."), '<a href="https://www.law.go.kr/법령/초·중등교육법" rel="noopener">초·중등교육법 제13조</a>'),
    script: pre + `const inp=$("y-y");let off=0;const seg=$("mode");seg.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;seg.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));off=b.dataset.v==="early"?-1:b.dataset.v==="late"?1:0;run();});
function run(){const y=parseInt(inp.value,10);if(!(y>1900&&y<2100)){out.hidden=true;return;}const s=N.school(y+off);const rows=[["초등학교",s.elemIn,s.elemOut],["중학교",s.midIn,s.midOut],["고등학교",s.highIn,s.highOut],["대학교 (4년제)",s.univIn,s.univOut]];
out.innerHTML=\`<div class="result-hero"><div class="k">\${y}년생</div><div class="v">\${String(s.univIn).slice(2)}학번<small>대학 \${s.univIn}년 입학</small></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>학교</th><th>입학</th><th>졸업</th><th>상태</th></tr></thead><tbody>\${rows.map(([n,i,o])=>\`<tr><td>\${n}</td><td>\${i}년 3월</td><td>\${o}년 2월</td><td>\${TY<i?"입학 전":TY<o||(TY===o&&N.M(T)<3)?"재학 중":"졸업"}</td></tr>\`).join("")}</tbody></table></div><p class="note">수능은 고3 해 11월, 즉 \${s.highOut-1}년 11월(\${s.highOut}학년도 수능)입니다.</p>\`;N.bump(out);N.setQS({y});}
inp.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});const q=N.qs("y");if(q){inp.value=q;run();}`,
  },
  {
    slug: "student-age", cat: "age", title: "학생 나이 정보", short: "올해 학년별 출생연도와 나이",
    lede: "올해 초등학교 1학년부터 대학교 4학년까지 각 학년의 출생연도, 세는나이, 만나이를 한 표로 정리했습니다.",
    description: "학년별 나이표. 올해 기준 초1~고3, 대학 1~4학년 학생의 출생연도, 세는나이, 만나이, 띠를 확인하세요.",
    keys: ["학년별나이", "초등학생나이", "고등학생나이", "몇학년"], related: ["school", "age-table", "suneung"],
    form: `<form id="f" autocomplete="off"><div class="field"><label for="ty">기준 연도</label><div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="년"><input id="ty" type="text" inputmode="numeric" maxlength="4" autocomplete="off"></div></div><p class="help">3월 학년 시작 기준. 정상 취학, 재수·휴학 없음.</p></div></form>`,
    info: card("빠른 년생", P("2008년 이전 입학자는 1·2월생이 한 학년 위일 수 있습니다. 표는 2009년 이후 기준(출생연도 + 7년 초등 입학)입니다.")),
    script: pre + `const inp=$("ty");inp.value=TY;
function run(){const y=parseInt(inp.value,10)||TY;const grades=[];for(let g=1;g<=6;g++)grades.push(["초등학교 "+g+"학년",y-6-g]);for(let g=1;g<=3;g++)grades.push(["중학교 "+g+"학년",y-12-g]);for(let g=1;g<=3;g++)grades.push(["고등학교 "+g+"학년",y-15-g]);for(let g=1;g<=4;g++)grades.push(["대학교 "+g+"학년",y-18-g]);
out.innerHTML=\`<div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>학년</th><th>출생연도</th><th class="num">세는나이</th><th class="num">만나이</th><th>띠</th></tr></thead><tbody>\${grades.map(([n,b])=>\`<tr><td>\${n}</td><td>\${b}년생</td><td class="num">\${y-b+1}살</td><td class="num">\${y-b-1}~\${y-b}세</td><td>\${N.zodiacOf(b)}띠</td></tr>\`).join("")}</tbody></table></div>\`;out.hidden=false;}
inp.addEventListener("input",run);run();`,
  },
  {
    slug: "today", cat: "age", title: "오늘 날짜 정보", short: "요일·음력·간지·올해 며칠째",
    lede: "오늘의 양력, 음력, 간지, 올해 몇 번째 날인지와 남은 날, 이번 주 몇째 주인지를 한눈에 봅니다. 다른 날짜도 조회할 수 있습니다.",
    description: "오늘 날짜 정보. 요일, 음력 날짜, 육십갑자 간지, 올해 며칠째, 연말까지 남은 날, 주차, 손없는 날 여부를 확인하세요.",
    keys: ["오늘날짜", "오늘음력", "며칠째", "주차", "간지"], related: ["today-lunar", "d-day", "son-eomneun-nal"],
    form: ymdForm("b", "조회할 날짜", "비우면 오늘 기준으로 표시됩니다"),
    info: card("주차 계산", P("주차는 ISO 8601 기준(월요일 시작, 1월 4일이 포함된 주가 1주차)입니다.")),
    script: pre + `const f=$("b"),get=N.ymdInputs(f);
function isoWeek(t){const d=new Date(Date.UTC(N.Y(t),N.M(t)-1,N.D(t)));const dn=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-dn);const ys=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil(((d-ys)/N.DAY+1)/7);}
function run(){const t=get()||T;const y=N.Y(t),L=N.toLunar(t),doy=N.dayOfYear(t),tot=N.isLeap(y)?366:365,g=N.ganjiOf(y);
out.innerHTML=\`<div class="result-hero"><div class="k">\${t.getTime()===T.getTime()?"오늘":"조회일"}</div><div class="v">\${N.fmt(t)}</div></div><div class="stats cols-3"><div class="stat"><div class="k">올해</div><div class="v">\${doy}<small>일째</small></div></div><div class="stat"><div class="k">남은 날</div><div class="v">\${tot-doy}<small>일</small></div></div><div class="stat"><div class="k">주차</div><div class="v">\${isoWeek(t)}<small>주</small></div></div></div><div class="kv"><div><span class="k">음력</span><span class="v">\${L?\`\${L.year}년 \${L.leap?"윤":""}\${L.month}월 \${L.day}일\`:"범위 밖"}</span></div><div><span class="k">간지</span><span class="v">\${L?\`\${L.gapja.year} \${L.gapja.month} \${L.gapja.day}\`:""}</span></div><div><span class="k">올해 띠</span><span class="v">\${g.color} \${g.animal}띠</span></div><div><span class="k">손없는 날</span><span class="v">\${L?(N.isSonEomneun(L.day)?"예":"아니요"):""}</span></div><div><span class="k">윤년</span><span class="v">\${N.isLeap(y)?"예 (366일)":"아니요 (365일)"}</span></div></div>\`;N.bump(out);}
f.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});run();`,
  },
  {
    slug: "indian-name", cat: "age", title: "인디언식 이름 짓기", short: "생년월일로 만드는 그 이름",
    lede: "출생 연도 끝자리, 월, 일을 조합해 '푸른 늑대와 함께 춤을' 같은 이름을 만듭니다. 인터넷에서 오래 돌던 놀이표를 옮긴 것입니다.",
    description: "인디언식 이름 짓기. 생년월일 숫자 조합으로 만드는 재미있는 이름 생성기.",
    keys: ["인디언식이름", "인디언이름", "이름짓기"], related: ["joseon-name", "birthyear-zodiac"],
    form: ymdForm("b", "생년월일"),
    info: card("이 표에 대해", P("실제 아메리카 원주민 작명 문화와는 관계없는 인터넷 놀이입니다. 이름은 연도 끝자리(형용사) + 월(명사) + 일(수식구) 순서로 붙입니다.")),
    script: pre + `const f=$("b"),get=N.ymdInputs(f);
function run(){const b=get();if(!b){out.hidden=true;return;}N.showErr(f,"");const I=N.INDIAN;const name=\`\${I.y[N.Y(b)%10]} \${I.m[N.M(b)-1]}\${I.d[N.D(b)-1]}\`;
out.innerHTML=\`<div class="result-hero"><div class="k">당신의 인디언식 이름</div><div class="v accent">\${name}</div></div><div class="kv"><div><span class="k">연도 끝자리 \${N.Y(b)%10}</span><span class="v">\${I.y[N.Y(b)%10]}</span></div><div><span class="k">\${N.M(b)}월</span><span class="v">\${I.m[N.M(b)-1]}</span></div><div><span class="k">\${N.D(b)}일</span><span class="v">\${I.d[N.D(b)-1]||"(없음)"}</span></div></div>\`;N.bump(out);N.setQS({d:N.iso(b)});}
f.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});${restore("b", "run")}`,
  },
  {
    slug: "joseon-name", cat: "age", title: "조선식 이름 짓기", short: "내 성에 옛날 이름 붙여 보기",
    lede: "성을 고르고 생년월일을 넣으면 조선 시대 서민 이름 느낌의 두 글자 이름을 만들어 줍니다. 놀이용입니다.",
    description: "조선식 이름 짓기. 성씨와 생년월일 조합으로 옛날 이름을 만들어 보는 재미있는 생성기.",
    keys: ["조선식이름", "옛날이름", "이름짓기"], related: ["indian-name", "birthyear-zodiac"],
    form: `<form id="f" autocomplete="off"><div class="form-row cols-2"><div class="field"><label for="sn">성</label><select id="sn">${["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "전", "홍", "고", "문", "양", "손", "배", "백", "허", "유", "남"].map((s) => `<option>${s}</option>`).join("")}</select></div>${ymd("b", "생년월일")}</div>${btns("이름 만들기")}</form>`,
    info: card("이 표에 대해", P("조선 시대 서민 이름에 자주 쓰인 글자(돌·쇠·복·순·이·봉…)를 월과 일에 배정해 조합하는 놀이입니다. 실제 족보나 작명과는 관계가 없습니다.")),
    script: pre + `const f=$("b"),get=N.ymdInputs(f),sn=$("sn");
function run(){const b=get();if(!b){out.hidden=true;return;}const J=N.JOSEON;const name=sn.value+J.m[N.M(b)-1]+J.d[N.D(b)-1];
out.innerHTML=\`<div class="result-hero"><div class="k">조선식 이름</div><div class="v accent">\${name}</div></div><p class="note">\${N.M(b)}월 → \${J.m[N.M(b)-1]}, \${N.D(b)}일 → \${J.d[N.D(b)-1]}</p>\`;N.bump(out);N.setQS({d:N.iso(b),s:sn.value});}
f.addEventListener("input",run);sn.addEventListener("change",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});if(N.qs("s"))sn.value=N.qs("s");${restore("b", "run")}`,
  },
];
