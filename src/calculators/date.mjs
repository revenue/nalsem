import { ymd, ARROW } from "../layout.mjs";

const card = (h2, body, src = "") => `<div class="card bz"><h2>${h2}</h2>${body}${src ? `<p class="src">출처: ${src}</p>` : ""}</div>`;
const P = (s) => `<p>${s}</p>`;
const btns = (label = "계산") => `<div class="actions"><button class="btn btn-primary" type="submit">${label}${ARROW}</button><button class="btn btn-ghost btn-sm" type="button" data-share=""><iconify-icon icon="solar:share-linear"></iconify-icon> 공유</button></div>`;
const pre = `const $=(i)=>document.getElementById(i);const T=N.today();const TY=N.Y(T);const out=$("result");`;
const ymdForm = (id, label, help = "") => `<form id="f" autocomplete="off">${ymd(id, label, help)}${btns()}</form>`;
const restore = (id, run, key = "d") => `const q=N.qs("${key}"),qd=q&&N.parseISO(q);if(qd){N.setYMD($("${id}"),qd);${run}();}`;
const LUNAR_INFO = card("음력 변환 기준", P("한국천문연구원 음양력 자료를 따르는 <b>korean-lunar-calendar</b> 라이브러리로 변환합니다. 1000년 1월 1일부터 2050년 12월 31일까지 지원합니다.") + P("음력은 윤달이 있어 같은 달이 두 번 있을 수 있습니다. 윤달은 '윤' 표시로 구분합니다. 중국 음력과 하루 차이가 나는 날이 있는데, 이 사이트는 한국 기준입니다."), '<a href="https://astro.kasi.re.kr/life/pageView/8" rel="noopener">한국천문연구원 음양력 변환</a>');
const lunarField = (id, label) => `<div class="field" id="${id}"><label for="${id}-y">${label}</label><div class="ymd"><div class="unit" data-unit="년"><input id="${id}-y" type="text" inputmode="numeric" maxlength="4" data-len="4" placeholder="1990" autocomplete="off"></div><div class="unit" data-unit="월"><input id="${id}-m" type="text" inputmode="numeric" maxlength="2" data-len="2" placeholder="5" autocomplete="off" aria-label="${label} 월"></div><div class="unit" data-unit="일"><input id="${id}-d" type="text" inputmode="numeric" maxlength="2" data-len="2" placeholder="3" autocomplete="off" aria-label="${label} 일"></div></div><label style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--muted)"><input type="checkbox" id="${id}-leap" style="width:18px;height:18px"> 윤달</label><p class="help">1000년 ~ 2050년</p><p class="err" role="alert"></p></div>`;

