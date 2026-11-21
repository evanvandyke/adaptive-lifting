import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  applyEvent, CATALOG, createState, eventFingerprint, identityKey, normalizeLoad,
  recommendExercise, replay, resolutionEntityId, summarize,
} from "../src/index.js";
import type {
  Actual, Decision, EngineEvent, EngineState, Identity, Inventory, Load,
  Prescription, RecommendationContext, Setting, VariantId,
} from "../src/types.js";

// Scripted observations only: this is not a physiological model or forecast.
const POLICY = "experimental-v1";
const SCENARIO_VERSION = "independent-histories-v2";
const ZONE = "America/Denver";
const DAY = 86_400_000;
const START = Date.parse("2026-11-01T17:00:00Z");
const lb = (n: number): Load => ({ amountMilli: n * 1000, unit: "lb" });
const kg = (n: number): Load => ({ amountMilli: n * 1000, unit: "kg" });
const iso = (n: number): string => new Date(n).toISOString();
const date = (n: number): string => new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit",
}).format(n);
const json = (value: unknown): string => JSON.stringify(value, null, 2);
const hash = (value: string): string => createHash("sha256").update(value).digest("hex");
function hashTree(directory: string): string {
  return hash(readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => entry.isDirectory() ? `${entry.name}:${hashTree(join(directory, entry.name))}`
      : `${entry.name}:${hash(readFileSync(join(directory, entry.name), "utf8"))}`).join("\n"));
}
const identity = (variant: VariantId, setupId = "scenario-verified"): Identity => variant === "lat_pulldown"
  ? { variant, setupId, machineUnit: "lb" } : { variant, setupId };
const reps = (which: Identity, n: number) => CATALOG[which.variant].perSide ? { left: n, right: n } : n;
function inventory(which: Identity, values: Load[]): Inventory {
  return { verified: true, equipment: [...CATALOG[which.variant].equipment], loads: values };
}

interface Scenario {
  id: string;
  title: string;
  purpose: string;
  mode: string;
  visits?: number;
  variant?: VariantId;
  loads?: Load[];
  home?: boolean;
  easy?: boolean;
  hold?: boolean;
  extras?: boolean;
  unknownTiming?: boolean;
}

