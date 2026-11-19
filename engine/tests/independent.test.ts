import test from "node:test";
import assert from "node:assert/strict";
import {
  createState, applyEvent, replay, recommendExercise, planVisit, summarize,
  identityKey, eventFingerprint, resolutionEntityId, normalizeLoad, CATALOG,
} from "../src/index.js";
import type {
  Actual, CatalogEntry, EngineConfig, EngineEvent, EngineState, Identity,
  Inventory, Load, Prescription, RecommendationContext, Reps, VariantId,
} from "../src/types.js";

// Independent verifier: expected numbers below come from ENGINE-SPEC.md.
// Fixtures build state only through public events/replay. No baseline seeding,
// implementation-private helpers, filesystem reads, wall clock or randomness.
const POLICY = "experimental-v1";
const CONFIG: EngineConfig = { timeZone: "America/Denver", policyVersion: POLICY };
const START = Date.parse("2026-11-01T17:00:00.000Z");
const DAY = 86_400_000;
const lb = (value: number): Load => ({ amountMilli: value * 1000, unit: "lb" });
const kg = (value: number): Load => ({ amountMilli: value * 1000, unit: "kg" });
const id = (variant: VariantId, setupId = "verified-setup"): Identity =>
  variant === "lat_pulldown" ? { variant, setupId, machineUnit: "lb" } : { variant, setupId };
const PER_SIDE = new Set<VariantId>(["split_squat", "loaded_split_squat", "dead_bug", "single_leg_bridge", "single_leg_calf"]);
const repsFor = (identity: Identity, value: number): Reps =>
  PER_SIDE.has(identity.variant) ? { left: value, right: value } : value;
