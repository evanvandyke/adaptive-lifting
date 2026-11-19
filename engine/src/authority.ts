import type { EngineConfig, EngineEvent, EngineState } from "./types.js";
import { replay as structuralReplay } from "./journal.js";
import { logicalFingerprint, prescriptionContent, recommendationCore } from "./prescription.js";
import { clone, instant, stableStringify } from "./util.js";

// A cache only skips already-proven historical issuance. It is weakly keyed by
// an immutable result object and never enters serialized state or policy data.
interface ProofCache {
  configFingerprint:string;
  eventReceipts:Map<string,string>;
  proofs:Map<string,{valid:boolean;receivedAt:number}>;
}
const validationCache=new WeakMap<EngineState,ProofCache>();

/** Reconstruct an accepted causal snapshot; latest corrections never rewrite its old inputs. */
export function checkedReplay(config:EngineConfig,events:EngineEvent[],asOf?:string,reuse?:EngineState):EngineState {
  const initial=structuralReplay(config,events,asOf);
  const memo=new Map<string,boolean>(), active=new Set<string>();
  const all=initial.events;
  const previousCache=reuse?validationCache.get(reuse):undefined;
  if(previousCache&&previousCache.configFingerprint===stableStringify(initial.config)) {
    const prior=previousCache.eventReceipts;
    const current=new Map(all.map(e=>[logicalFingerprint(e),e.receivedAt]));
    const unchanged=[...prior].every(([key,receipt])=>current.get(key)===receipt);
    const additions=all.filter(e=>!prior.has(logicalFingerprint(e)));
    if(unchanged)for(const [key,proof] of previousCache.proofs) {
      if(proof.valid&&additions.every(e=>instant(e.receivedAt)>proof.receivedAt))memo.set(key,true);
    }
  }
  function masked(state:EngineState,valid:(event:Extract<EngineEvent,{type:"prescription_issued"}>)=>boolean):EngineState {
    const issues=state.projection.authoritativeEvents.filter((e):e is Extract<EngineEvent,{type:"prescription_issued"}>=>e.type==="prescription_issued");
    const bad=issues.filter(e=>!valid(e));
    const invalidIds=new Set(bad.map(e=>e.id)), invalidPrescriptions=new Set(bad.map(e=>e.payload.prescription.id));
    state.projection.ineligibleEventIds=[...new Set([...state.projection.ineligibleEventIds,...invalidIds])].sort();
    state.projection.prescriptions=state.projection.prescriptions.filter(p=>!invalidPrescriptions.has(p.id));
    state.projection.authoritativeEvents=state.projection.authoritativeEvents.filter(e=>!invalidIds.has(e.id));
    state.projection.sets=state.projection.sets.map(s=>({...s,policyEligible:s.policyEligible&&!!s.prescriptionId&&!invalidPrescriptions.has(s.prescriptionId)}));
    return state;
  }
  function validIssue(e:Extract<EngineEvent,{type:"prescription_issued"}>):boolean {
    const key=logicalFingerprint(e);
    if(memo.has(key))return memo.get(key)!;
    if(active.has(key))return false;
    active.add(key);
    let valid=false;
    try {
      const p=e.payload.prescription;
      const dependencies=new Set(p.dependencyIds);
      if(dependencies.has(e.id))throw new Error("cyclic_issuance");
      if(p.dependencyIds.some(id=>!all.some(candidate=>candidate.id===id)))throw new Error("missing_issuance_dependency");
      // Declared predecessors may arrive after their dependent envelope. Receipt-
      // earlier events also participate so an acknowledgement cannot ignore a
      // relevant correction it already observed.
      const knownDependencies=new Set([...dependencies].filter(id=>all.some(other=>other.id===id&&instant(other.receivedAt)<=instant(e.receivedAt))));
      const causalEntities=new Set(all.filter(other=>dependencies.has(other.id)).map(other=>other.entityId));
      const snapshotEvents=all.filter(other=>other.id!==e.id && ((dependencies.has(other.id)&&(!knownDependencies.has(other.id)||instant(other.receivedAt)<=instant(e.receivedAt))) ||
        ((instant(other.receivedAt)<instant(e.receivedAt)||(instant(other.receivedAt)===instant(e.receivedAt)&&causalEntities.has(other.entityId))) && instant(other.occurredAt)<=instant(e.occurredAt))));
      // Tombstones and resolutions need their raw referenced records even when
      // those records are quarantined or otherwise supply no positive evidence.
      const included=new Set(snapshotEvents.map(logicalFingerprint));
      for(let i=0;i<snapshotEvents.length;i++) {
        const source=snapshotEvents[i]!;
        const references=new Set([...(source.dependencies??[]),...(source.previousEventId?[source.previousEventId]:[])]);
        if(source.type==="event_voided")references.add(source.payload.targetEventId);
        if(source.type==="stop_resolved")source.payload.stopEventIds.forEach(id=>references.add(id));
        if(source.type==="prescription_issued")source.payload.prescription.dependencyIds.forEach(id=>references.add(id));
        const visitId="visitId" in source.payload?source.payload.visitId:source.type==="prescription_issued"?source.payload.prescription.visitId:undefined;
        if(visitId)for(const target of all)if(target.type==="visit_started"&&target.payload.visitId===visitId)references.add(target.id);
        if(source.type==="set_recorded"&&source.payload.prescriptionId)for(const target of all)if(target.type==="prescription_issued"&&target.payload.prescription.id===source.payload.prescriptionId)references.add(target.id);
        if(source.type==="set_corrected")for(const target of all)if(target.type==="set_recorded"&&target.entityId===source.entityId)references.add(target.id);
        const candidates=source.type==="conflict_resolved"?new Set(source.payload.expectedCandidateKeys):undefined;
        for(const target of all)if(target.id!==e.id&&(references.has(target.id)||candidates?.has(logicalFingerprint(target)))) {
          // An implicit shared visit/entity reference cannot pull a later fork
          // into an older observation snapshot. Explicit dependencies that had
          // not arrived yet remain eligible; known IDs use their then-known data.
          const knownAtIssue=instant(target.receivedAt)<=instant(e.receivedAt);
          const declaredPending=dependencies.has(target.id)&&!knownDependencies.has(target.id);
          if(!knownAtIssue&&!declaredPending)continue;
          const targetKey=logicalFingerprint(target);
          if(!included.has(targetKey)){included.add(targetKey);snapshotEvents.push(target);}
        }
      }
      const snapshot=masked(structuralReplay(config,snapshotEvents,e.occurredAt),validIssue);
      const decision=recommendationCore(snapshot,{...clone(e.payload.context),now:e.occurredAt});
      const expected=decision.prescription;
      valid=!!expected && (decision.status==="proposal"||decision.status==="hold") && expected.id===p.id &&
        stableStringify(prescriptionContent(expected))===stableStringify(prescriptionContent(p));
    } catch {valid=false;}
    active.delete(key);memo.set(key,valid);return valid;
  }
  const result=masked(initial,validIssue);
  const receipts=new Map(all.map(e=>[logicalFingerprint(e),e.receivedAt]));
  validationCache.set(result,{
    configFingerprint:stableStringify(result.config),eventReceipts:receipts,
    proofs:new Map([...memo].filter(([key])=>receipts.has(key)).map(([key,valid])=>[key,{valid,receivedAt:instant(receipts.get(key)!)}]))
  });
  return result;
}
