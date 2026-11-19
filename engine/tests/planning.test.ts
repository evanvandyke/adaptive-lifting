import test from "node:test";
import assert from "node:assert/strict";
import {
  applyEvent, createState, identityKey, planVisit, recommendExercise, summarize, CATALOG,
} from "../src/index.js";
import type { Actual, EngineEvent, EngineState, Identity, Inventory, PlanContext, Prescription, RecommendationContext, VariantId } from "../src/types.js";

const CONFIG = { timeZone: "America/Denver" };
const POLICY = "experimental-v1";
const DAY = 86_400_000;
const BASE = Date.parse("2026-11-05T17:00:00Z");
const date = (time: number) => new Intl.DateTimeFormat("en-CA", {
  timeZone: CONFIG.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
}).format(time);
const identity = (variant: VariantId, setupId = "planning-setup"): Identity =>
  variant === "lat_pulldown" ? { variant, setupId, machineUnit: "lb" } : { variant, setupId };
const A = [identity("goblet_squat"), identity("db_flat_press"), identity("db_supported_row"), identity("calf_raise"), identity("dead_bug")];
const B = [identity("db_rdl"), identity("db_incline_press"), identity("lat_pulldown"), identity("split_squat"), identity("dead_bug")];
const HOME = [identity("knee_pushup"), identity("air_squat"), identity("glute_bridge"), identity("dead_bug")];
const inventory = (item: Identity): Inventory => ({
  verified: true, equipment: [...CATALOG[item.variant].equipment],
  loads: CATALOG[item.variant].loadingMode === "bodyweight" ? [] : [5, 10, 15, 20].map(lb => ({ amountMilli: lb * 1000, unit: "lb" })),
});
function planContext(items: Identity[], now = BASE, extra: Partial<PlanContext> = {}): PlanContext {
  return { now: new Date(now).toISOString(), setting: "gym", identities: items,
    inventories: Object.fromEntries(items.map(i => [identityKey(i), inventory(i)])), ...extra };
}
class History {
  state: EngineState = createState(CONFIG);
  now: number;
  serial = 0;
  visitId = "";
  constructor(now = BASE) { this.now = now; }
  time() { return new Date(this.now).toISOString(); }
  event(type: EngineEvent["type"], payload: unknown, extra: Partial<EngineEvent> = {}): EngineEvent {
    const id = `planning-${++this.serial}`;
    return { id, entityId: id, revision: 1, occurredAt: this.time(), receivedAt: this.time(), policyVersion: POLICY,
      type, payload, ...extra } as EngineEvent;
  }
  send(event: EngineEvent) {
    const result = applyEvent(this.state, event);
    assert.equal(result.status, "accepted", `${event.type}: ${result.reasons.join(", ")}`);
    this.state = result.state;
  }
  open(items: Identity[], setting: "gym" | "home" = "gym") {
    this.visitId = `planning-visit-${++this.serial}`;
    const pinned = this.state.projection.visits.find(v => v.setting === "gym" && v.date === date(this.now))?.template;
    this.send(this.event("visit_started", { visitId: this.visitId, setting, template: setting === "home" ? "HOME" : pinned ?? summarize(this.state).nextGymTemplate,
      timeZone: CONFIG.timeZone, trainingDate: date(this.now), plannedIdentities: items }));
  }
  manual(item: Identity, role: "calibration" | "working" | "warmup" = "calibration", reps = 8): EngineEvent {
    const startedAt = this.time(); this.now += 40_000;
    const event = this.event("set_recorded", { visitId: this.visitId, identity: item, role, startedAt, endedAt: this.time(),
      actual: { reps: CATALOG[item.variant].perSide ? { left: reps, right: reps } : reps,
        load: CATALOG[item.variant].loadingMode === "bodyweight" ? null : { amountMilli: 5000, unit: "lb" },
        completed: true, timingQuality: "reported" } });
    this.send(event); return event;
  }
  prepare(item: Identity) {
    this.send(this.event("rehearsal_confirmed", { visitId: this.visitId, identity: item, controlled: true }));
    this.send(this.event("preparation_confirmed", { visitId: this.visitId, identity: item, recoveryConfirmed: true }));
  }
  issue(item: Identity, extra: Partial<RecommendationContext> = {}): Prescription {
    const context = { visitId: this.visitId, identity: item, now: this.time(), inventory: inventory(item), remainingSeconds: 1800, declineIncrease: true, ...extra };
    const result = recommendExercise(this.state, context);
    assert.ok(result.prescription, `${result.status}: ${result.reasons.join(", ")}`);
    const p = result.prescription;
    this.send(this.event("prescription_issued", { context, prescription: p, expectedStateRevision: this.state.revision }));
    return p;
  }
  record(p: Prescription, setIndex: number, changes: Partial<Actual> = {}): EngineEvent {
    const startedAt = this.time(); this.now += 40_000;
    const event = this.event("set_recorded", { visitId: this.visitId, identity: p.identity, prescriptionId: p.id, setIndex,
      role: p.roles[setIndex]!, startedAt, endedAt: this.time(), actual: {
        reps: CATALOG[p.identity.variant].perSide ? { left: p.targets[setIndex]!, right: p.targets[setIndex]! } : p.targets[setIndex]!,
        load: p.load, completed: true, timingQuality: "measured", feedback: "unknown", ...changes,
      } });
    this.send(event); return event;
  }
  perform(item: Identity): Prescription {
    this.prepare(item);
    const p = this.issue(item);
    p.targets.forEach((_, setIndex) => {
      if (setIndex > 0) this.now += 180_000;
      this.record(p, setIndex);
    });
    return p;
  }
  end() { this.send(this.event("visit_ended", { visitId: this.visitId })); }
}