const actualReps = (value: Reps): number => typeof value === "number" ? value : Math.min(value.left, value.right);
const trainingDate = (instant: number): string => new Intl.DateTimeFormat("en-CA", { timeZone: CONFIG.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);

function inventory(identity: Identity, values: number[] = [5, 10, 15, 20]): Inventory {
  const entry = (CATALOG as Record<VariantId, CatalogEntry>)[identity.variant];
  assert.ok(entry, `Public catalogue contains ${identity.variant}`);
  return { verified: true, equipment: [...entry.equipment], loads: values.map(lb) };
}

class History {
  state: EngineState = createState(CONFIG);
  now = START;
  serial = 0;
  receiptOffsetMs = 0;
  visitId = "";
  events: EngineEvent[] = [];
  identity: Identity;
  inventory: Inventory;
  constructor(variant: VariantId = "db_flat_press", values = [5, 10, 15, 20], setup = "verified-setup") {
    this.identity = id(variant, setup);
    this.inventory = inventory(this.identity, values);
  }
  time(): string { return new Date(this.now).toISOString(); }
  event(type: EngineEvent["type"], payload: unknown, changes: Partial<EngineEvent> = {}): EngineEvent {
    const eventId = `verifier-${++this.serial}`;
    return { id: eventId, entityId: eventId, revision: 1, occurredAt: this.time(), receivedAt: new Date(this.now - this.receiptOffsetMs).toISOString(), policyVersion: POLICY, type, payload, ...changes } as EngineEvent;
  }
  send(event: EngineEvent): void {
    const result = applyEvent(this.state, event);
    assert.equal(result.status, "accepted", `${event.type}: ${result.reasons.join("; ")}`);
    this.state = result.state;
    this.events.push(event);
  }
  open(setting: "gym" | "home" = "gym", planned: Identity[] = [this.identity]): void {
    this.visitId = `visit-${++this.serial}`;
    const date = trainingDate(this.now);
    const pinned = this.state.projection.visits.find(visit => visit.setting === "gym" && visit.date === date)?.template;
    const template = setting === "home" ? "HOME" : pinned ?? summarize(this.state, this.time()).nextGymTemplate;
    this.send(this.event("visit_started", {
      visitId: this.visitId, setting, template,
      timeZone: CONFIG.timeZone, trainingDate: date, plannedIdentities: planned,
    }));
  }
  prepare(identity = this.identity): void {
    this.send(this.event("rehearsal_confirmed", { visitId: this.visitId, identity, controlled: true }));
    this.send(this.event("preparation_confirmed", { visitId: this.visitId, identity, recoveryConfirmed: true }));
  }
  context(extra: Partial<RecommendationContext> = {}): RecommendationContext {
    return { visitId: this.visitId, identity: this.identity, now: this.time(), inventory: this.inventory, remainingSeconds: 1800, ...extra };
  }
  decision(extra: Partial<RecommendationContext> = {}) { return recommendExercise(this.state, this.context(extra)); }
  issue(extra: Partial<RecommendationContext> = {}): Prescription {
    const context = this.context(extra);
    const decision = recommendExercise(this.state, context);
    assert.ok(decision.prescription, `Expected prescription, received ${decision.status}: ${decision.reasons.join("; ")}; baseline=${JSON.stringify(decision.baseline)}; counters=${JSON.stringify(decision.counters)}`);
    const prescription = decision.prescription;
    this.send(this.event("prescription_issued", { context, prescription, expectedStateRevision: this.state.revision }));
    return prescription;
  }
  record(prescription: Prescription, index = 0, changes: Partial<Actual> = {}): EngineEvent {
    const target = prescription.targets[index];
    const role = prescription.roles[index];
    assert.notEqual(target, undefined);
    assert.ok(role);
    const startedAt = this.time();
    this.now += 40_000;
    const event = this.event("set_recorded", {
      visitId: this.visitId, identity: prescription.identity, prescriptionId: prescription.id,
      setIndex: index, role, startedAt, endedAt: this.time(),
      actual: { reps: repsFor(prescription.identity, target!), load: prescription.load, completed: true, feedback: "unknown", timingQuality: "measured", ...changes },
    });
    this.send(event);
    return event;
  }
  manual(changes: Partial<Actual> = {}, role: "working" | "calibration" | "warmup" = "working", identity = this.identity): EngineEvent {
    const startedAt = this.time();
    this.now += 40_000;
    const event = this.event("set_recorded", {
      visitId: this.visitId, identity, role, startedAt, endedAt: this.time(),
      actual: { reps: repsFor(identity, 8), load: identity.variant.includes("pushup") || identity.variant === "dead_bug" ? null : lb(5), completed: true, timingQuality: "measured", ...changes },
    });
    this.send(event);
    return event;
  }
  finish(): void { this.send(this.event("visit_ended", { visitId: this.visitId })); }
  next(days = 3, setting: "gym" | "home" = "gym"): void {
    this.finish();
    this.now += days * DAY;
    this.open(setting);
    this.prepare();
  }
  complete(prescription: Prescription, changes: Partial<Actual> = {}): EngineEvent[] {
    const result: EngineEvent[] = [];
    for (let n = 0; n < prescription.targets.length; n++) {
      if (n > 0) this.now += 180_000;
      result.push(this.record(prescription, n, changes));
    }
    return result;
  }
  correction(original: EngineEvent, actual: Actual, revision = 2, previousEventId = original.id): EngineEvent {
    return this.event("set_corrected", { actual }, { entityId: original.entityId, revision, previousEventId });
  }
}

function fresh(variant: VariantId = "db_flat_press", values = [5, 10, 15, 20], setting: "gym" | "home" = "gym"): History {
  const h = new History(variant, values);
  h.open(setting);
  h.prepare();
  return h;
}

function checkedPress(): History {
  const h = fresh("db_flat_press", [10, 12.5, 15, 17.5, 20]);
  const p = h.issue();
  assert.equal(p.kind, "calibration");
  h.record(p);
  return h;
}

function establishedPress(): History {
  const h = checkedPress();
  h.next(); h.complete(h.issue());
  h.next(); h.complete(h.issue());
  h.next();
  assert.deepEqual(h.decision({ declineIncrease: true }).baseline?.load, lb(10));
  assert.deepEqual(h.decision({ declineIncrease: true }).baseline?.targets, [8, 8]);
  return h;
}

function baselineWithResetEvidence(): History {
  const h = establishedPress();
  const p = h.issue({ declineIncrease: true });
  h.record(p, 0, { reps: 7 }); h.now += 180_000; h.record(p, 1, { reps: 8 });
  h.next();
  assert.deepEqual(h.decision({ declineIncrease: true }).baseline?.targets, [8, 8]);
  return h;
}

function reachCeiling(): History {
  const h = establishedPress();
  for (let n = 0; n < 16; n++) {
    const d = h.decision();
    if (d.baseline?.targets.every(target => target === 12)) return h;
    const p = h.issue();
    assert.deepEqual(p.load, lb(10), "rep progression remains at original load until ceiling");
    h.complete(p); h.next();
  }
  assert.fail("Genuine ordinary histories did not reach established 12/12 in sixteen visits");
}

function reachLoad(target: number, variant: VariantId = "db_flat_press"): History {
  const values = variant === "back_squat"
    ? Array.from({ length: 20 }, (_, n) => 10 + n * 5)
    : Array.from({ length: 17 }, (_, n) => 10 + n * 2.5);
  // Keep later implements available: the candidate must establish intervening
  // loads instead of treating an Easy calibration ladder as working evidence.
  const h = fresh(variant, values);
  let priorSignature = "";
  let unchangedVisits = 0;
  for (let n = 0; n < 120; n++) {
    const candidate = h.decision({ requestTrial: true });
    if (candidate.baseline?.load?.amountMilli === target * 1000) return h;
    const signature = JSON.stringify({ status: candidate.status, baseline: candidate.baseline?.load, targets: candidate.baseline?.targets,
      next: candidate.prescription?.load, nextTargets: candidate.prescription?.targets, reasons: candidate.reasons });
    unchangedVisits = signature === priorSignature ? unchangedVisits + 1 : 0;
    priorSignature = signature;
    assert.ok(unchangedVisits < 8, `Unreachable ${variant} ${target}: eight unchanged eligible visits ${signature}`);
    const extra = candidate.prescription ? { requestTrial: true } : {};
    const fallback = h.decision(extra);
    if (fallback.prescription) {
      const p = h.issue(extra);
      h.complete(p, { feedback: "easy" });
    }
    h.next();
  }
  assert.fail(`Valid event histories did not establish ${variant} at ${target} in 120 visits`);
}

function actualFrom(event: EngineEvent): Actual {
  assert.equal(event.type, "set_recorded");
  return (event as Extract<EngineEvent, { type: "set_recorded" }>).payload.actual;
}

test("C01 initial verified press selects exactly 5 lb × 8 as calibration", () => {
  const h = fresh();
  const d = h.decision();
  assert.equal(d.status, "proposal");
  assert.deepEqual(d.prescription?.load, lb(5));
  assert.deepEqual(d.prescription?.targets, [8]);
  assert.equal(d.baseline, undefined);
});

test("C02 unknown rehearsal never assigns an ordinary 45 lb bar", () => {
  const h = new History("back_squat", [45]); h.open();
  const d = h.decision();
  assert.equal(d.status, "needs_calibration");
  assert.equal(d.prescription, undefined);
  assert.ok(d.prerequisites.length || d.reasons.length);
});

test("C03 verified empty weighted inventory produces no fabricated load", () => {
  const h = fresh("db_flat_press", []);
  const d = h.decision();
  assert.equal(d.prescription, undefined);
  assert.ok(["needs_setup", "needs_calibration", "hold"].includes(d.status));
  assert.ok(d.reasons.length);
});

test("C04 no-feedback completed trial retains 10 lb at provisional 8/8", () => {
  const h = checkedPress();
  h.now += 100_000;
  const d = h.decision();
  assert.deepEqual(d.prescription?.load, lb(10));
  assert.deepEqual(d.prescription?.targets, [8, 8]);
  assert.equal(d.prescription?.provisional, true);
  assert.equal(d.baseline, undefined);
  assert.equal(h.state.projection.sets[0]?.role, "calibration");
});

test("C05 initial Easy cannot exceed first-use maximum step", () => {
  const h = fresh("db_flat_press", [5, 15]);
  h.record(h.issue(), 0, { feedback: "easy" }); h.now += 100_000;
  const d = h.decision({ requestTrial: true });
  assert.notDeepEqual(d.prescription?.load, lb(15));
  assert.ok(d.reasons.length);
});

test("C06 completed floor with Hard feedback does not authorize upward work", () => {
  const h = fresh();
  h.record(h.issue(), 0, { feedback: "hard" }); h.now += 100_000;
  const d = h.decision({ requestTrial: true });
  assert.notDeepEqual(d.prescription?.load, lb(10));
  assert.equal(d.baseline, undefined);
  assert.equal(d.prescription, undefined, "failed minimum has no lower or previous manageable trial; defer/reselect instead of retrying5");
});

test("C07 missed first floor with no prior manageable load does not establish work", () => {
  const h = fresh(); h.record(h.issue(), 0, { reps: 4 }); h.now += 100_000;
  const d = h.decision();
  assert.equal(d.baseline, undefined);
  assert.notEqual(d.prescription?.kind, "working");
  assert.equal(d.prescription, undefined, "known failed starter is not automatically issued again");
});

test("C06 C07 failed higher calibration restores last manageable5 without immediate10 retry", () => {
  for (const failure of [{ reps: 4, feedback: "unknown" as const }, { reps: 8, feedback: "hard" as const }]) {
    const h = fresh("db_flat_press", [5, 10, 15]);
    h.record(h.issue(), 0, { feedback: "easy" }); h.now += 90_000;
    const higher = h.issue({ requestTrial: true }); assert.deepEqual(higher.load, lb(10));
    h.record(higher, 0, failure); h.now += 90_000;
    const fallback = h.decision();
    assert.deepEqual(fallback.prescription?.load, lb(5));
    assert.equal(fallback.baseline, undefined);
    const repeated = h.decision({ requestTrial: true });
    assert.notDeepEqual(repeated.prescription?.load, lb(10), "a repeated request cannot undo the known failed trial");
  }
});

test("C08 three calibration trials consume the movement allowance", () => {
  const h = fresh("db_flat_press", [10, 12.5, 15, 17.5, 20]);
  for (let n = 0; n < 3; n++) {
    if (n) h.now += 90_000;
    const p = h.issue({ requestTrial: n > 0 });
    assert.equal(p.kind, "calibration");
    h.record(p, 0, { feedback: "easy" });
  }
  const d = h.decision({ requestTrial: true });
  assert.notEqual(d.prescription?.kind, "calibration");
  assert.equal(h.state.projection.sets.filter(set => set.role === "calibration").length, 3);
});

test("C08 unrestricted Easy calibration cannot cross first-use ceiling before baseline", () => {
  const h = fresh("db_flat_press", [5, 10, 15, 20, 25, 30, 35, 40]);
  for (let n = 0; n < 8; n++) {
    const d = h.decision({ requestTrial: true });
    assert.equal(d.baseline, undefined, "fixture performs calibration only");
    if (d.prescription) {
      assert.ok((d.prescription.load?.amountMilli ?? 0) <= 20_000, "press first-use ceiling remains20lb even when normal coarse bounds would permit25");
      if (d.prescription.kind === "calibration") h.record(h.issue({ requestTrial: true }), 0, { feedback: "easy" });
    }
    h.next();
  }
});

test("C09 exhausted six-minute calibration budget blocks further trials", () => {
  const h = fresh(); h.record(h.issue(), 0, { feedback: "easy" });
  h.now += 360_000;
  const d = h.decision({ requestTrial: true });
  assert.notEqual(d.prescription?.kind, "calibration");
  assert.ok(d.reasons.length);
});

test("C10 two new gym identities consume the visit calibration allowance", () => {
  const h = fresh(); h.record(h.issue()); h.now += 90_000;
  const row = id("db_supported_row"); h.prepare(row);
  h.record(h.issue({ identity: row, inventory: inventory(row) }));
  const hinge = id("db_rdl"); h.prepare(hinge);
  const d = h.decision({ identity: hinge, inventory: inventory(hinge) });
  assert.equal(d.prescription, undefined);
  assert.match(d.reasons.join(" "), /new|identit|movement|limit|calibrat/i);
});

test("C11 home retries consume the same four-check allowance", () => {
  const h = fresh("knee_pushup", [], "home");
  h.record(h.issue(), 0, { reps: 5 });
  const nextIdentities = [id("wall_pushup"), id("air_squat"), id("glute_bridge")];
  for (const identity of nextIdentities) {
    h.now += 60_000; h.prepare(identity);
    h.record(h.issue({ identity, inventory: inventory(identity, []) }));
  }
  const deadBug = id("dead_bug"); h.prepare(deadBug);
  const d = h.decision({ identity: deadBug, inventory: inventory(deadBug, []) });
  assert.equal(d.prescription, undefined);
  assert.equal(h.state.projection.sets.filter(set => set.role === "calibration").length, 4);
});

test("C12 home controlled check 10 gives provisional target 8", () => {
  const h = fresh("knee_pushup", [], "home");
  const p = h.issue(); h.record(p, 0, { reps: 10 }); h.now += 100_000;
  const d = h.decision();
  assert.deepEqual(d.prescription?.targets, [8, 8]);
  assert.equal(d.prescription?.load, null);
  assert.equal(d.prescription?.provisional, true);
  assert.equal(h.state.projection.sets[0]?.role, "calibration");
});

test("C13 below-floor home check cannot prescribe unachieved floor reps", () => {
  const h = fresh("knee_pushup", [], "home");
  h.record(h.issue(), 0, { reps: 5 }); h.now += 100_000;
  const d = h.decision();
  assert.notEqual(d.prescription?.kind, "working");
  assert.equal(d.baseline, undefined);
  assert.equal(d.prescription, undefined, "floor-only failed knee push-up needs an eligible easier setup or deferral");
});

test("C14 first added load uses 2.5 lb/hand selector rather than percentage of zero", () => {
  const h = fresh("loaded_split_squat", [2.5, 5, 7.5]);
  const d = h.decision();
  assert.equal(d.status, "proposal");
  assert.deepEqual(d.prescription?.load, lb(2.5));
  assert.deepEqual(d.prescription?.targets, [6]);
});

test("C20 per-side calibration keeps weaker side decisive", () => {
  const h = fresh("dead_bug", [], "home");
  h.record(h.issue(), 0, { reps: { left: 10, right: 5 } }); h.now += 100_000;
  const d = h.decision();
  assert.notEqual(d.prescription?.kind, "working");
  assert.equal(d.baseline, undefined);
});

test("C19 new variants and priority lifts never prompt extras", () => {
  for (const variant of ["db_flat_press", "goblet_squat", "db_rdl"] as const) {
    const h = fresh(variant);
    const p = h.issue(); assert.equal(p.extrasAllowed, false);
    h.record(p, 0, { reps: 12 }); h.now += 180_000;
    const d = h.decision();
    assert.equal(d.prescription?.extrasAllowed ?? false, false);
    assert.equal(d.baseline, undefined);
  }
});

test("C22 missing actual reps cannot become a confirmed completion", () => {
  const h = fresh();
  const event = h.event("set_recorded", {
    visitId: h.visitId, identity: h.identity, role: "working", startedAt: h.time(), endedAt: h.time(),
    actual: { load: lb(5), completed: true },
  });
  const before = structuredClone(h.state);
  const result = applyEvent(h.state, event);
  assert.equal(result.status, "rejected");
  assert.deepEqual(h.state, before);
  assert.deepEqual(result.state, before);
});

test("C26 provisional two-success pair establishes and earns 9/9 only once", () => {
  const h = establishedPress();
  const d = h.decision();
  assert.deepEqual(d.baseline?.targets, [8, 8]);
  assert.deepEqual(d.prescription?.targets, [9, 9]);
  const repeated = recommendExercise(replay(CONFIG, h.events), h.context());
  assert.deepEqual(repeated.prescription?.targets, [9, 9], "same evidence cannot ratchet to 10/10");
  h.complete(h.issue()); h.next();
  assert.deepEqual(h.decision().prescription?.targets, [9, 9], "one new-target success is not two");
});

test("C15 C16 deliberate baseline hold preserves ordinary two-success progression", () => {
  const h = baselineWithResetEvidence();
  h.complete(h.issue({ declineIncrease: true })); h.next();
  const hold = h.decision({ declineIncrease: true });
  assert.deepEqual(hold.prescription?.targets, [8, 8]);
  assert.deepEqual(h.decision().prescription?.targets, [8, 8], "one ordinary success after the reset does not earn 9/9");
  h.complete(h.issue({ declineIncrease: true })); h.next();
  assert.deepEqual(h.decision().prescription?.targets, [9, 9]);
});

test("C17 extras accelerate at most one rep on a deliberately retained baseline", () => {
  const h = baselineWithResetEvidence();
  const p = h.issue({ declineIncrease: true });
  assert.equal(p.extrasAllowed, true);
  h.record(p, 0, { reps: 8 }); h.now += 180_000; h.record(p, 1, { reps: 14 });
  h.next();
  assert.deepEqual(h.decision().prescription?.targets, [9, 9]);
  assert.deepEqual(h.decision().prescription?.load, lb(10));
});

test("C17 C40 rep-only extras may advance a trial but never establish an intermediate target", () => {
  const h = establishedPress(); const nine = h.issue();
  assert.deepEqual(nine.targets, [9, 9]); assert.equal(nine.extrasAllowed, true);
  h.record(nine, 0, { reps: 9 }); h.now += 180_000; h.record(nine, 1, { reps: 11 }); h.next();
  assert.deepEqual(h.decision().baseline?.targets, [8, 8]);
  const ten = h.issue(); assert.deepEqual(ten.targets, [10, 10]);
  h.record(ten, 0, { reps: 9 }); h.now += 180_000; h.record(ten, 1, { reps: 8 }); h.next();
  assert.deepEqual(h.decision().baseline?.targets, [8, 8]);
  assert.ok(h.decision().prescription?.targets.every(target => target <= 8));
});

test("C17 unknown timing permits ordinary evidence but cannot accelerate extras", () => {
  const h = baselineWithResetEvidence(); const p = h.issue({ declineIncrease: true });
  h.record(p, 0, { reps: 8, timingQuality: "unknown" }); h.now += 180_000;
  h.record(p, 1, { reps: 10, timingQuality: "unknown" }); h.next();
  assert.deepEqual(h.decision().prescription?.targets, [8, 8]);
  h.complete(h.issue({ declineIncrease: true }), { timingQuality: "unknown" }); h.next();
  assert.deepEqual(h.decision().prescription?.targets, [9, 9]);
});

test("C18 7/10 cannot satisfy 8/8 by pooling extras", () => {
  const h = establishedPress(); const p = h.issue({ declineIncrease: true });
  h.record(p, 0, { reps: 7 }); h.now += 180_000; h.record(p, 1, { reps: 10 });
  h.next();
  assert.notDeepEqual(h.decision().prescription?.targets, [9, 9]);
  assert.deepEqual(h.decision().baseline?.targets, [8, 8]);
});

test("C21 time-limited partial does not supply full-prescription success", () => {
  const h = checkedPress(); h.next(); const p = h.issue(); h.record(p, 0); h.next();
  assert.equal(h.decision().baseline, undefined);
  h.complete(h.issue()); h.next();
  assert.equal(h.decision().baseline, undefined, "one complete plus one partial is not two successes");
  assert.deepEqual(h.decision().prescription?.targets, [8, 8]);
});

test("C23 prescribed paired-to-straight change alone does not starve success", () => {
  const h = checkedPress(); h.next(); h.complete(h.issue({ context: "paired" })); h.next();
  h.complete(h.issue({ context: "straight" })); h.next();
  assert.deepEqual(h.decision().baseline?.targets, [8, 8]);
  assert.deepEqual(h.decision().prescription?.targets, [9, 9]);
});

test("C24 shortened recovery is excluded and does not establish baseline", () => {
  const h = checkedPress(); h.next(); h.complete(h.issue(), { shortRecovery: true }); h.next();
  h.complete(h.issue()); h.next();
  assert.equal(h.decision().baseline, undefined);
  assert.deepEqual(h.decision().prescription?.targets, [8, 8]);
});

test("C25 changed required set count cannot reuse old two-set success", () => {
  const h = fresh("goblet_squat", [10, 12.5, 15]); h.record(h.issue());
  h.next(); h.complete(h.issue()); h.next(); h.complete(h.issue());
  h.send(h.event("recovery_reported", { visitId: h.visitId, feedback: "manageable" })); h.next();
  const p = h.issue({ plannedSets: 3, declineIncrease: true });
  assert.deepEqual(p.targets, [6, 6, 6]); assert.deepEqual(p.load, lb(10));
  h.complete(p); h.next();
  const d = h.decision({ plannedSets: 3 });
  assert.deepEqual(d.baseline?.targets, [6, 6]);
  assert.deepEqual(d.prescription?.targets, [6, 6, 6]);
});

test("C25 requested ninety-nine working sets cannot bypass max-three volume guard", () => {
  const h = establishedPress();
  const d = h.decision({ plannedSets: 99 });
  assert.equal(d.prescription, undefined);
  assert.ok(d.reasons.length);
});

test("C29 established 10-to-15 uses bounded low-load trial inside catalog ceiling", () => {
  const h = reachCeiling(); h.inventory = inventory(h.identity, [10, 15]);
  const d = h.decision({ requestTrial: true });
  assert.deepEqual(d.prescription?.load, lb(15));
  assert.equal(d.prescription?.kind, "calibration");
  assert.deepEqual(d.prescription?.targets, [8]);
  assert.deepEqual(d.baseline?.load, lb(10));
});

test("C30 oversized available step fails absolute and relative coarse bounds", () => {
  const h = reachCeiling(); h.inventory = inventory(h.identity, [10, 30]);
  const d = h.decision({ requestTrial: true });
  assert.notDeepEqual(d.prescription?.load, lb(30));
  assert.deepEqual(d.baseline?.load, lb(10));
  assert.ok(d.reasons.length);
});

test("C28 established 40-to-45 uses an acknowledged floor-target coarse trial", () => {
  const h = reachLoad(40); h.inventory = inventory(h.identity, [40, 45]);
  const d = h.decision({ requestTrial: true });
  assert.equal(d.prescription?.kind, "calibration");
  assert.deepEqual(d.prescription?.load, lb(45));
  assert.deepEqual(d.prescription?.targets, [8]);
  assert.equal(d.prescription?.provisional, true);
  assert.deepEqual(d.baseline?.load, lb(40));
});

test("C27 exactly five-percent bar increase uses the attainable 105 lb entry", () => {
  const h = reachLoad(100, "back_squat"); h.inventory = inventory(h.identity, [100, 105]);
  // Reach the rep ceiling through real issued work, never invent baseline fields.
  for (let n = 0; n < 12; n++) {
    const d = h.decision();
    if (d.baseline?.targets.every(target => target === 8)) break;
    h.complete(h.issue()); h.next();
  }
  assert.deepEqual(h.decision().baseline?.load, lb(100));
  assert.deepEqual(h.decision().baseline?.targets, [8, 8]);
  const d = h.decision();
  assert.equal(d.prescription?.kind, "working");
  assert.deepEqual(d.prescription?.load, lb(105));
  assert.deepEqual(d.prescription?.targets, [6, 6]);
});

test("C46 twice-failed permitted coarse load stops automatically repeating it", () => {
  const h = reachLoad(40); h.inventory = inventory(h.identity, [40, 45]);
  for (let n = 0; n < 2; n++) {
    const beforeTrial = h.decision({ requestTrial: true });
    const trial = h.issue({ requestTrial: true });
    assert.deepEqual(trial.load, lb(45), `attempt${n + 1}: ${JSON.stringify(beforeTrial)}`); h.record(trial, 0, { reps: 6 }); h.next();
    if (n === 0) {
      h.complete(h.issue({ declineIncrease: true }), { feedback: "easy" }); h.next();
    }
  }
  const d = h.decision({ requestTrial: true });
  assert.notDeepEqual(d.prescription?.load, lb(45));
  assert.ok(d.reasons.length);
  assert.deepEqual(d.baseline?.load, lb(40));
});

test("C31 rolling anchor remains 10 after 12.5 establishes inside seven days", () => {
  const h = establishedPress();
  h.complete(h.issue({ declineIncrease: true }), { feedback: "easy" }); h.next(1);
  const trial = h.issue({ requestTrial: true });
  assert.deepEqual(trial.load, lb(12.5)); assert.equal(trial.kind, "calibration");
  h.record(trial); h.next(1); h.complete(h.issue()); h.next(1);
  h.complete(h.issue(), { feedback: "easy" }); h.next(1);
  const d = h.decision({ requestTrial: true });
  assert.deepEqual(d.baseline?.load, lb(12.5));
  assert.deepEqual(d.prescription?.load, lb(15), "15 remains within low-load rolling bounds anchored at 10");
});

test("C31 establishing 10 cannot ratchet a retained low-load rolling anchor of 5", () => {
  const h = fresh("db_flat_press", [5, 10, 15, 20]); h.record(h.issue());
  h.next(); h.complete(h.issue()); h.next(); h.complete(h.issue(), { feedback: "easy" }); h.next(1);
  assert.deepEqual(h.decision().baseline?.load, lb(5));
  const trial = h.issue({ requestTrial: true }); assert.deepEqual(trial.load, lb(10));
  h.record(trial); h.next(1); h.complete(h.issue()); h.next(1); h.complete(h.issue(), { feedback: "easy" }); h.next(1);
  const d = h.decision({ requestTrial: true });
  assert.deepEqual(d.baseline?.load, lb(10));
  assert.notDeepEqual(d.prescription?.load, lb(15), "15 exceeds 100% above the retained 5-lb anchor despite latest baseline 10");
  assert.match(d.reasons.join(" "), /rolling|cumulat|cap|limit|budget/i);
});

test("C32 second upward load request in one date cannot chain Easy steps", () => {
  const h = establishedPress();
  h.complete(h.issue({ declineIncrease: true }), { feedback: "easy" }); h.next(1);
  const first = h.issue({ requestTrial: true });
  assert.deepEqual(first.load, lb(12.5)); h.record(first, 0, { feedback: "easy" }); h.now += 100_000;
  const again = h.decision({ requestTrial: true });
  assert.notDeepEqual(again.prescription?.load, lb(15));
  assert.deepEqual(again.baseline?.load, lb(10));
});

test("C34 substitute actual load cannot satisfy original issued-load gate", () => {
  const h = checkedPress(); h.next(); h.complete(h.issue(), { load: lb(5) }); h.next();
  h.complete(h.issue()); h.next();
  assert.equal(h.decision().baseline, undefined);
});

test("C38 short set offers gentler next work without a cause answer", () => {
  const h = establishedPress(); const p = h.issue();
  assert.deepEqual(p.targets, [9, 9]);
  h.record(p, 0, { reps: 7 }); h.now += 180_000;
  const d = h.decision({ declineIncrease: true });
  assert.ok(d.prescription || d.status === "stop");
  if (d.prescription) assert.ok(d.prescription.targets.every(target => target <= 8));
  assert.deepEqual(d.baseline?.targets, [8, 8]);
});

test("C39 two short sets end the movement and count one difficult exposure", () => {
  const h = establishedPress(); const p = h.issue();
  h.complete(p, { reps: 6 });
  const d = h.decision();
  assert.equal(d.status, "hold");
  assert.equal(d.prescription, undefined);
  assert.match(d.reasons.join(" "), /end|short/i);
  assert.ok((d.counters?.difficulty ?? 0) <= 1);
});

test("C40 failed increased trial returns toward established prescription", () => {
  const h = establishedPress(); const p = h.issue();
  h.record(p, 0, { reps: 8 }); h.now += 180_000; h.record(p, 1, { reps: 7 }); h.next();
  const d = h.decision();
  assert.deepEqual(d.baseline?.targets, [8, 8]);
  assert.ok(d.prescription?.targets.every(target => target <= 8));
});

test("C41 C47 repeated failed 9/9 survives baseline return and mode reopening", () => {
  const h = establishedPress();
  const first = h.issue(); assert.deepEqual(first.targets, [9, 9]); h.complete(first, { reps: 8 }); h.next();
  h.complete(h.issue({ declineIncrease: true })); h.next();
  h.complete(h.issue({ declineIncrease: true })); h.next();
  const second = h.issue(); assert.deepEqual(second.targets, [9, 9]); h.complete(second, { reps: 8 }); h.next();
  const plateau = h.decision();
  assert.notDeepEqual(plateau.prescription?.targets, [9, 9]);
  assert.ok((plateau.counters?.failedTrialDates ?? 0) >= 2);
  const reopened = h.decision({ requestTrial: true });
  assert.notDeepEqual(reopened.prescription?.targets, [9, 9]);
  assert.ok((reopened.counters?.failedTrialDates ?? 0) >= 2);
});

test("C48 establishing a bridge clears only its superseded failed-proposal history", () => {
  const h = establishedPress();
  h.complete(h.issue(), { reps: 8 }); h.next();
  h.complete(h.issue({ declineIncrease: true })); h.next();
  h.complete(h.issue({ declineIncrease: true })); h.next();
  h.complete(h.issue(), { reps: 8 }); h.next();
  const beforeBridge = h.decision();
  const bridge = h.issue();
  assert.notDeepEqual(bridge.targets, [9, 9]);
  assert.ok(bridge.targets.some(target => target === 9), `rep plateau should bridge one set at a time: ${JSON.stringify(beforeBridge)}`);
  h.complete(bridge); h.next(); h.complete(h.issue()); h.next();
  assert.deepEqual(h.decision().baseline?.targets, bridge.targets);
  assert.equal(h.decision().counters?.failedTrialDates ?? 0, 0);
  assert.deepEqual(h.decision().prescription?.targets, [9, 9], "established asymmetric bridge levels minima before raising both sets");
});

test("C42 unknown-cause short baseline dates eventually ease without a rating", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [7.5, 10, 12.5]);
  for (let n = 0; n < 3; n++) {
    const p = h.issue({ declineIncrease: true });
    h.record(p, 0, { reps: 7 }); h.now += 180_000; h.record(p, 1, { reps: 8 }); h.next();
  }
  const d = h.decision({ declineIncrease: true });
  assert.deepEqual(d.prescription?.load, lb(7.5), "at floor 8 the third unknown-short date selects next lower load");
  assert.deepEqual(d.baseline?.load, lb(10));
});

