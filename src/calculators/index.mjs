import { age } from "./age.mjs";
import { date } from "./date.mjs";

export const calculators = [...age, ...date];

// 필수 필드 점검
for (const c of calculators) for (const k of ["slug", "title", "short", "lede", "description", "cat", "form", "info"]) if (!c[k]) throw new Error(`${c.slug || "?"}: ${k} 누락`);
const dup = calculators.map((c) => c.slug).filter((s, i, a) => a.indexOf(s) !== i);
if (dup.length) throw new Error("slug 중복: " + dup);
