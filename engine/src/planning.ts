import { CATALOG, CATALOG_VERSION, POLICY_VERSION } from "./catalog.js";
import { analyze } from "./evidence.js";
import type {
  EngineState, Identity, Inventory, PlanContext, SetView, Summary,
  Template, VariantId, VisitPlan, VisitView,
} from "./types.js";
import { clone, identityKey, instant, localDate, normalizeLoad, pounds, totalReps } from "./util.js";

const DAY = 86_400_000;
const HALF_DAY = 12 * 60 * 60 * 1000;
const EXPIRY = 6 * 60 * 60 * 1000;
type PlannedExercise = VisitPlan["exercises"][number];

/** Core precondition: public index has supplied an authority-checked, as-of projection.
 * Never replay raw events here: that would discard issuance-policy eligibility. */
function visibleSets(state: EngineState, asOf?: string): SetView[] {
  const cutoff = asOf ? instant(asOf) : state.observedAt ? instant(state.observedAt) : -Infinity;
  const excluded = new Set([
    ...state.projection.invalidEventIds, ...state.projection.ineligibleEventIds,
    ...state.projection.pendingEventIds, ...state.projection.quarantinedEventIds,
    ...state.projection.voidedEventIds,
  ]);
  const conflicted = new Set(state.projection.conflicts.map(c => c.entityId));
  const validIssues = new Set(state.projection.prescriptions.map(p => p.id));
  const eligibleStartIds = new Set(state.projection.authoritativeEvents.filter(e =>
    e.type === "visit_started" && e.payload.timeZone === state.config.timeZone && !excluded.has(e.id)
  ).map(e => e.type === "visit_started" ? e.payload.visitId : ""));
  const visitIds = new Set(state.projection.visits.filter(v => eligibleStartIds.has(v.id)).map(v => v.id));
  return state.projection.sets.filter(set =>
    instant(set.endedAt) <= cutoff && visitIds.has(set.visitId) &&
    !excluded.has(set.eventId) && !conflicted.has(set.id) &&
    (set.prescriptionId === undefined || validIssues.has(set.prescriptionId))
  );
}
function hasWork(set: SetView): boolean {
  return set.role !== "warmup" && set.actual.completed && totalReps(set.actual.reps) > 0;
}
function closedAt(visit: VisitView, now: number): string | undefined {
  if (visit.endedAt && instant(visit.endedAt) <= now) return visit.endedAt;
  const expires = instant(visit.lastActivityAt) + EXPIRY;
  return now >= expires ? new Date(expires).toISOString() : undefined;
}
function orderedVisits(state: EngineState): VisitView[] {
  return [...state.projection.visits].sort((a, b) =>
    instant(a.startedAt) - instant(b.startedAt) || a.id.localeCompare(b.id));
}
function rotation(state: EngineState, sets: SetView[], now: number): {
  due: "A" | "B"; pinned: Map<string, "A" | "B">;
} {
  const visits = orderedVisits(state).filter(v => v.setting === "gym" && instant(v.startedAt) <= now);
  const pinned = new Map<string, "A" | "B">();
  let due: "A" | "B" = "A";
  for (const date of [...new Set(visits.map(v => v.date))].sort()) {
    const today = visits.filter(v => v.date === date);
    pinned.set(date, due);
    // A manual different-template visit remains history but cannot consume a second rotation.
    if (today.some(v => v.template === due && closedAt(v, now) && sets.some(s => s.visitId === v.id && hasWork(s)))) {
      due = due === "A" ? "B" : "A";
    }
  }
  return { due, pinned };
}
function unsupported(state: EngineState): boolean {
  return state.config.policyVersion !== POLICY_VERSION || state.config.catalogVersion !== CATALOG_VERSION ||
    state.projection.unsupportedEventIds.length > 0 || state.projection.authoritativeEvents.some(e =>
      e.type === "visit_started" && e.payload.timeZone !== state.config.timeZone);
}