test("C43 effort-related baseline difficulty responds after two dates", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [7.5, 10, 12.5]);
  for (let n = 0; n < 2; n++) {
    const p = h.issue({ declineIncrease: true });
    h.record(p, 0, { reps: 7, feedback: "hard" }); h.now += 180_000; h.record(p, 1, { reps: 8 }); h.next();
  }
  assert.deepEqual(h.decision({ declineIncrease: true }).prescription?.load, lb(7.5));
});

test("C43 complete-but-hard is difficulty and a later clean success resets the streak", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [7.5, 10, 12.5]);
  h.complete(h.issue({ declineIncrease: true }), { feedback: "hard" }); h.next();
  assert.notDeepEqual(h.decision().prescription?.targets, [9, 9]);
  h.complete(h.issue({ declineIncrease: true })); h.next();
  h.complete(h.issue({ declineIncrease: true }), { feedback: "hard" }); h.next();
  assert.deepEqual(h.decision({ declineIncrease: true }).prescription?.load, lb(10), "separated hard dates are not consecutive difficulty");
});

test("C44 interrupted work remains actual history and does not establish baseline", () => {
  const h = checkedPress(); h.next(); h.complete(h.issue(), { interrupted: true }); h.next();
  h.complete(h.issue()); h.next();
  const d = h.decision();
  assert.equal(d.baseline, undefined);
  assert.equal(d.counters?.difficulty ?? 0, 0);
  assert.ok(h.state.projection.sets.some(set => set.actual.interrupted));
});

test("C44 C70 controlled equipment or time truncation refreshes exposure but not progress", () => {
  for (const cause of ["equipment", "time"] as const) {
    const h = establishedPress(); h.inventory = inventory(h.identity, [7.5, 10, 12.5]);
    h.record(h.issue({ declineIncrease: true }), 0, { reps: 5, cause });
    h.next(12);
    const d = h.decision({ declineIncrease: true });
    assert.equal(d.prescription?.kind, "working", `${cause} work was controlled exposure twelve days ago`);
    assert.deepEqual(d.prescription?.load, lb(10));
    assert.deepEqual(d.baseline?.targets, [8, 8]);
  }
});

test("C45 warm-up and out-of-policy actuals can stop work despite evidence exclusion", () => {
  for (const role of ["warmup", "working"] as const) {
    for (const flag of ["pain", "controlLost"] as const) {
      const h = fresh();
      h.manual({ reps: 1, load: lb(60), [flag]: true }, role);
      const d = h.decision({ declineIncrease: true });
      assert.equal(d.status, "stop", `${role} ${flag} must stop even when non-authorizing`);
      assert.equal(d.prescription, undefined);
    }
  }
});

