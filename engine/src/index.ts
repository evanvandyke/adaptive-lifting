export * from "./types.js";
export { CATALOG, CATALOG_VERSION, POLICY_VERSION } from "./catalog.js";
export { identityKey, normalizeLoad, localDate as trainingDateAt } from "./util.js";
export { eventFingerprint, resolutionEntityId, createState } from "./journal.js";
import type { ApplyResult, EngineConfig, EngineEvent, EngineState, PlanContext, RecommendationContext } from "./types.js";
import { appendEvent } from "./journal.js";
import { checkedReplay } from "./authority.js";
import { recommendationCore } from "./prescription.js";
import { planVisit as planningCore, summarize as summaryCore } from "./planning.js";
import { clone, stableStringify } from "./util.js";

export function replay(config:EngineConfig,events:EngineEvent[],asOf?:string):EngineState {
  return checkedReplay(config,events,asOf);
}
export function applyEvent(state:EngineState,event:EngineEvent,observedAt?:string):ApplyResult {
  let input:EngineEvent;
  try {
    if(event===null||typeof event!=="object"||Array.isArray(event))throw new TypeError("invalid_event");
    input=JSON.parse(stableStringify(event)) as EngineEvent;
    if(observedAt!==undefined)input.receivedAt=observedAt;
  } catch(error) {return {status:"rejected",reasons:[(error as Error).message],state:clone(state)};}
  const result=appendEvent(state,input);
  if(result.status==="rejected")return result;
  result.state=checkedReplay(result.state.config,result.state.events,undefined,state);
  if(result.state.projection.ineligibleEventIds.includes(input.id))result.reasons=[...result.reasons,"ineligible_policy_or_causal_event"];
  return result;
}
export function recommendExercise(state:EngineState,context:RecommendationContext) {
  return recommendationCore(checkedReplay(state.config,state.events,context.now,state),context);
}
export function planVisit(state:EngineState,context:PlanContext) {
  return planningCore(checkedReplay(state.config,state.events,context.now,state),context);
}
export function summarize(state:EngineState,asOf?:string) {
  return summaryCore(checkedReplay(state.config,state.events,asOf??state.observedAt??undefined,state),asOf);
}
