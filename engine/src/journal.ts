import { CATALOG, CATALOG_VERSION, POLICY_VERSION } from "./catalog.js";
import type { Actual, ApplyResult, EngineConfig, EngineEvent, EngineState, Identity, Projection, SetView, VisitView } from "./types.js";
import { clone, identityKey, instant, localDate, normalizeLoad, stableStringify, validId } from "./util.js";

export function eventFingerprint(event: EngineEvent): string {
  const { receivedAt: _receipt, ...payload } = event;
  return stableStringify(payload);
}
export function resolutionEntityId(entityId: string, revision: number): string { return `resolution:${entityId}:${revision}`; }
const own = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const assert = (condition: unknown, message: string): void => { if (!condition) throw new TypeError(message); };
function checkActual(value: Actual, identity?: Identity): void {
  assert(own(value) && typeof value.completed === "boolean", "invalid_actual");
  const validRep = (rep: unknown) => Number.isSafeInteger(rep) && (rep as number) >= 0 && (rep as number) <= 10000;
  const perSide = identity ? CATALOG[identity.variant].perSide : undefined;
  if (typeof value.reps === "number") {
    assert(validRep(value.reps) && perSide !== true, "invalid_reps");
  } else {
    assert(own(value.reps) && validRep(value.reps.left) && validRep(value.reps.right) && perSide !== false, "invalid_side_reps");
  }
  if (value.load !== null) normalizeLoad(value.load);
  assert(value.feedback === undefined || ["easy", "manageable", "hard", "unknown"].includes(value.feedback), "invalid_feedback");
  assert(value.cause === undefined || ["effort", "unknown", "equipment", "time", "interruption"].includes(value.cause), "invalid_cause");
  assert(value.timingQuality === undefined || ["measured", "reported", "unknown"].includes(value.timingQuality), "invalid_timing_quality");
  for (const name of ["pain", "controlLost", "interrupted", "shortRecovery", "preFatigued"] as const) assert(value[name] === undefined || typeof value[name] === "boolean", "invalid_flag");
  if (identity) {
    const cat = CATALOG[identity.variant];
    assert(cat.loadingMode === "bodyweight" ? value.load === null : value.load !== null, "loading_mode_mismatch");
    if (cat.convention === "machine" && value.load) assert(value.load.unit === identity.machineUnit, "machine_unit_mismatch");
  }
}