test("C45 pain correction false leaves family stop until referenced resolution plus preparation", () => {
  const h = fresh(); const original = h.record(h.issue(), 0, { pain: true, reps: 3 });
  h.now += 1_000; h.send(h.correction(original, { ...actualFrom(original), pain: false }));
  assert.equal(h.decision({ declineIncrease: true }).status, "stop");
  const sibling = id("db_incline_press"); h.prepare(sibling);
  assert.equal(h.decision({ identity: sibling, inventory: inventory(sibling) }).status, "stop");
  h.now += 1_000;
  h.send(h.event("stop_resolved", { visitId: h.visitId, identity: h.identity, acknowledged: true, stopEventIds: [original.id] }));
  const beforePreparation = h.decision();
  assert.equal(beforePreparation.prescription, undefined);
  h.now += 1_000; h.send(h.event("preparation_confirmed", { visitId: h.visitId, identity: h.identity, recoveryConfirmed: true }));
  assert.notEqual(h.decision().status, "stop");
});

test("C45 direct movement stop before any set latches family without training credit", () => {
  for (const reason of ["pain", "control_loss"] as const) {
    const h = fresh();
    const stop = h.event("movement_stopped", { visitId: h.visitId, identity: h.identity, reason });
    h.send(stop);
    assert.equal(h.decision().status, "stop");
    assert.equal(h.state.projection.sets.length, 0);
    assert.deepEqual(summarize(h.state).attendanceDates, []);
    assert.equal(summarize(h.state).confirmedWorkingSets, 0);
    assert.equal(summarize(h.state).calibrationSets, 0);
    const sibling = id("db_incline_press"); h.prepare(sibling);
    assert.equal(h.decision({ identity: sibling, inventory: inventory(sibling) }).status, "stop");
    h.now += 1000;
    h.send(h.event("stop_resolved", { visitId: h.visitId, identity: h.identity, acknowledged: true, stopEventIds: [stop.id] }));
    assert.equal(h.decision().prescription, undefined, "resolution alone supplies no fresh preparation");
    h.now += 1000; h.send(h.event("preparation_confirmed", { visitId: h.visitId, identity: h.identity, recoveryConfirmed: true }));
    const after = h.decision();
    assert.equal(after.status, "proposal");
    assert.equal(after.prescription?.kind, "calibration");
    assert.equal(after.baseline, undefined);
    assert.deepEqual(summarize(h.state).attendanceDates, []);
  }
});

test("C50 correction retains successful downstream issued and actual work", () => {
  const h = establishedPress(); const p = h.issue();
  assert.deepEqual(p.targets, [9, 9]);
  const later = h.complete(p);
  const earlier = h.events.find(e => e.type === "set_recorded" && e.payload.role === "working");
  assert.ok(earlier);
  h.now += 1_000;
  h.send(h.correction(earlier!, { ...actualFrom(earlier!), reps: 6 }));
  for (const original of later) {
    const set = h.state.projection.sets.find(s => s.id === original.entityId);
    assert.equal(actualReps(set!.actual.reps), 9);
    assert.deepEqual(set!.issued?.targets, [9, 9]);
    assert.equal(set!.dependencyChanged, true);
  }
});

test("C51 old prepared prescription remains immutable when an earlier actual is corrected", () => {
  const h = establishedPress(); const prepared = h.issue();
  assert.deepEqual(prepared.targets, [9, 9]);
  const earlier = h.events.find(e => e.type === "set_recorded" && e.payload.role === "working");
  assert.ok(earlier); h.now += 1_000;
  h.send(h.correction(earlier!, { ...actualFrom(earlier!), reps: 6 }));
  const issued = h.state.projection.prescriptions.find(p => p.id === prepared.id);
  assert.deepEqual(issued, prepared, "recomputation cannot rewrite an already prepared prescription");
  assert.deepEqual(prepared.targets, [9, 9]);
});

test("C67 exercise absence remains independent of recent unrelated attendance", () => {
  const h = establishedPress();
  h.inventory = inventory(h.identity, [5, 7.5, 10, 12.5, 15]);
  h.finish(); h.now += 14 * DAY; h.open();
  const other = id("knee_pushup"); h.prepare(other); h.manual({ load: null, reps: 10 }, "calibration", other);
  h.prepare();
  const d = h.decision({ declineIncrease: true });
  assert.equal(d.prescription?.kind, "return");
  assert.deepEqual(d.prescription?.load, lb(7.5));
  assert.equal(d.prescription?.extrasAllowed, false);
});

test("C68 return check refresh does not cancel two-day re-establishment", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [5, 7.5, 10]);
  h.finish(); h.now += 14 * DAY; h.open(); h.prepare();
  const p = h.issue(); assert.equal(p.kind, "return");
  h.record(p, 0); h.now += 180_000;
  const d = h.decision({ declineIncrease: true });
  assert.equal(d.prescription?.extrasAllowed ?? false, false);
  assert.notDeepEqual(d.prescription?.load, lb(10));
  if (d.prescription) assert.ok(d.prescription.targets.every(target => target <= 8));
});

test("C68 return load stays 7.5 across dates instead of repeatedly multiplying 85 percent", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [5, 6.25, 7.5, 10]);
  h.finish(); h.now += 14 * DAY; h.open(); h.prepare();
  const first = h.issue(); assert.deepEqual(first.load, lb(7.5)); h.complete(first); h.next();
  const second = h.issue();
  assert.deepEqual(second.load, lb(7.5), "return anchor is historical baseline, not yesterday's reduced load");
  assert.equal(second.extrasAllowed, false);
  h.complete(second); h.next();
  assert.deepEqual(h.decision().baseline?.load, lb(7.5));
});

test("C69 forty-two-day absence restarts low-load selector while retaining history", () => {
  const h = establishedPress(); const oldCount = h.state.projection.sets.length;
  h.finish(); h.now += 42 * DAY; h.open(); h.prepare(); h.inventory = inventory(h.identity, [5, 10, 15]);
  const d = h.decision({ declineIncrease: true });
  assert.equal(d.status, "proposal");
  assert.deepEqual(d.prescription?.load, lb(5));
  assert.equal(h.state.projection.sets.length, oldCount);
});

test("C69 first-use check after long gap cannot resurrect archived baseline", () => {
  const h = establishedPress(); h.finish(); h.now += 42 * DAY; h.open(); h.prepare();
  h.inventory = inventory(h.identity, [5, 10, 15, 20]);
  h.record(h.issue(), 0, { feedback: "easy" }); h.now += 100_000;
  const next = h.decision({ requestTrial: true });
  assert.equal(next.baseline, undefined, "old established 10 is archival after reset");
  assert.deepEqual(next.prescription?.load, lb(10));
  h.record(h.issue({ requestTrial: true }), 0, { feedback: "easy" }); h.now += 100_000;
  const again = h.decision({ requestTrial: true });
  assert.notDeepEqual(again.prescription?.load, lb(15), "same-visit first-use anchor 5 limits cumulative rise to 10");
});

test("C70 warm-up only cannot refresh an absent exercise's readiness clock", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [5, 7.5, 10]);
  h.finish(); h.now += 14 * DAY; h.open(); h.prepare(); h.manual({ reps: 8, load: lb(5) }, "warmup");
  const d = h.decision();
  assert.equal(d.prescription?.kind, "return");
  assert.deepEqual(d.prescription?.load, lb(7.5));
});

test("C71 home visits preserve due gym rotation and unused press absence", () => {
  const h = establishedPress(); h.finish();
  const due = summarize(h.state).nextGymTemplate;
  for (let n = 0; n < 3; n++) {
    h.now += 5 * DAY; h.open("home");
    const identity = id("knee_pushup"); h.prepare(identity);
    h.manual({ reps: 10, load: null }, "calibration", identity); h.finish();
  }
  assert.equal(summarize(h.state).nextGymTemplate, due);
  h.now += 1000; h.open(); h.prepare(); h.inventory = inventory(h.identity, [5, 7.5, 10]);
  assert.equal(h.decision().prescription?.kind, "return");
  assert.deepEqual(h.decision().prescription?.load, lb(7.5));
});

test("C72 identical dead bug execution shares history across home and gym", () => {
  const h = fresh("dead_bug", [], "home"); h.record(h.issue(), 0, { reps: { left: 10, right: 10 } });
  h.next(3, "home"); h.complete(h.issue()); h.next(3, "gym"); h.complete(h.issue()); h.next();
  const d = h.decision();
  assert.deepEqual(d.baseline?.targets, [8, 8]);
  assert.deepEqual(d.prescription?.targets, [9, 9]);
  assert.equal(d.prescription?.load, null);
});

test("C33 out-of-policy manual 60 lb actual remains truthful and non-authorizing", () => {
  const h = fresh();
  const p = h.issue(); const e = h.record(p, 0, { load: lb(60), reps: 8 });
  assert.deepEqual(h.state.projection.sets.find(s => s.eventId === e.id)?.actual.load, lb(60));
  assert.deepEqual(h.state.projection.sets.find(s => s.eventId === e.id)?.issued?.load, lb(5));
  h.now += 100_000;
  const d = h.decision({ assessManualLoad: lb(60) });
  assert.notDeepEqual(d.prescription?.load, lb(60));
  assert.equal(d.baseline, undefined);
});

test("C31 C33 lower manual calibration actual cannot reroot the rolling anchor", () => {
  const h = establishedPress();
  h.complete(h.issue({ declineIncrease: true }), { feedback: "easy" }); h.next(1);
  const proposed = h.issue({ requestTrial: true });
  assert.deepEqual(proposed.load, lb(12.5)); assert.equal(proposed.kind, "calibration");
  const manual = h.record(proposed, 0, { load: lb(1), reps: 8, feedback: "easy" });
  h.now += 100_000;
  const immediate = h.decision({ requestTrial: true });
  assert.deepEqual(immediate.prescription?.load, lb(12.5),
    "same approved step remains eligible; manual1 is neither a new anchor nor failed12.5 work");
  h.next(1);
  const baseline = h.issue({ declineIncrease: true });
  assert.deepEqual(baseline.load, lb(10), "manual1lb is not an acknowledged or established prescription");
  h.complete(baseline, { feedback: "easy" }); h.next(1);
  const next = h.decision({ requestTrial: true });
  assert.deepEqual(next.baseline?.load, lb(10));
  assert.deepEqual(next.prescription?.load, lb(12.5),
    `legitimate10→12.5 trial must not be capped relative to manual1lb: ${next.reasons.join(";")}`);
  const recorded = h.state.projection.sets.find(set => set.eventId === manual.id);
  assert.deepEqual(recorded?.actual.load, lb(1));
  assert.deepEqual(recorded?.issued?.load, lb(12.5));
});

test("C35 machine setup identity cannot inherit another stack's trial", () => {
  const h = fresh("lat_pulldown", [10, 20, 30]);
  h.record(h.issue()); h.next();
  const other = id("lat_pulldown", "different-stack"); h.prepare(other);
  const d = h.decision({ identity: other, inventory: inventory(other, [10, 20, 30]) });
  assert.equal(d.status, "proposal");
  assert.equal(d.baseline, undefined);
  assert.notEqual(identityKey(h.identity), identityKey(other));
});

test("C36 units normalize to exact distinct mass and preserve attainable entry", () => {
  assert.equal(String(normalizeLoad(kg(1))), "1000000000000");
  assert.equal(String(normalizeLoad(lb(1))), "453592370000");
  assert.notEqual(normalizeLoad(kg(20)), normalizeLoad(lb(20)));
  const h = fresh();
  h.inventory.loads = [kg(2), lb(5), kg(2)];
  const d = h.decision();
  assert.deepEqual(d.prescription?.load, kg(2));
});

test("C36 maximum safe integer milli-unit input normalizes without floating-point loss", () => {
  const load: Load = { amountMilli: Number.MAX_SAFE_INTEGER, unit: "kg" };
  assert.equal(String(normalizeLoad(load)), "9007199254740991000000000");
});

test("C37 inventory sorting and duplicate entries do not invent load steps", () => {
  const h = fresh("db_flat_press", [10, 5, 10, 5]);
  assert.deepEqual(h.decision().prescription?.load, lb(5));
  const a = recommendExercise(h.state, h.context());
  const b = recommendExercise(h.state, h.context({ inventory: inventory(h.identity, [5, 10]) }));
  assert.deepEqual(a.prescription?.load, b.prescription?.load);
  h.inventory.loads.push({ amountMilli: Number.NaN, unit: "lb" });
  const invalid = h.decision();
  assert.equal(invalid.prescription, undefined);
  assert.ok(invalid.reasons.length);
});

