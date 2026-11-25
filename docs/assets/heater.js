/* 날셈 난방기 전기요금 엔진 (주택용 저압, 2026년 겨울 기준).
   순수 함수만 둔다. 브라우저(window.HEATER)와 Node 테스트(test/heater.test.mjs, vm) 양쪽에서 쓴다.
   요금 출처(2026-11-26 확인):
   - 주택용(저압) 요금표 2024-01-01 적용분: 한전ON https://online.kepco.co.kr/PRM004D00 , 한전 사이버지점 CYEEHP00101
   - 청구금액 = 전기요금 + 부가가치세(10%, 원 미만 4사 5입) + 전력산업기반기금(2.7%, 10원 미만 절사): 한전ON 요금표 '일반사항'
   - 연료비조정단가 +5원/kWh: 2026년 4분기(10~12월) 동결 발표(2026-09-21)
   - 기후환경요금 9원/kWh: 2023-01 단가, 2026년 3분기 '기후환경요금 등 다른 항목도 조정하지 않음' 보도(SBS Biz 2026-06)
   - 검산: 한전ON '전기요금계산 방법' 예시 250kWh 전력량요금 34,730원, 기본요금 1,600원
   전력량요금·기후환경요금·연료비조정요금의 원 미만은 버리고, 청구금액은 10원 미만을 버린다. 고지서와 몇십 원 차이가 날 수 있어 화면에 "약"으로 표시한다.
   입력값은 이 파일 밖으로 나가지 않는다(전송·저장 없음). */