function completedWorkingCoverage(state: EngineState, sets: SetView[], visit: VisitView, identity: Identity): boolean {
  const key = identityKey(identity);
  const prescriptions = new Map(state.projection.prescriptions.map(p => [p.id, p]));
  const roots = state.projection.prescriptions.filter(p => p.visitId === visit.id && identityKey(p.identity) === key &&
    p.kind !== "calibration" && !p.replacement && p.targets.length >= 2 &&
    p.targets.length <= 3 && p.workingSetBudget === p.targets.length);
  return roots.some(root => {
    const slots = new Map<number, SetView[]>();
    for (const set of sets) {
      if (set.visitId !== visit.id || identityKey(set.identity) !== key ||
        (set.role !== "working" && set.role !== "return_check") || set.setIndex === undefined || !set.prescriptionId) continue;
      const issued = prescriptions.get(set.prescriptionId);
      if (!issued || issued.visitId !== visit.id || identityKey(issued.identity) !== key || issued.kind === "calibration") continue;
      let originalIndex: number | undefined;
      if (issued.id === root.id) originalIndex = set.setIndex;
      else if (issued.replacement?.rootPrescriptionId === root.id && issued.workingSetBudget === root.workingSetBudget) {
        originalIndex = issued.replacement.setIndices[set.setIndex];
      }
      if (originalIndex === undefined || originalIndex < 0 || originalIndex >= root.targets.length) continue;
      slots.set(originalIndex, [...(slots.get(originalIndex) ?? []), set]);
    }
    // Completion is slot coverage, not a claim that target reps were achieved.
    // Conflicting duplicate slots cannot be made complete by choosing one record.
    return root.targets.every((_, index) => {
      const records = slots.get(index);
      return records?.length === 1 && records[0]!.actual.completed;
    });
  });
}

/** Summary of checked facts only. Calibration/partial attendance is not full completion. */
export function summarize(state: EngineState, asOf?: string): Summary {
  const at = asOf ?? state.observedAt ?? undefined;
  const now = at ? instant(at) : -Infinity;
  const sets = visibleSets(state, at);
  const work = sets.filter(hasWork);
  const visits = orderedVisits(state).filter(v => instant(v.startedAt) <= now);
  const dates = new Set(work.map(s => visits.find(v => v.id === s.visitId)?.date).filter((d): d is string => !!d));
  let completedVisits = 0, partialVisits = 0, calibrationVisits = 0;
  for (const visit of visits) {
    if (!closedAt(visit, now)) continue;
    const performed = work.filter(s => s.visitId === visit.id);
    if (!performed.length) continue;
    const complete = visit.plannedIdentities.length > 0 && visit.plannedIdentities.every(identity =>
      completedWorkingCoverage(state, sets, visit, identity));
    if (complete) completedVisits++;
    else partialVisits++;
    if (performed.every(s => s.role === "calibration")) calibrationVisits++;
  }
  const tonnage: Record<string, number> = {};
  let bodyweightReps = 0;
  for (const set of work) {
    const cat = CATALOG[set.identity.variant];
    if (cat.loadingMode === "bodyweight") bodyweightReps += totalReps(set.actual.reps);
    else if (set.actual.load) {
      // Reporting only; never feed approximate display totals into progression.
      const machine = cat.convention === "machine" ? `:${identityKey(set.identity)}` : "";
      const key = `${cat.convention}${machine}:lb`;
      const displayedPounds = Number(normalizeLoad(set.actual.load)) / Number(pounds(1));
      tonnage[key] = (tonnage[key] ?? 0) + displayedPounds * totalReps(set.actual.reps);
    }
  }
  return {
    attendanceDates: [...dates].sort(), nextGymTemplate: rotation(state, sets, now).due,
    completedVisits, partialVisits, calibrationVisits,
    confirmedWorkingSets: sets.filter(s => (s.role === "working" || s.role === "return_check") && s.actual.completed).length,
    calibrationSets: sets.filter(s => s.role === "calibration" && s.actual.completed).length,
    bodyweightReps, externalTonnageByConvention: tonnage,
    conflicts: state.projection.conflicts.length,
    pending: new Set([...state.projection.pendingEventIds, ...state.projection.quarantinedEventIds,
      ...state.projection.unsupportedEventIds]).size,
  };
}