export function validateEvent(event: unknown): asserts event is EngineEvent {
  assert(own(event), "invalid_event");
  // Validate the same JSON representation that will be retained. Array holes
  // become null and must not bypass .every/.forEach checks on required fields.
  const e = JSON.parse(stableStringify(event)) as EngineEvent;
  assert(validId(e.id) && validId(e.entityId), "invalid_id");
  assert(Number.isSafeInteger(e.revision) && e.revision > 0, "invalid_revision");
  instant(e.occurredAt);
  instant(e.receivedAt);
  assert(typeof e.policyVersion === "string" && e.policyVersion.length > 0, "invalid_policy_version");
  assert(e.previousEventId === undefined || validId(e.previousEventId), "invalid_predecessor");
  assert(e.previousEventId !== e.id && !e.dependencies?.includes(e.id), "self_dependency");
  assert(e.revision === 1 ? e.previousEventId === undefined : !!e.previousEventId, "revision_predecessor_required");
  assert(e.dependencies === undefined || (Array.isArray(e.dependencies) && e.dependencies.every(validId)), "invalid_dependencies");
  assert(own(e.payload), "invalid_payload");
  // Unknown policy payloads are retained opaquely; they never supply evidence.
  if (e.policyVersion !== POLICY_VERSION) return;
  switch (e.type) {
    case "visit_started":
      assert(validId(e.payload.visitId) && e.revision === 1, "invalid_visit");
      assert(["gym", "home"].includes(e.payload.setting) && ["A", "B", "HOME"].includes(e.payload.template), "invalid_setting");
      assert((e.payload.setting === "home") === (e.payload.template === "HOME"), "template_setting_mismatch");
      assert(typeof e.payload.timeZone === "string" && e.payload.timeZone.length > 0, "training_time_zone_required");
      new Intl.DateTimeFormat("en", { timeZone: e.payload.timeZone }).format(0);
      assert(typeof e.payload.trainingDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.payload.trainingDate), "training_date_required");
      assert(localDate(e.occurredAt,e.payload.timeZone)===e.payload.trainingDate, "training_date_mismatch");
      assert(e.payload.plannedIdentities === undefined || Array.isArray(e.payload.plannedIdentities), "invalid_planned_identities");
      e.payload.plannedIdentities?.forEach(identityKey);
      break;
    case "visit_ended": assert(validId(e.payload.visitId), "invalid_visit"); break;
    case "rehearsal_confirmed":
      assert(validId(e.payload.visitId) && typeof e.payload.controlled === "boolean", "invalid_rehearsal");
      identityKey(e.payload.identity); break;
    case "preparation_confirmed":
      assert(validId(e.payload.visitId) && (e.payload.recoveryConfirmed === undefined || typeof e.payload.recoveryConfirmed === "boolean"), "invalid_visit"); identityKey(e.payload.identity); break;
    case "recovery_reported":
      assert(validId(e.payload.visitId) && ["manageable", "unknown", "difficult"].includes(e.payload.feedback), "invalid_recovery_report"); break;
    case "movement_stopped":
      assert(validId(e.payload.visitId) && ["pain", "control_loss"].includes(e.payload.reason), "invalid_movement_stop"); identityKey(e.payload.identity); break;
    case "stop_resolved":
      assert(validId(e.payload.visitId) && e.payload.acknowledged === true && Array.isArray(e.payload.stopEventIds) && e.payload.stopEventIds.length > 0 && e.payload.stopEventIds.every(validId), "invalid_resolution"); identityKey(e.payload.identity); break;
    case "prescription_issued": {
      const p = e.payload.prescription;
      assert(own(p) && validId(p.id) && validId(p.visitId), "invalid_prescription");
      identityKey(p.identity); instant(p.issuedAt);
      assert(Array.isArray(p.dependencyIds) && p.dependencyIds.every(validId), "invalid_prescription_dependencies");
      assert(typeof p.dependencyFingerprint === "string" && p.dependencyFingerprint.length > 0, "invalid_dependency_fingerprint");
      assert(typeof p.source === "string" && p.source.length > 0
        && typeof p.provisional === "boolean" && typeof p.extrasAllowed === "boolean"
        && typeof p.preparationRequired === "boolean" && Number.isFinite(p.recoverySeconds) && p.recoverySeconds >= 0
        && ["paired", "straight"].includes(p.context), "invalid_prescription_metadata");
      assert(p.policyVersion === POLICY_VERSION && Array.isArray(p.targets) && p.targets.length > 0 && p.targets.length <= 10, "invalid_targets");
      assert(p.targets.every(n => Number.isSafeInteger(n) && n >= CATALOG[p.identity.variant].floor && n <= CATALOG[p.identity.variant].ceiling), "invalid_target_range");
      assert(Array.isArray(p.roles) && p.roles.length === p.targets.length && p.roles.every(r => ["working", "calibration", "return_check", "warmup"].includes(r)), "invalid_roles");
      assert(["working", "calibration", "return"].includes(p.kind), "invalid_prescription_kind");
      assert(Number.isSafeInteger(p.workingSetBudget) && (p.kind === "calibration"
        ? p.workingSetBudget === 0 && p.targets.length === 1
        : p.workingSetBudget >= 1 && p.workingSetBudget <= 3 && p.targets.length <= p.workingSetBudget), "invalid_working_set_budget");
      if(p.replacement !== undefined) {
        assert(own(p.replacement) && p.kind !== "calibration" && validId(p.replacement.rootPrescriptionId)
          && p.replacement.rootPrescriptionId !== p.id && Array.isArray(p.replacement.setIndices)
          && p.replacement.setIndices.length === p.targets.length
          && p.replacement.setIndices.every(index => Number.isSafeInteger(index) && index >= 0 && index < p.workingSetBudget)
          && new Set(p.replacement.setIndices).size === p.replacement.setIndices.length, "invalid_replacement_slots");
      }
      assert(Number.isSafeInteger(e.payload.expectedStateRevision) && e.payload.expectedStateRevision >= 0, "invalid_state_revision");
      if (p.load !== null) normalizeLoad(p.load);
      assert(CATALOG[p.identity.variant].loadingMode === "bodyweight" ? p.load === null : p.load !== null && normalizeLoad(p.load) > 0, "loading_mode_mismatch");
      assert(own(e.payload.context) && e.payload.context.visitId === p.visitId && identityKey(e.payload.context.identity) === identityKey(p.identity), "prescription_context_mismatch");
      instant(e.payload.context.now);
      break;
    }
    case "set_recorded":
      assert(validId(e.payload.visitId) && e.revision === 1, "invalid_set"); identityKey(e.payload.identity);
      assert(["working", "calibration", "return_check", "warmup"].includes(e.payload.role), "invalid_role");
      assert(instant(e.payload.endedAt) >= instant(e.payload.startedAt) && instant(e.occurredAt) >= instant(e.payload.endedAt), "reversed_set_time");
      assert(e.payload.prescriptionId === undefined || (typeof e.payload.prescriptionId === "string" && Number.isSafeInteger(e.payload.setIndex) && (e.payload.setIndex ?? -1) >= 0), "invalid_prescription_reference");
      checkActual(e.payload.actual, e.payload.identity); break;
    case "set_corrected":
      assert(e.revision > 1 && Object.keys(e.payload).every(k => k === "actual"), "immutable_set_fields");
      checkActual(e.payload.actual); break;
    case "event_voided":
      assert(validId(e.payload.targetEventId) && e.payload.targetEventId !== e.id && typeof e.payload.reason === "string" && e.payload.reason.trim().length > 0, "invalid_void");
      break;
    case "conflict_resolved":
      assert(validId(e.payload.targetEntityId) && Number.isSafeInteger(e.payload.targetRevision) && e.payload.targetRevision > 0, "invalid_conflict_target");
      assert(e.entityId === resolutionEntityId(e.payload.targetEntityId, e.payload.targetRevision), "resolution_entity_required");
      assert(Array.isArray(e.payload.expectedCandidateKeys) && e.payload.expectedCandidateKeys.length >= 2 && e.payload.expectedCandidateKeys.every(v => typeof v === "string"), "invalid_conflict_candidates");
      assert(e.payload.expectedCandidateKeys.includes(e.payload.selectedCandidateKey), "invalid_selected_candidate");
      break;
    default: throw new TypeError("unknown_event_type");
  }
}

