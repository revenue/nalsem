import { age } from "./age.mjs";
import { date } from "./date.mjs";
import { tax } from "./tax.mjs";
import { kepco } from "./kepco.mjs";
import { simpleVat } from "./simple-vat.mjs";
import { alba } from "./alba.mjs";
import { juhyuPay } from "./juhyu.mjs";
import { insurance } from "./insurance.mjs";
import { wedding } from "./wedding.mjs";

// src: 사이트맵 lastmod·dateModified를 페이지별 실제 수정일(git)로 내기 위한 원본 파일 이름
const from = (list, src) => list.map((c) => ({ ...c, src }));
export const calculators = [...from(age, "age.mjs"), ...from(date, "date.mjs"), ...from(tax, "tax.mjs"), ...from(simpleVat, "simple-vat.mjs"), ...from(kepco, "kepco.mjs"), ...from(alba, "alba.mjs"), ...from(juhyuPay, "juhyu.mjs"), ...from(insurance, "insurance.mjs"), ...from(wedding, "wedding.mjs")];

// 필수 필드 점검
for (const c of calculators) for (const k of ["slug", "title", "short", "lede", "description", "cat", "form", "info"]) if (!c[k]) throw new Error(`${c.slug || "?"}: ${k} 누락`);
const dup = calculators.map((c) => c.slug).filter((s, i, a) => a.indexOf(s) !== i);
if (dup.length) throw new Error("slug 중복: " + dup);