test("C45 pain stops affected movement until explicit resolution and preparation", () => {
  const h = fresh(); h.record(h.issue(), 0, { pain: true, reps: 3 });
  const d = h.decision();
  assert.equal(d.status, "stop"); assert.equal(d.prescription, undefined);
  h.manual({ reps: 8, pain: false });
  assert.equal(h.decision().status, "stop", "ordinary subsequent confirmation cannot clear a stop");
});

test("C49 correction before further work retains issued target and recomputes guidance", () => {
  const h = fresh(); const p = h.issue(); const original = h.record(p);
  h.now += 1_000;
  h.send(h.correction(original, { ...actualFrom(original), reps: 4 }));
  const set = h.state.projection.sets.find(s => s.id === original.entityId);
  assert.equal(actualReps(set!.actual.reps), 4);
  assert.equal(actualReps(set!.originalActual.reps), 8);
  assert.deepEqual(set!.issued?.targets, [8]);
  assert.equal(h.decision().baseline, undefined);
});

test("C52 duplicate offline event contributes exactly one set and one credit", () => {
  const h = fresh(); const event = h.record(h.issue());
  const before = structuredClone(h.state);
  const result = applyEvent(h.state, event);
  assert.equal(result.status, "duplicate");
  assert.deepEqual(result.state, before);
  assert.equal(result.state.projection.sets.length, 1);
  assert.equal(summarize(result.state).attendanceDates.length, 1);
});

test("C52 earlier trusted receipt on duplicate append converges with replay", () => {
  const h = fresh(); const original = h.record(h.issue());
  const prefix = h.events.slice(0, -1);
  const laterReceipt = { ...original, receivedAt: new Date(Date.parse(original.receivedAt) + 60_000).toISOString() };
  const earlyReceipt = { ...original };
  assert.equal(eventFingerprint(laterReceipt), eventFingerprint(earlyReceipt));
  const lateFirst = applyEvent(replay(CONFIG, prefix), laterReceipt);
  const appended = applyEvent(lateFirst.state, earlyReceipt);
  assert.equal(appended.status, "duplicate");
  const replayed = replay(CONFIG, [...prefix, laterReceipt, earlyReceipt]);
  assert.deepEqual(appended.state.projection, replayed.projection);
  assert.deepEqual(appended.state.events, replayed.events);
});

test("C53 duplicate logical set under another entity cannot become another set", () => {
  const h = fresh(); const original = h.record(h.issue());
  const duplicateSlot = { ...original, id: "different-event-same-slot", entityId: "different-set-same-slot" } as EngineEvent;
  const result = applyEvent(h.state, duplicateSlot);
  assert.ok(result.status === "conflict" || result.status === "rejected" || result.status === "duplicate"
    || result.state.projection.invalidEventIds.includes(duplicateSlot.id));
  assert.ok(result.state.projection.sets.length <= 1, "one prescription/index is one logical set");
  assert.ok(summarize(result.state).calibrationSets <= 1);
});

test("C56 duplicate logical visit under another entity is rejected or conflicted", () => {
  const h = fresh();
  const original = h.events.find(event => event.type === "visit_started")!;
  const duplicate = { ...original, id: "other-start-event", entityId: "other-start-entity" } as EngineEvent;
  const result = applyEvent(h.state, duplicate);
  assert.ok(result.status === "conflict" || result.status === "rejected" || result.status === "duplicate"
    || result.state.projection.invalidEventIds.includes(duplicate.id));
  assert.ok(result.state.projection.visits.length <= 1);
});

test("C53 competing corrections produce conflict instead of choosing arrival order", () => {
  const h = fresh(); const original = h.record(h.issue()); h.now += 1_000;
  const first = h.correction(original, { ...actualFrom(original), reps: 6 });
  const second = h.correction(original, { ...actualFrom(original), reps: 7 });
  const a = replay(CONFIG, [...h.events, first, second]);
  const b = replay(CONFIG, [...h.events, second, first]);
  assert.equal(a.projection.conflicts.length, 1);
  assert.deepEqual(a.projection.conflicts, b.projection.conflicts);
  assert.equal(recommendExercise(a, h.context()).prescription, undefined);
  assert.equal(recommendExercise(b, h.context()).prescription, undefined);
});

test("C54 revision three arriving before revision two remains pending then wins", () => {
  const h = fresh(); const original = h.record(h.issue()); h.now += 1_000;
  const second = h.correction(original, { ...actualFrom(original), reps: 6 });
  h.now += 1_000;
  const third = h.correction(original, { ...actualFrom(original), reps: 7 }, 3, second.id);
  const pending = replay(CONFIG, [...h.events, third]);
  assert.ok(pending.projection.pendingEventIds.includes(third.id));
  const resolved = replay(CONFIG, [...h.events, third, second]);
  const set = resolved.projection.sets.find(s => s.id === original.entityId);
  assert.equal(set?.revision, 3);
  assert.equal(actualReps(set!.actual.reps), 7);
  assert.deepEqual(resolved.projection.pendingEventIds, []);
});

test("C55 valid journal permutations yield identical projection and recommendation", () => {
  const h = fresh(); const original = h.record(h.issue()); h.now += 1_000;
  const correction = h.correction(original, { ...actualFrom(original), reps: 7 });
  const events = [...h.events, correction];
  const chronological = replay(CONFIG, events);
  const reversed = replay(CONFIG, [...events].reverse());
  assert.deepEqual(chronological.projection, reversed.projection);
  assert.deepEqual(recommendExercise(chronological, h.context()), recommendExercise(reversed, h.context()));
});

test("C55 JSON roundtrip of undefined optional fields creates no same-ID conflict", () => {
  const h = fresh();
  const p = h.issue({ plannedSets: undefined, requestTrial: undefined });
  const original = h.record(p, 0, { feedback: undefined, pain: undefined, cause: undefined });
  const serialized: EngineEvent[] = JSON.parse(JSON.stringify(h.events));
  const replayed = replay(CONFIG, serialized);
  const last = serialized.find(event => event.id === original.id)!;
  assert.equal(eventFingerprint(original), eventFingerprint(last));
  const duplicate = applyEvent(h.state, last);
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.state.projection.conflicts.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(h.state.projection)), JSON.parse(JSON.stringify(replayed.projection)));
  assert.deepEqual(JSON.parse(JSON.stringify(h.decision())), JSON.parse(JSON.stringify(recommendExercise(replayed, h.context()))));
});

test("C55 cached authority matches cold replay after equal-receipt correction and fork", () => {
  const h = establishedPress(); const higher = h.issue(); h.complete(higher); h.next();
  const original = h.events.find(event => event.type === "set_recorded" && event.payload.role === "working")!;
  const warm = replay(CONFIG, h.events, h.time());
  recommendExercise(warm, h.context());
  const correction = h.correction(original, { ...actualFrom(original), reps: 6 });
  correction.occurredAt = higher.issuedAt; correction.receivedAt = higher.issuedAt;
  const hot = applyEvent(warm, correction).state;
  const cold = replay(CONFIG, [...h.events, correction], h.time());
  assert.deepEqual(hot.projection, cold.projection);
  assert.deepEqual(recommendExercise(hot, h.context()), recommendExercise(cold, h.context()));
  const fork = h.correction(original, { ...actualFrom(original), reps: 7 });
  fork.occurredAt = higher.issuedAt; fork.receivedAt = higher.issuedAt;
  const hotFork = applyEvent(hot, fork).state;
  const coldFork = replay(CONFIG, [...h.events, correction, fork], h.time());
  assert.deepEqual(hotFork.projection, coldFork.projection);
  assert.deepEqual(recommendExercise(hotFork, h.context()), recommendExercise(coldFork, h.context()));

  const reused = replay(CONFIG, h.events, h.time());
  recommendExercise(reused, h.context());
  if (!Object.isFrozen(reused.events)) {
    // This is an adversarial caller-owned fixture mutation, not baseline
    // seeding. The appended fact is the same genuine revision used above.
    reused.events.push(correction);
    assert.deepEqual(recommendExercise(reused, h.context()), recommendExercise(cold, h.context()),
      "a mutable public journal cannot reuse stale cached prescription authority");
  }
});

test("C56 unknown valid references stay pending; malformed dates reject atomically", () => {
  const h = fresh();
  const unknown = h.event("set_corrected", { actual: { reps: 8, load: lb(5), completed: true } }, { entityId: "unknown-set", revision: 2, previousEventId: "missing-first" });
  const p = applyEvent(h.state, unknown);
  assert.equal(p.status, "accepted");
  assert.ok(p.state.projection.pendingEventIds.includes(unknown.id));
  assert.equal(p.state.projection.sets.length, 0);
  const malformed = { ...unknown, id: "bad-date", occurredAt: "not-a-date" } as EngineEvent;
  const before = structuredClone(h.state);
  const r = applyEvent(h.state, malformed);
  assert.equal(r.status, "rejected"); assert.deepEqual(r.state, before);
});

test("C56 prototype property names are invalid catalogue variants without mutation or crash", () => {
  for (const variant of ["constructor", "__proto__", "toString"]) {
    const h = fresh(); const before = structuredClone(h.state);
    const invalidIdentity = { variant: variant as VariantId, setupId: "prototype-name" };
    const d = h.decision({ identity: invalidIdentity });
    assert.equal(d.prescription, undefined, `${variant} is not a catalogue exercise`);
    assert.deepEqual(h.state, before);
    const result = applyEvent(h.state, h.event("rehearsal_confirmed", {
      visitId: h.visitId, identity: invalidIdentity, controlled: true,
    }));
    assert.equal(result.status, "rejected");
    assert.deepEqual(result.state, before);
  }
});

test("C56 malformed and non-cloneable public events reject before receipt override", () => {
  const h = fresh();
  const nonCloneable = { ...h.event("visit_ended", { visitId: h.visitId }), callback: () => "not-protocol-data" };
  for (const input of [null, undefined, "malformed-event", nonCloneable]) {
    const before = structuredClone(h.state);
    const result = applyEvent(h.state, input as unknown as EngineEvent, h.time());
    assert.equal(result.status, "rejected");
    assert.deepEqual(result.state, before);
    assert.deepEqual(h.state, before);
  }
});

test("C56 sparse and non-plain JSON values reject atomically while dense references stay journaled", () => {
  const h = fresh();
  const holes: string[] = []; holes.length = 2;
  const sparsePlanned: Identity[] = []; sparsePlanned.length = 1;
  const rootClass = Object.assign(Object.create({ inheritedMeaning: "not-json" }),
    h.event("visit_ended", { visitId: h.visitId }));
  const malformed: unknown[] = [
    h.event("visit_ended", { visitId: h.visitId }, { dependencies: holes }),
    h.event("visit_started", { visitId: "sparse-plan", setting: "gym", template: "A", timeZone: CONFIG.timeZone,
      trainingDate: trainingDate(h.now), plannedIdentities: sparsePlanned }),
    { ...h.event("visit_ended", { visitId: h.visitId }), nonProtocolValue: new Date(START) },
    { ...h.event("visit_ended", { visitId: h.visitId }), nonProtocolValue: new Map([["key", "value"]]) },
    { ...h.event("visit_ended", { visitId: h.visitId }), nonProtocolValue: new Set(["value"]) },
    rootClass,
  ];
  for (const input of malformed) {
    const before = structuredClone(h.state);
    const result = applyEvent(h.state, input as EngineEvent);
    assert.equal(result.status, "rejected");
    assert.deepEqual(result.state, before);
    assert.deepEqual(h.state, before);
  }
  const dense = h.event("visit_ended", { visitId: h.visitId }, { dependencies: ["future-dense-reference"] });
  const retained = applyEvent(h.state, dense);
  assert.equal(retained.status, "accepted");
  assert.equal(retained.state.events.filter(event => event.id === dense.id).length, 1,
    "an accepted envelope cannot disappear during canonical replay");
  assert.ok(retained.state.projection.pendingEventIds.includes(dense.id));
  const roundtrip = replay(CONFIG, JSON.parse(JSON.stringify(retained.state.events)), h.time());
  assert.deepEqual(roundtrip.projection, retained.state.projection);
});