test("planner computes complete A and home estimates without mutating inputs", () => {
  const state = createState(CONFIG), input = planContext(A), before = structuredClone({ state, input });
  const a = planVisit(state, input);
  assert.equal(a.status, "proposal"); assert.equal(a.estimatedSeconds, 1690);
  assert.equal(a.exercises.reduce((n, e) => n + e.sets, 0), 10);
  const home = planVisit(state, planContext(HOME, BASE, { setting: "home" }));
  assert.equal(home.estimatedSeconds, 940); assert.match(home.missingCoverage.join(" "), /pull/);
  assert.deepEqual({ state, input }, before);
});

test("planner B exactly fits the inclusive 1800-second budget", () => {
  const h = new History(); h.open([A[0]!]); h.manual(A[0]!); h.end(); h.now += 3 * DAY;
  const b = planVisit(h.state, planContext(B, h.now));
  assert.equal(b.template, "B"); assert.equal(b.estimatedSeconds, 1800); assert.equal(b.status, "proposal");
});

test("straight fallback includes within-block changes and trims secondary work honestly", () => {
  const state = createState(CONFIG);
  const full = planVisit(state, planContext(A, BASE, { straightSets: true, budgetSeconds: 2400 }));
  assert.equal(full.estimatedSeconds, 1810);
  const short = planVisit(state, planContext(A, BASE, { straightSets: true }));
  assert.equal(short.status, "proposal"); assert.equal(short.estimatedSeconds, 1680);
  assert.equal(short.exercises.find(e => e.identity.variant === "dead_bug")?.sets, 1);
  assert.ok(short.omitted.some(i => i.variant === "dead_bug"));
});

test("dropping a complete block recalculates setup overhead and reports missing coverage", () => {
  const state = createState(CONFIG);
  const exact = planVisit(state, planContext(A, BASE, { budgetSeconds: 1280 }));
  assert.equal(exact.status, "proposal"); assert.equal(exact.estimatedSeconds, 1280);
  assert.equal(exact.exercises.some(e => e.block === 3), false);
  assert.ok(exact.missingCoverage.includes("trunk"));
  const impossible = planVisit(state, planContext(A, BASE, { budgetSeconds: 1279 }));
  assert.equal(impossible.status, "hold"); assert.equal(impossible.estimatedSeconds, 1280);
  assert.ok(impossible.reasons.includes("insufficient_time_for_core"));
});

test("optional sixth movement is removed before required work when budget is tight", () => {
  const items = [...A, identity("db_lateral_raise")];
  const input = planContext(items); input.inventories[identityKey(items.at(-1)!)]!.loads = [{ amountMilli: 2500, unit: "lb" }];
  const plan = planVisit(createState(CONFIG), input);
  assert.equal(plan.estimatedSeconds, 1690);
  assert.ok(plan.omitted.some(i => i.variant === "db_lateral_raise"));
  assert.ok(plan.reasons.includes("optional_movement_removed_for_time"));
});

test("same-date visits keep one pinned template and one attendance credit", () => {
  const h = new History(); h.open([A[0]!]); h.manual(A[0]!); h.end();
  h.now += 60_000; h.open([A[0]!]); h.manual(A[0]!); h.end();
  const summary = summarize(h.state);
  assert.equal(summary.attendanceDates.length, 1); assert.equal(summary.nextGymTemplate, "B");
  assert.equal(summary.calibrationVisits, 2); assert.equal(summary.completedVisits, 0);
  const today = planVisit(h.state, planContext(A, h.now));
  assert.equal(today.template, "A");
  const tomorrow = planVisit(h.state, planContext(B, h.now + DAY));
  assert.equal(tomorrow.template, "B");
});

