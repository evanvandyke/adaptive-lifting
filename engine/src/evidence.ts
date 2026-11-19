import { CATALOG } from "./catalog.js";
import type { EngineEvent, EngineState, Identity, Load, Prescription, SetView } from "./types.js";
import { identityKey, instant, minReps, normalizeLoad, prescriptionKey, sameLoad } from "./util.js";

export interface Established { prescription: Prescription; at: string; visitId: string }
export interface Exposure {
  prescription: Prescription; sets: SetView[]; date: string; endedAt: string;
  complete: boolean; success: boolean; short: boolean; rawShort: boolean;
  effort: boolean; excluded: boolean; extra: boolean; easy: boolean;
}
export interface ReturnEpoch {
  retained: Prescription; checkLoad: Load | null; startedAt: string;
  snapshots: Established[]; restoring: boolean;
  /** Latest checked return issuance; initial checkLoad stays frozen separately. */
  current?: Prescription;
}
export interface Analysis {
  baseline?: Established; provisional?: Prescription; snapshots: Established[];
  successCount: number; earnedKey?: string; earnedAt?: string; earnedDate?: string;
  difficultyDates: string[]; effortDates: string[];
  failures: Map<string, Set<string>>; failureLastAt: Map<string,string>;
  returnMode: boolean; returnEpoch?: ReturnEpoch; freshMode: boolean; freshSince: number;
  failedTrial: boolean; lastValidAt?: string; lastTrial?: SetView; latestEasy?: SetView;
  exposures: Exposure[]; currentSets: SetView[]; stopAt?: string;
}
export interface StopSource { eventId: string; identity: Identity; date?: string; receivedAt: string }