export const SCENARIOS: Scenario[] = [
  { id: "01", title: "Press with no ratings", purpose: "Ordinary completion establishes and progresses without optional input.", mode: "ordinary" },
  { id: "02", title: "Hinge with no ratings", purpose: "Different rep floor and protected priority lift; no extras prompt.", mode: "ordinary", variant: "db_rdl", visits: 16 },
  { id: "03", title: "Goblet squat with no ratings", purpose: "Six-to-eight target range and priority recovery.", mode: "ordinary", variant: "goblet_squat", visits: 16 },
  { id: "04", title: "Supported row with longer recovery", purpose: "Longer recovery still supplies ordinary comparable evidence.", mode: "long-rest", variant: "db_supported_row" },
  { id: "05", title: "Alternating paired and straight sets", purpose: "Equipment-driven pairing changes must not starve progression.", mode: "pair-context" },
  { id: "06", title: "Easy feedback bridges low press loads", purpose: "Acknowledged low-load trials and establishment gates.", mode: "easy", easy: true, visits: 18, loads: [5, 10, 15, 20, 25, 30].map(lb) },
  { id: "07", title: "Small lateral-raise implements", purpose: "Low-load ceiling and2.5-lb steps for a small exercise.", mode: "easy", variant: "db_lateral_raise", easy: true, visits: 18, loads: [2.5, 5, 7.5, 10, 12.5].map(lb) },
  { id: "08", title: "Normal coarse press steps", purpose: "Progress through low-load bridge into above-ceiling coarse trials.", mode: "easy", easy: true, visits: 28, loads: [10, 15, 20, 25, 30, 35, 40, 45].map(lb) },
  { id: "09", title: "Oversized next implement", purpose: "10-to30 inventory gap must produce an explained limit.", mode: "oversized", visits: 16, loads: [10, 30].map(lb) },
  { id: "10", title: "Kilogram dumbbell inventory", purpose: "Use original attainable kg entries while applying lb-defined policy bounds exactly.", mode: "easy", easy: true, visits: 18, loads: [2, 4, 6, 8, 10, 12].map(kg) },
  { id: "11", title: "Measured optional final-set extras", purpose: "Extras may accelerate rep-only proposals, never pool sets or skip baseline gates.", mode: "extras", extras: true, visits: 16 },
  { id: "12", title: "Unknown timing with extras logged", purpose: "Truthful extra reps remain but unknown timing disables extras acceleration.", mode: "unknown-timing", extras: true, unknownTiming: true, visits: 16 },
  { id: "13", title: "One difficult day", purpose: "One short exposure affects guidance without deleting established history.", mode: "one-bad-day", hold: true },
  { id: "14", title: "Repeated unknown-cause shorts", purpose: "Unanswered cause cannot leave a repeated baseline target permanently stuck.", mode: "unknown-shorts", hold: true },
  { id: "15", title: "Two effort-related short dates", purpose: "Explicit effort cause uses its distinct difficulty gate.", mode: "effort-shorts", hold: true },
  { id: "16", title: "Complete but hard", purpose: "Completed targets with hard feedback are difficulty rather than success.", mode: "hard-complete", hold: true },
  { id: "17", title: "A clean success resets difficulty", purpose: "Hard dates separated by successful work are not one consecutive streak.", mode: "reset-difficulty", hold: true },
  { id: "18", title: "Equipment interruptions", purpose: "Tagged interruptions stay truthful and neutral for adaptation evidence.", mode: "interruptions" },
  { id: "19", title: "Actual substitute load", purpose: "Available lighter dumbbells cannot satisfy the heavier issued-load gate.", mode: "substitute-actual" },
  { id: "20", title: "Current implement disappears", purpose: "Verified lower inventory substitution rather than rounding up.", mode: "missing-load", hold: true },
  { id: "21", title: "Manual oversized actual", purpose: "Out-of-policy observed60lb remains history and grants no future authority.", mode: "manual-load" },
  { id: "22", title: "Warm-up pain latch", purpose: "Evidence-excluded warm-up pain still stops the movement until explicit resolution.", mode: "pain-warmup" },
  { id: "23", title: "Pain flag corrected away", purpose: "Actual correction cannot erase a safety latch.", mode: "pain-correction" },
  { id: "24", title: "Sibling press after pain", purpose: "Horizontal-push stop follows the movement family across variants.", mode: "pain-sibling" },
  { id: "25", title: "Return after fifteen days", purpose: "Frozen85% check remains stable while further increases are deliberately declined.", mode: "return", hold: true, visits: 16 },
  { id: "26", title: "Another gap during return", purpose: "Re-entering unfinished return does not compound85% of transient load.", mode: "repeat-return", hold: true, visits: 16 },
  { id: "27", title: "Fresh start after forty-three days", purpose: "Archive old capacity and use current first-use selectors.", mode: "long-gap", hold: true },
  { id: "28", title: "Home push-up progression", purpose: "Bodyweight check initializes reps with no external tonnage.", mode: "home", home: true, variant: "knee_pushup", loads: [] },
  { id: "29", title: "Same dead bug at home and gym", purpose: "One exact identity shares history across settings.", mode: "shared-home", variant: "dead_bug", loads: [] },
  { id: "30", title: "A home week between gym visits", purpose: "Home attendance preserves due gym rotation and unused-lift absence.", mode: "home-week", hold: true, visits: 16 },
  { id: "31", title: "Correction before unstarted increase", purpose: "Retract an earlier success and recompute only future guidance.", mode: "correction-before" },
  { id: "32", title: "Correction after higher work", purpose: "Completed downstream issued and actual performance remains intact.", mode: "correction-after", visits: 16 },
  { id: "33", title: "Duplicate reconnect traffic", purpose: "Every performed set is retried, without duplicate evidence or attendance.", mode: "duplicates" },
  { id: "34", title: "Conflicting corrections and resolution", purpose: "Both candidates remain, affected guidance blocks, referenced selection resolves.", mode: "conflict", visits: 16 },
  { id: "35", title: "Several visits on the same date", purpose: "No same-date attendance, rotation or success-gate farming.", mode: "same-date", visits: 16 },
  { id: "36", title: "Midnight and DST continuity", purpose: "Frozen training dates and elapsed time survive calendar boundaries.", mode: "calendar" },
  { id: "37", title: "Future clock quarantine and void", purpose: "A bad future record cannot poison unrelated valid work.", mode: "future-clock" },
  { id: "38", title: "Repeated partial visits", purpose: "One performed set is not a complete two-set exposure.", mode: "partial", visits: 16 },
  { id: "39", title: "Expired visit retains actuals", purpose: "Late logged work stays truthful but cannot revive an expired visit.", mode: "stale-visit" },
  { id: "40", title: "Unilateral short side", purpose: "Stronger-side reps cannot compensate for the weaker side.", mode: "unilateral", home: true, variant: "split_squat", loads: [] },
  { id: "41", title: "Partial return crosses a visit boundary", purpose: "A single return set refreshes exposure but cannot erase the frozen return epoch or satisfy its success gate.", mode: "partial-return", hold: true, visits: 16 },
  { id: "42", title: "Time-neutral return crosses a visit boundary", purpose: "Completed cause:time return work counts attendance but remains neutral for return re-establishment.", mode: "neutral-return", hold: true, visits: 16 },
  { id: "43", title: "Ordinary work with a two-minute device clock offset", purpose: "Every occurrence is two minutes ahead of trusted receipt; authority becomes valid at occurrence time and ordinary progress remains possible.", mode: "clock-skew" },
  { id: "44", title: "Manual60 working actual is short", purpose: "An issued working load10 recorded as60 with short reps cannot authorize a higher easier set.", mode: "manual-short-working" },
];