function currentSetCount(state: EngineState, identity: Identity, now: string): number {
  const analysis = analyze(state, identity, now);
  return Math.min(3, Math.max(2, analysis.baseline?.prescription.targets.length ?? 2));
}
function hasTwoFullExposures(state: EngineState, identity: Identity, sets: number, now: string): boolean {
  const analysis = analyze(state, identity, now);
  const vetoDates = new Set(analysis.exposures.filter(e => e.short || e.sets.some(s =>
    s.actual.pain || s.actual.controlLost || s.actual.feedback === "hard")).map(e => e.date));
  const eligible = analysis.exposures.filter(e => e.success && e.complete && !e.excluded &&
    e.prescription.targets.length === sets && !vetoDates.has(e.date));
  let previous: typeof eligible[number] | undefined;
  for (const exposure of eligible) {
    if (!previous) previous = exposure;
    else if (exposure.date !== previous.date && instant(exposure.endedAt) - instant(previous.endedAt) >= HALF_DAY) return true;
  }
  return false;
}
function latestRecovery(state: EngineState, identity: Identity, now: string): "manageable" | "unknown" | "difficult" {
  const key = identityKey(identity), time = instant(now);
  const visits = new Set(visibleSets(state, now).filter(s => identityKey(s.identity) === key && hasWork(s)).map(s => s.visitId));
  const reports = state.projection.authoritativeEvents.filter(e => e.type === "recovery_reported" &&
    visits.has(e.payload.visitId) && instant(e.occurredAt) <= time && time - instant(e.occurredAt) <= 7 * DAY);
  const latest = reports.at(-1);
  if (!latest) return "unknown";
  const tied = reports.filter(e => e.occurredAt === latest.occurredAt);
  if (tied.some(e => e.type === "recovery_reported" && e.payload.feedback === "difficult")) return "difficult";
  if (tied.some(e => e.type === "recovery_reported" && e.payload.feedback === "unknown")) return "unknown";
  return latest.type === "recovery_reported" ? latest.payload.feedback : "unknown";
}

/** Shared guard for planner and recommender; caller also checks whole-plan time. */
export function volumeChangeEligibility(state: EngineState, identity: Identity, requestedSets: number,
  now: string, visitId?: string): { allowed: boolean; reasons: string[]; currentSets: number } {
  const count = currentSetCount(state, identity, now);
  const deny = (reason: string) => ({ allowed: false, reasons: [reason], currentSets: count });
  if (!Number.isSafeInteger(requestedSets) || requestedSets < 1 || requestedSets > 3) return deny("invalid_set_count");
  if (requestedSets <= count) return { allowed: true, reasons: requestedSets === 1 ? ["shortened_no_upward_credit"] : [], currentSets: count };
  const analysis = analyze(state, identity, now, visitId);
  if (analysis.stopAt) return deny("volume_stop_unresolved");
  if (!analysis.baseline || analysis.returnMode || analysis.freshMode) return deny("volume_exposures_required");
  if (analysis.provisional || analysis.difficultyDates.length) return deny("volume_current_work_not_established");
  if (requestedSets !== count + 1) return deny("one_set_increase_only");
  if (!hasTwoFullExposures(state, identity, count, now)) return deny("volume_exposures_required");
  if (latestRecovery(state, identity, now) !== "manageable") return deny("volume_recovery_report_required");
  const visit = visitId ? state.projection.visits.find(v => v.id === visitId) : undefined;
  if (visitId && !visit) return deny("volume_visit_unknown");
  if (visit) {
    const order = [...visit.plannedIdentities].sort((a, b) => Number(CATALOG[b.variant].priority) - Number(CATALOG[a.variant].priority));
    const position = order.findIndex(i => identityKey(i) === identityKey(identity));
    if (position < 0) return deny("volume_plan_required");
    if (order.slice(0, position).some(i => currentSetCount(state, i, now) < 3)) return deny("priority_volume_first");
    const another = state.projection.prescriptions.some(p => p.visitId === visitId && identityKey(p.identity) !== identityKey(identity) &&
      p.targets.length > currentSetCount(state, p.identity, visit.startedAt));
    if (another) return deny("one_identity_volume_change_per_visit");
  }
  return { allowed: true, reasons: [], currentSets: count };
}