function project(config: EngineState["config"], events: EngineEvent[], asOf?: string): Projection {
  const observed=asOf ? instant(asOf) : Math.max(-Infinity,...events.map(e=>instant(e.receivedAt)));
  const quarantinedEventIds = events.filter(e => instant(e.occurredAt) > instant(e.receivedAt) + 5*60000).map(e => e.id).sort();
  const futureEventIds=events.filter(e=>instant(e.occurredAt)>observed && !quarantinedEventIds.includes(e.id)).map(e=>e.id);
  const notQuarantined = events.filter(e => !quarantinedEventIds.includes(e.id) && !futureEventIds.includes(e.id));
  const supported = notQuarantined.filter(e => e.policyVersion === POLICY_VERSION);
  const unsupportedEventIds = events.filter(e => e.policyVersion !== POLICY_VERSION).map(e => e.id).sort();
  const groups = new Map<string, EngineEvent[]>();
  const groupKey = (entity: string, revision: number) => JSON.stringify([entity, revision]);
  for (const e of supported) {
    const key = groupKey(e.entityId, e.revision);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const actualGroupKeys=[...groups.keys()];
  const conflicts = new Map<string, Projection["conflicts"][number]>();
  const pending = new Set<string>(futureEventIds);
  const invalid = new Set<string>();
  const losingGroups = new Set<string>();
  const cache = new Map<string, EngineEvent | null>();
  const visiting = new Set<string>();
  const idGroups = new Map<string, EngineEvent[]>();
  for (const e of supported) idGroups.set(e.id, [...(idGroups.get(e.id) ?? []), e]);
  const globalAlias = new Map<string,string>();
  const logicalAlias = new Map<string,string>();
  for (const [id, candidates] of idGroups) {
    if (new Set(candidates.map(e => groupKey(e.entityId, e.revision))).size > 1) {
      const alias=groupKey(`event:${id}`,1); groups.set(alias,candidates); globalAlias.set(id,alias);
    }
  }
  const logicalGroups=new Map<string,EngineEvent[]>();
  const prescriptionShape=(p:Extract<EngineEvent,{type:"prescription_issued"}>["payload"]["prescription"])=>{
    const {issuedAt:_issuedAt,...content}=p; return stableStringify(content);
  };
  const uniquePrescription=(id:string)=>{
    const candidates=supported.filter((e):e is Extract<EngineEvent,{type:"prescription_issued"}>=>e.type==="prescription_issued"&&e.payload.prescription.id===id).map(e=>e.payload.prescription);
    return candidates.length&&candidates.every(p=>prescriptionShape(p)===prescriptionShape(candidates[0]!))?candidates[0]:undefined;
  };
  const replacementMatches=(p:Extract<EngineEvent,{type:"prescription_issued"}>["payload"]["prescription"],root:typeof p)=>
    !!p.replacement&&!root.replacement&&root.kind!=="calibration"&&p.visitId===root.visitId&&identityKey(p.identity)===identityKey(root.identity)
    &&p.workingSetBudget===root.workingSetBudget&&p.replacement.setIndices.every(index=>index<root.targets.length);
  for (const e of supported) {
    let logical=e.type === "visit_started" ? `visit:${e.payload.visitId}` : e.type === "set_recorded" && e.payload.prescriptionId !== undefined ? `slot:${e.payload.prescriptionId}:${e.payload.setIndex}` : undefined;
    if(e.type==="set_recorded"&&e.payload.prescriptionId!==undefined) {
      const p=uniquePrescription(e.payload.prescriptionId);
      const root=p?.replacement?uniquePrescription(p.replacement.rootPrescriptionId):undefined;
      const slot=p?.replacement?.setIndices[e.payload.setIndex??-1];
      if(p&&root&&slot!==undefined&&replacementMatches(p,root))logical=`slot:${root.id}:${slot}`;
    }
    if (logical) logicalGroups.set(logical,[...(logicalGroups.get(logical)??[]),e]);
  }
  for (const [logical,candidates] of logicalGroups) if (new Set(candidates.map(e=>e.entityId)).size>1) {
    const alias=groupKey(logical,1); groups.set(alias,candidates);
    for (const e of candidates) logicalAlias.set(eventFingerprint(e),alias);
  }
  function pick(key: string): EngineEvent | null {
    if (cache.has(key)) return cache.get(key) ?? null;
    if (visiting.has(key)) return null;
    visiting.add(key);
    const candidates = groups.get(key) ?? [];
    let choice: EngineEvent | undefined;
    const [entity,groupRevision]=JSON.parse(key) as [string,number];
    if (candidates.length === 1) choice = candidates[0];
    else if (candidates.length > 1) {
      const keys = candidates.map(eventFingerprint).sort();
      const resolutionId = resolutionEntityId(entity, groupRevision);
      const revisions = [...groups.values()].filter(g => g[0]?.entityId === resolutionId).map(g => g[0]!.revision).sort((a,b) => b-a);
      for (const revision of revisions) {
        const resolution = pick(groupKey(resolutionId, revision));
        if (resolution?.type !== "conflict_resolved") continue;
        if (stableStringify([...resolution.payload.expectedCandidateKeys].sort()) !== stableStringify(keys)) continue;
        if (candidates.some(e => instant(e.occurredAt) > instant(resolution.occurredAt))) continue;
        choice = candidates.find(e => eventFingerprint(e) === resolution.payload.selectedCandidateKey);
        break;
      }
      if (!choice) conflicts.set(key, { entityId: entity, revision: groupRevision, candidateKeys: keys });
    }
    if (choice && groupKey(choice.entityId,choice.revision)===key) {
      for (const alias of [globalAlias.get(choice.id),logicalAlias.get(eventFingerprint(choice))]) if (alias && alias!==key) {
        const selected=pick(alias);
        if (!selected) { pending.add(choice.id); choice=undefined; break; }
        if (eventFingerprint(selected)!==eventFingerprint(choice)) {
          losingGroups.add(key);
          // A globally reused event ID can name both candidates. Do not mark
          // the selected candidate's shared ID invalid with the losing one.
          if(selected.id!==choice.id)invalid.add(choice.id);
          choice=undefined; break;
        }
      }
    }
    if (choice && choice.revision > 1) {
      const predecessor = pick(groupKey(choice.entityId, choice.revision - 1));
      if (!predecessor || predecessor.id !== choice.previousEventId) {
        if(losingGroups.has(groupKey(choice.entityId,choice.revision-1))||invalid.has(choice.previousEventId!)||(predecessor&&supported.some(e=>e.id===choice!.previousEventId)))invalid.add(choice.id);
        else pending.add(choice.id);
        choice = undefined;
      } else if (instant(choice.occurredAt) < instant(predecessor.occurredAt)) {
        invalid.add(choice.id); choice = undefined;
      } else if ((choice.type === "set_corrected" && predecessor.type !== "set_recorded" && predecessor.type !== "set_corrected") || (choice.type === "event_voided" && (predecessor.type !== "event_voided" || predecessor.payload.targetEventId !== choice.payload.targetEventId))) {
        invalid.add(choice.id); choice=undefined;
      }
    }
    visiting.delete(key); cache.set(key, choice ?? null); return choice ?? null;
  }
  let authoritative = [...new Map(actualGroupKeys.map(pick).filter((e): e is EngineEvent => e !== null).map(e=>[eventFingerprint(e),e])).values()];
  // A causal event never becomes evidence merely because its envelope arrived.
  let changed = true;
  while (changed) {
    changed = false;
    const ids = new Set(authoritative.map(e => e.id));
    const visits = new Map(authoritative.filter(e => e.type === "visit_started").map(e => [e.payload.visitId, e]));
    const prescriptions = new Map(authoritative.filter(e => e.type === "prescription_issued").map(e => [e.payload.prescription.id, e]));
    authoritative = authoritative.filter(e => {
      let unresolved = e.dependencies?.some(id => !ids.has(id)) ?? false;
      const visitId = "visitId" in e.payload ? e.payload.visitId : e.type === "prescription_issued" ? e.payload.prescription.visitId : undefined;
      if (typeof visitId === "string" && e.type !== "visit_started") {
        const visit = visits.get(visitId);
        if (!visit) unresolved = true;
        else if (instant(e.occurredAt) < instant(visit.occurredAt)) { invalid.add(e.id); changed = true; return false; }
      }
      if (e.type === "set_recorded" && e.payload.prescriptionId) {
        const issue = prescriptions.get(e.payload.prescriptionId);
        if (!issue) unresolved = true;
        else {
          const p = issue.payload.prescription;
          if (p.visitId !== e.payload.visitId || identityKey(p.identity) !== identityKey(e.payload.identity) || p.roles[e.payload.setIndex ?? -1] !== e.payload.role || instant(e.payload.startedAt) < instant(issue.occurredAt)) {
            invalid.add(e.id); changed = true; return false;
          }
        }
      }
      if(e.type==="prescription_issued"&&e.payload.prescription.replacement) {
        const p=e.payload.prescription,root=prescriptions.get(p.replacement!.rootPrescriptionId);
        if(!root)unresolved=true;
        else if(!replacementMatches(p,root.payload.prescription)||instant(e.occurredAt)<instant(root.occurredAt)) {
          invalid.add(e.id);changed=true;return false;
        }
      }
      if (e.type === "set_corrected" && !ids.has(e.previousEventId!)) unresolved = true;
      if (e.type === "event_voided" && !events.some(target => target.id === e.payload.targetEventId)) unresolved = true;
      if (e.type === "stop_resolved" && e.payload.stopEventIds.some(id => !events.some(target => target.id === id))) unresolved = true;
      if (e.type === "conflict_resolved") {
        const group = groups.get(groupKey(e.payload.targetEntityId, e.payload.targetRevision));
        if (!group || group.length < 2 || stableStringify(group.map(eventFingerprint).sort()) !== stableStringify([...e.payload.expectedCandidateKeys].sort())) unresolved = true;
      }
      if (unresolved) {
        if((e.previousEventId&&invalid.has(e.previousEventId))||e.dependencies?.some(id=>invalid.has(id)))invalid.add(e.id);
        else pending.add(e.id);
        changed = true; return false;
      }
      return true;
    });
  }
  const voidedEventIds = [...new Set(authoritative.filter(e => e.type === "event_voided" && events.some(target=>target.id===e.payload.targetEventId && target.type!=="event_voided")).map(e => e.type === "event_voided" ? e.payload.targetEventId : ""))].sort();
  authoritative=authoritative.filter(e=>!voidedEventIds.includes(e.id));
  changed=true;
  while(changed) {
    changed=false; const ids=new Set(authoritative.map(e=>e.id));
    const visitIds=new Set(authoritative.filter(e=>e.type==="visit_started").map(e=>e.payload.visitId));
    const prescriptionIds=new Set(authoritative.filter(e=>e.type==="prescription_issued").map(e=>e.payload.prescription.id));
    authoritative=authoritative.filter(e=>{
      if(e.type==="event_voided" || e.type==="conflict_resolved") return true;
      const visitId="visitId" in e.payload?e.payload.visitId:e.type==="prescription_issued"?e.payload.prescription.visitId:undefined;
      const missingVisit=typeof visitId==="string"&&e.type!=="visit_started"&&!visitIds.has(visitId);
      const missingIssue=e.type==="set_recorded"&&e.payload.prescriptionId!==undefined&&!prescriptionIds.has(e.payload.prescriptionId);
      if(missingVisit||missingIssue||(e.previousEventId&&!ids.has(e.previousEventId)) || e.dependencies?.some(id=>!ids.has(id))) {
        if((e.previousEventId&&(invalid.has(e.previousEventId)||voidedEventIds.includes(e.previousEventId)))||e.dependencies?.some(id=>invalid.has(id)||voidedEventIds.includes(id)))invalid.add(e.id);
        else pending.add(e.id);
        changed=true;return false;
      }
      return true;
    });
  }
  authoritative.sort((a,b) => instant(a.occurredAt)-instant(b.occurredAt) || a.entityId.localeCompare(b.entityId) || a.revision-b.revision || a.id.localeCompare(b.id));
  const visitMap = new Map<string, VisitView>();
  for (const e of authoritative) if (e.type === "visit_started") {
    if (visitMap.has(e.payload.visitId)) { invalid.add(e.id); continue; }
    visitMap.set(e.payload.visitId, { id: e.payload.visitId, setting: e.payload.setting, template: e.payload.template,
      startedAt: e.occurredAt, date: e.payload.trainingDate, lastActivityAt: e.occurredAt,
      plannedIdentities: clone(e.payload.plannedIdentities ?? []) });
  }
  const prescriptions = authoritative.filter(e => e.type === "prescription_issued").map(e => clone(e.payload.prescription));
  const prescriptionMap = new Map(prescriptions.map(p => [p.id,p]));
  const sets = new Map<string, SetView>();
  for (const e of authoritative) {
    if (invalid.has(e.id)) continue;
    const visitId = "visitId" in e.payload ? e.payload.visitId : e.type === "prescription_issued" ? e.payload.prescription.visitId : undefined;
    const visit = typeof visitId === "string" ? visitMap.get(visitId) : undefined;
    if (visit && e.type !== "set_corrected") {
      const activityAt = e.type === "set_recorded" ? e.payload.endedAt : e.occurredAt;
      const workEvent=e.type==="set_recorded"||e.type==="rehearsal_confirmed"||e.type==="preparation_confirmed"||e.type==="prescription_issued";
      const starts=e.type==="set_recorded"?instant(e.payload.startedAt):instant(e.occurredAt);
      const expires=instant(visit.lastActivityAt)+6*3600000;
      if(workEvent&&(visit.endedAt&&starts>instant(visit.endedAt)||starts>=expires)) {
        visit.endedAt??=new Date(expires).toISOString(); invalid.add(e.id); continue;
      }
      const actualActivity=e.type==="set_recorded"&&e.payload.actual.completed||e.type==="rehearsal_confirmed"||e.type==="preparation_confirmed";
      if(actualActivity&&instant(activityAt)>instant(visit.lastActivityAt))visit.lastActivityAt=activityAt;
    }
    if (e.type === "visit_ended" && visit) visit.endedAt ??= new Date(Math.min(instant(e.occurredAt),instant(visit.lastActivityAt)+6*3600000)).toISOString();
    if (e.type === "set_recorded") {
      const issued = e.payload.prescriptionId ? prescriptionMap.get(e.payload.prescriptionId) : undefined;
      sets.set(e.entityId, { id: e.entityId, eventId: e.id, revision: e.revision, visitId: e.payload.visitId,
        identity: clone(e.payload.identity), prescriptionId: e.payload.prescriptionId, setIndex: e.payload.setIndex,
        role: e.payload.role, startedAt: e.payload.startedAt, endedAt: e.payload.endedAt,
        actual: clone(e.payload.actual), originalActual: clone(e.payload.actual), issued: issued ? clone(issued) : undefined, dependencyChanged: false, policyEligible:!!issued });
    }
    if (e.type === "set_corrected") {
      const set = sets.get(e.entityId);
      if (!set) { pending.add(e.id); continue; }
      try { checkActual(e.payload.actual,set.identity); }
      catch { invalid.add(e.id); continue; }
      set.actual = clone(e.payload.actual); set.revision = e.revision; set.eventId = e.id;
    }
  }
  const correctedEntities = new Set([...sets.values()].filter(s => s.revision > 1).map(s => s.id));
  const corrected = new Set([...correctedEntities,...events.filter(e=>correctedEntities.has(e.entityId)).map(e=>e.id)]);
  for (const s of sets.values()) s.dependencyChanged = s.issued?.dependencyIds.some(id => corrected.has(id) && id !== s.id) ?? false;
  const eligiblePrescriptions=prescriptions.filter(p=>authoritative.some(e=>e.type==="prescription_issued"&&e.payload.prescription.id===p.id&&!invalid.has(e.id)));
  const eligibleIds=new Set(eligiblePrescriptions.map(p=>p.id));
  for(const set of sets.values())if(set.prescriptionId&&!eligibleIds.has(set.prescriptionId))set.policyEligible=false;
  return { visits: [...visitMap.values()], sets: [...sets.values()].sort((a,b) => instant(a.endedAt)-instant(b.endedAt) || a.id.localeCompare(b.id)),
    prescriptions:eligiblePrescriptions, authoritativeEvents: authoritative.filter(e => !invalid.has(e.id)), conflicts: [...conflicts.values()].sort((a,b) => a.entityId.localeCompare(b.entityId) || a.revision-b.revision),
    pendingEventIds: [...pending].filter(id=>!voidedEventIds.includes(id)&&!invalid.has(id)).sort(), unsupportedEventIds, invalidEventIds: [...invalid].sort(), quarantinedEventIds:quarantinedEventIds.filter(id=>!voidedEventIds.includes(id)), voidedEventIds, ineligibleEventIds:[...invalid].sort() };
}

export function createState(config: EngineConfig): EngineState {
  if (!config || typeof config.timeZone !== "string") throw new TypeError("training_time_zone_required");
  new Intl.DateTimeFormat("en", { timeZone: config.timeZone }).format(0);
  const resolved = { timeZone: config.timeZone, policyVersion: config.policyVersion ?? POLICY_VERSION, catalogVersion: config.catalogVersion ?? CATALOG_VERSION };
  return { config: resolved, events: [], revision: 0, observedAt:null, projection: project(resolved,[]) };
}

export function replay(config: EngineConfig, events: EngineEvent[], asOf?: string): EngineState {
  if(asOf) instant(asOf);
  const state = createState(config);
  const unique = new Map<string, EngineEvent>();
  for (const event of events) {
    try {
      validateEvent(event);
      const key=eventFingerprint(event), previous=unique.get(key);
      if (!previous || instant(event.receivedAt) < instant(previous.receivedAt)) unique.set(key,JSON.parse(stableStringify(event)) as EngineEvent);
    } catch { /* Rejected envelopes never enter the journal. */ }
  }
  state.events = [...unique.values()].sort((a,b) => eventFingerprint(a).localeCompare(eventFingerprint(b)));
  state.revision = state.events.length;
  state.observedAt=asOf ?? [...state.events].sort((a,b)=>instant(a.receivedAt)-instant(b.receivedAt)).at(-1)?.receivedAt ?? null;
  state.projection = project(state.config,state.events,state.observedAt??undefined);
  return state;
}

export function appendEvent(state: EngineState, event: unknown): ApplyResult {
  try { validateEvent(event); } catch (error) { return { status: "rejected", reasons: [(error as Error).message], state: clone(state) }; }
  if (state.events.some(e => eventFingerprint(e) === eventFingerprint(event))) return { status: "duplicate", reasons: ["identical_event"], state: replay(state.config,[...state.events,event]) };
  const next = replay(state.config,[...state.events,event]);
  const conflicting = next.projection.conflicts.some(c => c.entityId === event.entityId || c.candidateKeys.includes(eventFingerprint(event)));
  return { status: conflicting ? "conflict" : "accepted", reasons: conflicting ? ["conflicting_revision"] : next.projection.quarantinedEventIds.includes(event.id) ? ["quarantined_clock"] : next.projection.invalidEventIds.includes(event.id) ? ["ineligible_causal_event"] : next.projection.pendingEventIds.includes(event.id) ? ["pending_predecessor"] : event.policyVersion !== POLICY_VERSION ? ["opaque_policy_version"] : [], state: next };
}