test("warm-up-only and zero-rep dates do not earn attendance or advance rotation", () => {
  for (const [role, reps] of [["warmup", 8], ["working", 0]] as const) {
    const h = new History(); h.open([A[0]!]); h.manual(A[0]!, role, reps); h.end();
    assert.deepEqual(summarize(h.state).attendanceDates, []);
    assert.equal(summarize(h.state).nextGymTemplate, "A");
  }
});

test("midnight continuation retains its stored start date", () => {
  const h = new History(Date.parse("2026-11-06T06:50:00Z")); h.open([HOME[0]!], "home");
  h.now += 20 * 60_000; h.manual(HOME[0]!); h.end();
  assert.deepEqual(summarize(h.state).attendanceDates, ["2026-11-05"]);
});

test("home attendance preserves gym position and never invents bodyweight tonnage", () => {
  const h = new History(); h.open([A[0]!]); h.manual(A[0]!); h.end();
  const due = summarize(h.state).nextGymTemplate;
  h.now += DAY; h.open(HOME, "home"); HOME.forEach(i => h.manual(i)); h.end();
  const result = summarize(h.state);
  assert.equal(result.nextGymTemplate, due); assert.ok(result.bodyweightReps > 0);
  assert.equal(Object.keys(result.externalTonnageByConvention).length, 1, "only the earlier actual goblet load contributes");
});

test("summary and planning use their public as-of projection", () => {
  const h = new History(); const before = h.time(); h.open([A[0]!]); h.manual(A[0]!); h.end();
  assert.equal(summarize(h.state).attendanceDates.length, 1);
  assert.deepEqual(summarize(h.state, before).attendanceDates, []);
  const past = planVisit(h.state, planContext(A, BASE));
  assert.equal(past.template, "A");
});

test("quarantined future work earns no attendance and does not poison a valid plan", () => {
  const h = new History();
  const future = h.event("visit_started", { visitId: "future-clock", setting: "gym", template: "A", timeZone: CONFIG.timeZone,
    trainingDate: date(h.now + DAY), plannedIdentities: A }, { occurredAt: new Date(h.now + DAY).toISOString() });
  h.send(future);
  assert.deepEqual(summarize(h.state).attendanceDates, []);
  assert.equal(planVisit(h.state, planContext(A)).status, "proposal");
});

test("foreign training-zone records cannot mint a second attendance date", () => {
  const h = new History(); h.open([HOME[0]!], "home"); h.manual(HOME[0]!); h.end();
  const before = summarize(h.state).attendanceDates;
  h.visitId = "foreign-training-zone";
  const foreignDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(h.now);
  h.send(h.event("visit_started", { visitId: h.visitId, setting: "home", template: "HOME", timeZone: "Pacific/Auckland", trainingDate: foreignDate, plannedIdentities: [HOME[0]!] }));
  h.manual(HOME[0]!); h.end();
  assert.deepEqual(summarize(h.state).attendanceDates, before);
  assert.equal(planVisit(h.state, planContext(HOME, h.now, { setting: "home" })).status, "needs_migration");
});

test("volume request and optional context feedback cannot bypass recorded evidence", () => {
  const plan = planVisit(createState(CONFIG), planContext(A, BASE, { desiredSets: 3, recoveryFeedback: "manageable", budgetSeconds: 3600 }));
  assert.ok(plan.exercises.every(e => e.sets === 2));
  assert.ok(plan.reasons.includes("volume_exposures_required"));
  assert.equal(planVisit(createState(CONFIG), planContext(A, BASE, { desiredSets: 4 })).status, "hold");
});

test("two genuine exposures and a recorded recovery report add only the priority set", () => {
  const h = new History(); const item = B[0]!;
  h.open([item]); assert.equal(h.perform(item).kind, "calibration"); h.end();
  for (let n = 0; n < 2; n++) {
    h.now += 3 * DAY; h.open([item]); assert.equal(h.perform(item).kind, "working");
    if (n === 1) h.send(h.event("recovery_reported", { visitId: h.visitId, feedback: "manageable" }));
    h.end();
  }
  h.now += 3 * DAY;
  const plan = planVisit(h.state, planContext(B, h.now, { desiredSets: 3, budgetSeconds: 3600 }));
  assert.equal(plan.template, "B");
  assert.equal(plan.exercises[0]?.sets, 3); assert.ok(plan.exercises.slice(1).every(e => e.sets === 2));
  const bounded = planVisit(h.state, planContext(B, h.now, { desiredSets: 3, budgetSeconds: 1800 }));
  assert.equal(bounded.exercises[0]?.sets, 2); assert.ok(bounded.reasons.includes("volume_time_budget_required"));
});