export function hasAdverse(set: SetView): boolean { return !!(set.actual.pain || set.actual.controlLost); }
export function excluded(set: SetView): boolean {
  return !!(hasAdverse(set) || set.actual.interrupted || set.actual.shortRecovery || set.actual.preFatigued || ["equipment","time","interruption"].includes(set.actual.cause ?? ""));
}
export function controlled(set: SetView): boolean {
  return set.actual.completed && minReps(set.actual.reps)>0 && !hasAdverse(set) && !set.actual.interrupted && set.actual.cause!=="interruption" && !set.actual.shortRecovery && !set.actual.preFatigued;
}
export function setMatchesIssue(set: SetView): boolean {
  return set.policyEligible && !!set.issued && sameLoad(set.issued.load,set.actual.load) && set.issued.roles[set.setIndex ?? -1]===set.role;
}
export function preparedAt(state: EngineState, visitId: string, identity: Identity, at: string): string | undefined {
  return state.projection.authoritativeEvents.filter(e =>
    (e.type==="preparation_confirmed" || (e.type==="rehearsal_confirmed" && e.payload.controlled)) &&
    e.payload.visitId===visitId && identityKey(e.payload.identity)===identityKey(identity) && instant(e.occurredAt)<=instant(at)
  ).at(-1)?.occurredAt;
}
export function isPolicyWork(state: EngineState,set: SetView): boolean {
  if(!setMatchesIssue(set)||!controlled(set)||set.role==="warmup") return false;
  const prep=preparedAt(state,set.visitId,set.identity,set.startedAt);
  if(!prep) return false;
  const earlier=state.projection.sets.filter(s=>s.visitId===set.visitId && identityKey(s.identity)===identityKey(set.identity) && instant(s.endedAt)<=instant(set.startedAt) && s.id!==set.id).at(-1);
  const known=(s:SetView)=>s.actual.timingQuality==="measured"||s.actual.timingQuality==="reported";
  if(earlier&&known(earlier)&&known(set)&&instant(set.startedAt)-instant(earlier.endedAt)<(set.issued?.recoverySeconds??0)*1000) return false;
  if(instant(set.startedAt)-Math.max(instant(prep),earlier?instant(earlier.endedAt):0)>=30*60000) return false;
  return true;
}
export function stopSources(state: EngineState,identity: Identity): StopSource[] {
  const family=CATALOG[identity.variant].movement;
  const sources:StopSource[]=[];
  for(const e of state.events) {
    if(e.type==="movement_stopped"&&e.policyVersion===state.config.policyVersion&&CATALOG[e.payload.identity.variant].movement===family) {
      const visit=state.events.find(v=>v.type==="visit_started"&&v.payload.visitId===e.payload.visitId);
      sources.push({eventId:e.id,identity:e.payload.identity,date:visit?.type==="visit_started"?visit.payload.trainingDate:undefined,receivedAt:e.receivedAt});
      continue;
    }
    if(e.policyVersion!==state.config.policyVersion || (e.type!=="set_recorded"&&e.type!=="set_corrected") || !(e.payload.actual.pain||e.payload.actual.controlLost)) continue;
    const originals=e.type==="set_recorded"?[e]:state.events.filter((p):p is Extract<EngineEvent,{type:"set_recorded"} >=>p.type==="set_recorded"&&p.entityId===e.entityId);
    for(const original of originals) if(CATALOG[original.payload.identity.variant].movement===family) {
      const visit=state.events.find(p=>p.type==="visit_started"&&p.payload.visitId===original.payload.visitId);
      sources.push({eventId:e.id,identity:original.payload.identity,date:visit?.type==="visit_started"?visit.payload.trainingDate:undefined,receivedAt:e.receivedAt});
    }
  }
  return [...new Map(sources.map(s=>[s.eventId,s])).values()];
}
export function activeStops(state:EngineState,identity:Identity,now:string,visitId?:string):string[] {
  return stopSources(state,identity).filter(source=>{
    const resolution=state.projection.authoritativeEvents.filter(e=>e.type==="stop_resolved" && CATALOG[e.payload.identity.variant].movement===CATALOG[identity.variant].movement && e.payload.stopEventIds.includes(source.eventId) && instant(e.receivedAt)>=instant(source.receivedAt) && instant(e.occurredAt)<=instant(now)).at(-1);
    if(!resolution) return true;
    return !state.projection.authoritativeEvents.some(e=>(e.type==="preparation_confirmed"||(e.type==="rehearsal_confirmed"&&e.payload.controlled)) && identityKey(e.payload.identity)===identityKey(identity) && (!visitId||e.payload.visitId===visitId) && instant(e.occurredAt)>instant(resolution.occurredAt) && instant(e.occurredAt)<=instant(now));
  }).map(s=>s.eventId);
}
export function collectExposures(state:EngineState,identity:Identity):Exposure[] {
  const key=identityKey(identity), visits=new Map(state.projection.visits.map(v=>[v.id,v]));
  const result:Exposure[]=[];
  for(const p of state.projection.prescriptions) {
    if(identityKey(p.identity)!==key||p.kind==="calibration") continue;
    const sets=state.projection.sets.filter(s=>s.prescriptionId===p.id&&(s.role==="working"||s.role==="return_check"));
    const visit=visits.get(p.visitId); if(!sets.length||!visit) continue;
    const slots=new Map<number,SetView[]>();
    for(const s of sets) slots.set(s.setIndex!,[...(slots.get(s.setIndex!)??[]),s]);
    const unique=[...slots.values()].every(values=>values.length===1);
    const comparable=unique&&sets.every(s=>setMatchesIssue(s)&&!excluded(s)&&(minReps(s.actual.reps)===0||isPolicyWork(state,s)));
    const complete=unique&&p.targets.every((_,i)=>slots.get(i)?.length===1&&slots.get(i)![0]!.actual.completed);
    const rawShort=sets.some(s=>s.actual.completed&&(s.actual.feedback==="hard"||minReps(s.actual.reps)<(p.targets[s.setIndex!]??Infinity)));
    const success=comparable&&complete&&!rawShort&&p.targets.length>=2;
    const final=slots.get(p.targets.length-1)?.[0];
    const knownTiming=sets.every(s=>s.actual.timingQuality==="measured"||s.actual.timingQuality==="reported");
    result.push({prescription:p,sets,date:visit.date,endedAt:sets.at(-1)!.endedAt,complete,success,
      short:comparable&&rawShort,rawShort,effort:sets.some(s=>s.actual.feedback==="hard"||s.actual.cause==="effort"),excluded:!comparable,
      extra:!!(success&&final&&p.extrasAllowed&&knownTiming&&minReps(final.actual.reps)>p.targets[p.targets.length-1]!),
      easy:!!(success&&final?.actual.feedback==="easy")});
  }
  return result.sort((a,b)=>instant(a.endedAt)-instant(b.endedAt)||a.prescription.id.localeCompare(b.prescription.id));
}
function fromTrial(set:SetView):Prescription {
  const cat=CATALOG[set.identity.variant];
  const target=cat.loadingMode==="bodyweight"?Math.max(cat.floor,Math.min(cat.ceiling,minReps(set.actual.reps)-2)):cat.floor;
  return {...set.issued!,kind:"working",source:"trial_working",targets:[target,target],roles:["working","working"],provisional:true,extrasAllowed:false};
}
function increased(p:Prescription,b:Prescription):boolean {
  if(p.load&&b.load&&!sameLoad(p.load,b.load)) return normalizeLoad(p.load)>normalizeLoad(b.load);
  return p.targets.some((n,i)=>n>(b.targets[i]??n));
}
export function analyze(state:EngineState,identity:Identity,now:string,visitId?:string):Analysis {
  const key=identityKey(identity), cat=CATALOG[identity.variant], nowTime=instant(now);
  const sets=state.projection.sets.filter(s=>identityKey(s.identity)===key&&instant(s.endedAt)<=nowTime);
  const relevant=sets.filter(s=>isPolicyWork(state,s));
  const currentVisit=state.projection.visits.find(v=>v.id===visitId);
  let freshSince=-Infinity;
  for(let i=1;i<relevant.length;i++) if(instant(relevant[i]!.endedAt)-instant(relevant[i-1]!.endedAt)>=42*86400000) freshSince=instant(relevant[i]!.startedAt);
  const priorToVisit=currentVisit?relevant.filter(s=>instant(s.endedAt)<instant(currentVisit.startedAt)).at(-1):relevant.at(-1);
  const referenceTime=currentVisit?instant(currentVisit.startedAt):nowTime;
  if(priorToVisit&&referenceTime-instant(priorToVisit.endedAt)>=42*86400000) freshSince=Math.max(freshSince,referenceTime);
  const exposures=collectExposures(state,identity).filter(e=>instant(e.endedAt)<=nowTime&&instant(e.prescription.issuedAt)>=freshSince);
  const result:Analysis={snapshots:[],successCount:0,difficultyDates:[],effortDates:[],failures:new Map(),failureLastAt:new Map(),returnMode:false,freshMode:Number.isFinite(freshSince),freshSince,failedTrial:false,exposures,currentSets:sets.filter(s=>s.visitId===visitId)};
  const sources=stopSources(state,identity);
  if(activeStops(state,identity,now,visitId).length) result.stopAt=sources.at(-1)?.receivedAt;
  const phaseValid=relevant.filter(s=>instant(s.startedAt)>=freshSince);
  const trials=phaseValid.filter(s=>s.role==="calibration"&&!excluded(s)&&s.actual.feedback!=="hard"&&minReps(s.actual.reps)>=cat.floor);
  const dateFor=(s:SetView)=>state.projection.visits.find(v=>v.id===s.visitId)?.date;
  let activeKey:string|undefined, difficultyKey:string|undefined;
  let successTimes:{date:string;at:string}[]=[];
  const beginReturn = (prescription: Prescription): void => {
    if (result.returnEpoch) return;
    const visit = state.projection.visits.find(v => v.id === prescription.visitId);
    if (!visit) return;
    const priorTrial = trials.filter(s => instant(s.endedAt) < instant(visit.startedAt)).at(-1);
    const retained = result.baseline?.prescription ?? result.provisional ?? (priorTrial ? fromTrial(priorTrial) : undefined);
    if (retained) result.returnEpoch = {
      retained, checkLoad: prescription.load, startedAt: visit.startedAt,
      snapshots: [], restoring: false, current: prescription,
    };
    result.returnMode = true;
    result.provisional = prescription;
    successTimes = []; activeKey = undefined; difficultyKey = undefined;
    result.difficultyDates = []; result.effortDates = [];
    result.earnedKey = undefined; result.earnedAt = undefined; result.earnedDate = undefined;
    result.failedTrial = false;
  };
  const dates=[...new Set(exposures.map(e=>e.date))].sort();
  for(const date of dates) {
    const day=exposures.filter(e=>e.date===date);
    // A partial or neutral return still occurred. Latch its epoch before score
    // selection, otherwise refreshing the exposure clock can erase return mode.
    const returnWork = day.find(e => e.prescription.kind === "return" &&
      e.sets.some(s => isPolicyWork(state, s)));
    if (returnWork) beginReturn(returnWork.prescription);
    const chosen=day.find(e=>e.short)??day.find(e=>e.success);
    const veto=sources.some(s=>s.date===date)||day.some(e=>e.rawShort);
    const use=chosen?.short?chosen:!veto?chosen:undefined;
    if(!use) continue;
    const p=use.prescription, pk=prescriptionKey(p.load,p.targets);
    if(p.kind==="return") beginReturn(p);
    if(activeKey!==pk) {successTimes=[];activeKey=pk;result.earnedKey=undefined;result.earnedAt=undefined;result.earnedDate=undefined;}
    if(use.short) {
      successTimes=[];result.earnedKey=undefined;result.earnedAt=undefined;result.earnedDate=undefined;
      // Do not let a previously successful attempt survive its own later failure
      // and reappear as ordinary work after a baseline-success date.
      if (result.provisional && prescriptionKey(result.provisional.load, result.provisional.targets) === pk) {
        result.provisional = undefined;
      }
      if(difficultyKey!==pk) {result.difficultyDates=[];result.effortDates=[];difficultyKey=pk;}
      result.difficultyDates.push(date);
      if(use.effort) result.effortDates.push(date); else result.effortDates=[];
      if(result.baseline&&increased(p,result.baseline.prescription)) {
        const failures=result.failures.get(pk)??new Set<string>();failures.add(date);result.failures.set(pk,failures);result.failureLastAt.set(pk,use.endedAt);result.failedTrial=true;
      }
    } else if(use.success) {
      result.difficultyDates=[];result.effortDates=[];difficultyKey=undefined;
      const previous=successTimes.at(-1);
      if(!previous||instant(use.endedAt)-instant(previous.at)>=12*3600000) successTimes.push({date,at:use.endedAt});
      const baseKey=result.baseline?prescriptionKey(result.baseline.prescription.load,result.baseline.prescription.targets):undefined;
      if(baseKey!==pk||result.returnMode) result.provisional=p;
      result.failedTrial=false;
      if(successTimes.length>=2) {
        if(baseKey!==pk||result.returnMode) {
          if(baseKey!==undefined&&baseKey!==pk) {result.failures.clear();result.failureLastAt.clear();}
          result.baseline={prescription:p,at:use.endedAt,visitId:p.visitId};result.snapshots.push(result.baseline);result.provisional=undefined;result.freshMode=false;
          result.failures.delete(pk);result.failureLastAt.delete(pk);
          if(result.returnEpoch) {
            result.returnEpoch.snapshots.push(result.baseline);result.returnEpoch.restoring=true;
            if(result.returnEpoch.retained.load===null||sameLoad(p.load,result.returnEpoch.retained.load)) {result.returnEpoch=undefined;result.returnMode=false;}
          }
        }
        if(result.earnedKey!==pk) {result.earnedKey=pk;result.earnedAt=use.endedAt;result.earnedDate=date;}
      } else if(use.extra&&result.baseline&&sameLoad(p.load,result.baseline.prescription.load)&&!result.returnMode&&p.source!=="rep_bridge") {
        result.earnedKey=pk;result.earnedAt=use.endedAt;result.earnedDate=date;
      }
    }
  }
  result.successCount=Math.min(2,successTimes.length);
  result.lastValidAt=phaseValid.at(-1)?.endedAt;
  result.lastTrial=trials.at(-1);
  const successfulEasyWork=exposures.filter(e=>e.easy).at(-1)?.sets.at(-1);
  const easyTrial=trials.filter(s=>s.actual.feedback==="easy").at(-1);
  result.latestEasy=[successfulEasyWork,easyTrial].filter((s):s is SetView=>!!s).sort((a,b)=>instant(a.endedAt)-instant(b.endedAt)).at(-1);
  const lastDifficulty=Math.max(-Infinity,...exposures.filter(e=>e.short).map(e=>instant(e.endedAt)),...sets.filter(s=>s.role==="calibration"&&setMatchesIssue(s)&&s.actual.completed&&!excluded(s)&&(s.actual.feedback==="hard"||minReps(s.actual.reps)<cat.floor)).map(s=>instant(s.endedAt)));
  if(result.latestEasy&&instant(result.latestEasy.endedAt)<=lastDifficulty)result.latestEasy=undefined;
  const lastCalibration=sets.filter(s=>s.role==="calibration"&&instant(s.startedAt)>=freshSince).at(-1);
  if(result.lastTrial?.issued&&(!result.baseline||instant(result.lastTrial.endedAt)>instant(result.baseline.at))) {
    const afterWorking=exposures.at(-1)?.endedAt;
    if(!afterWorking||instant(result.lastTrial.endedAt)>instant(afterWorking)) result.provisional=fromTrial(result.lastTrial);
  }
  for(const failed of sets.filter(s=>s.role==="calibration"&&s.issued&&setMatchesIssue(s)&&!excluded(s)&&(s.actual.feedback==="hard"||minReps(s.actual.reps)<cat.floor))) {
    const baselineBefore=result.snapshots.filter(s=>instant(s.at)<instant(failed.startedAt)).at(-1);
    if(!baselineBefore||!failed.actual.load||!baselineBefore.prescription.load||normalizeLoad(failed.actual.load)<=normalizeLoad(baselineBefore.prescription.load)) continue;
    if(result.baseline&&prescriptionKey(baselineBefore.prescription.load,baselineBefore.prescription.targets)!==prescriptionKey(result.baseline.prescription.load,result.baseline.prescription.targets))continue;
    const pk=prescriptionKey(failed.actual.load,[cat.floor,cat.floor]);
    const failureDates=result.failures.get(pk)??new Set<string>(); failureDates.add(dateFor(failed)!);result.failures.set(pk,failureDates);result.failureLastAt.set(pk,failed.endedAt);
    if(lastCalibration?.id===failed.id&&(!exposures.at(-1)||instant(failed.endedAt)>=instant(exposures.at(-1)!.endedAt))) {result.failedTrial=true;result.provisional=undefined;}
  }
  if(currentVisit&&priorToVisit) {
    const gap=instant(currentVisit.startedAt)-instant(priorToVisit.endedAt);
    if(gap>=14*86400000&&gap<42*86400000&&(!result.returnEpoch||instant(result.returnEpoch.startedAt)<instant(currentVisit.startedAt))) {
      const priorTrial=trials.filter(s=>instant(s.endedAt)<instant(currentVisit.startedAt)).at(-1);
      const retained=result.returnEpoch?.retained??result.baseline?.prescription??result.provisional??(priorTrial?fromTrial(priorTrial):undefined);
      if(retained) {
        const currentReturn=state.projection.prescriptions.find(p=>p.visitId===visitId&&identityKey(p.identity)===key&&p.kind==="return");
        result.returnEpoch={retained,checkLoad:currentReturn?.load??null,startedAt:currentVisit.startedAt,snapshots:[],restoring:false,current:currentReturn};
        result.returnMode=true;result.successCount=0;result.earnedKey=undefined;result.provisional=currentReturn;
      }
    }
  }
  if (result.returnEpoch) {
    const epochStart = instant(result.returnEpoch.startedAt);
    result.returnEpoch.current = state.projection.prescriptions.filter(p =>
      p.kind === "return" && identityKey(p.identity) === key &&
      instant(p.issuedAt) >= epochStart && instant(p.issuedAt) <= nowTime
    ).sort((a, b) => instant(a.issuedAt) - instant(b.issuedAt) || a.id.localeCompare(b.id)).at(-1);
  }
  return result;
}
