import { CATALOG, CATALOG_VERSION, POLICY_VERSION } from "./catalog.js";
import { activeStops, analyze, excluded, isPolicyWork, preparedAt, setMatchesIssue, type Analysis, type Established } from "./evidence.js";
import type { Decision, EngineEvent, EngineState, Identity, Inventory, Load, Prescription, RecommendationContext } from "./types.js";
import { atMostPercent, clone, contentDigest, identityKey, instant, minReps, normalizeLoad, pounds, prescriptionKey, sameLoad, stableStringify, withinPercent } from "./util.js";
import { volumeChangeEligibility } from "./planning.js";

export function relevantEvents(state:EngineState,identity:Identity,visitId:string):EngineEvent[] {
  const key=identityKey(identity), family=CATALOG[identity.variant].movement;
  const setEntities=new Set(state.events.filter(e=>e.type==="set_recorded"&&identityKey(e.payload.identity)===key).map(e=>e.entityId));
  const relevantVisits=new Set(state.events.filter(e=>e.type==="set_recorded"&&identityKey(e.payload.identity)===key).map(e=>e.type==="set_recorded"?e.payload.visitId:""));
  relevantVisits.add(visitId);
  const related=(e:EngineEvent,seen=new Set<string>()):boolean=>{
    if(seen.has(e.id))return false;seen.add(e.id);
    if("identity" in e.payload) return identityKey(e.payload.identity)===key || ((e.type==="stop_resolved"||e.type==="movement_stopped")&&CATALOG[e.payload.identity.variant].movement===family) || (e.type==="set_recorded"&&(e.payload.actual.pain||e.payload.actual.controlLost)===true&&CATALOG[e.payload.identity.variant].movement===family) || ("visitId" in e.payload&&e.payload.visitId===visitId);
    if(e.type==="prescription_issued") return identityKey(e.payload.prescription.identity)===key||e.payload.prescription.visitId===visitId;
    if(e.type==="set_corrected") return setEntities.has(e.entityId);
    if("visitId" in e.payload) return relevantVisits.has(e.payload.visitId);
    if(e.type==="event_voided")return state.events.some(target=>target.id===e.payload.targetEventId&&related(target,new Set(seen)));
    if(e.type==="conflict_resolved")return state.events.some(target=>(target.entityId===e.payload.targetEntityId||e.payload.expectedCandidateKeys.includes(logicalFingerprint(target)))&&related(target,new Set(seen)));
    return false;
  };
  return state.projection.authoritativeEvents.filter(e=>related(e));
}
export function logicalFingerprint(event:EngineEvent):string {
  const {receivedAt:_receipt,...logical}=event; return stableStringify(logical);
}
export function prescriptionContent(p:Prescription):unknown {
  const {id:_id,issuedAt:_time,...content}=p; return content;
}
export function inventoryLoads(identity:Identity,inventory:Inventory):Load[] {
  if(!inventory||inventory.verified!==true||!Array.isArray(inventory.loads)||!Array.isArray(inventory.equipment)) throw new TypeError("unverified_inventory");
  const cat=CATALOG[identity.variant];
  if(cat.equipment.some(item=>!inventory.equipment.includes(item))) throw new TypeError("equipment_unavailable");
  const loads=new Map<string,Load>();
  for(const load of inventory.loads) {
    const norm=normalizeLoad(load); if(norm<=BigInt(0)) throw new TypeError("nonpositive_inventory_load");
    if(cat.convention==="machine"&&load.unit!==identity.machineUnit) throw new TypeError("machine_unit_mismatch");
    const key=norm.toString(),existing=loads.get(key);
    if(!existing||load.unit.localeCompare(existing.unit)<0) loads.set(key,clone(load));
  }
  return [...loads.values()].sort((a,b)=>normalizeLoad(a)<normalizeLoad(b)?-1:normalizeLoad(a)>normalizeLoad(b)?1:0);
}
export function recommendationCore(state:EngineState,context:RecommendationContext):Decision {
  const plain=(status:Decision["status"],...reasons:string[]):Decision=>({status,reasons,prerequisites:[],stateRevision:state.revision});
  let now:number,key:string;
  try {now=instant(context.now);key=identityKey(context.identity);} catch(error) {return plain("needs_setup",(error as Error).message);}
  const cat=CATALOG[context.identity.variant];
  if(state.config.policyVersion!==POLICY_VERSION||state.config.catalogVersion!==CATALOG_VERSION||state.projection.unsupportedEventIds.length||state.events.some(e=>e.type==="visit_started"&&e.payload.timeZone!==state.config.timeZone)) return plain("needs_migration","unsupported_version_or_training_zone");
  const touches=(event:EngineEvent):boolean=>{
    if("identity" in event.payload) return identityKey(event.payload.identity)===key;
    if(event.type==="prescription_issued") return identityKey(event.payload.prescription.identity)===key;
    if(event.type==="set_corrected") return state.events.some(e=>e.type==="set_recorded"&&e.entityId===event.entityId&&identityKey(e.payload.identity)===key);
    return "visitId" in event.payload&&event.payload.visitId===context.visitId;
  };
  if(state.projection.conflicts.some(c=>state.events.some(e=>c.candidateKeys.includes(logicalFingerprint(e))&&touches(e)))) return plain("hold","unresolved_conflict");
  const stops=activeStops(state,context.identity,context.now,context.visitId);
  if(stops.length) return {...plain("stop","pain_or_control_loss_latched"),stopEventIds:stops,prerequisites:["resolve_stop_sources","fresh_preparation"]};
  const visit=state.projection.visits.find(v=>v.id===context.visitId);
  if(!visit) {
    if(state.events.some(e=>e.type==="visit_started"&&e.payload.visitId===context.visitId&&instant(e.occurredAt)>now))return plain("hold","affected_time_skew");
    return plain("needs_setup","visit_required");
  }
  if(state.projection.quarantinedEventIds.some(id=>state.events.some(e=>e.id===id&&touches(e)))) return plain("hold","affected_clock_quarantine");
  if(state.projection.pendingEventIds.some(id=>state.events.some(e=>e.id===id&&touches(e)))) return plain("hold","pending_reference_or_time");
  if(now<instant(visit.startedAt)||now<instant(visit.lastActivityAt)) return plain("hold","affected_time_skew");
  if(visit.endedAt) return plain("hold","visit_closed");
  if(now-instant(visit.lastActivityAt)>=6*3600000) return plain("hold","visit_expired_close_partial");
  if(now-instant(visit.lastActivityAt)>=30*60000) return {...plain("needs_calibration","renew_preparation"),prerequisites:["fresh_preparation"]};
  let loads:Load[];
  try {loads=inventoryLoads(context.identity,context.inventory);} catch(error) {return {...plain("needs_setup",(error as Error).message),alternatives:cat.alternatives};}
  const a=analyze(state,context.identity,context.now,context.visitId);
  if(context.assessManualLoad!==undefined) {
    try {normalizeLoad(context.assessManualLoad);} catch {return plain("hold","invalid_manual_load");}
    if(cat.convention==="machine"&&context.assessManualLoad.unit!==context.identity.machineUnit)return plain("hold","manual_machine_unit_mismatch");
    const observed=state.projection.sets.some(s=>identityKey(s.identity)===key&&s.actual.completed&&minReps(s.actual.reps)>0&&sameLoad(s.actual.load,context.assessManualLoad!)&&!s.actual.pain&&!s.actual.controlLost&&!s.actual.interrupted);
    if(!observed)return {...plain("hold","matching_manual_observation_required"),baseline:a.baseline?{load:clone(a.baseline.prescription.load),targets:[...a.baseline.prescription.targets],establishedAt:a.baseline.at}:undefined};
  }
  const rehearsal=state.projection.authoritativeEvents.filter(e=>e.type==="rehearsal_confirmed"&&identityKey(e.payload.identity)===key&&instant(e.occurredAt)<=now).at(-1);
  const requireThisVisit=!a.baseline||a.returnMode||a.freshMode;
  if(rehearsal?.type!=="rehearsal_confirmed"||!rehearsal.payload.controlled||now-instant(rehearsal.occurredAt)>=14*86400000||(requireThisVisit&&rehearsal.payload.visitId!==visit.id)) return {...plain("needs_calibration","controlled_rehearsal_required"),prerequisites:["controlled_unloaded_rehearsal"],alternatives:cat.alternatives};
  const prep=preparedAt(state,visit.id,context.identity,context.now);
  if(!prep) return {...plain("needs_calibration","preparation_required"),prerequisites:["fresh_preparation"]};
  const remaining=context.remainingSeconds??Math.max(0,1800-(now-instant(visit.startedAt))/1000);
  if(!Number.isFinite(remaining)||remaining<0) return plain("hold","invalid_time_budget");
  const requested=context.plannedSets??(a.returnMode?2:a.provisional?.targets.length??a.baseline?.prescription.targets.length??2);
  if(!Number.isSafeInteger(requested)||requested<1||requested>3||(requested===1&&!context.shortened)) return plain("hold","invalid_set_count");
  const causal=relevantEvents(state,context.identity,visit.id);
  const fingerprint=contentDigest(causal.map(logicalFingerprint).sort());
  const baselineInfo=a.baseline?{load:clone(a.baseline.prescription.load),targets:[...a.baseline.prescription.targets],establishedAt:a.baseline.at}:undefined;
  const todayIssues=state.projection.prescriptions.filter(p=>p.visitId===visit.id&&identityKey(p.identity)===key);
  const firstWorking=todayIssues.find(p=>p.kind!=="calibration");
  const approvedRoot=firstWorking?state.projection.prescriptions.find(p=>p.id===(firstWorking.replacement?.rootPrescriptionId??firstWorking.id)):undefined;
  const spentWorking=a.currentSets.filter(s=>(s.role==="working"||s.role==="return_check")&&s.actual.completed).length;
  const remainingSlots=(root:Prescription):number[]=>{
    const used=new Set<number>();
    for(const set of a.currentSets) {
      if(!set.actual.completed||!set.prescriptionId)continue;
      const issued=state.projection.prescriptions.find(p=>p.id===set.prescriptionId);
      if(!issued)continue;
      if(issued.id===root.id&&set.setIndex!==undefined)used.add(set.setIndex);
      else if(issued.replacement?.rootPrescriptionId===root.id&&set.setIndex!==undefined) {
        const slot=issued.replacement.setIndices[set.setIndex];if(slot!==undefined)used.add(slot);
      }
    }
    return root.targets.map((_,i)=>i).filter(i=>!used.has(i));
  };
  const make=(load:Load|null,requestedTargets:number[],source:string,kind:Prescription["kind"]="working",reasons:string[]=[]):Decision=>{
    if(load!==null&&!loads.some(entry=>sameLoad(entry,load)))return {...plain("needs_setup","prescription_load_unavailable"),alternatives:cat.alternatives};
    let targets=[...requestedTargets];
    const budget=kind==="calibration"?0:approvedRoot?.workingSetBudget??approvedRoot?.targets.length??targets.length;
    let replacement:Prescription["replacement"];
    if(kind!=="calibration") {
      const capacity=budget-spentWorking;
      if(capacity<=0)return plain("hold","working_set_budget_complete");
      if(approvedRoot) {
        if(requested>budget)return plain("hold","volume_change_waits_for_future_visit");
        const slots=remainingSlots(approvedRoot);
        targets=targets.slice(0,Math.min(capacity,slots.length));
        if(!targets.length)return plain("hold","original_working_slots_complete");
        replacement={rootPrescriptionId:approvedRoot.id,setIndices:slots.slice(0,targets.length)};
      } else if(targets.length>capacity) {
        targets=targets.slice(0,capacity);reasons=[...reasons,"remaining_work_budget"];
      }
      const seconds=targets.length*(cat.perSide&&cat.movement==="squat"?75:40)+Math.max(0,targets.length-1)*(cat.priority?150:90);
      if(seconds>remaining)return plain("hold","insufficient_work_time");
    }
    const stableLoad=!!a.baseline&&sameLoad(load,a.baseline.prescription.load);
    const extras=kind==="working"&&stableLoad&&!a.returnMode&&!cat.priority&&cat.movement!=="squat"&&cat.movement!=="hinge"&&source!=="rep_bridge"&&source!=="volume_change"&&targets.length>=2;
    const p:Prescription={id:"",visitId:visit.id,identity:clone(context.identity),load:clone(load),targets:[...targets],roles:kind==="calibration"?["calibration"]:kind==="return"?targets.map((_,i)=>i===0?"return_check":"working"):targets.map(()=>"working"),
      kind,source,provisional:kind!=="working"||!a.baseline||prescriptionKey(load,targets)!==prescriptionKey(a.baseline.prescription.load,a.baseline.prescription.targets),extrasAllowed:extras,preparationRequired:true,recoverySeconds:cat.priority?150:90,workingSetBudget:budget,
      policyVersion:POLICY_VERSION,issuedAt:context.now,dependencyIds:causal.map(e=>e.id).sort(),dependencyFingerprint:fingerprint,context:context.context??"paired"};
    if(replacement)p.replacement=replacement;
    p.id=`p-${contentDigest(prescriptionContent(p))}`;
    return {status:"proposal",reasons,prerequisites:kind==="calibration"?["acknowledge_trial"]:[],prescription:p,stateRevision:state.revision,baseline:baselineInfo,counters:{successes:a.successCount,difficulty:a.difficultyDates.length,failedTrialDates:Math.max(0,...[...a.failures.values()].map(v=>v.size))}};
  };
  const have=(load:Load|null)=>load===null?cat.loadingMode==="bodyweight":loads.some(v=>sameLoad(v,load));
  const lower=(load:Load)=>loads.filter(v=>normalizeLoad(v)<normalizeLoad(load)).at(-1);
  const next=(load:Load)=>loads.find(v=>normalizeLoad(v)>normalizeLoad(load));
  const existing=a.provisional??a.baseline?.prescription;
  const stay=(reason:string,p:Prescription|undefined=existing):Decision=>{
    if(!p) return plain("hold",reason);
    if(!have(p.load)) {
      if(p.load) {const substitute=lower(p.load);if(substitute)return make(substitute,p.targets,"inventory_substitution","working",[reason,"lower_inventory_substitution"]);}
      return {...plain("needs_setup","established_load_unavailable"),alternatives:cat.alternatives};
    }
    const decision=make(p.load,p.targets,a.returnMode?"return_reestablish":"baseline",a.returnMode?"return":"working",[reason]);
    decision.reasons=[...new Set([reason,...decision.reasons])];
    decision.baseline??=baselineInfo;
    if(context.requestTrial&&decision.status==="proposal") decision.status="hold";
    return decision;
  };
  const enoughWorkTime=(targets:number[])=>targets.length*(cat.perSide&&cat.movement==="squat"?75:40)+Math.max(0,targets.length-1)*(cat.priority?150:90)<=remaining;
  const calibrationLimit=():string|undefined=>{
    const all=state.projection.sets.filter(s=>s.visitId===visit.id&&s.role==="calibration");
    const mine=all.filter(s=>identityKey(s.identity)===key);
    const floorHome=visit.setting==="home"&&cat.loadingMode==="bodyweight";
    if(floorHome&&all.length>=4) return "home_check_cap";
    if(!floorHome&&mine.length>=3) return "identity_trial_cap";
    if(!floorHome&&!mine.length&&new Set(all.map(s=>identityKey(s.identity))).size>=2) return "new_identity_cap";
    const last=state.projection.sets.filter(s=>s.visitId===visit.id&&s.actual.completed).at(-1),first=all[0];
    const preceding=last?(floorHome&&identityKey(last.identity)!==key?60:cat.priority?150:90):0;
    const wait=last?Math.max(0,preceding-(now-instant(last.endedAt))/1000):0;
    const duration=cat.perSide&&cat.movement==="squat"?75:40;
    if(wait+duration>remaining) return "insufficient_trial_time";
    if(first&&(now-instant(first.startedAt))/1000+wait+duration>360) return "calibration_time_cap";
    if(wait>0) return "trial_recovery_required";
    return undefined;
  };
  const trial=(load:Load|null,source:string,target=cat.floor):Decision=>{
    const cap=calibrationLimit();if(cap)return existing?stay(cap):plain("hold",cap);
    return make(load,[target],source,"calibration");
  };
  const currentWork=a.currentSets.filter(s=>s.role!=="warmup"&&s.actual.completed&&setMatchesIssue(s)&&!excluded(s));
  const shorts=currentWork.filter(s=>s.role!=="calibration"&&(s.actual.feedback==="hard"||(s.issued&&minReps(s.actual.reps)<(s.issued.targets[s.setIndex??0]??cat.floor))));
  if(shorts.length>=2) return plain("hold","two_short_sets_end_movement");
  const latestIssue=state.projection.prescriptions.filter(p=>p.visitId===visit.id&&identityKey(p.identity)===key).at(-1);
  if(shorts.length===1&&existing) {
    const short=shorts[0]!;
    const root=state.projection.prescriptions.find(p=>p.id===(short.issued?.replacement?.rootPrescriptionId??short.issued?.id));
    if(!root||root.kind==="calibration")return plain("hold","short_set_missing_working_authority");
    const slots=remainingSlots(root);
    if(!slots.length||spentWorking>=root.workingSetBudget)return plain("hold","original_working_slots_complete");
    const pendingReplacement=latestIssue?.replacement?.rootPrescriptionId===root.id&&state.projection.sets.filter(s=>s.prescriptionId===latestIssue.id&&s.actual.completed).length<latestIssue.targets.length;
    if(pendingReplacement&&have(latestIssue!.load))return {...plain("hold","prepared_prescription_unchanged"),prescription:clone(latestIssue!),baseline:baselineInfo};
    const currentTarget=short.issued?.targets[short.setIndex??0]??cat.floor;
    const issuedLoad=short.issued!.load,kind=root.kind==="return"?"return":"working";
    if(currentTarget>cat.floor&&have(issuedLoad))return make(issuedLoad,slots.map(()=>currentTarget-1),"today_easier",kind,["short_set_ease_remaining"]);
    if(issuedLoad){const lighter=lower(issuedLoad);if(lighter)return make(lighter,slots.map(()=>Math.max(cat.floor,currentTarget-1)),"today_easier",kind,["short_set_lower_load"]);}
    return {...plain("needs_calibration","easier_variant_required"),alternatives:cat.alternatives};
  }
  if(latestIssue) {
    const done=state.projection.sets.filter(s=>s.prescriptionId===latestIssue.id&&s.actual.completed);
    if(done.length<latestIssue.targets.length) {
      if(!have(latestIssue.load)) {
        const substitute=latestIssue.load?lower(latestIssue.load):undefined;
        if(!substitute)return {...plain("needs_setup","prepared_load_unavailable"),alternatives:cat.alternatives};
        const unperformedTargets=latestIssue.targets.filter((_,index)=>!done.some(set=>set.setIndex===index));
        return make(substitute,unperformedTargets,"inventory_substitution",latestIssue.kind,["acknowledge_prepared_replacement"]);
      }
      return {...plain("hold","prepared_prescription_unchanged"),prescription:clone(latestIssue),baseline:baselineInfo};
    }
    if(latestIssue.kind!=="calibration"&&!context.requestTrial&&!context.assessManualLoad) return plain("hold","movement_complete_this_visit");
  }
  if(a.returnMode&&a.returnEpoch) {
    const epoch=a.returnEpoch;
    const currentReturn=epoch.current??a.provisional;
    const currentLoad=currentReturn?.load??epoch.checkLoad;
    const latestReturnEvidence=a.exposures.filter(e=>e.prescription.kind==="return"&&instant(e.prescription.issuedAt)>=instant(epoch.startedAt)&&sameLoad(e.prescription.load,currentLoad)&&(e.short||e.success)).at(-1);
    if(latestReturnEvidence?.short) {
      const lighter=currentLoad?lower(currentLoad):undefined;
      if(lighter)return make(lighter,[cat.floor,cat.floor],"return_easier","return",["failed_return_lower_load"]);
      return {...plain("needs_calibration","failed_return_easier_setup_required"),alternatives:cat.alternatives};
    }
    const returnWork=(load:Load|null,source:string,reasons:string[]=[]):Decision=>{
      if(!have(load)) {
        const substitute=load?lower(load):undefined;
        if(!substitute)return {...plain("needs_setup","return_load_unavailable"),alternatives:cat.alternatives};
        return make(substitute,[cat.floor,cat.floor],"return_inventory_substitution","return",[...reasons,"lower_inventory_substitution"]);
      }
      return make(load,[cat.floor,cat.floor],source,"return",reasons);
    };
    if(!epoch.restoring) {
      let check:Load|null=null;
      if(epoch.retained.load) {
        check=currentReturn?.load??epoch.checkLoad??loads.filter(v=>atMostPercent(normalizeLoad(v),normalizeLoad(epoch.retained.load!),85)).at(-1)??null;
        if(!check)return {...plain(cat.alternatives.some(v=>CATALOG[v].equipment.every(eq=>context.inventory.equipment.includes(eq)))?"needs_calibration":"needs_setup","return_load_unavailable"),alternatives:cat.alternatives};
      }
      if(!enoughWorkTime([cat.floor,cat.floor]))return plain("hold","insufficient_work_time");
      return returnWork(check,"return_check");
    }
    const p=currentReturn??a.provisional??a.baseline?.prescription;
    if(!p)return plain("needs_calibration","return_observation_required");
    const establishedReturn=a.baseline?.prescription;
    const performedCurrent=state.projection.sets.some(set=>set.prescriptionId===p.id&&isPolicyWork(state,set));
    if(context.declineIncrease&&establishedReturn?.kind==="return"&&p.load&&establishedReturn.load&&
      normalizeLoad(p.load)>normalizeLoad(establishedReturn.load)&&!performedCurrent) {
      return returnWork(establishedReturn.load,"return_reestablish",["declined_unperformed_return_increase"]);
    }
    if(a.provisional||!a.baseline||!sameLoad(p.load,a.baseline.prescription.load))return returnWork(p.load,"return_reestablish");
    if(!a.earnedAt||a.earnedDate===visit.date||now-instant(a.earnedAt)<12*3600000||context.declineIncrease)return returnWork(p.load,"return_reestablish",["return_gate_wait"]);
    if(!p.load||!epoch.retained.load)return returnWork(p.load,"return_reestablish");
    const candidate=next(p.load);
    if(!candidate||normalizeLoad(candidate)>normalizeLoad(epoch.retained.load))return stay("return_inventory_limit",p);
    const targetKey=prescriptionKey(candidate,[cat.floor,cat.floor]);
    if((a.failures.get(targetKey)?.size??0)>=2&&!retryReleased(state,a,targetKey,context.now,context.requestTrial===true))return returnWork(p.load,"return_reestablish",["failed_load_terminal_hold"]);
    const anchor=rollingAnchor(epoch.snapshots,now)??normalizeLoad(p.load);
    if(!withinPercent(normalizeLoad(candidate),normalizeLoad(p.load),100)||normalizeLoad(candidate)-normalizeLoad(p.load)>pounds(cat.firstStepLb??0)||!withinPercent(normalizeLoad(candidate),anchor,100)||normalizeLoad(candidate)-anchor>pounds(2*(cat.firstStepLb??0)))return stay("return_restoration_limit",p);
    return make(candidate,[cat.floor,cat.floor],"return_restore","return");
  }
  if(a.effortDates.length>=2||a.difficultyDates.length>=3) {
    const p=a.baseline?.prescription??existing;
    if(p) {
      if(!have(p.load))return stay("inventory_changed_before_easing",p);
      if(p.targets.some(n=>n>cat.floor))return make(p.load,p.targets.map(n=>Math.max(cat.floor,n-1)),"easier","working",["repeated_difficulty"]);
      if(p.load){const light=lower(p.load);if(light)return make(light,p.targets,"easier","working",["repeated_difficulty"]);}
      return {...plain("needs_calibration","difficulty_easier_variant"),alternatives:cat.alternatives};
    }
  }
  if(a.failedTrial&&a.baseline) {
    const base=a.baseline.prescription;
    if(!have(base.load))return stay("inventory_changed_before_bridge",base);
    const last=a.exposures.filter(e=>e.short&&sameLoad(e.prescription.load,base.load)).at(-1);
    const keyOfFailure=last?prescriptionKey(last.prescription.load,last.prescription.targets):undefined;
    const count=keyOfFailure?a.failures.get(keyOfFailure)?.size??0:0;
    const qualified=last&&count>=2&&last.date!==visit.date&&now-instant(last.endedAt)>=12*3600000&&
      last.complete&&!last.effort&&!last.excluded&&last.sets.every(s=>minReps(s.actual.reps)>=(base.targets[s.setIndex??0]??Infinity));
    if(qualified&&!context.declineIncrease) {
      const targets=[...base.targets],index=targets.findIndex(n=>n===Math.min(...targets)&&n<cat.ceiling);
      if(index>=0) {
        targets[index]=targets[index]!+1;
        if((a.failures.get(prescriptionKey(base.load,targets))?.size??0)<2)return make(base.load,targets,"rep_bridge","working",["failed_trial_retained_baseline_capacity"]);
      }
    }
    return stay("failed_trial_return_to_baseline",base);
  }
  if(!a.baseline) {
    const phaseTrials=state.projection.sets.filter(s=>identityKey(s.identity)===key&&s.role==="calibration"&&s.actual.completed&&setMatchesIssue(s)&&!excluded(s)&&instant(s.startedAt)>=a.freshSince);
    const lastAttempt=phaseTrials.at(-1);
    if(lastAttempt&&(lastAttempt.actual.feedback==="hard"||minReps(lastAttempt.actual.reps)<cat.floor)) {
      if(lastAttempt.actual.load) {
        const previous=phaseTrials.filter(s=>s.actual.feedback!=="hard"&&minReps(s.actual.reps)>=cat.floor&&s.actual.load&&normalizeLoad(s.actual.load)<normalizeLoad(lastAttempt.actual.load!)).at(-1);
        if(previous?.actual.load) {
          if(have(previous.actual.load))return make(previous.actual.load,[cat.floor,cat.floor],"calibration_fallback","working",["failed_trial_use_previous_manageable_load"]);
          const available=lower(previous.actual.load);
          if(available)return trial(available,"lower_initial_check");
          return {...plain("needs_setup","previous_manageable_load_unavailable"),alternatives:cat.alternatives};
        }
        const lighter=lower(lastAttempt.actual.load);
        if(lighter)return trial(lighter,"lower_initial_check");
      }
      return {...plain("needs_calibration","failed_initial_check_choose_easier_variant_or_defer"),alternatives:cat.alternatives,prerequisites:["easier_variant_check"]};
    }
  }
  if(!a.baseline&&!a.provisional) {
    if(cat.loadingMode==="bodyweight")return trial(null,"first_use",cat.ceiling);
    const start=loads.find(v=>normalizeLoad(v)<=pounds(cat.starterLb??0));
    return start?trial(start,"first_use"):{...plain("needs_setup","starter_load_unavailable"),alternatives:cat.alternatives};
  }
  let p=existing!;
  if(context.declineIncrease&&a.baseline&&(p.load&&a.baseline.prescription.load?normalizeLoad(p.load)>=normalizeLoad(a.baseline.prescription.load):sameLoad(p.load,a.baseline.prescription.load))&&p.targets.every((n,i)=>n>=(a.baseline!.prescription.targets[i]??n)))p=a.baseline.prescription;
  if(!have(p.load))return stay("inventory_changed",p);
  if(requested!==p.targets.length) {
    if(requested===1&&context.shortened)return make(p.load,[p.targets[0]!],"shortened");
    const volume=volumeChangeEligibility(state,context.identity,requested,context.now,context.visitId);
    if(!volume.allowed)return stay(volume.reasons[0]??"volume_not_earned",p);
    const targets=Array.from({length:requested},(_,i)=>p.targets[i]??p.targets[p.targets.length-1]!);
    if(!enoughWorkTime(targets))return stay("volume_time_limit",p);
    return make(p.load,targets,"volume_change");
  }
  const activeKey=prescriptionKey(p.load,p.targets);
  const earned=a.earnedKey===activeKey;
  const easy=a.latestEasy&&sameLoad(a.latestEasy.actual.load,p.load);
  const explicitTrial=context.requestTrial===true||context.assessManualLoad!==undefined;
  const useEasy=explicitTrial&&!!easy;
  const ceiling=p.targets.every(n=>n===cat.ceiling);
  const qualifyingAt=useEasy?a.latestEasy!.endedAt:earned?a.earnedAt:undefined;
  const qualifyingDate=useEasy?state.projection.visits.find(v=>v.id===a.latestEasy!.visitId)?.date:earned?a.earnedDate:undefined;
  const later=!!qualifyingAt&&qualifyingDate!==visit.date&&now-instant(qualifyingAt)>=12*3600000;
  const changedLoad=!!a.baseline&&!sameLoad(p.load,a.baseline.prescription.load);
  const firstExploration=!a.baseline&&!!a.lastTrial&&a.latestEasy?.id===a.lastTrial.id&&a.lastTrial.actual.feedback==="easy";
  const wantLoad=!context.declineIncrease&&!changedLoad&&((earned&&ceiling)||useEasy||firstExploration);
  if(context.assessManualLoad&&!wantLoad)return stay("manual_trial_evidence_required",p);
  if(wantLoad) {
    if(cat.loadingMode==="bodyweight")return {...stay("bodyweight_progression_endpoint",p),alternatives:cat.harder};
    if(!p.load)return plain("needs_calibration","positive_load_selector_required");
    const candidate=next(p.load);
    if(!candidate)return {...stay("inventory_ceiling",p),alternatives:cat.harder};
    if(context.assessManualLoad&&!sameLoad(context.assessManualLoad,candidate))return stay("manual_load_not_next_eligible_step",p);
    if(a.baseline&&!later)return stay("increase_requires_later_date_and_12_hours",p);
    if(!a.baseline&&!firstExploration)return stay("first_use_trial_not_earned",p);
    const candidateKey=prescriptionKey(candidate,Array(p.targets.length).fill(cat.floor));
    const failures=a.failures.get(candidateKey)?.size??0;
    if(failures>=2&&!retryReleased(state,a,candidateKey,context.now,context.requestTrial===true))return stay("failed_load_terminal_hold",p);
    const bound=loadBoundReason(state,a,context,candidate,p.load,loads);
    if(bound)return stay(bound,p);
    const automatic=earned&&ceiling&&withinPercent(normalizeLoad(candidate),normalizeLoad(p.load),5)&&!context.requestTrial&&!context.assessManualLoad;
    if(automatic) {
      if(!enoughWorkTime(p.targets))return stay("insufficient_work_time",p);
      return make(candidate,p.targets.map(()=>cat.floor),"automatic_load");
    }
    const ready=state.projection.authoritativeEvents.some(e=>e.type==="preparation_confirmed"&&e.payload.visitId===visit.id&&identityKey(e.payload.identity)===key&&e.payload.recoveryConfirmed===true&&instant(e.occurredAt)<=now);
    const knownTiming=a.latestEasy?.actual.timingQuality==="measured"||a.latestEasy?.actual.timingQuality==="reported";
    if(!ready&&!knownTiming)return {...plain("needs_calibration","upward_trial_recovery_ack_required"),prerequisites:["confirm_current_recovery"]};
    return trial(candidate,normalizeLoad(candidate)<=pounds(cat.firstCeilingLb??0)?"low_load_trial":"coarse_trial");
  }
  if(earned&&!ceiling&&!context.declineIncrease) {
    if(!later)return stay("increase_requires_later_date_and_12_hours",p);
    let targets=nextRepTargets(p.targets,cat.ceiling),source="rep_progression";
    const failed=a.failures.get(prescriptionKey(p.load,targets))?.size??0;
    if(failed>=2) {
      const index=p.targets.findIndex(n=>n===Math.min(...p.targets)&&n<cat.ceiling);
      if(index<0)return stay("rep_plateau_endpoint",p);
      targets=[...p.targets];targets[index]=targets[index]!+1;source="rep_bridge";
      if((a.failures.get(prescriptionKey(p.load,targets))?.size??0)>=2)return stay("rep_plateau_hold",p);
    }
    return make(p.load,targets,source);
  }
  if(!enoughWorkTime(p.targets))return plain("hold","insufficient_work_time");
  return make(p.load,p.targets,context.declineIncrease?"held_baseline":a.baseline&&prescriptionKey(p.load,p.targets)===prescriptionKey(a.baseline.prescription.load,a.baseline.prescription.targets)?"baseline":"provisional_working");
}
export function nextRepTargets(targets:number[],ceiling:number):number[] {
  const high=Math.max(...targets), low=Math.min(...targets);
  return targets.map(n=>n<high?Math.min(high,n+1):low===high?Math.min(ceiling,n+1):n);
}
export function rollingAnchor(snapshots:Established[],now:number):bigint|undefined {
  const start=now-168*3600000;
  const before=snapshots.filter(s=>instant(s.at)<=start).at(-1);
  const within=snapshots.filter(s=>instant(s.at)>start);
  const candidates=[...(before?[before]:[]),...within].filter(s=>s.prescription.load!==null).map(s=>normalizeLoad(s.prescription.load!));
  return candidates.length?candidates.reduce((a,b)=>a<b?a:b):undefined;
}
function loadBoundReason(state:EngineState,a:Analysis,context:RecommendationContext,candidate:Load,current:Load,_loads:Load[]):string|undefined {
  const cat=CATALOG[context.identity.variant],value=normalizeLoad(candidate),base=normalizeLoad(current),now=instant(context.now);
  if(!a.baseline&&value>pounds(cat.firstCeilingLb??0))return "first_use_ceiling";
  const low=value<=pounds(cat.firstCeilingLb??0),relative=low?100:cat.coarsePercent,absolute=low?(cat.firstStepLb??0):cat.coarseLb;
  if(!withinPercent(value,base,relative)||value-base>pounds(absolute))return "single_step_limit";
  const visit=state.projection.visits.find(v=>v.id===context.visitId)!;
  const approved=state.projection.prescriptions.filter(p=>identityKey(p.identity)===identityKey(context.identity)&&p.load!==null);
  const atStart=a.snapshots.filter(s=>instant(s.at)<=instant(visit.startedAt)).at(-1)?.prescription.load;
  const firstVisit=approved.find(p=>p.visitId===visit.id)?.load;
  const visitAnchor=atStart?normalizeLoad(atStart):firstVisit?normalizeLoad(firstVisit):base;
  if(!withinPercent(value,visitAnchor,relative)||value-visitAnchor>pounds(low?2*(cat.firstStepLb??0):cat.coarseLb))return "visit_cumulative_limit";
  const successfulTrials=state.projection.sets.filter(s=>identityKey(s.identity)===identityKey(context.identity)&&s.role==="calibration"&&isPolicyWork(state,s)&&!excluded(s)&&s.actual.feedback!=="hard"&&s.actual.load&&minReps(s.actual.reps)>=cat.floor&&instant(s.endedAt)>=now-168*3600000);
  let anchor=rollingAnchor(a.snapshots,now);
  if(successfulTrials.length) {
    const first=normalizeLoad(successfulTrials[0]!.actual.load!);anchor=anchor===undefined||first<anchor?first:anchor;
  }
  anchor??=base;
  if(!withinPercent(value,anchor,low?100:cat.rollingPercent)||value-anchor>pounds(low?2*(cat.firstStepLb??0):cat.rollingLb))return "rolling_cumulative_limit";
  if(a.baseline) {
    const dayLoads=approved.filter(p=>state.projection.visits.find(v=>v.id===p.visitId)?.date===visit.date&&p.source!=="return_check").map(p=>normalizeLoad(p.load!));
    if(dayLoads.some(n=>n>visitAnchor)&&value>dayLoads.reduce((m,n)=>m>n?m:n,visitAnchor))return "one_load_step_per_date";
  }
  return undefined;
}
function retryReleased(state:EngineState,a:Analysis,key:string,now:string,requested:boolean):boolean {
  const last=a.failureLastAt.get(key);if(!last||!requested||!a.baseline)return false;
  const baseKey=prescriptionKey(a.baseline.prescription.load,a.baseline.prescription.targets);
  const successes=a.exposures.filter(e=>e.success&&prescriptionKey(e.prescription.load,e.prescription.targets)===baseKey&&instant(e.endedAt)>instant(last));
  if(successes.length<2)return false;
  const first=successes[0]!,later=successes.find(e=>e.date!==first.date&&instant(e.endedAt)-instant(first.endedAt)>=12*3600000);if(!later)return false;
  const reports=state.projection.authoritativeEvents.filter(e=>e.type==="recovery_reported"&&a.exposures.some(ex=>ex.prescription.visitId===e.payload.visitId)&&instant(now)-instant(e.occurredAt)<=7*86400000);
  const report=reports.at(-1);return report?.type==="recovery_reported"&&report.payload.feedback==="manageable";
}