test("full issued working coverage is distinguished from calibration-only partial visits", () => {
  const h = new History(); const item = A[0]!;
  h.open([item]); h.perform(item); h.end();
  assert.equal(summarize(h.state).calibrationVisits, 1); assert.equal(summarize(h.state).completedVisits, 0);
  h.now += 3 * DAY; h.open([item]); h.perform(item); h.end();
  const result = summarize(h.state);
  assert.equal(result.completedVisits, 1); assert.equal(result.partialVisits, 1);
});

test("recorded substantive work gives a soft recovery suggestion, not a lockout", () => {
  const h = new History(); h.open(HOME, "home");
  HOME.slice(0, 3).forEach(i => { h.manual(i, "working"); h.manual(i, "working"); }); h.end();
  const plan = planVisit(h.state, planContext(HOME, h.now + 60_000, { setting: "home" }));
  assert.equal(plan.status, "proposal"); assert.ok(plan.recoverySuggestedUntil);
  assert.ok(plan.reasons.includes("recovery_interval_suggested_not_locked"));
});

test("standard-bar-only entry chooses a verified bodyweight alternative", () => {
  const back = identity("back_squat"), air = identity("air_squat");
  const items = [back, air, ...A.slice(1)]; const input = planContext(items);
  input.inventories[identityKey(back)]!.loads = [{ amountMilli: 45000, unit: "lb" }];
  const plan = planVisit(createState(CONFIG), input);
  assert.equal(plan.exercises[0]?.identity.variant, "air_squat");
});

function replacementVisit(close = true): { history: History; item: Identity; root: Prescription; completedBefore: number } {
  const h = new History(), item = identity("db_flat_press");
  h.open([item]); h.perform(item); h.end();
  for (let n = 0; n < 2; n++) {
    h.now += 3 * DAY; h.open([item]); h.perform(item); h.end();
  }
  const completedBefore = summarize(h.state).completedVisits;
  h.now += 3 * DAY; h.open([item]); h.prepare(item);
  const root = h.issue(item, { declineIncrease: false });
  assert.deepEqual(root.targets, [9, 9]);
  h.record(root, 0, { reps: 8 });
  h.now += 180_000;
  const easier = h.issue(item, { declineIncrease: false });
  assert.deepEqual(easier.replacement, { rootPrescriptionId: root.id, setIndices: [1] });
  assert.equal(easier.workingSetBudget, 2);
  assert.deepEqual(easier.targets, [8]);
  h.record(easier, 0);
  if (close) h.end();
  return { history: h, item, root, completedBefore };
}

test("approved easier replacement completes original coverage without earning progression success", () => {
  const { history: h, item, completedBefore } = replacementVisit();
  const summary = summarize(h.state);
  assert.equal(summary.completedVisits, completedBefore + 1);
  assert.equal(summary.confirmedWorkingSets, 6, "two prior full visits plus exactly two original slots");
  h.now += 3 * DAY; h.open([item]); h.prepare(item);
  const decision = recommendExercise(h.state, { visitId: h.visitId, identity: item, now: h.time(), inventory: inventory(item), remainingSeconds: 1800 });
  assert.deepEqual(decision.baseline?.targets, [8, 8]);
  assert.deepEqual(decision.prescription?.targets, [8, 8]);
  assert.equal(decision.counters?.successes, 0, "finished coverage is not a successful 9/9 exposure");
});

test("conflicting original and replacement records cannot both complete the same slot", () => {
  const { history: h, root, completedBefore } = replacementVisit(false);
  const startedAt = h.time(); h.now += 40_000;
  const duplicate = h.event("set_recorded", { visitId: h.visitId, identity: root.identity, prescriptionId: root.id,
    setIndex: 1, role: root.roles[1]!, startedAt, endedAt: h.time(), actual: {
      reps: 9, load: root.load, completed: true, timingQuality: "measured", feedback: "unknown",
    } });
  const result = applyEvent(h.state, duplicate);
  assert.equal(result.status, "conflict"); h.state = result.state; h.end();
  const summary = summarize(h.state);
  assert.ok(summary.conflicts > 0);
  assert.equal(summary.completedVisits, completedBefore, "ambiguous slot coverage stays partial");
});