test("C53 resolved duplicate visit loser and its descendants stop blocking guidance", () => {
  const h = fresh();
  const original = h.events.find(event => event.type === "visit_started")!;
  const losing = { ...original, id: "losing-visit-start", entityId: "losing-visit-start-entity" } as EngineEvent;
  const forked = applyEvent(h.state, losing).state;
  const conflict = forked.projection.conflicts.find(item => item.candidateKeys.includes(eventFingerprint(original))
    && item.candidateKeys.includes(eventFingerprint(losing)));
  assert.ok(conflict, "different envelopes for one visit need an explicit resolvable conflict");
  h.now += 1000;
  const sibling = id("db_supported_row");
  const descendant = h.event("rehearsal_confirmed", { visitId: h.visitId, identity: sibling, controlled: true }, { dependencies: [losing.id] });
  const withDescendant = applyEvent(forked, descendant).state;
  const resolution = h.event("conflict_resolved", {
    targetEntityId: conflict!.entityId, targetRevision: conflict!.revision,
    expectedCandidateKeys: conflict!.candidateKeys, selectedCandidateKey: eventFingerprint(original),
  }, { entityId: resolutionEntityId(conflict!.entityId, conflict!.revision) });
  const resolved = applyEvent(withDescendant, resolution);
  assert.equal(resolved.status, "accepted");
  assert.equal(resolved.state.projection.conflicts.length, 0);
  assert.ok(!resolved.state.projection.pendingEventIds.includes(losing.id));
  assert.ok(!resolved.state.projection.pendingEventIds.includes(descendant.id));
  assert.ok(!resolved.state.projection.authoritativeEvents.some(event => event.id === descendant.id));
  assert.equal(resolved.state.projection.visits.length, 1);
  assert.deepEqual(summarize(resolved.state).attendanceDates, []);
  assert.ok(recommendExercise(resolved.state, h.context()).prescription,
    "a resolved losing start is not an eternally missing predecessor");
  const row = recommendExercise(resolved.state, h.context({ identity: sibling, inventory: inventory(sibling) }));
  assert.equal(row.prescription, undefined, "losing descendant cannot supply rehearsal authority");
  assert.ok(resolved.state.events.some(event => event.id === losing.id), "losing raw record remains auditable");
  const reversed = replay(CONFIG, [...h.events, losing, descendant, resolution].reverse(), h.time());
  assert.deepEqual(reversed.projection, resolved.state.projection);
});

test("C53 resolved duplicate set loser and its correction do not count or remain pending", () => {
  const h = fresh(); const original = h.record(h.issue());
  assert.equal(original.type, "set_recorded");
  const losing = { ...original, id: "losing-slot-event", entityId: "losing-slot-entity" } as EngineEvent;
  const forked = applyEvent(h.state, losing).state;
  const conflict = forked.projection.conflicts.find(item => item.candidateKeys.includes(eventFingerprint(original))
    && item.candidateKeys.includes(eventFingerprint(losing)));
  assert.ok(conflict);
  h.now += 1000;
  const descendant = h.correction(losing, { ...actualFrom(losing), reps: 12 });
  const withDescendant = applyEvent(forked, descendant).state;
  const resolution = h.event("conflict_resolved", {
    targetEntityId: conflict!.entityId, targetRevision: conflict!.revision,
    expectedCandidateKeys: conflict!.candidateKeys, selectedCandidateKey: eventFingerprint(original),
  }, { entityId: resolutionEntityId(conflict!.entityId, conflict!.revision) });
  const resolved = applyEvent(withDescendant, resolution);
  assert.equal(resolved.status, "accepted");
  assert.equal(resolved.state.projection.conflicts.length, 0);
  assert.ok(!resolved.state.projection.pendingEventIds.includes(losing.id));
  assert.ok(!resolved.state.projection.pendingEventIds.includes(descendant.id));
  assert.ok(!resolved.state.projection.authoritativeEvents.some(event => event.id === descendant.id));
  assert.equal(resolved.state.projection.sets.length, 1);
  assert.equal(actualReps(resolved.state.projection.sets[0]!.actual.reps), 8);
  assert.equal(summarize(resolved.state).calibrationSets, 1);
  assert.deepEqual(summarize(resolved.state).attendanceDates, ["2026-11-01"]);
  const reversed = replay(CONFIG, [...h.events, losing, descendant, resolution].reverse(), h.time());
  assert.deepEqual(reversed.projection, resolved.state.projection);
  h.state = resolved.state; h.events = [...resolved.state.events]; h.now += 100_000; h.prepare();
  assert.deepEqual(h.decision().prescription?.targets, [8, 8]);
  assert.equal(h.decision().baseline, undefined, "one winning calibration is not an established load");
});

test("C55 pending void revision cannot remove target evidence", () => {
  const h = fresh(); const original = h.record(h.issue()); h.now += 1_000;
  const pendingVoid = h.event("event_voided", { targetEventId: original.id, reason: "mistaken record" }, {
    entityId: "pending-void-chain", revision: 2, previousEventId: "not-yet-received-void",
  });
  const result = applyEvent(h.state, pendingVoid);
  assert.ok(result.state.projection.sets.some(set => set.eventId === original.id));
  assert.ok(!result.state.projection.voidedEventIds.includes(original.id));
});

test("C55 competing void candidates cannot pick a target by arrival order", () => {
  const h = fresh(); const original = h.record(h.issue()); h.now += 1_000;
  const unrelated = h.manual(); h.now += 1_000;
  const first = h.event("event_voided", { targetEventId: original.id, reason: "mistaken record" }, { entityId: "void-conflict" });
  const second = h.event("event_voided", { targetEventId: unrelated.id, reason: "different claimed mistake" }, { entityId: "void-conflict" });
  const left = replay(CONFIG, [...h.events, first, second]);
  const right = replay(CONFIG, [...h.events, second, first]);
  assert.deepEqual(left.projection, right.projection);
  assert.ok(left.projection.sets.some(set => set.eventId === original.id));
  assert.ok(left.projection.sets.some(set => set.eventId === unrelated.id));
});

test("C57 identical pure evaluations do not mutate inputs or change outputs", () => {
  const h = checkedPress(); h.now += 100_000;
  const before = structuredClone(h.state);
  const context = h.context(); const beforeContext = structuredClone(context);
  const first = recommendExercise(h.state, context);
  const second = recommendExercise(h.state, context);
  assert.deepEqual(first, second); assert.deepEqual(h.state, before); assert.deepEqual(context, beforeContext);
  assert.deepEqual(replay(CONFIG, h.events).projection, replay(CONFIG, h.events).projection);
});

test("C58 correction cannot switch identity or loading mode", () => {
  const h = fresh(); const original = h.record(h.issue()); h.now += 1_000;
  const correction = h.correction(original, { ...actualFrom(original), load: null });
  (correction.payload as unknown as Record<string, unknown>).identity = id("knee_pushup");
  const result = applyEvent(h.state, correction);
  assert.equal(result.status, "rejected");
  assert.deepEqual(result.state, h.state);
});

test("C59 calibration-only visit earns credit and advances gym A/B once", () => {
  const h = fresh(); h.record(h.issue()); h.finish();
  const summary = summarize(h.state);
  assert.deepEqual(summary.attendanceDates, ["2026-11-01"]);
  assert.equal(summary.nextGymTemplate, "B");
  assert.equal(summary.calibrationSets, 1);
});

test("C60 warm-up-only or zero-rep visits do not earn attendance/rotation", () => {
  const h = fresh(); h.manual({ reps: 8 }, "warmup"); h.finish();
  assert.deepEqual(summarize(h.state).attendanceDates, []);
  assert.equal(summarize(h.state).nextGymTemplate, "A");
  const z = fresh(); z.record(z.issue(), 0, { reps: 0 }); z.finish();
  assert.deepEqual(summarize(z.state).attendanceDates, []);
  assert.equal(summarize(z.state).nextGymTemplate, "A");
});

test("C61 two same-date visits cannot earn two credits or advance rotation twice", () => {
  const h = fresh(); h.record(h.issue()); h.finish();
  h.now += 3_600_000; h.open(); h.prepare(); h.manual(); h.finish();
  const summary = summarize(h.state);
  assert.equal(summary.attendanceDates.length, 1);
  assert.equal(summary.nextGymTemplate, "B");
});

test("C61 two complete exposures on one local date cannot establish a baseline", () => {
  const h = checkedPress(); h.next(); h.complete(h.issue()); h.next(0); h.complete(h.issue()); h.next();
  assert.equal(h.decision().baseline, undefined);
  assert.deepEqual(h.decision().prescription?.targets, [8, 8]);
});

test("C61 later same-date short work vetoes earlier positive evidence", () => {
  const h = checkedPress(); h.next(); h.complete(h.issue()); h.next(0);
  const second = h.issue(); h.record(second, 0, { reps: 7 }); h.now += 180_000; h.record(second, 1, { reps: 8 });
  h.next(); h.complete(h.issue()); h.next();
  assert.equal(h.decision().baseline, undefined, "vetoed date plus one later success is only one positive date");
});

test("C61 distinct local dates only twenty minutes apart cannot satisfy twelve-hour gate", () => {
  const h = checkedPress(); h.finish();
  h.now = Date.parse("2026-11-02T06:45:00Z"); h.open(); h.prepare(); h.complete(h.issue()); h.finish();
  h.now = Date.parse("2026-11-02T07:05:00Z"); h.open(); h.prepare(); h.complete(h.issue());
  h.finish(); h.now += DAY; h.open(); h.prepare();
  assert.equal(h.decision().baseline, undefined);
  assert.deepEqual(h.decision().prescription?.targets, [8, 8]);
});

test("C62 midnight continuation preserves one visit and original credit date", () => {
  const h = new History(); h.now = Date.parse("2026-11-02T06:50:00Z"); h.open(); h.prepare();
  h.record(h.issue()); h.now += 20 * 60_000; h.finish();
  assert.deepEqual(summarize(h.state).attendanceDates, ["2026-11-01"]);
  assert.equal(h.state.projection.visits.length, 1);
  assert.equal(h.state.projection.visits[0]?.date, "2026-11-01");
});

test("C63 exactly six hours of inactivity cannot resume as ordinary work", () => {
  const h = fresh(); h.now += 6 * 3_600_000;
  const d = h.decision();
  assert.equal(d.status, "hold"); assert.equal(d.prescription, undefined);
  assert.match(d.reasons.join(" "), /stale|close|expired|partial/i);
});

test("C64 exactly thirty-minute pause requires renewed preparation", () => {
  const h = fresh(); h.now += 30 * 60_000;
  const d = h.decision();
  assert.equal(d.prescription, undefined);
  assert.match([...d.prerequisites, ...d.reasons].join(" "), /prepar|warm|pause/i);
  h.send(h.event("preparation_confirmed", { visitId: h.visitId, identity: h.identity }));
  assert.ok(h.decision().prescription);
});

test("C65 DST fallback uses elapsed UTC time and retains local visit date", () => {
  const h = new History(); h.now = Date.parse("2026-11-01T07:50:00Z"); h.open(); h.prepare();
  h.now = Date.parse("2026-11-01T08:10:00Z");
  assert.ok(h.decision().prescription, "only twenty elapsed minutes despite repeated local hour");
  assert.equal(h.state.projection.visits[0]?.date, "2026-11-01");
});

test("C66 a different training-zone event cannot rewrite history's credit date", () => {
  const h = fresh(); h.record(h.issue()); h.finish();
  const before = structuredClone(h.state);
  const event = h.event("visit_started", { visitId: "foreign-zone", setting: "gym", template: "B", timeZone: "Pacific/Auckland", trainingDate: "2026-11-02" });
  const result = applyEvent(h.state, event);
  assert.ok(result.status === "rejected" || recommendExercise(result.state, h.context()).status === "needs_migration");
  assert.deepEqual(summarize(result.state).attendanceDates, summarize(before).attendanceDates);
});

test("C73 knee and floor push-ups retain separate calibration identities", () => {
  const h = fresh("knee_pushup", [], "home"); h.record(h.issue(), 0, { reps: 12 }); h.next(3, "home");
  const floor = id("floor_pushup"); h.prepare(floor);
  const d = h.decision({ identity: floor, inventory: inventory(floor, []) });
  assert.equal(d.status, "proposal");
  assert.equal(d.baseline, undefined);
  assert.notEqual(identityKey(h.identity), identityKey(floor));
});