(function (g) {
  "use strict";

  const RATE = {
    applied: "2024-01-01", checked: "2026-11-26",
    base: [910, 1600, 7300], // 구간별 기본요금(원/호)
    energy10: [1200, 2146, 3073], // 전력량요금(원/kWh) × 10, 소수점 오차를 피하려고 정수로 계산
    tiers: { summer: [300, 450], other: [200, 400] }, // 하계(7~8월)와 기타계절의 구간 경계
    superUser: { over: 1000, price10: 7362, months: [12, 1, 2, 7, 8] }, // 동계·하계 1,000kWh 초과분
    climate: 9, fuel: 5, vat: 0.1, fund: 0.027,
  };

  // 기기 종류 기본값: 한전ON '사용제품 요금계산' 예시(전기장판 300W)와 흔한 정격 소비전력. 제품마다 달라 라벨 값으로 바꾸게 한다.
  const KINDS = [
    { id: "mat", label: "전기장판·전기요", w: 300, hours: 8, note: "한전ON 예시값 300W" },
    { id: "water", label: "온수매트", w: 300, hours: 8 },
    { id: "carbon", label: "카본매트", w: 200, hours: 8 },
    { id: "heater", label: "전기히터·온풍기", w: 1500, hours: 3 },
    { id: "radiator", label: "라디에이터", w: 2000, hours: 4 },
    { id: "hum-heat", label: "가습기 (가열식)", w: 300, hours: 8 },
    { id: "hum-sonic", label: "가습기 (초음파식)", w: 30, hours: 8 },
    { id: "etc", label: "그 밖의 기기", w: 0, hours: 0 },
  ];
  const kind = (id) => KINDS.find((k) => k.id === id) || null;

  const season = (month) => (month === 7 || month === 8 ? "summer" : "other");
  const fl = Math.floor;

  // 한 달 사용량(kWh, 정수로 반올림) → 요금 내역. month: 1~12
  function bill(kwhIn, month) {
    const kwh = Math.max(0, Math.round(Number(kwhIn) || 0));
    const [t1, t2] = RATE.tiers[season(month)];
    const tier = kwh <= t1 ? 1 : kwh <= t2 ? 2 : 3;
    const base = RATE.base[tier - 1];
    const k1 = Math.min(kwh, t1), k2 = Math.max(0, Math.min(kwh, t2) - t1), k3 = Math.max(0, kwh - t2);
    let e10 = k1 * RATE.energy10[0] + k2 * RATE.energy10[1] + k3 * RATE.energy10[2];
    const su = RATE.superUser;
    const superKwh = su.months.includes(month) ? Math.max(0, kwh - su.over) : 0;
    if (superKwh) e10 += superKwh * (su.price10 - RATE.energy10[2]);
    const energy = fl(e10 / 10);
    const climate = fl(kwh * RATE.climate);
    const fuel = fl(kwh * RATE.fuel);
    const charge = base + energy + climate + fuel; // 전기요금계
    const vat = Math.round(charge * RATE.vat);
    const fund = fl((charge * RATE.fund) / 10) * 10;
    const total = fl((charge + vat + fund) / 10) * 10;
    return { kwh, tier, base, energy, climate, fuel, charge, vat, fund, total, superKwh, bounds: [t1, t2] };
  }

  // 기기 한 줄의 한 달 사용량(kWh, 소수 1자리). w: 와트, hours: 하루 사용 시간, days: 한 달 사용 일수, duty: 켜져 있는 비율(%)
  function kwhOf(r) {
    const w = Math.max(0, Number(r.w) || 0), h = Math.min(24, Math.max(0, Number(r.hours) || 0));
    const d = Math.min(31, Math.max(0, Number(r.days) || 0)), duty = Math.min(100, Math.max(0, r.duty == null ? 100 : Number(r.duty)));
    return Math.round((w * h * d * duty) / 100 / 1000 * 10) / 10;
  }

  // 평소 사용량 + 기기들 → 전후 요금, 기기별 몫(늘어난 요금을 사용량 비율로 나눔)
  function calc(input) {
    const month = Number(input.month) || 12;
    const usual = Math.max(0, Math.round(Number(input.usual) || 0));
    const rows = (input.rows || []).map((r) => ({ ...r, kwh: kwhOf(r) })).filter((r) => r.kwh > 0);
    const added = Math.round(rows.reduce((s, r) => s + r.kwh, 0));
    const before = bill(usual, month), after = bill(usual + added, month);
    const diff = after.total - before.total;
    const sumK = rows.reduce((s, r) => s + r.kwh, 0) || 1;
    let left = diff;
    const out = rows.map((r, i) => {
      const share = i === rows.length - 1 ? left : Math.round((diff * r.kwh) / sumK);
      left -= share;
      return { ...r, label: (kind(r.kind) || {}).label || "기기", won: share };
    });
    return { month, usual, added, before, after, diff, rows: out, tierUp: after.tier > before.tier, superUser: after.superKwh > 0 };
  }

  // 지금 구간에서 1kWh 더 쓸 때 드는 돈(부가세·기금 포함, 원). 1시간 요금 안내용
  // 다음 1kWh가 속하는 구간의 단가 + 기후환경·연료비조정 단가에 부가세(10%)·기금(2.7%)을 더한 값. 구간이 바뀌며 오르는 기본요금은 넣지 않는다.
  function marginal(kwh, month) {
    const k = Math.max(0, Math.round(Number(kwh) || 0)) + 1;
    const [t1, t2] = RATE.tiers[season(month)];
    const su = RATE.superUser;
    const p10 = su.months.includes(month) && k > su.over ? su.price10 : k <= t1 ? RATE.energy10[0] : k <= t2 ? RATE.energy10[1] : RATE.energy10[2];
    return Math.round((p10 / 10 + RATE.climate + RATE.fuel) * (1 + RATE.vat + RATE.fund));
  }

  const wonStr = (won) => Math.round(won).toLocaleString("ko-KR") + "원";
  const man = (won) => (Math.abs(won) >= 10000 ? (Math.round(won / 1000) / 10).toLocaleString("ko-KR") + "만 원" : wonStr(won));

  g.HEATER = { RATE, KINDS, kind, season, bill, kwhOf, calc, marginal, wonStr, man };
})(typeof window !== "undefined" ? window : globalThis);