function inventoryFor(context: PlanContext, identity: Identity): Inventory | undefined {
  return context.inventories[identityKey(identity)];
}
function available(state: EngineState, identity: Identity, context: PlanContext): boolean {
  const cat = CATALOG[identity.variant], inventory = inventoryFor(context, identity);
  if (!inventory?.verified || !cat.equipment.every(item => inventory.equipment.includes(item))) return false;
  if (cat.loadingMode === "bodyweight") return true;
  const positive = inventory.loads.filter(load => normalizeLoad(load) > BigInt(0));
  if (!positive.length || (cat.convention === "machine" && positive.some(load => load.unit !== identity.machineUnit))) return false;
  const known = analyze(state, identity, context.now);
  if (known.baseline || known.provisional) return true;
  if (!positive.some(load => normalizeLoad(load) <= pounds(cat.starterLb ?? 0))) return false;
  if (identity.variant === "back_squat") return state.projection.authoritativeEvents.some(e =>
    e.type === "rehearsal_confirmed" && e.payload.controlled && identityKey(e.payload.identity) === identityKey(identity) &&
    instant(context.now) - instant(e.occurredAt) < 14 * DAY);
  return true;
}
function choose(state: EngineState, context: PlanContext, variants: VariantId[], used: Set<string>): Identity | undefined {
  for (const variant of variants) {
    const candidates = context.identities.filter(i => i.variant === variant).sort((a, b) => identityKey(a).localeCompare(identityKey(b)));
    const match = candidates.find(i => !used.has(identityKey(i)) && available(state, i, context));
    if (match) { used.add(identityKey(match)); return clone(match); }
  }
  return undefined;
}
function omissionCount(state: EngineState, identity: Identity, now: string): number {
  const movement = CATALOG[identity.variant].movement;
  const sets = visibleSets(state, now), time = instant(now);
  const visits = orderedVisits(state).filter(v => v.setting === "gym" && closedAt(v, time) &&
    v.plannedIdentities.some(i => CATALOG[i.variant].movement === movement));
  let count = 0;
  for (const date of [...new Set(visits.map(v => v.date))].sort()) {
    const applicable = visits.filter(v => v.date === date);
    const visitIds = new Set(applicable.map(v => v.id));
    if (sets.some(s => visitIds.has(s.visitId) && CATALOG[s.identity.variant].movement === movement && hasWork(s))) {
      count = 0; continue;
    }
    // A movement not yet calibrated was deferred, rather than silently omitted.
    if (applicable.some(v => {
      const before = analyze(state, identity, v.startedAt);
      return !!(before.baseline || before.provisional);
    })) count++;
  }
  return count;
}
function setSeconds(exercise: PlannedExercise): number {
  return exercise.identity.variant === "split_squat" || exercise.identity.variant === "loaded_split_squat" ? 75 : 40;
}
function changeSeconds(template: Template, block: number): number {
  return template === "HOME" ? 20 : block === 2 ? template === "A" ? 40 : 60 : 20;
}
export function estimatePlanSeconds(exercises: PlannedExercise[], template: Template, straight = false): number {
  if (!exercises.length) return 0;
  const blocks = [...new Set(exercises.map(e => e.block))];
  let time = template === "HOME" ? 300 + 60 * (blocks.length - 1) : 600 + 120 * (blocks.length - 1);
  for (const block of blocks) {
    const group = exercises.filter(e => e.block === block);
    if (straight || group.length === 1 || group.some(e => e.priority)) {
      group.forEach(e => { time += e.sets * setSeconds(e) + Math.max(0, e.sets - 1) * (e.priority ? 150 : 90); });
      if (group.length > 1) time += changeSeconds(template, block) * (group.length - 1);
    } else {
      const rounds = Math.max(...group.map(e => e.sets));
      for (let round = 0; round < rounds; round++) {
        const active = group.filter(e => round < e.sets);
        time += active.reduce((sum, e) => sum + setSeconds(e), 0);
        time += Math.max(0, active.length - 1) * changeSeconds(template, block);
        if (round + 1 < rounds) time += 90;
      }
    }
  }
  return time;
}