interface TraceVisit {
  number: number;
  visitId: string;
  start: string;
  trainingDate: string;
  setting: Setting;
  identity: Identity;
  inputs: Record<string, unknown>;
  decisions: { moment: string; decision: Decision }[];
  events: EngineEvent[];
  summary?: ReturnType<typeof summarize>;
}

export class Simulation {
  state: EngineState = createState({ timeZone: ZONE, policyVersion: POLICY });
  events: EngineEvent[] = [];
  visits: TraceVisit[] = [];
  failures: string[] = [];
  now = START;
  serial = 0;
  currentVisit = "";
  currentIdentity: Identity;
  currentInventory: Inventory;
  painSources: string[] = [];
  futureEventId: string | undefined;
  conflictTarget: EngineEvent | undefined;
  conflictCandidates: EngineEvent[] = [];
  currentTrace: TraceVisit | undefined;
  constructor(public scenario: Scenario) {
    this.currentIdentity = identity(scenario.variant ?? "db_flat_press");
    this.currentInventory = inventory(this.currentIdentity, scenario.loads ?? [10, 12.5, 15, 17.5, 20, 25, 30, 35, 40, 45].map(lb));
    if (scenario.mode === "calendar") this.now = Date.parse("2026-11-01T07:50:00Z");
  }
  check(condition: unknown, message: string): void { if (!condition) this.failures.push(`visit${this.visits.length}: ${message}`); }
  make(type: EngineEvent["type"], payload: unknown, extra: Partial<EngineEvent> = {}): EngineEvent {
    const eventId = `s${this.scenario.id}-e${++this.serial}`;
    const receipt = this.now - (this.scenario.mode === "clock-skew" ? 120_000 : 0);
    return { id: eventId, entityId: eventId, revision: 1, occurredAt: iso(this.now), receivedAt: iso(receipt), policyVersion: POLICY, type, payload, ...extra } as EngineEvent;
  }
  append(event: EngineEvent, allowConflict = false): void {
    const result = applyEvent(this.state, event);
    if (result.status !== "accepted" && !(allowConflict && result.status === "conflict")) {
      throw new Error(`${event.type} ${event.id}: ${result.status} ${result.reasons.join(";")}`);
    }
    this.state = result.state; this.events.push(event); this.currentTrace?.events.push(event);
  }
  declineIncrease(number = this.visits.length): boolean | undefined {
    if (["partial-return", "neutral-return"].includes(this.scenario.mode) && number >= 6) return false;
    return this.scenario.hold;
  }
  context(extra: Partial<RecommendationContext> = {}): RecommendationContext {
    return {
      visitId: this.currentVisit, identity: this.currentIdentity, now: iso(this.now),
      inventory: this.currentInventory, remainingSeconds: 1800,
      context: this.scenario.mode === "pair-context" && this.visits.length % 2 === 0 ? "straight" : "paired",
      declineIncrease: this.declineIncrease(), ...extra,
    };
  }
  decide(moment: string, extra: Partial<RecommendationContext> = {}): Decision {
    const d = recommendExercise(this.state, this.context(extra));
    this.currentTrace?.decisions.push({ moment, decision: d });
    if (d.prescription) {
      const p = d.prescription; const entry = CATALOG[p.identity.variant];
      this.check(p.targets.length >= 1 && p.targets.length <= 3, "prescription has1–3 sets");
      this.check(p.targets.every(n => Number.isInteger(n) && n >= entry.floor && n <= entry.ceiling), "targets stay inside catalog range");
      if (p.load) this.check(this.currentInventory.loads.some(l => String(normalizeLoad(l)) === String(normalizeLoad(p.load!))), "load is an attainable supplied entry");
      this.check(!(d.status === "stop" || d.status === "needs_setup" || d.status === "needs_calibration" || d.status === "needs_migration"), "blocked status carries no prescription");
    }
    return d;
  }
  issue(decision: Decision, extra: Partial<RecommendationContext> = {}): Prescription | undefined {
    if (!decision.prescription) return undefined;
    const p = decision.prescription;
    this.append(this.make("prescription_issued", { context: this.context(extra), prescription: p, expectedStateRevision: this.state.revision }));
    return p;
  }
  record(p: Prescription, index: number, changes: Partial<Actual> = {}): EngineEvent {
    const start = iso(this.now); this.now += 40_000;
    const event = this.make("set_recorded", {
      visitId: this.currentVisit, identity: p.identity, prescriptionId: p.id, setIndex: index,
      role: p.roles[index], startedAt: start, endedAt: iso(this.now),
      actual: { reps: reps(p.identity, p.targets[index]!), load: p.load, completed: true, feedback: "unknown", cause: "unknown", timingQuality: "measured", ...changes },
    });
    this.append(event);
    if (this.scenario.mode === "duplicates") {
      const before = this.state.projection.sets.length;
      const duplicate = applyEvent(this.state, { ...event, receivedAt: iso(this.now + 5000) });
      this.check(duplicate.status === "duplicate", "reconnect replay is duplicate");
      this.check(duplicate.state.projection.sets.length === before, "duplicate creates no second logical set");
      this.state = duplicate.state;
      this.currentTrace?.inputs && (this.currentTrace.inputs.duplicateRetries = Number(this.currentTrace.inputs.duplicateRetries ?? 0) + 1);
    }
    return event;
  }
  manual(changes: Partial<Actual>, role: "working" | "warmup" = "working"): EngineEvent {
    const start = iso(this.now); this.now += 40_000;
    const event = this.make("set_recorded", {
      visitId: this.currentVisit, identity: this.currentIdentity, role,
      startedAt: start, endedAt: iso(this.now),
      actual: { reps: reps(this.currentIdentity, 8), load: this.currentInventory.loads[0] ?? null, completed: true, timingQuality: "measured", ...changes },
    }); this.append(event); return event;
  }
  correction(original: EngineEvent, changes: Partial<Actual>, entity = original.entityId): EngineEvent {
    if (original.type !== "set_recorded") throw new Error("correction target is not set_recorded");
    return this.make("set_corrected", { actual: { ...original.payload.actual, ...changes } }, { entityId: entity, revision: 2, previousEventId: original.id });
  }
  beforeVisit(number: number): Setting {
    const mode = this.scenario.mode;
    if (number > 1) this.now += (mode === "same-date" && number % 2 === 0 ? 0 : 3) * DAY;
    if (["return", "repeat-return", "partial-return", "neutral-return"].includes(mode) && number === 6) this.now += 15 * DAY;
    if (mode === "repeat-return" && number === 8) this.now += 15 * DAY;
    if (mode === "long-gap" && number === 7) this.now += 43 * DAY;
    if (mode === "calendar" && number === 2) this.now = Date.parse("2026-11-02T06:50:00Z");
    let setting: Setting = this.scenario.home ? "home" : "gym";
    if (mode === "shared-home") setting = number % 2 ? "home" : "gym";
    if (mode === "home-week") {
      const atHome = number >= 5 && number <= 7;
      setting = atHome ? "home" : "gym";
      if (atHome) this.now += 2 * DAY;
      this.currentIdentity = identity(atHome ? "knee_pushup" : "db_flat_press");
      this.currentInventory = inventory(this.currentIdentity, atHome ? [] : (number >= 8 ? [7.5, 10, 12.5, 15] : [10, 12.5, 15]).map(lb));
    }
    if (["unknown-shorts", "effort-shorts", "hard-complete", "reset-difficulty", "missing-load", "return", "repeat-return", "partial-return", "neutral-return"].includes(mode) && number >= 4) {
      this.currentInventory = inventory(this.currentIdentity, [7.5, 10, 12.5, 15, 20].map(lb));
    }
    if (mode === "missing-load" && number >= 5 && number <= 7) this.currentInventory.loads = [7.5, 15].map(lb);
    if (mode === "long-gap" && number >= 7) this.currentInventory = inventory(this.currentIdentity, [5, 10, 15, 20].map(lb));
    if (mode === "pain-sibling" && number >= 5) { this.currentIdentity = identity("db_incline_press"); this.currentInventory = inventory(this.currentIdentity, [10, 12.5, 15].map(lb)); }
    return setting;
  }
  inject(number: number): void {
    const mode = this.scenario.mode;
    if (mode.startsWith("pain-") && number === 4) {
      const painful = this.manual({ pain: true, reps: reps(this.currentIdentity, 2), load: lb(60) }, mode === "pain-warmup" ? "warmup" : "working");
      this.painSources.push(painful.id);
      if (mode === "pain-correction") { this.now += 1000; this.append(this.correction(painful, { pain: false })); }
    }
    if (mode.startsWith("pain-") && number === 7) {
      this.append(this.make("stop_resolved", { visitId: this.currentVisit, identity: this.currentIdentity, acknowledged: true, stopEventIds: this.painSources }));
      this.now += 1000;
      this.append(this.make("preparation_confirmed", { visitId: this.currentVisit, identity: this.currentIdentity, recoveryConfirmed: true }));
    }
    if ((mode === "correction-before" && number === 4) || (mode === "correction-after" && number === 6)) {
      const first = this.events.find(e => e.type === "set_recorded" && e.payload.role === "working");
      if (first) this.append(this.correction(first, { reps: reps(this.currentIdentity, 6) }));
    }
    if (mode === "conflict" && number === 4) {
      const first = this.events.find(e => e.type === "set_recorded" && e.payload.role === "working");
      if (first) {
        this.conflictTarget = first;
        this.conflictCandidates = [this.correction(first, { reps: 6 }), this.correction(first, { reps: 7 })];
        for (const event of this.conflictCandidates) this.append(event, true);
      }
    }
    if (mode === "conflict" && number === 6 && this.conflictTarget) {
      const candidates = this.conflictCandidates.map(eventFingerprint).sort();
      this.append(this.make("conflict_resolved", {
        targetEntityId: this.conflictTarget.entityId, targetRevision: 2,
        expectedCandidateKeys: candidates, selectedCandidateKey: eventFingerprint(this.conflictCandidates[1]!),
      }, { entityId: resolutionEntityId(this.conflictTarget.entityId, 2) }));
    }
    if (mode === "future-clock" && number === 4) {
      const future = this.now + 30 * DAY;
      const event = this.make("visit_started", { visitId: "unrelated-bad-clock", setting: "home", template: "HOME", timeZone: ZONE, trainingDate: date(future) }, { occurredAt: iso(future) });
      this.futureEventId = event.id; this.append(event);
      this.check(this.state.projection.quarantinedEventIds.includes(event.id), "far-future event is quarantined");
    }
    if (mode === "future-clock" && number === 6 && this.futureEventId) this.append(this.make("event_voided", { targetEventId: this.futureEventId, reason: "scripted incorrect device clock" }));
    if (mode === "stale-visit" && number === 5) {
      this.now += 7 * 3_600_000;
      this.manual({ reps: 8 });
    }
  }
  actual(number: number, p: Prescription, index: number): Partial<Actual> {
    const mode = this.scenario.mode;
    const final = index === p.targets.length - 1;
    const changes: Partial<Actual> = { feedback: this.scenario.easy && final ? "easy" : "unknown" };
    if (this.scenario.unknownTiming) changes.timingQuality = "unknown";
    if (this.scenario.extras && final && p.extrasAllowed) changes.reps = reps(p.identity, p.targets[index]! + 2);
    const short = (mode === "one-bad-day" && number === 6)
      || (mode === "unknown-shorts" && number >= 5 && number <= 7)
      || (mode === "effort-shorts" && number >= 5 && number <= 6);
    if (short && p.kind !== "calibration") {
      changes.reps = reps(p.identity, Math.max(0, p.targets[index]! - 2));
      changes.cause = mode === "effort-shorts" ? "effort" : "unknown";
      if (mode === "effort-shorts") changes.feedback = "hard";
    }
    if ((mode === "hard-complete" && (number === 5 || number === 6)) || (mode === "reset-difficulty" && (number === 5 || number === 7))) changes.feedback = "hard";
    if (mode === "interruptions" && (number === 4 || number === 8)) { changes.interrupted = true; changes.cause = "equipment"; }
    if (mode === "substitute-actual" && number === 5) changes.load = lb(5);
    if (mode === "manual-load" && number === 5) changes.load = lb(60);
    if (mode === "neutral-return" && number === 6) changes.cause = "time";
    if (mode === "manual-short-working" && number === 6 && index === 0 && p.kind === "working") {
      changes.load = lb(60); changes.reps = reps(p.identity, Math.max(0, p.targets[index]! - 2));
    }
    if (mode === "unilateral" && number === 6) changes.reps = { left: p.targets[index]!, right: Math.max(0, p.targets[index]! - 2) };
    return changes;
  }
  runVisit(number: number): void {
    const setting = this.beforeVisit(number);
    const trainingDate = date(this.now);
    const pinned = this.state.projection.visits.find(v => v.setting === "gym" && v.date === trainingDate)?.template;
    const template = setting === "home" ? "HOME" : pinned ?? summarize(this.state, iso(this.now)).nextGymTemplate;
    this.currentVisit = `s${this.scenario.id}-v${number}`;
    const trace: TraceVisit = {
      number, visitId: this.currentVisit, start: iso(this.now), trainingDate, setting, identity: this.currentIdentity,
      inputs: { scriptMode: this.scenario.mode, inventory: this.currentInventory, easyFeedback: !!this.scenario.easy, declineIncrease: !!this.declineIncrease(number), extrasScript: !!this.scenario.extras, timingQuality: this.scenario.unknownTiming ? "unknown" : "measured", receiptOffsetSeconds: this.scenario.mode === "clock-skew" ? 120 : 0 },
      decisions: [], events: [],
    };
    this.visits.push(trace); this.currentTrace = trace;
    this.append(this.make("visit_started", { visitId: this.currentVisit, setting, template, timeZone: ZONE, trainingDate, plannedIdentities: [this.currentIdentity] }));
    this.append(this.make("rehearsal_confirmed", { visitId: this.currentVisit, identity: this.currentIdentity, controlled: true }));
    this.append(this.make("preparation_confirmed", { visitId: this.currentVisit, identity: this.currentIdentity, recoveryConfirmed: true }));
    this.inject(number);
    const request = { requestTrial: this.scenario.easy === true };
    let activeRequest = request;
    let d = this.decide("visit-start", activeRequest);
    if (this.scenario.mode.startsWith("pain-") && number >= 4 && number <= 6) this.check(d.status === "stop", "pain latch persists through correction/sibling visit");
    if (this.scenario.mode === "conflict" && number >= 4 && number <= 5) this.check(!d.prescription, "unresolved conflict blocks affected prescription");
    if (["return", "repeat-return"].includes(this.scenario.mode) && number === 6) {
      this.check(d.prescription?.kind === "return", "gap enters return mode");
      this.check(d.prescription?.load?.amountMilli === 7500, "10-lb retained baseline returns at attainable7.5lb");
    }
    if (this.scenario.mode === "repeat-return" && number === 8) this.check(d.prescription?.load?.amountMilli === 7500, "unfinished return gap does not compound85percent");
    if (["partial-return", "neutral-return"].includes(this.scenario.mode) && number >= 6 && number <= 8) {
      this.check(d.prescription?.kind === "return", "partial/neutral prior visit cannot drop the return epoch");
      this.check(d.prescription?.load?.amountMilli === 7500, "return stays at initial7.5 until two scored dates establish it");
      this.check(d.prescription?.extrasAllowed === false, "return work has no extras acceleration");
    }
    if (["partial-return", "neutral-return"].includes(this.scenario.mode) && number === 9) {
      this.check(d.prescription?.kind === "return" && d.prescription.load?.amountMilli === 10_000,
        "two later scored return dates permit bounded restoration toward retained10");
    }
    if (this.scenario.mode === "long-gap" && number === 7) this.check(d.prescription?.kind === "calibration" && d.prescription.load?.amountMilli === 5000, "long gap selects fresh5lb trial");
    if (this.scenario.mode === "future-clock" && number === 4) this.check(!!d.prescription, "quarantined other-visit clock does not deadlock current movement");
    if (this.scenario.mode === "stale-visit" && number === 5) this.check(!d.prescription, "expired visit is not revived by late actual");

    // A ready trial is performed once, then separately labelled working work may
    // follow. This intentionally does not invent calibration sets as work.
    if (d.prescription?.kind === "calibration") {
      const p = this.issue(d, request)!;
      const extra = CATALOG[p.identity.variant].loadingMode === "bodyweight" ? { reps: reps(p.identity, 10) } : {};
      this.record(p, 0, { ...this.actual(number, p, 0), ...extra });
      this.now += (CATALOG[p.identity.variant].priority ? 150 : 90) * 1000;
      activeRequest = { requestTrial: false };
      d = this.decide("after-calibration", activeRequest);
    }
    if (d.prescription && d.prescription.kind !== "calibration") {
      const p = this.issue(d, activeRequest);
      if (p) {
        const count = (this.scenario.mode === "partial" && number % 2 === 1)
          || (this.scenario.mode === "partial-return" && number === 6) ? 1 : p.targets.length;
        for (let index = 0; index < count; index++) {
          if (index > 0) this.now += (this.scenario.mode === "long-rest" ? 240 : CATALOG[p.identity.variant].priority ? 150 : 90) * 1000;
          this.record(p, index, this.actual(number, p, index));
          if (this.scenario.mode === "calendar" && index === 0 && number <= 2) this.now += 20 * 60_000;
          const afterSet = this.decide(`after-set-${index + 1}`);
          if (this.scenario.mode === "manual-short-working" && number === 6 && afterSet.prescription?.load && p.load) {
            this.check(normalizeLoad(afterSet.prescription.load) <= normalizeLoad(p.load),
              "manual60 short actual cannot authorize easier work above the issued load");
          }
        }
      }
    }
    this.append(this.make("visit_ended", { visitId: this.currentVisit }));
    if (this.scenario.mode === "clock-skew") {
      this.state = replay(this.state.config, this.events, iso(this.now));
      this.check(this.state.projection.ineligibleEventIds.length === 0, "tolerated skew cannot permanently invalidate issued work");
      this.check(this.state.projection.quarantinedEventIds.length === 0, "two-minute skew is within five-minute tolerance");
    }
    trace.summary = summarize(this.state, iso(this.now));
    const setIds = this.state.projection.sets.map(s => s.id);
    this.check(new Set(setIds).size === setIds.length, "logical set IDs unique");
    this.check(new Set(trace.summary.attendanceDates).size === trace.summary.attendanceDates.length, "one credit per frozen training date");
    const performed = trace.events.some(e => e.type === "set_recorded" && e.payload.role !== "warmup"
      && e.payload.actual.completed && (typeof e.payload.actual.reps === "number"
        ? e.payload.actual.reps > 0 : e.payload.actual.reps.left + e.payload.actual.reps.right > 0));
    if (performed && !(this.scenario.mode === "stale-visit" && number === 5)) {
      this.check(trace.summary.attendanceDates.includes(trainingDate), "confirmed current non-warm-up work earns its frozen-date attendance credit");
    }
    if (this.scenario.mode === "future-clock" && number >= 6) {
      this.check(trace.summary.attendanceDates.includes(trainingDate), "voiding unrelated bad-clock history preserves valid current attendance and evidence");
      this.check(trace.events.some(e => e.type === "set_recorded"), "valid post-void visits still receive usable work rather than a spurious return gap");
    }
    if (this.scenario.mode === "manual-load" && number > 5) this.check(trace.decisions.every(t => t.decision.prescription?.load?.amountMilli !== 60_000), "manual60lb never automatically prescribed");
  }
  run(): Record<string, unknown> {
    const targetVisits = this.scenario.visits ?? 12;
    let error: string | undefined;
    try {
      for (let n = 1; n <= targetVisits; n++) this.runVisit(n);
      const issued = this.state.projection.prescriptions;
      this.check(this.visits.filter(v => v.events.some(e => e.type === "set_recorded")).length >= 6,
        "history contains performed work on at least six visits, not a no-op parameter sweep");
      this.check(this.state.projection.sets.filter(s => s.role === "working" || s.role === "return_check").length >= 8,
        "history includes at least eight actual working/return sets");
      if (["ordinary", "long-rest", "pair-context", "clock-skew"].includes(this.scenario.mode)) {
        const first = issued.find(p => p.kind === "working");
        const last = [...issued].reverse().find(p => p.kind === "working");
        this.check(!!first && !!last, "ordinary history performs working prescriptions");
        this.check(!!first && !!last && (JSON.stringify(first.targets) !== JSON.stringify(last.targets) || JSON.stringify(first.load) !== JSON.stringify(last.load)), "ordinary no-rating history makes bounded progress");
      }
      if (this.scenario.mode === "oversized") this.check(!issued.some(p => p.load?.amountMilli === 30_000), "oversized30lb step never prescribed");
      if (this.scenario.home || this.scenario.mode === "shared-home") this.check(Object.keys(summarize(this.state).externalTonnageByConvention).length === 0, "bodyweight history creates no equivalent-pound tonnage");
      if (this.scenario.mode === "duplicates") this.check(this.state.projection.sets.length === this.events.filter(e => e.type === "set_recorded").length, "all retries preserve original set count");
    } catch (cause) {
      error = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
      this.failures.push(`execution: ${error}`);
    }
    return {
      id: this.scenario.id, title: this.scenario.title, purpose: this.scenario.purpose,
      requestedVisits: targetVisits, observedVisits: this.visits.length,
      status: this.failures.length ? "failed" : "passed", invariantFailures: this.failures,
      ...(error ? { error } : {}),
      counts: { journalEvents: this.events.length, projectedSets: this.state.projection.sets.length, issuedPrescriptions: this.state.projection.prescriptions.length },
      finalSummary: summarize(this.state, iso(this.now)),
      journalSha256: hash(JSON.stringify(this.events)), visits: this.visits,
    };
  }
}