test("C74 known home plan is 940 seconds and reports absent pulling coverage", () => {
  const identities = [id("knee_pushup"), id("air_squat"), id("glute_bridge"), id("dead_bug")];
  const state = createState(CONFIG);
  const inventories = Object.fromEntries(identities.map(identity => [identityKey(identity), inventory(identity, [])]));
  const plan = planVisit(state, { now: new Date(START).toISOString(), setting: "home", identities, inventories, budgetSeconds: 1800 });
  assert.equal(plan.estimatedSeconds, 940);
  assert.match(plan.missingCoverage.join(" "), /pull/i);
  const h = fresh("knee_pushup", [], "home"); h.record(h.issue(), 0, { reps: 10 }); h.finish();
  assert.ok(summarize(h.state).bodyweightReps > 0);
  assert.deepEqual(summarize(h.state).externalTonnageByConvention, {});
});

test("C75 repeated planned omission is moved earlier while priority remains protected", () => {
  const identities = [id("goblet_squat"), id("db_flat_press"), id("db_supported_row"), id("calf_raise"), id("dead_bug")];
  const inventories = Object.fromEntries(identities.map(identity => [identityKey(identity), inventory(identity)]));
  const h = establishedPress();
  h.identity = id("db_supported_row"); h.inventory = inventory(h.identity); h.prepare();
  h.record(h.issue()); h.next(); h.complete(h.issue()); h.next(); h.complete(h.issue()); h.next();
  assert.ok(h.decision().baseline, "row is established, so its omission is not first-use deferral");
  h.finish(); h.identity = id("goblet_squat"); h.inventory = inventory(h.identity);
  for (let n = 0; n < 2; n++) {
    h.now += 3 * DAY;
    h.open("gym", identities); h.prepare();
    const p = h.issue(); h.record(p);
    const press = identities[1]!; h.prepare(press);
    const pressPrescription = h.issue({ identity: press, inventory: inventories[identityKey(press)]! });
    h.record(pressPrescription); h.finish();
  }
  h.now += 3 * DAY;
  const plan = planVisit(h.state, { now: h.time(), setting: "gym", identities, inventories, budgetSeconds: 2400 });
  assert.equal(plan.exercises[0]?.priority, true);
  const rowPosition = plan.exercises.findIndex(e => e.identity.variant === "db_supported_row");
  const pressPosition = plan.exercises.findIndex(e => e.identity.variant === "db_flat_press");
  assert.ok(rowPosition > 0 && rowPosition < pressPosition, "twice omitted row is promoted after protected squat");
});

test("C76 missing home plan equipment is explicit and makes no saved-work claim", () => {
  const plan = planVisit(createState(CONFIG), { now: new Date(START).toISOString(), setting: "home", identities: [], inventories: {} });
  assert.ok(plan.status === "needs_setup" || plan.status === "hold");
  assert.equal(plan.exercises.length, 0);
  assert.ok(plan.reasons.length);
});

test("C77 reversed evaluation clock blocks guidance instead of negative-gap progress", () => {
  const h = fresh(); h.record(h.issue());
  const d = h.decision({ now: new Date(START - 1000).toISOString() });
  assert.equal(d.prescription, undefined);
  assert.match(d.reasons.join(" "), /time|clock|future|skew/i);
});

test("C77 bad future event is quarantined and explicit void leaves other work available", () => {
  const h = fresh();
  const futureTime = new Date(h.now + DAY).toISOString();
  const futureEvent = h.event("visit_started", {
    visitId: "bad-clock-visit", setting: "home", template: "HOME", timeZone: CONFIG.timeZone,
    trainingDate: trainingDate(h.now + DAY),
  }, { occurredAt: futureTime });
  const applied = applyEvent(h.state, futureEvent);
  assert.equal(applied.status, "accepted");
  assert.ok(applied.state.projection.quarantinedEventIds.includes(futureEvent.id));
  assert.ok(recommendExercise(applied.state, h.context()).prescription, "unrelated existing visit remains usable");
  const voidEvent = h.event("event_voided", { targetEventId: futureEvent.id, reason: "incorrect device time" });
  const repaired = applyEvent(applied.state, voidEvent);
  assert.equal(repaired.status, "accepted");
  assert.ok(repaired.state.projection.voidedEventIds.includes(futureEvent.id));
  assert.ok(repaired.state.events.some(event => event.id === futureEvent.id), "raw history is retained");
  h.state = repaired.state;
  h.events = [...repaired.state.events];
  h.record(h.issue());
  assert.deepEqual(summarize(h.state).attendanceDates, ["2026-11-01"],
    "a ready prescription issued after void must retain actual work and attendance authority");
});

test("C78 unsupported policy returns migration without rewriting old issued work", () => {
  const h = fresh(); h.record(h.issue());
  const future = replay({ ...CONFIG, policyVersion: "experimental-v999" }, h.events);
  const d = recommendExercise(future, h.context());
  assert.equal(d.status, "needs_migration");
  assert.equal(d.prescription, undefined);
  assert.deepEqual(future.events, h.events);
});

test("C53 explicit conflict resolution names exact candidate fingerprints", () => {
  const h = fresh(); const original = h.record(h.issue()); h.now += 1_000;
  const first = h.correction(original, { ...actualFrom(original), reps: 6 });
  const second = h.correction(original, { ...actualFrom(original), reps: 7 });
  const conflicted = replay(CONFIG, [...h.events, first, second]);
  const resolution = h.event("conflict_resolved", {
    targetEntityId: original.entityId, targetRevision: 2,
    expectedCandidateKeys: [eventFingerprint(first), eventFingerprint(second)].sort(),
    selectedCandidateKey: eventFingerprint(second),
  }, { entityId: resolutionEntityId(original.entityId, 2) });
  const resolved = applyEvent(conflicted, resolution);
  assert.equal(resolved.status, "accepted");
  assert.equal(resolved.state.projection.conflicts.length, 0);
  const set = resolved.state.projection.sets.find(s => s.id === original.entityId);
  assert.equal(actualReps(set!.actual.reps), 7);
});

// Fable implementation audit: public-history reproductions of paths that the
// original green totals did not exercise. Expected outcomes remain spec-based.
test("C33 C38 F1 manual60 short or Hard cannot supply easing load authority", () => {
  for (const unissued of [false, true]) {
    const h = establishedPress();
    if (unissued) h.manual({ load: lb(60), reps: 8, feedback: "hard" });
    else h.record(h.issue(), 0, { load: lb(60), reps: 7 });
    h.now += 100_000;
    const d = h.decision();
    if (d.prescription?.load) {
      assert.ok(d.prescription.load.amountMilli <= 10_000, `manual60 cannot authorize ${JSON.stringify(d.prescription.load)}`);
      assert.ok(h.inventory.loads.some(load => load.amountMilli === d.prescription!.load!.amountMilli));
    }
    assert.deepEqual(d.baseline?.load, lb(10));
    assert.ok(h.state.projection.sets.some(set => set.actual.load?.amountMilli === 60_000));
  }
});

test("C38 F1 easier sets stop when the original remaining work is completed", () => {
  const h = establishedPress(); const original = h.issue();
  assert.deepEqual(original.targets, [9, 9]);
  h.record(original, 0, { reps: 7 }); h.now += 100_000;
  const easier = h.issue();
  assert.deepEqual(easier.load, lb(10));
  assert.equal(easier.targets.length, 1, "only the original second set remains");
  assert.equal(easier.replacement?.rootPrescriptionId, original.id);
  assert.deepEqual(easier.replacement?.setIndices, [1]);
  h.complete(easier); h.now += 100_000;
  const after = h.decision();
  assert.equal(after.prescription, undefined, `completed easing cannot produce more work: ${after.reasons.join(";")}`);
  assert.equal(h.state.projection.sets.filter(set => set.visitId === h.visitId && set.role === "working").length, 2);
});

test("C68 F2 partial and neutral return visits retain their epoch across dates", () => {
  for (const mode of ["partial", "time", "equipment"] as const) {
    const h = establishedPress(); h.inventory = inventory(h.identity, [5, 7.5, 10, 12.5]);
    h.finish(); h.now += 15 * DAY; h.open(); h.prepare();
    const p = h.issue(); assert.equal(p.kind, "return"); assert.deepEqual(p.load, lb(7.5));
    if (mode === "partial") h.record(p, 0);
    else h.complete(p, { cause: mode });
    h.next();
    const next = h.decision();
    assert.equal(next.prescription?.kind, "return", `${mode} exposure must not erase the frozen epoch`);
    assert.deepEqual(next.prescription?.load, lb(7.5));
    assert.deepEqual(next.prescription?.targets, [8, 8]);
    assert.equal(next.prescription?.extrasAllowed, false);
  }
});

test("C40 C41 F3 one success before a failed rep trial cannot resurrect that trial", () => {
  const h = establishedPress(); h.complete(h.issue()); h.next();
  const failed = h.issue(); assert.deepEqual(failed.targets, [9, 9]);
  h.complete(failed, { reps: 8 }); h.next();
  h.complete(h.issue({ declineIncrease: true })); h.next();
  const afterOneBaseline = h.decision();
  assert.deepEqual(afterOneBaseline.prescription?.targets, [8, 8]);
  assert.deepEqual(afterOneBaseline.baseline?.targets, [8, 8]);
  h.complete(h.issue({ declineIncrease: true })); h.next();
  const retrial = h.issue(); assert.deepEqual(retrial.targets, [9, 9]);
  h.complete(retrial, { reps: 8 }); h.next();
  assert.deepEqual(h.decision().prescription?.targets, [9, 8], "second failed date reaches the qualified bridge");
});

test("C40 F3 successful provisional load followed by failure needs renewed authority", () => {
  const h = establishedPress(); h.complete(h.issue({ declineIncrease: true }), { feedback: "easy" }); h.next(1);
  const trial = h.issue({ requestTrial: true }); assert.deepEqual(trial.load, lb(12.5)); h.record(trial); h.next(1);
  h.complete(h.issue()); h.next(1);
  const failed = h.issue(); assert.deepEqual(failed.load, lb(12.5)); h.complete(failed, { reps: 6 }); h.next(1);
  h.complete(h.issue({ declineIncrease: true })); h.next(1);
  assert.deepEqual(h.decision().prescription?.load, lb(10), "a stale successful provisional must not bypass the failed-trial rollback");
  assert.deepEqual(h.decision().baseline?.load, lb(10));
});

test("C77 F4 two-minute occurrence receipt skew becomes valid at occurrence time", () => {
  const h = new History("db_flat_press", [10, 12.5, 15]); h.receiptOffsetMs = 120_000;
  h.open(); h.prepare(); h.record(h.issue());
  h.next(); h.complete(h.issue()); h.next(); h.complete(h.issue()); h.next();
  const d = h.decision();
  assert.deepEqual(d.baseline?.targets, [8, 8]);
  assert.deepEqual(d.prescription?.targets, [9, 9]);
  const resolved = replay(CONFIG, h.events, h.time());
  assert.deepEqual(resolved.projection.ineligibleEventIds, []);
  assert.deepEqual(resolved.projection.quarantinedEventIds, []);
  assert.equal(summarize(resolved, h.time()).attendanceDates.length, 3);
});

test("C32 F5 Easy today cannot borrow an old earned pair for a same-visit load increase", () => {
  const h = establishedPress();
  h.complete(h.issue({ declineIncrease: true }), { feedback: "easy" }); h.now += 100_000;
  const sameVisit = h.decision({ requestTrial: true });
  assert.notDeepEqual(sameVisit.prescription?.load, lb(12.5));
  assert.ok(sameVisit.reasons.includes("increase_requires_later_date_and_12_hours"));
  h.next(1);
  assert.deepEqual(h.decision({ requestTrial: true }).prescription?.load, lb(12.5));
});

test("C55 F6 late logical fork resolution preserves original issuance in hot and cold replay", () => {
  const h = checkedPress(); h.next(); const valid = h.issue(); h.complete(valid);
  const start = h.events.find(event => event.type === "visit_started")!;
  const warm = replay(CONFIG, h.events, h.time()); recommendExercise(warm, h.context());
  const late = { ...start, id: "late-fork-start", entityId: "late-fork-entity", receivedAt: h.time() } as EngineEvent;
  const forked = applyEvent(warm, late).state;
  const conflict = forked.projection.conflicts.find(c => c.candidateKeys.includes(eventFingerprint(start)) && c.candidateKeys.includes(eventFingerprint(late)));
  assert.ok(conflict); h.now += 1000;
  const resolution = h.event("conflict_resolved", { targetEntityId: conflict!.entityId, targetRevision: conflict!.revision,
    expectedCandidateKeys: conflict!.candidateKeys, selectedCandidateKey: eventFingerprint(start) },
  { entityId: resolutionEntityId(conflict!.entityId, conflict!.revision) });
  const hot = applyEvent(forked, resolution).state;
  const cold = replay(CONFIG, [...h.events, late, resolution], h.time());
  assert.deepEqual(hot.projection, cold.projection);
  assert.deepEqual(recommendExercise(hot, h.context()), recommendExercise(cold, h.context()));
  assert.ok(cold.projection.prescriptions.some(p => p.id === valid.id));
  assert.equal(summarize(cold, h.time()).attendanceDates.length, 2);
  assert.equal(cold.projection.sets.filter(set => set.issued?.id === valid.id && set.policyEligible).length, 2);
});