/** Structural plan only. Public wrapper supplies checkedReplay(state.events, context.now). */
export function planVisit(state: EngineState, context: PlanContext): VisitPlan {
  let template: Template = context.setting === "home" ? "HOME" : "A";
  const empty = (status: VisitPlan["status"], reason: string): VisitPlan => ({
    status, template, reasons: [reason], exercises: [], estimatedSeconds: 0, omitted: [], missingCoverage: [],
  });
  let now: number, budget: number;
  try {
    now = instant(context.now); budget = context.budgetSeconds ?? 1800;
    if (!Number.isFinite(budget) || budget < 0) return empty("hold", "invalid_time_budget");
    if (context.desiredSets !== undefined && (!Number.isSafeInteger(context.desiredSets) || context.desiredSets < 1 || context.desiredSets > 3)) return empty("hold", "invalid_set_count");
    context.identities.forEach(identityKey);
    Object.values(context.inventories).forEach(inv => inv.loads.forEach(normalizeLoad));
  } catch { return empty("needs_setup", "invalid_plan_input"); }
  if (unsupported(state)) return empty("needs_migration", "unsupported_history_configuration");
  const sets = visibleSets(state, context.now);
  const visit = context.visitId ? state.projection.visits.find(v => v.id === context.visitId) : undefined;
  if (context.visitId && !visit) return empty("hold", "visit_unknown");
  if (visit && (instant(visit.startedAt) > now || closedAt(visit, now))) return empty("hold", "visit_closed_or_time_skew");
  const date = visit?.date ?? localDate(context.now, state.config.timeZone);
  const rotations = rotation(state, sets, now);
  if (context.setting === "gym") template = rotations.pinned.get(date) ?? rotations.due;
  const slots: { choices: VariantId[]; block: number; priority: boolean; coverage: string }[] = template === "HOME" ? [
    { choices: ["wall_pushup", "knee_pushup", "incline_pushup", "floor_pushup"], block: 1, priority: false, coverage: "horizontal_push" },
    { choices: ["air_squat", "split_squat"], block: 1, priority: false, coverage: "squat" },
    { choices: ["glute_bridge", "single_leg_bridge"], block: 2, priority: false, coverage: "hinge" },
    { choices: ["dead_bug"], block: 2, priority: false, coverage: "trunk" },
  ] : template === "A" ? [
    { choices: ["goblet_squat", "back_squat", "air_squat"], block: 1, priority: true, coverage: "squat" },
    { choices: ["db_flat_press", "db_incline_press", "knee_pushup"], block: 2, priority: false, coverage: "horizontal_push" },
    { choices: ["db_supported_row"], block: 2, priority: false, coverage: "horizontal_pull" },
    { choices: ["calf_raise", "single_leg_calf", "loaded_calf_raise"], block: 3, priority: false, coverage: "calf" },
    { choices: ["dead_bug"], block: 3, priority: false, coverage: "trunk" },
  ] : [
    { choices: ["db_rdl", "glute_bridge"], block: 1, priority: true, coverage: "hinge" },
    { choices: ["db_incline_press", "db_flat_press", "knee_pushup"], block: 2, priority: false, coverage: "horizontal_push" },
    { choices: ["lat_pulldown", "db_supported_row"], block: 2, priority: false, coverage: "vertical_pull" },
    { choices: ["split_squat", "loaded_split_squat", "air_squat"], block: 3, priority: false, coverage: "squat" },
    { choices: ["dead_bug"], block: 3, priority: false, coverage: "trunk" },
  ];
  const used = new Set<string>(), missing = new Set<string>(), reasons: string[] = ["structural_plan_requires_prescription_checks"];
  const exercises: PlannedExercise[] = [];
  if (template === "HOME") missing.add("loaded_pulling_unavailable");
  for (const slot of slots) {
    const identity = choose(state, context, slot.choices, used);
    if (!identity) { missing.add(slot.coverage); continue; }
    if (CATALOG[identity.variant].movement !== slot.coverage) missing.add(slot.coverage);
    exercises.push({ identity, block: slot.block, priority: slot.priority,
      sets: context.desiredSets === 1 ? 1 : currentSetCount(state, identity, context.now) });
  }
  if (!exercises.length) return { ...empty("needs_setup", "no_available_plan"), missingCoverage: [...missing] };
  if (template !== "HOME" && (!exercises.some(e => e.priority) || exercises.filter(e => e.block === 2).length < 2)) {
    return { ...empty("needs_setup", "core_equipment_missing"), exercises, missingCoverage: [...missing], estimatedSeconds: estimatePlanSeconds(exercises, template, context.straightSets) };
  }
  if (context.desiredSets === 3) {
    const candidate = exercises.find(e => e.sets < 3);
    if (candidate) {
      const gate = volumeChangeEligibility(state, candidate.identity, candidate.sets + 1, context.now, context.visitId);
      if (gate.allowed) {
        candidate.sets++;
        if (estimatePlanSeconds(exercises, template, context.straightSets) > budget) {
          candidate.sets--; reasons.push("volume_time_budget_required");
        }
      } else reasons.push(...gate.reasons);
    }
  }
  if (template !== "HOME" && context.desiredSets !== 3) {
    const optional = choose(state, context, ["db_lateral_raise"], used);
    if (optional) exercises.push({ identity: optional, sets: 2, block: 4, priority: false });
  }
  const omissions = new Map(exercises.map(e => [identityKey(e.identity), omissionCount(state, e.identity, context.now)]));
  const originalBlockOrder = [...new Set(exercises.map(e => e.block))];
  const blockScore = (block: number) => Math.max(0, ...exercises.filter(e => e.block === block).map(e => omissions.get(identityKey(e.identity)) ?? 0));
  const orderedBlocks = [...originalBlockOrder].sort((a, b) => {
    if (exercises.some(e => e.block === a && e.priority)) return -1;
    if (exercises.some(e => e.block === b && e.priority)) return 1;
    return Number(blockScore(b) >= 2) - Number(blockScore(a) >= 2) || originalBlockOrder.indexOf(a) - originalBlockOrder.indexOf(b);
  });
  exercises.sort((a, b) => orderedBlocks.indexOf(a.block) - orderedBlocks.indexOf(b.block) ||
    Number((omissions.get(identityKey(b.identity)) ?? 0) >= 2) - Number((omissions.get(identityKey(a.identity)) ?? 0) >= 2));
  if ([...omissions.values()].some(n => n >= 2)) reasons.push("repeated_coverage_omission_promoted");
  const omitted: Identity[] = [];
  let estimate = estimatePlanSeconds(exercises, template, context.straightSets);
  if (estimate > budget) {
    for (let index = exercises.length - 1; index >= 0; index--) {
      if (exercises[index]!.block !== 4) continue;
      omitted.push(clone(exercises[index]!.identity));
      exercises.splice(index, 1);
      reasons.push("optional_movement_removed_for_time");
    }
    estimate = estimatePlanSeconds(exercises, template, context.straightSets);
  }
  while (estimate > budget && exercises.some(e => e.sets === 3)) {
    const last = [...exercises].reverse().find(e => e.sets === 3)!;
    last.sets = 2; reasons.push("extra_round_removed_for_time");
    estimate = estimatePlanSeconds(exercises, template, context.straightSets);
  }
  while (estimate > budget) {
    const index = exercises.map(e => e.block).lastIndexOf(template === "HOME" ? 2 : 3);
    if (index < 0) break;
    const item = exercises[index]!;
    if (!omitted.some(i => identityKey(i) === identityKey(item.identity))) omitted.push(clone(item.identity));
    item.sets--;
    if (item.sets === 0) { missing.add(CATALOG[item.identity.variant].movement); exercises.splice(index, 1); }
    reasons.push("secondary_work_shortened_for_time");
    estimate = estimatePlanSeconds(exercises, template, context.straightSets);
  }
  let recoverySuggestedUntil: string | undefined;
  for (const previous of orderedVisits(state)) {
    const performed = sets.filter(s => s.visitId === previous.id && hasWork(s));
    if (performed.length >= 6 && new Set(performed.map(s => identityKey(s.identity))).size >= 3) {
      const until = Math.max(...performed.map(s => instant(s.endedAt))) + 48 * 60 * 60 * 1000;
      if (until > now && (!recoverySuggestedUntil || until > instant(recoverySuggestedUntil))) recoverySuggestedUntil = new Date(until).toISOString();
    }
  }
  if (recoverySuggestedUntil) reasons.push("recovery_interval_suggested_not_locked");
  if (estimate > budget) reasons.push("insufficient_time_for_core");
  return { status: estimate > budget ? "hold" : "proposal", template, reasons: [...new Set(reasons)],
    exercises, estimatedSeconds: estimate, omitted, missingCoverage: [...missing],
    ...(recoverySuggestedUntil ? { recoverySuggestedUntil } : {}) };
}