if (require.main === module) {
const args = process.argv.slice(2);
const reportFlag = args.indexOf("--report-dir");
const reportDir = resolve(reportFlag >= 0 ? args[reportFlag + 1]! : "engine/reports");
const unknownArgs = reportFlag >= 0 ? args.filter((_, i) => i !== reportFlag && i !== reportFlag + 1) : args;
if (unknownArgs.length) throw new Error(`Unsupported scenario arguments: ${unknownArgs.join(" ")}`);
mkdirSync(reportDir, { recursive: true });
const runId = process.env.ADAPTIVE_ENGINE_RUN_ID ?? `manual-${Date.now()}`;
const startedAt = process.env.ADAPTIVE_ENGINE_STARTED_AT ?? new Date().toISOString();
const archiveDirectory = join("runs", runId.replace(/[^A-Za-z0-9._-]/g, "_"));
const archiveDir = join(reportDir, archiveDirectory);
mkdirSync(archiveDir, { recursive: true });
function writeReport(name: string, content: string): void {
  writeFileSync(join(reportDir, name), content);
  writeFileSync(join(archiveDir, name), content);
}
const here = __dirname;
const provenance = {
  runId, startedAt, policyVersion: POLICY, scenarioVersion: SCENARIO_VERSION, archiveDirectory,
  compiledCandidateSha256: hashTree(resolve(here, "../src")),
  compiledScenarioSha256: hash(readFileSync(__filename, "utf8")),
  specSha256: hash(readFileSync(resolve("docs/engine/ENGINE-SPEC.md"), "utf8")),
  model: "Deterministic scripted observations; no physiological forecast",
};
const summaries: Record<string, unknown>[] = [];
let failed = 0; let visits = 0; let events = 0; let sets = 0;
for (const scenario of SCENARIOS) {
  const result = new Simulation(scenario).run();
  if (result.status === "failed") failed++;
  visits += Number(result.observedVisits);
  const counts = result.counts as { journalEvents: number; projectedSets: number };
  events += counts.journalEvents; sets += counts.projectedSets;
  const traceFile = `trace-${scenario.id}.json`;
  writeReport(traceFile, json({ ...provenance, ...result }) + "\n");
  const { visits: trace, ...summary } = result;
  void trace;
  summaries.push({ ...summary, traceFile });
  console.log(`${result.status === "passed" ? "PASS" : "FAIL"} history${scenario.id}: ${scenario.title} (${result.observedVisits}/${result.requestedVisits} visits)`);
}
const finishedAt = new Date().toISOString();
const report = {
  ...provenance, finishedAt, status: failed ? "failed" : "complete",
  counts: { scriptedHistories: SCENARIOS.length, passedHistories: SCENARIOS.length - failed, failedHistories: failed, observedVisits: visits, journalEvents: events, projectedSets: sets },
  limits: ["No physiological safety or effectiveness validation", "Exercise-focused histories isolate adaptation and journal behavior; they are not complete workout programmes", "No live app, database, browser or storage/network integration", "Named behavior tests are counted separately", "Observed outputs came from the compiled public candidate APIs", "Manual/late/conflicting records may be retained without prescription authority"],
  scenarios: summaries,
};
writeReport("latest.json", json(report) + "\n");
const lines = [
  "# Standalone engine scripted histories", "", `Status: **${report.status.toUpperCase()}** · Run: \`${runId}\``, "",
  `${SCENARIOS.length} distinct scripted multi-visit histories; ${SCENARIOS.length - failed} passed, ${failed} failed. ${visits} observed visits. These counts are separate from named behavior tests.`, "",
  "These are exercise-focused deterministic input scripts, not complete workout programmes or a model of human progress. Passing checks proves software-policy conformance only. No app, database, real offline storage or gym session was exercised.", "",
  `Policy: \`${POLICY}\`; scenarios: \`${SCENARIO_VERSION}\`.`,
  `Started: ${startedAt}; finished: ${finishedAt}.`,
  `Compiled candidate SHA256: \`${provenance.compiledCandidateSha256}\`.`,
  `Specification SHA256: \`${provenance.specSha256}\`.`, "",
  "| History | Observed visits | Outcome | Actual trace |", "|---|---:|---|---|",
  ...summaries.map(s => `| ${s.id}: ${s.title} | ${s.observedVisits}/${s.requestedVisits} | ${s.status} | [JSON](${s.traceFile}) |`),
  "", "Each trace records scripted inputs, issued prescriptions, decisions/reasons, baseline/provisional status, actual events and final summaries. Failure traces are retained.",
];
writeReport("SUMMARY.md", lines.join("\n") + "\n");
console.log(`Histories: ${SCENARIOS.length}; passed: ${SCENARIOS.length - failed}; failed: ${failed}; observed visits: ${visits}.`);
if (failed) process.exitCode = 1;
}