test("C55 F6 declared causal records delivered later can restore a valid offline issuance", () => {
  const h = fresh(); const p = h.issue(); h.record(p);
  const delivery = new Date(h.now + DAY).toISOString();
  const events = h.events.map(event => event.type === "prescription_issued" ? event : { ...event, receivedAt: delivery });
  const restored = replay(CONFIG, [...events].reverse(), delivery);
  assert.deepEqual(restored.projection.pendingEventIds, []);
  assert.ok(restored.projection.prescriptions.some(candidate => candidate.id === p.id));
  assert.equal(summarize(restored, delivery).calibrationSets, 1);
  assert.deepEqual(summarize(restored, delivery).attendanceDates, ["2026-11-01"]);
});

test("C33 Fable secondary unrecorded assessManualLoad cannot invent reassessment evidence", () => {
  for (const established of [false, true]) {
    const h = established ? establishedPress() : fresh("db_flat_press", [10, 12.5, 15]);
    assert.ok(!h.state.projection.sets.some(set => set.actual.load?.amountMilli === 12500));
    const d = h.decision({ assessManualLoad: lb(12.5) });
    assert.notDeepEqual(d.prescription?.load, lb(12.5), "parameter is not a recorded manual actual or Easy/ceiling signal");
  }
});

test("C66 Fable secondary append and replay reject a forged frozen training date", () => {
  const h = fresh();
  const forged = h.event("visit_started", { visitId: "forged-date-visit", setting: "gym", template: "A",
    timeZone: CONFIG.timeZone, trainingDate: "2026-11-02" });
  assert.equal(applyEvent(h.state, forged).status, "rejected");
  const restored = replay(CONFIG, [...h.events, forged], h.time());
  assert.equal(restored.projection.visits.length, h.state.projection.visits.length);
  assert.ok(!restored.projection.authoritativeEvents.some(event => event.id === forged.id));
  assert.deepEqual(summarize(restored).attendanceDates, []);
});

test("C68 Fable secondary failed external return check lowers the next visit or defers", () => {
  for (const hasLower of [false, true]) {
    const h = establishedPress(); h.inventory = inventory(h.identity, hasLower ? [5, 7.5, 10] : [7.5, 10]);
    h.finish(); h.now += 15 * DAY; h.open(); h.prepare();
    const p = h.issue(); assert.deepEqual(p.load, lb(7.5)); h.record(p, 0, { reps: 4 }); h.next();
    const d = h.decision();
    if (hasLower) assert.deepEqual(d.prescription?.load, lb(5));
    else assert.equal(d.prescription, undefined, "known failed check cannot repeat when no lower eligible load exists");
  }
});

test("C34 Fable secondary frozen partial-return load must remain attainable", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [5, 7.5, 10]);
  h.finish(); h.now += 15 * DAY; h.open(); h.prepare();
  h.record(h.issue(), 0); h.next(); h.inventory = inventory(h.identity, [5, 10]);
  const d = h.decision();
  assert.equal(d.prescription?.kind, "return");
  assert.deepEqual(d.prescription?.load, lb(5));
});

test("C34 Fable secondary return re-establishment cannot prescribe disappeared inventory", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [5, 7.5, 10]);
  h.finish(); h.now += 15 * DAY; h.open(); h.prepare(); h.complete(h.issue());
  h.next(); h.inventory = inventory(h.identity, [5, 10]);
  assert.deepEqual(h.decision().prescription?.load, lb(5));
});

test("C34 Fable secondary gentler future baseline chooses an available lower entry", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [7.5, 10, 12.5]);
  for (let n = 0; n < 2; n++) {
    const p = h.issue({ declineIncrease: true });
    h.record(p, 0, { reps: 7, feedback: "hard", cause: "effort" }); h.now += 180_000;
    h.record(p, 1); h.next();
  }
  h.inventory = inventory(h.identity, [5, 10]);
  assert.deepEqual(h.decision().prescription?.load, lb(5));
});

test("C34 Fable secondary rep bridge cannot reuse an unavailable baseline implement", () => {
  const h = establishedPress(); h.complete(h.issue(), { reps: 8 }); h.next();
  h.complete(h.issue({ declineIncrease: true })); h.next();
  h.complete(h.issue({ declineIncrease: true })); h.next();
  h.complete(h.issue(), { reps: 8 }); h.next();
  h.inventory = inventory(h.identity, [7.5, 12.5]);
  assert.deepEqual(h.decision().prescription?.load, lb(7.5));
});

test("C34 Fable secondary failed calibration fallback checks current inventory", () => {
  const h = fresh("db_flat_press", [5, 10, 15]); h.record(h.issue(), 0, { feedback: "easy" }); h.now += 90_000;
  h.record(h.issue({ requestTrial: true }), 0, { reps: 4 }); h.now += 90_000;
  h.inventory = inventory(h.identity, [2.5, 10]);
  assert.deepEqual(h.decision().prescription?.load, lb(2.5));
});

test("C34 C38 Fable secondary remaining easing work cannot use a disappeared issued load", () => {
  const h = establishedPress(); h.record(h.issue(), 0, { reps: 7 }); h.now += 100_000;
  h.inventory = inventory(h.identity, [7.5, 12.5]);
  const d = h.decision();
  assert.deepEqual(d.prescription?.load, lb(7.5));
  assert.equal(d.prescription?.targets.length, 1);
});

test("C53 F1 original and replacement recordings cannot count the same planned slot twice", () => {
  const h = establishedPress(); const original = h.issue();
  h.record(original, 0, { reps: 7 }); h.now += 100_000;
  const replacement = h.issue(); assert.deepEqual(replacement.replacement?.setIndices, [1]);
  const winningSet = h.record(replacement, 0); h.now += 1000;
  const start = h.time(); h.now += 40_000;
  const duplicate = h.event("set_recorded", {
    visitId: h.visitId, identity: h.identity, prescriptionId: original.id, setIndex: 1, role: "working",
    startedAt: start, endedAt: h.time(), actual: { reps: 9, load: original.load, completed: true, timingQuality: "measured" },
  });
  const forked = applyEvent(h.state, duplicate).state;
  const conflict = forked.projection.conflicts.find(c => c.candidateKeys.includes(eventFingerprint(winningSet))
    && c.candidateKeys.includes(eventFingerprint(duplicate)));
  assert.ok(conflict, "replacement local0 and original local1 alias the same root slot");
  assert.ok(forked.projection.sets.filter(set => set.visitId === h.visitId && set.role === "working" && set.policyEligible).length <= 2);
  assert.ok(summarize(forked, h.time()).confirmedWorkingSets <= summarize(h.state, h.time()).confirmedWorkingSets);
  const resolution = h.event("conflict_resolved", { targetEntityId: conflict!.entityId, targetRevision: conflict!.revision,
    expectedCandidateKeys: conflict!.candidateKeys, selectedCandidateKey: eventFingerprint(winningSet) },
  { entityId: resolutionEntityId(conflict!.entityId, conflict!.revision) });
  const resolved = applyEvent(forked, resolution).state;
  assert.equal(summarize(resolved, h.time()).confirmedWorkingSets,
    summarize(h.state, h.time()).confirmedWorkingSets, "choosing the replacement adds no extra work");
  assert.ok(!resolved.projection.pendingEventIds.includes(duplicate.id));
  assert.equal(recommendExercise(resolved, h.context()).prescription, undefined);
});

test("C68 Fable secondary one-set return remainder does not shrink the next visit template", () => {
  const h = establishedPress(); h.inventory = inventory(h.identity, [5, 7.5, 10]);
  h.finish(); h.now += 15 * DAY; h.open(); h.prepare();
  const original = h.issue(); h.record(original, 0, { reps: 4 }); h.now += 100_000;
  const remainder = h.issue();
  assert.deepEqual(remainder.load, lb(5)); assert.equal(remainder.targets.length, 1);
  assert.deepEqual(remainder.replacement?.setIndices, [1]);
  h.record(remainder, 0); h.next();
  const next = h.decision();
  assert.equal(next.prescription?.kind, "return");
  assert.deepEqual(next.prescription?.load, lb(5));
  assert.deepEqual(next.prescription?.targets, [8, 8]);
});

test("C56 FinalA malformed issuance metadata rejects and its referenced set stays pending", () => {
  const mutations: [string, (value: Record<string, unknown>) => void][] = [
    ["missing dependencies", p => { delete p.dependencyIds; }],
    ["string dependencies", p => { p.dependencyIds = "not-an-array"; }],
    ["missing fingerprint", p => { delete p.dependencyFingerprint; }],
    ["empty fingerprint", p => { p.dependencyFingerprint = ""; }],
    ["string provisional", p => { p.provisional = "true"; }],
    ["numeric extras flag", p => { p.extrasAllowed = 1; }],
    ["missing preparation flag", p => { delete p.preparationRequired; }],
    ["non-string source", p => { p.source = 42; }],
    ["negative recovery", p => { p.recoverySeconds = -1; }],
    ["object context", p => { p.context = { kind: "paired" }; }],
  ];
  for (const [label, mutate] of mutations) {
    const h = fresh(); const proposal = h.decision().prescription!;
    assert.ok(proposal);
    const malformed = structuredClone(proposal) as unknown as Record<string, unknown>;
    mutate(malformed);
    const issuance = h.event("prescription_issued", {
      context: h.context(), prescription: malformed, expectedStateRevision: h.state.revision,
    });
    const before = structuredClone(h.state);
    const rejected = applyEvent(h.state, issuance);
    assert.equal(rejected.status, "rejected", label);
    assert.deepEqual(rejected.state, before, label);
    const start = h.time(); h.now += 40_000;
    const referencedSet = h.event("set_recorded", {
      visitId: h.visitId, identity: h.identity, prescriptionId: proposal.id, setIndex: 0,
      role: "calibration", startedAt: start, endedAt: h.time(),
      actual: { reps: 8, load: proposal.load, completed: true, timingQuality: "measured" },
    });
    const retained = applyEvent(rejected.state, referencedSet);
    assert.equal(retained.status, "accepted", label);
    assert.ok(retained.state.projection.pendingEventIds.includes(referencedSet.id), label);
    assert.equal(retained.state.projection.sets.length, 0, label);
    const cold = replay(CONFIG, [...h.events, issuance, referencedSet], h.time());
    assert.ok(cold.projection.pendingEventIds.includes(referencedSet.id), label);
    assert.equal(cold.projection.sets.length, 0, label);
    assert.deepEqual(summarize(cold, h.time()).attendanceDates, [], label);
  }
});

test("C68 FinalB declining an unperformed restore step retains the established return load", () => {
  const h = reachLoad(20); h.inventory = inventory(h.identity, [15, 20]);
  h.finish(); h.now += 15 * DAY; h.open(); h.prepare();
  const first = h.issue(); assert.equal(first.kind, "return"); assert.deepEqual(first.load, lb(15));
  h.complete(first); h.next(); h.complete(h.issue()); h.next();
  const unperformed = h.issue(); assert.deepEqual(unperformed.load, lb(20));
  assert.equal(unperformed.kind, "return");
  h.next();
  const declined = h.decision({ declineIncrease: true });
  assert.deepEqual(declined.baseline?.load, lb(15));
  assert.equal(declined.prescription?.kind, "return");
  assert.deepEqual(declined.prescription?.load, lb(15));
  assert.deepEqual(declined.prescription?.targets, [8, 8]);
  assert.ok(!h.state.projection.sets.some(set => set.issued?.id === unperformed.id), "no fabricated20lb exposure");
  assert.deepEqual(h.decision({ declineIncrease: false }).prescription?.load, lb(20));
  h.inventory = inventory(h.identity, [10, 20]);
  assert.deepEqual(h.decision({ declineIncrease: true }).prescription?.load, lb(10), "missing15 uses an attainable lower entry, not20");
});