export const date = [
  {
    slug: "d-day", cat: "date", title: "디데이 계산기", short: "오늘부터 그날까지 며칠",
    lede: "날짜를 넣으면 오늘부터 남은 날(D-) 또는 지난 날(D+)을 계산합니다. 결과 링크를 북마크하면 언제든 바로 확인할 수 있습니다.",
    description: "디데이 계산기. 목표 날짜까지 남은 일수(D-day)와 지난 일수를 주·개월 단위로 함께 계산하고 링크로 저장하세요.",
    keys: ["디데이", "dday", "d-day", "남은날"], related: ["date-diff", "anniversary", "suneung"],
    form: `<form id="f" autocomplete="off">${ymd("t", "목표 날짜")}<div class="field"><label for="memo">이름 (선택)</label><input id="memo" type="text" maxlength="30" placeholder="예: 결혼식" autocomplete="off"></div>${btns()}</form>`,
    info: card("D-day 세는 법", P("D-day는 목표일 당일이 D-0(D-day)이고 하루 전이 D-1입니다. 목표일이 지나면 D+1, D+2로 셉니다.") + P("'100일'처럼 당일을 1일로 세는 기념일 계산은 <a href=\"/anniversary/\" style=\"text-decoration:underline\">기념일 계산기</a>를 쓰세요.")),
    script: pre + `const f=$("t"),get=N.ymdInputs(f),memo=$("memo");
function run(){const t=get();if(!t){out.hidden=true;return;}N.showErr(f,"");const n=N.diffDays(T,t),abs=Math.abs(n);const ymd=n>=0?N.diffYMD(T,t):N.diffYMD(t,T);const label=memo.value.trim();
out.innerHTML=\`<div class="result-hero"><div class="k">\${label?N.esc(label)+" · ":""}\${N.fmt(t)}</div><div class="v accent">\${n===0?"D-day":n>0?"D-"+abs:"D+"+abs}</div></div><div class="stats cols-3"><div class="stat"><div class="k">주</div><div class="v">\${Math.floor(abs/7)}<small>주 \${abs%7}일</small></div></div><div class="stat"><div class="k">개월</div><div class="v">\${ymd.y*12+ymd.m}<small>개월 \${ymd.d}일</small></div></div><div class="stat"><div class="k">년</div><div class="v">\${ymd.y}<small>년 \${ymd.m}개월</small></div></div></div><p class="note">오늘 \${N.fmt(T)} 기준. \${n>0?"목표일까지 "+abs+"일 남았습니다.":n<0?"목표일에서 "+abs+"일 지났습니다.":"오늘이 그날입니다."}</p>\`;N.bump(out);N.setQS({d:N.iso(t),m:label||null});}
f.addEventListener("input",run);memo.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});if(N.qs("m"))memo.value=N.qs("m");${restore("t", "run")}`,
  },
  {
    slug: "solar-to-lunar", cat: "date", title: "양력을 음력으로 변환", short: "양력 생일의 음력 날짜와 간지",
    lede: "양력 날짜를 넣으면 음력 날짜(윤달 포함)와 그날의 간지를 알려줍니다. 1000년부터 2050년까지 변환할 수 있습니다.",
    description: "양력 음력 변환기. 한국천문연구원 기준으로 양력 날짜를 음력으로 바꾸고 육십갑자 간지까지 확인하세요.",
    keys: ["양력음력변환", "음력변환", "양력을음력으로", "음력생일"], related: ["lunar-to-solar", "lunar-yearly", "today-lunar"],
    form: ymdForm("s", "양력 날짜", "1000.1.1 ~ 2050.12.31"),
    info: LUNAR_INFO,
    script: pre + `const f=$("s"),get=N.ymdInputs(f);
function run(){const t=get();if(!t){out.hidden=true;return;}const L=N.toLunar(t);if(!L){N.showErr(f,"1000년 ~ 2050년 사이 날짜만 변환할 수 있습니다");out.hidden=true;return;}N.showErr(f,"");
out.innerHTML=\`<div class="result-hero"><div class="k">음력</div><div class="v accent">\${L.year}년 \${L.leap?"윤":""}\${L.month}월 \${L.day}일</div></div><div class="kv"><div><span class="k">양력</span><span class="v">\${N.fmt(t)}</span></div><div><span class="k">간지</span><span class="v">\${L.gapja.year} \${L.gapja.month} \${L.gapja.day} (\${L.gapjaHanja.year})</span></div><div><span class="k">띠</span><span class="v">\${N.ganjiOf(L.year).color} \${N.ganjiOf(L.year).animal}띠 (음력 연도 기준)</span></div><div><span class="k">손없는 날</span><span class="v">\${N.isSonEomneun(L.day)?"예":"아니요"}</span></div></div><p class="note"><a href="/lunar-yearly/?m=\${L.month}&d=\${L.day}\${L.leap?"&leap=1":""}" style="text-decoration:underline;text-underline-offset:3px">이 음력 날짜의 연도별 양력 보기</a></p>\`;N.bump(out);N.setQS({d:N.iso(t)});}
f.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});${restore("s", "run")}`,
  },
  {
    slug: "lunar-to-solar", cat: "date", title: "음력을 양력으로 변환", short: "음력 날짜가 올해 양력으로 며칠",
    lede: "음력 날짜를 넣으면 양력 날짜와 요일을 알려줍니다. 윤달이면 체크해 주세요. 해당 해에 윤달이 없으면 안내합니다.",
    description: "음력 양력 변환기. 음력 생일·제사 날짜를 양력으로 바꾸고 요일까지 확인하세요. 윤달 지원, 1000~2050년.",
    keys: ["음력양력변환", "음력을양력으로", "제사날짜", "음력생일"], related: ["solar-to-lunar", "lunar-yearly", "holidays"],
    form: `<form id="f" autocomplete="off">${lunarField("l", "음력 날짜")}${btns("변환")}</form>`,
    info: LUNAR_INFO,
    script: pre + `const f=$("l"),get=N.ymdInputs(f),leap=$("l-leap");
function run(){const ins=f.querySelectorAll("input[type=text]");const [y,m,d]=[...ins].map(x=>parseInt(x.value,10));if(!(y>0&&m>=1&&m<=12&&d>=1&&d<=30)){out.hidden=true;return;}const t=N.toSolar(y,m,d,leap.checked);if(!t){N.showErr(f,leap.checked?"그 해 "+m+"월에는 윤달이 없거나 날짜가 없습니다":"존재하지 않는 음력 날짜이거나 범위(1000~2050년) 밖입니다");out.hidden=true;return;}N.showErr(f,"");const L=N.toLunar(t);
out.innerHTML=\`<div class="result-hero"><div class="k">양력</div><div class="v accent">\${N.fmt(t)}</div></div><div class="kv"><div><span class="k">음력</span><span class="v">\${y}년 \${leap.checked?"윤":""}\${m}월 \${d}일</span></div><div><span class="k">간지</span><span class="v">\${L.gapja.year} \${L.gapja.month} \${L.gapja.day}</span></div><div><span class="k">오늘 기준</span><span class="v">\${(n=>n===0?"오늘":n>0?"D-"+n:n*-1+"일 전")(N.diffDays(T,t))}</span></div></div>\`;N.bump(out);N.setQS({y,m,d,leap:leap.checked?1:null});}
f.addEventListener("input",run);leap.addEventListener("change",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});if(N.qs("y")){$("l-y").value=N.qs("y");$("l-m").value=N.qs("m");$("l-d").value=N.qs("d");leap.checked=!!N.qs("leap");run();}`,
  },
  {
    slug: "lunar-yearly", cat: "date", title: "음력을 연도별 양력으로 변환", short: "음력 생일·제삿날이 해마다 양력 며칠인지",
    lede: "음력 월·일을 넣으면 해마다 양력으로 며칠인지 표로 보여줍니다. 음력 생일이나 제사 날짜를 달력에 옮길 때 편합니다.",
    description: "음력 날짜 연도별 양력 변환표. 음력 생일·제사·기념일이 매년 양력으로 언제인지 요일과 함께 한 번에 확인하세요.",
    keys: ["음력생일양력", "제사날짜", "연도별음력", "음력달력"], related: ["lunar-to-solar", "solar-to-lunar", "holidays"],
    form: `<form id="f" autocomplete="off"><div class="field"><label for="lm">음력 월·일</label><div class="ymd" style="grid-template-columns:1fr 1fr"><div class="unit" data-unit="월"><input id="lm" type="text" inputmode="numeric" maxlength="2" data-len="2" placeholder="8" autocomplete="off"></div><div class="unit" data-unit="일"><input id="ld" type="text" inputmode="numeric" maxlength="2" data-len="2" placeholder="15" autocomplete="off" aria-label="음력 일"></div></div><label style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--muted)"><input type="checkbox" id="leap" style="width:18px;height:18px"> 윤달만 보기</label></div><div class="field"><label for="from">시작 연도</label><div class="ymd" style="grid-template-columns:1fr 1fr"><div class="unit" data-unit="년"><input id="from" type="text" inputmode="numeric" maxlength="4" autocomplete="off"></div><div class="unit" data-unit="년"><input id="to" type="text" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="끝 연도"></div></div></div>${btns("표 보기")}</form>`,
    info: LUNAR_INFO + card("윤달 제사", P("윤달에 태어났거나 돌아가신 경우 관습적으로 평달(같은 달)에 기념합니다. '윤달만 보기'를 끄면 평달 날짜가 나옵니다.")),
    script: pre + `const lm=$("lm"),ld=$("ld"),leap=$("leap"),from=$("from"),to=$("to");from.value=TY-5;to.value=TY+10;
function run(){const m=parseInt(lm.value,10),d=parseInt(ld.value,10);let a=parseInt(from.value,10)||TY-5,b=parseInt(to.value,10)||TY+10;if(!(m>=1&&m<=12&&d>=1&&d<=30)){out.hidden=true;return;}a=Math.max(N.LUNAR_MIN,a);b=Math.min(N.LUNAR_MAX,b,a+60);const rows=[];for(let y=a;y<=b;y++){const t=N.toSolar(y,m,d,leap.checked);rows.push(\`<tr class="\${y===TY?"hl":""}"><td>\${y}년</td><td>\${t?N.fmt(t):(leap.checked?"윤달 없음":"날짜 없음")}</td><td>\${t?(n=>n===0?"오늘":n>0?"D-"+n:"지남")(N.diffDays(T,t)):""}</td></tr>\`);}
out.innerHTML=\`<p class="note">음력 \${leap.checked?"윤":""}\${m}월 \${d}일, \${a}~\${b}년 (한 번에 최대 60년)</p><div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>연도</th><th>양력</th><th>오늘 기준</th></tr></thead><tbody>\${rows.join("")}</tbody></table></div>\`;N.bump(out);N.setQS({m,d,leap:leap.checked?1:null,from:a,to:b});}
[lm,ld,from,to].forEach(i=>i.addEventListener("input",run));leap.addEventListener("change",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});if(N.qs("m")){lm.value=N.qs("m");ld.value=N.qs("d");leap.checked=!!N.qs("leap");if(N.qs("from"))from.value=N.qs("from");if(N.qs("to"))to.value=N.qs("to");run();}`,
  },
  {
    slug: "today-lunar", cat: "date", title: "오늘 날짜 음력 변환", short: "오늘 음력 며칠, 이번 달 음력 달력",
    lede: "오늘의 음력 날짜와 간지, 그리고 이번 달 전체를 양력·음력 나란히 보여주는 달력입니다.",
    description: "오늘 음력 날짜. 오늘이 음력으로 며칠인지, 간지, 손없는 날 여부와 이번 달 양력·음력 대조 달력을 확인하세요.",
    keys: ["오늘음력", "음력달력", "오늘음력며칠"], related: ["solar-to-lunar", "son-eomneun-nal", "today"],
    form: `<form id="f" autocomplete="off"><div class="field"><label for="ym">달 선택</label><div class="ymd" style="grid-template-columns:1fr 1fr"><div class="unit" data-unit="년"><input id="ym-y" type="text" inputmode="numeric" maxlength="4" autocomplete="off"></div><div class="unit" data-unit="월"><input id="ym-m" type="text" inputmode="numeric" maxlength="2" autocomplete="off" aria-label="월"></div></div></div></form>`,
    info: LUNAR_INFO,
    script: pre + `const yi=$("ym-y"),mi=$("ym-m");yi.value=TY;mi.value=N.M(T);const L0=N.toLunar(T);
function run(){const y=parseInt(yi.value,10),m=parseInt(mi.value,10);if(!(y>=N.LUNAR_MIN&&y<=N.LUNAR_MAX&&m>=1&&m<=12)){out.hidden=true;return;}const n=N.daysInMonth(y,m);const rows=[];for(let d=1;d<=n;d++){const t=N.mk(y,m,d),L=N.toLunar(t);const hol=N.holidays(y).find(h=>h.date.getTime()===t.getTime());rows.push(\`<tr class="\${t.getTime()===T.getTime()?"hl":""}"><td>\${m}월 \${d}일 (\${N.WEEK[N.W(t)]})</td><td>\${L?\`\${L.leap?"윤":""}\${L.month}.\${L.day}\`:""}\${L&&L.day===1?' <span class="tag neutral">초하루</span>':""}\${L&&L.day===15?' <span class="tag neutral">보름</span>':""}</td><td>\${L?L.gapja.day:""}</td><td>\${hol?hol.name:""}\${L&&N.isSonEomneun(L.day)?(hol?" · ":"")+"손없는 날":""}</td></tr>\`);}
out.innerHTML=\`<div class="result-hero"><div class="k">오늘 \${N.fmt(T)}</div><div class="v accent">음력 \${L0.leap?"윤":""}\${L0.month}월 \${L0.day}일</div></div><p class="note">\${L0.gapja.year} \${L0.gapja.month} \${L0.gapja.day}</p><div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>양력</th><th>음력</th><th>일진</th><th>비고</th></tr></thead><tbody>\${rows.join("")}</tbody></table></div>\`;out.hidden=false;}
[yi,mi].forEach(i=>i.addEventListener("input",run));run();`,
  },
  {
    slug: "anniversary", cat: "date", title: "기념일 계산기", short: "100일·200일·1주년이 언제인지",
    lede: "시작일을 넣으면 100일, 200일, 300일, 500일, 1000일과 1주년, 2주년 날짜를 한 번에 계산합니다. 사귄 날, 결혼기념일, 개업일에 쓰세요.",
    description: "기념일 계산기. 사귄 날·결혼일·개업일을 넣으면 100일, 200일, 1000일, N주년 날짜와 남은 날을 한 번에 확인하세요.",
    keys: ["기념일", "100일", "1000일", "커플", "결혼기념일", "주년"], related: ["d-day", "baby-100", "date-add"],
    form: `<form id="f" autocomplete="off">${ymd("s", "시작일", "첫날을 1일로 셉니다")}<div class="field"><label>첫날 세기</label><div class="seg" id="mode"><button type="button" data-v="1" aria-pressed="true">첫날 = 1일</button><button type="button" data-v="0" aria-pressed="false">첫날 = 0일</button></div></div>${btns()}</form>`,
    info: card("첫날을 어떻게 셀까", P("우리나라에서는 사귄 날을 1일로 세는 것이 일반적입니다. 이 기준으로 100일은 시작일에서 99일 뒤입니다.") + P("'첫날 = 0일'로 바꾸면 시작일에서 100일 뒤가 100일이 됩니다.")),
    script: pre + `const f=$("s"),get=N.ymdInputs(f);let inc=1;const seg=$("mode");seg.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;seg.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));inc=+b.dataset.v;run();});
function run(){const s=get();if(!s){out.hidden=true;return;}N.showErr(f,"");const passed=N.diffDays(s,T)+inc;const days=[100,200,300,365,400,500,600,700,800,900,1000,1500,2000,3000,5000,10000];const rows=days.map(n=>[n+"일",N.addDays(s,n-inc)]);for(let y=1;y<=10;y++)rows.push([y+"주년",N.addMonths(s,12*y)]);rows.sort((a,b)=>a[1]-b[1]);
out.innerHTML=\`<div class="result-hero"><div class="k">\${N.fmt(s)}부터 오늘까지</div><div class="v accent">\${passed}<small>일째</small></div></div><div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>기념일</th><th>날짜</th><th>남은 날</th></tr></thead><tbody>\${rows.map(([k,d])=>{const n=N.diffDays(T,d);return \`<tr class="\${n>=0&&n<=30?"hl":""}"><td>\${k}</td><td>\${N.fmt(d)}</td><td>\${n===0?"오늘":n>0?"D-"+n:"지남"}</td></tr>\`;}).join("")}</tbody></table></div>\`;N.bump(out);N.setQS({d:N.iso(s)});}
f.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});${restore("s", "run")}`,
  },
  {
    slug: "date-add", cat: "date", title: "날짜 더하기·빼기 계산기", short: "며칠 뒤, 몇 주 전이 무슨 요일",
    lede: "기준일에 일·주·개월·년을 더하거나 빼서 결과 날짜와 요일을 계산합니다. 계약 만료일, 복약 종료일, 휴가 계산에 쓰세요.",
    description: "날짜 계산기. 기준일에서 N일 후, N주 전, N개월 후, N년 후 날짜와 요일을 계산하세요.",
    keys: ["날짜더하기", "날짜계산", "며칠후", "몇주후", "몇개월후"], related: ["date-diff", "d-day", "anniversary"],
    form: `<form id="f" autocomplete="off">${ymd("s", "기준일", "비우면 오늘")}<div class="field"><label for="n">더하거나 뺄 값</label><div class="ymd" style="grid-template-columns:2fr 1fr 1fr"><input id="n" type="text" inputmode="numeric" placeholder="30" autocomplete="off"><select id="unit"><option value="d">일</option><option value="w">주</option><option value="m">개월</option><option value="y">년</option></select><select id="sign"><option value="1">후</option><option value="-1">전</option></select></div><p class="help">개월·년은 같은 날짜로 이동하고, 없는 날짜(31일 등)는 그 달 마지막 날로 맞춥니다.</p></div>${btns()}</form>`,
    info: card("자주 쓰는 계산", P("<b>계약 3개월</b>: 시작일 + 3개월 − 1일이 만료일인 경우가 많습니다. <b>14일 후</b>는 오늘을 빼고 14일 뒤입니다.") + P("법령의 기간 계산은 초일불산입(첫날을 안 셈)이 원칙이므로, 서류 기한은 관련 기관 안내를 따르세요.")),
    script: pre + `const f=$("s"),get=N.ymdInputs(f),n=$("n"),unit=$("unit"),sign=$("sign");
function run(){const s=get()||T;const v=parseInt(n.value,10);if(!(v>=0)){out.hidden=true;return;}const k=v*+sign.value;let r;if(unit.value==="d")r=N.addDays(s,k);else if(unit.value==="w")r=N.addDays(s,k*7);else if(unit.value==="m")r=N.addMonths(s,k);else r=N.addMonths(s,k*12);const L=N.toLunar(r);
out.innerHTML=\`<div class="result-hero"><div class="k">\${N.fmt(s)}에서 \${v}\${unit.options[unit.selectedIndex].text} \${sign.value==="1"?"후":"전"}</div><div class="v accent">\${N.fmt(r)}</div></div><div class="kv"><div><span class="k">날 수 차이</span><span class="v">\${Math.abs(N.diffDays(s,r))}일</span></div><div><span class="k">음력</span><span class="v">\${L?\`\${L.year}년 \${L.leap?"윤":""}\${L.month}월 \${L.day}일\`:"범위 밖"}</span></div><div><span class="k">오늘 기준</span><span class="v">\${(x=>x===0?"오늘":x>0?"D-"+x:x*-1+"일 전")(N.diffDays(T,r))}</span></div></div>\`;N.bump(out);}
[f,n,unit,sign].forEach(i=>i.addEventListener("input",run));$("f").addEventListener("submit",e=>{e.preventDefault();run();});`,
  },
  {
    slug: "date-diff", cat: "date", title: "날짜 차이 계산기", short: "두 날짜 사이 며칠, 몇 주, 몇 개월",
    lede: "두 날짜를 넣으면 사이의 일수, 주, 개월, 년을 계산합니다. 시작일 포함 여부를 고를 수 있어 근무일수·재직기간 계산에 맞습니다.",
    description: "날짜 차이 계산기. 두 날짜 사이의 일수·주수·개월수·연수를 계산하고 시작일 포함(양편 넣기) 여부를 선택하세요.",
    keys: ["날짜차이", "일수계산", "며칠차이", "재직기간", "근무일수"], related: ["date-add", "d-day", "anniversary"],
    form: `<form id="f" autocomplete="off"><div class="form-row cols-2">${ymd("a", "시작일")}${ymd("b", "종료일", "비우면 오늘")}</div><div class="field"><label>세는 방법</label><div class="seg" id="mode"><button type="button" data-v="0" aria-pressed="true">차이만 (종료 − 시작)</button><button type="button" data-v="1" aria-pressed="false">양편 넣기 (+1일)</button></div></div>${btns()}</form>`,
    info: card("양편 넣기란", P("1일부터 3일까지는 '차이'로 2일이지만 '양편 넣기'로는 3일입니다. 재직 기간, 입원 일수, 숙박이 아닌 이용 일수는 보통 양편 넣기를 씁니다.")),
    script: pre + `const fa=$("a"),fb=$("b"),ga=N.ymdInputs(fa),gb=N.ymdInputs(fb);let inc=0;const seg=$("mode");seg.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;seg.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));inc=+b.dataset.v;run();});
function run(){const a=ga();let b=gb()||T;if(!a){out.hidden=true;return;}const [s,e]=a<=b?[a,b]:[b,a];const d=N.diffYMD(s,e);const days=d.days+inc;const wd=(()=>{let c=0;for(let t=s;t<=e;t=N.addDays(t,1)){const w=N.W(t);if(w!==0&&w!==6)c++;}return inc?c:Math.max(0,c-(N.W(e)!==0&&N.W(e)!==6?1:0));})();
out.innerHTML=\`<div class="result-hero"><div class="k">\${N.fmt(s)} → \${N.fmt(e)}</div><div class="v accent">\${N.comma(days)}<small>일</small></div></div><div class="stats cols-3"><div class="stat"><div class="k">주</div><div class="v">\${Math.floor(days/7)}<small>주 \${days%7}일</small></div></div><div class="stat"><div class="k">개월</div><div class="v">\${d.y*12+d.m}<small>개월 \${d.d}일</small></div></div><div class="stat"><div class="k">년</div><div class="v">\${d.y}<small>년 \${d.m}개월 \${d.d}일</small></div></div></div><div class="kv"><div><span class="k">평일 (월~금)</span><span class="v">\${wd}일</span></div><div><span class="k">주말</span><span class="v">\${days-wd}일</span></div></div><p class="note">평일 수는 공휴일을 빼지 않은 값입니다.</p>\`;N.bump(out);N.setQS({a:N.iso(s),b:gb()?N.iso(e):null});}
[fa,fb].forEach(i=>i.addEventListener("input",run));$("f").addEventListener("submit",e=>{e.preventDefault();run();});const qa=N.parseISO(N.qs("a")),qb=N.parseISO(N.qs("b"));if(qa){N.setYMD(fa,qa);if(qb)N.setYMD(fb,qb);run();}`,
  },
  {
    slug: "suneung", cat: "date", title: "수능 디데이", short: "2027학년도 수능까지 남은 날",
    lede: "다음 대학수학능력시험까지 남은 날을 세어 줍니다. 2027학년도 수능은 2026년 11월 19일 목요일입니다.",
    description: "수능 디데이 카운터. 2027학년도 수능(2026년 11월 19일)까지 남은 날짜와 이후 수능 예정일을 확인하세요.",
    keys: ["수능디데이", "수능", "수능날짜", "수능까지"], related: ["d-day", "school", "student-age"],
    form: `<form id="f" autocomplete="off"><div class="field"><label>학년도 선택</label><div class="chips" id="hy"></div></div></form>`,
    info: card("수능 일정", P("교육부는 매년 3월 그 해 11월 수능 일정을 확정 발표합니다. 확정된 날짜만 '확정'으로 표시하고, 그 이후 연도는 11월 셋째 목요일 관행에 따른 추정입니다.") + P("2027학년도 수능: 2026년 11월 19일(목), 성적 통지 12월 11일."), '<a href="https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=100526&lev=0&m=020402&s=moe" rel="noopener">교육부 보도자료 (2027학년도 수능 시행일)</a>'),
    script: pre + `const hy=$("hy");const years=[];for(let h=TY;h<=TY+4;h++){const s=N.suneung(h);if(N.diffDays(T,s.date)>=-30)years.push(h);}
hy.innerHTML=years.map(h=>\`<button class="chip" type="button" data-h="\${h}" aria-pressed="false">\${h}학년도</button>\`).join("");
function run(h){hy.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",String(+c.dataset.h===h)));const s=N.suneung(h),n=N.diffDays(T,s.date);
out.innerHTML=\`<div class="result-hero"><div class="k">\${h}학년도 수능 · \${N.fmt(s.date)} \${s.confirmed?'<span class="tag">확정</span>':'<span class="tag neutral">추정</span>'}</div><div class="v accent">\${n===0?"D-day":n>0?"D-"+n:"D+"+(-n)}</div></div><div class="stats cols-3"><div class="stat"><div class="k">주</div><div class="v">\${Math.floor(Math.abs(n)/7)}<small>주</small></div></div><div class="stat"><div class="k">응시 학년</div><div class="v">\${h-19}<small>년생 (고3)</small></div></div><div class="stat"><div class="k">오늘</div><div class="v" style="font-size:16px">\${N.fmt(T)}</div></div></div>\${s.confirmed?"":'<p class="note">교육부 발표 전이라 11월 셋째 목요일로 추정한 날짜입니다.</p>'}\`;N.bump(out);N.setQS({h});}
hy.addEventListener("click",e=>{const c=e.target.closest(".chip");if(c)run(+c.dataset.h);});const q=+N.qs("h");run(years.includes(q)?q:years[0]);`,
  },
  {
    slug: "holidays", cat: "date", title: "우리나라 공휴일", short: "올해·내년 공휴일과 대체공휴일, 연휴",
    lede: "연도별 법정 공휴일과 대체공휴일을 요일과 함께 보여주고, 다음 공휴일까지 남은 날과 연휴를 계산합니다.",
    description: "공휴일 달력. 올해와 내년 법정 공휴일, 대체공휴일, 설날·추석 연휴 날짜와 다음 공휴일 디데이를 확인하세요.",
    keys: ["공휴일", "대체공휴일", "연휴", "빨간날", "쉬는날"], related: ["lunar-to-solar", "d-day", "date-diff"],
    form: `<form id="f" autocomplete="off"><div class="field"><label for="ty">연도</label><div class="ymd" style="grid-template-columns:1fr"><div class="unit" data-unit="년"><input id="ty" type="text" inputmode="numeric" maxlength="4" autocomplete="off"></div></div><p class="help">설·추석·부처님오신날은 음력으로 계산하고, 대체공휴일 규정을 적용합니다. 임시공휴일은 포함하지 않습니다.</p></div></form>`,
    info: card("대체공휴일 규정", P("설날·추석 연휴가 일요일과 겹치면, 삼일절·광복절·개천절·한글날·어린이날·부처님오신날·성탄절이 토·일요일과 겹치면 그다음 첫 평일이 대체공휴일입니다.") + P("신정, 현충일은 대체공휴일 대상이 아닙니다. 정부가 따로 지정하는 임시공휴일과 선거일은 이 표에 없습니다."), '<a href="https://www.law.go.kr/법령/관공서의공휴일에관한규정" rel="noopener">관공서의 공휴일에 관한 규정</a>'),
    script: pre + `const inp=$("ty");inp.value=TY;
function run(){const y=parseInt(inp.value,10)||TY;if(y<N.LUNAR_MIN+1||y>N.LUNAR_MAX-1){out.hidden=true;return;}const hs=N.holidays(y);const next=hs.find(h=>h.date>=T);const weekday=hs.filter(h=>N.W(h.date)>0&&N.W(h.date)<6).length;
out.innerHTML=\`<div class="stats cols-3"><div class="stat"><div class="k">\${y}년 공휴일</div><div class="v">\${hs.length}<small>일</small></div></div><div class="stat"><div class="k">평일에 쉬는 날</div><div class="v">\${weekday}<small>일</small></div></div><div class="stat"><div class="k">\${y===TY?"다음 공휴일":"첫 공휴일"}</div><div class="v" style="font-size:16px">\${next?N.fmtShort(next.date)+" "+next.name+(y===TY?" (D-"+N.diffDays(T,next.date)+")":""):"없음"}</div></div></div><div class="tbl-wrap tbl-tall"><table class="tbl"><thead><tr><th>날짜</th><th>요일</th><th>공휴일</th></tr></thead><tbody>\${hs.map(h=>\`<tr class="\${next&&h.date.getTime()===next.date.getTime()&&y===TY?"hl":""}"><td>\${N.M(h.date)}월 \${N.D(h.date)}일</td><td>\${N.WEEK[N.W(h.date)]}</td><td>\${h.name}\${h.sub?' <span class="tag neutral">대체</span>':""}</td></tr>\`).join("")}</tbody></table></div>\`;out.hidden=false;N.setQS({y:y===TY?null:y});}
inp.addEventListener("input",run);if(N.qs("y"))inp.value=N.qs("y");run();`,
  },
  {
    slug: "son-eomneun-nal", cat: "date", title: "손없는 날", short: "이사·개업하기 좋은 날 달력",
    lede: "음력 끝자리가 9·0인 날, 이른바 손없는 날을 달마다 보여줍니다. 이사, 개업, 혼례 날짜를 잡을 때 참고하는 민속 달력입니다.",
    description: "손없는 날 달력. 이사·개업·혼례 날짜로 찾는 손없는 날(음력 9·10·19·20·29·30일)을 월별로 요일과 함께 확인하세요.",
    keys: ["손없는날", "이사날짜", "이사하기좋은날", "개업"], related: ["today-lunar", "holidays", "lunar-to-solar"],
    form: `<form id="f" autocomplete="off"><div class="field"><label for="ym">달 선택</label><div class="ymd" style="grid-template-columns:1fr 1fr"><div class="unit" data-unit="년"><input id="ym-y" type="text" inputmode="numeric" maxlength="4" autocomplete="off"></div><div class="unit" data-unit="월"><input id="ym-m" type="text" inputmode="numeric" maxlength="2" autocomplete="off" aria-label="월"></div></div></div></form>`,
    info: card("손없는 날이란", P("'손(損)'은 날짜에 따라 방위를 옮겨 다니며 사람 일을 방해한다는 귀신을 뜻합니다. 음력 1·2일은 동쪽, 3·4일은 남쪽, 5·6일은 서쪽, 7·8일은 북쪽에 있고, 9·10일에는 하늘로 올라가 아무 방위에도 없다고 하여 이날을 손없는 날이라 합니다.") + P("과학적 근거는 없지만 이사 비용이 몰리는 날이므로 일정과 비용을 함께 고려하세요.")),
    script: pre + `const yi=$("ym-y"),mi=$("ym-m");yi.value=TY;mi.value=N.M(T);
function run(){const y=parseInt(yi.value,10),m=parseInt(mi.value,10);if(!(y>=N.LUNAR_MIN&&y<=N.LUNAR_MAX&&m>=1&&m<=12)){out.hidden=true;return;}const n=N.daysInMonth(y,m);const rows=[];for(let d=1;d<=n;d++){const t=N.mk(y,m,d),L=N.toLunar(t);if(!L||!N.isSonEomneun(L.day))continue;const w=N.W(t);rows.push(\`<tr class="\${t.getTime()===T.getTime()?"hl":""}"><td>\${m}월 \${d}일</td><td>\${N.WEEK[w]}\${w===0||w===6?' <span class="tag neutral">주말</span>':""}</td><td>\${L.leap?"윤":""}\${L.month}.\${L.day}</td><td>\${L.gapja.day}</td></tr>\`);}
out.innerHTML=\`<div class="result-hero"><div class="k">\${y}년 \${m}월</div><div class="v">\${rows.length}<small>일이 손없는 날</small></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>양력</th><th>요일</th><th>음력</th><th>일진</th></tr></thead><tbody>\${rows.join("")}</tbody></table></div>\`;out.hidden=false;N.setQS({y,m});}
[yi,mi].forEach(i=>i.addEventListener("input",run));if(N.qs("y")){yi.value=N.qs("y");mi.value=N.qs("m")||1;}run();`,
  },
  {
    slug: "baby-100", cat: "date", title: "아기 100일 계산기", short: "백일·돌·생후 개월 수",
    lede: "아기 생년월일을 넣으면 백일, 200일, 첫돌, 두돌 날짜와 오늘 생후 며칠·몇 개월인지 계산합니다.",
    description: "아기 백일 계산기. 생년월일로 백일(100일), 첫돌, 두돌 날짜와 생후 일수·개월수·주수를 확인하세요.",
    keys: ["백일", "100일", "돌", "첫돌", "생후개월", "아기"], related: ["anniversary", "man-age", "age"],
    form: `<form id="f" autocomplete="off">${ymd("b", "아기 생년월일")}${btns()}</form>`,
    info: card("백일 세는 법", P("태어난 날을 1일로 세어 100일째 되는 날이 백일입니다. 즉 생일에서 99일 뒤입니다. 돌은 태어난 다음 해 같은 날(만 1세 생일)입니다.") + P("영유아 건강검진 시기는 생후 개월 수 기준이므로 '생후 개월'을 참고하세요.")),
    script: pre + `const f=$("b"),get=N.ymdInputs(f);
function run(){const b=get();if(!b){out.hidden=true;return;}if(b>T){N.showErr(f,"오늘 이전 날짜를 입력해 주세요");out.hidden=true;return;}N.showErr(f,"");const a=N.ages(b,T),days=a.full.days+1;const rows=[["백일 (100일째)",N.addDays(b,99)],["200일",N.addDays(b,199)],["첫돌 (만 1세)",N.addMonths(b,12)],["500일",N.addDays(b,499)],["두돌 (만 2세)",N.addMonths(b,24)],["1000일",N.addDays(b,999)],["세돌 (만 3세)",N.addMonths(b,36)]];
out.innerHTML=\`<div class="result-hero"><div class="k">오늘 생후</div><div class="v accent">\${days}<small>일째</small></div></div><div class="stats cols-3"><div class="stat"><div class="k">생후 개월</div><div class="v">\${a.full.y*12+a.full.m}<small>개월 \${a.full.d}일</small></div></div><div class="stat"><div class="k">생후 주</div><div class="v">\${Math.floor(a.full.days/7)}<small>주 \${a.full.days%7}일</small></div></div><div class="stat"><div class="k">만나이</div><div class="v">\${a.man}<small>세</small></div></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>기념일</th><th>날짜</th><th>남은 날</th></tr></thead><tbody>\${rows.map(([k,d])=>{const n=N.diffDays(T,d);return \`<tr class="\${n>=0&&n<=14?"hl":""}"><td>\${k}</td><td>\${N.fmt(d)}</td><td>\${n===0?"오늘":n>0?"D-"+n:"지남"}</td></tr>\`;}).join("")}</tbody></table></div>\`;N.bump(out);N.setQS({d:N.iso(b)});}
f.addEventListener("input",run);$("f").addEventListener("submit",e=>{e.preventDefault();run();});${restore("b", "run")}`,
  },
];
