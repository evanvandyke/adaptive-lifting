import { CATALOG } from "./catalog.js";
import type { Identity, Load, Reps } from "./types.js";

export function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("nonfinite_json_value");
    if (["function", "symbol", "bigint"].includes(typeof value)) throw new TypeError("unsupported_json_value");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${Array.from(value,stableStringify).join(",")}]`;
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==Object.prototype&&prototype!==null)throw new TypeError("unsupported_json_object");
  return `{${Object.keys(value).filter(k => (value as Record<string, unknown>)[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(",")}}`;
}
export function contentDigest(value: unknown): string {
  const text = stableStringify(value);
  let a = 2166136261, b = 2246822507;
  for (let i=0;i<text.length;i++) { a=Math.imul(a^text.charCodeAt(i),16777619); b=Math.imul(b^text.charCodeAt(i),3266489909); }
  return `${(a>>>0).toString(16).padStart(8,"0")}${(b>>>0).toString(16).padStart(8,"0")}`;
}
export function clone<T>(value: T): T { return structuredClone(value); }
export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(value);
}
export function instant(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) throw new TypeError("invalid_instant");
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString().replace(".000Z", "Z") !== value.replace(".000Z", "Z")) throw new TypeError("invalid_instant");
  return time;
}
export function localDate(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant(value));
  const read = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}
export function normalizeLoad(load: Load): bigint {
  if (!load || !Number.isSafeInteger(load.amountMilli) || load.amountMilli < 0 || (load.unit !== "lb" && load.unit !== "kg")) throw new TypeError("invalid_load");
  const factor = BigInt(load.unit === "lb" ? 453592370000 : 1000000000000);
  const value = BigInt(load.amountMilli) * factor / BigInt(1000);
  return value;
}
export function pounds(value: number): bigint { return normalizeLoad({ amountMilli: value * 1000, unit: "lb" }); }
export function withinPercent(value: bigint, anchor: bigint, percent: number): boolean {
  return value * BigInt(100) <= anchor * BigInt(100 + percent);
}
export function atMostPercent(value: bigint, anchor: bigint, percent: number): boolean {
  return value * BigInt(100) <= anchor * BigInt(percent);
}
export function sameLoad(a: Load | null, b: Load | null): boolean {
  return a === null || b === null ? a === b : normalizeLoad(a) === normalizeLoad(b);
}
export function identityKey(identity: Identity): string {
  if (!identity || !Object.prototype.hasOwnProperty.call(CATALOG,identity.variant)) throw new TypeError("unknown_variant");
  const cat = CATALOG[identity.variant];
  if (!cat || !validId(identity.setupId)) throw new TypeError("invalid_identity");
  if (cat.convention === "machine" && identity.machineUnit !== "lb" && identity.machineUnit !== "kg") throw new TypeError("machine_unit_required");
  if (cat.convention !== "machine" && identity.machineUnit !== undefined) throw new TypeError("unexpected_machine_unit");
  return JSON.stringify([cat.movement, identity.variant, identity.setupId, cat.loadingMode, cat.convention, identity.machineUnit ?? null]);
}
export function minReps(reps: Reps): number { return typeof reps === "number" ? reps : Math.min(reps.left, reps.right); }
export function totalReps(reps: Reps): number { return typeof reps === "number" ? reps : reps.left + reps.right; }
export function prescriptionKey(load: Load | null, targets: number[]): string {
  return JSON.stringify([load === null ? null : normalizeLoad(load).toString(), targets]);
}
