export type Unit = "lb" | "kg";
export type Setting = "gym" | "home";
export type Template = "A" | "B" | "HOME";
export type LoadingMode = "bodyweight" | "external" | "added";
export type Convention = "total" | "per_hand" | "machine";
export type VariantId =
  | "db_flat_press" | "db_incline_press" | "db_supported_row" | "db_rdl"
  | "goblet_squat" | "back_squat" | "lat_pulldown" | "db_lateral_raise"
  | "loaded_calf_raise" | "loaded_split_squat" | "air_squat" | "calf_raise"
  | "split_squat" | "glute_bridge" | "dead_bug" | "wall_pushup"
  | "incline_pushup" | "knee_pushup" | "floor_pushup"
  | "single_leg_bridge" | "single_leg_calf";
export interface Load { amountMilli: number; unit: Unit }
export interface Identity {
  variant: VariantId;
  setupId: string;
  /** Required for nominal machine stacks; omitted for free weights/bodyweight. */
  machineUnit?: Unit;
}
export interface Inventory {
  verified: boolean;
  equipment: string[];
  loads: Load[];
}
export interface EngineConfig {
  timeZone: string;
  policyVersion?: string;
  catalogVersion?: string;
}
export interface ResolvedConfig {
  timeZone: string;
  policyVersion: string;
  catalogVersion: string;
}
export interface CatalogEntry {
  id: VariantId;
  movement: string;
  loadingMode: LoadingMode;
  convention: Convention;
  floor: number;
  ceiling: number;
  perSide: boolean;
  priority: boolean;
  equipment: string[];
  starterLb?: number;
  firstCeilingLb?: number;
  firstStepLb?: number;
  coarsePercent: number;
  coarseLb: number;
  rollingPercent: number;
  rollingLb: number;
  alternatives: VariantId[];
  harder: VariantId[];
}
export type Feedback = "easy" | "manageable" | "hard" | "unknown";
export type Reps = number | { left: number; right: number };
export interface Actual {
  reps: Reps;
  load: Load | null;
  completed: boolean;
  feedback?: Feedback;
  cause?: "effort" | "unknown" | "equipment" | "time" | "interruption";
  timingQuality?: "measured" | "reported" | "unknown";
  pain?: boolean;
  controlLost?: boolean;
  interrupted?: boolean;
  shortRecovery?: boolean;
  preFatigued?: boolean;
}
export type SetRole = "warmup" | "calibration" | "working" | "return_check";
export interface Prescription {
  id: string;
  visitId: string;
  identity: Identity;
  load: Load | null;
  targets: number[];
  roles: SetRole[];
  kind: "calibration" | "working" | "return";
  source: string;
  provisional: boolean;
  extrasAllowed: boolean;
  preparationRequired: boolean;
  recoverySeconds: number;
  /** Zero for a trial; otherwise the approved total working slots this visit. */
  workingSetBudget: number;
  policyVersion: string;
  issuedAt: string;
  dependencyIds: string[];
  dependencyFingerprint: string;
  context: "paired" | "straight";
  /** Remaining slots of an immutable original prescription, never extra work. */
  replacement?: { rootPrescriptionId: string; setIndices: number[] };
}
export interface RecommendationContext {
  visitId: string;
  identity: Identity;
  now: string;
  inventory: Inventory;
  /** Time still available for this trial/work, including necessary recovery. */
  remainingSeconds?: number;
  context?: "paired" | "straight";
  /** Explicitly request the next eligible same-exercise load trial. */
  requestTrial?: boolean;
  /** Decline an upward proposal and retain an otherwise eligible baseline. */
  declineIncrease?: boolean;
  /** Explicitly assess a previously recorded manual actual load. */
  assessManualLoad?: Load;
  plannedSets?: number;
  shortened?: boolean;
}
export interface Decision {
  status: "proposal" | "needs_setup" | "needs_calibration" | "hold" | "stop" | "needs_migration";
  reasons: string[];
  prerequisites: string[];
  prescription?: Prescription;
  alternatives?: VariantId[];
  baseline?: { load: Load | null; targets: number[]; establishedAt: string };
  counters?: { successes: number; difficulty: number; failedTrialDates: number };
  stateRevision: number;
  stopEventIds?: string[];
}
interface EventBase {
  id: string;
  entityId: string;
  revision: number;
  occurredAt: string;
  /** Trusted adapter observation, excluded from logical payload fingerprints. */
  receivedAt: string;
  policyVersion: string;
  previousEventId?: string;
  dependencies?: string[];
}
export type EngineEvent = EventBase & (
  | { type: "visit_started"; payload: { visitId: string; setting: Setting; template: Template; timeZone: string; trainingDate: string; plannedIdentities?: Identity[] } }
  | { type: "visit_ended"; payload: { visitId: string } }
  | { type: "rehearsal_confirmed"; payload: { visitId: string; identity: Identity; controlled: boolean } }
  | { type: "preparation_confirmed"; payload: { visitId: string; identity: Identity; recoveryConfirmed?: boolean } }
  | { type: "recovery_reported"; payload: { visitId: string; feedback: "manageable" | "unknown" | "difficult" } }
  | { type: "movement_stopped"; payload: { visitId: string; identity: Identity; reason: "pain" | "control_loss" } }
  | { type: "stop_resolved"; payload: { visitId: string; identity: Identity; acknowledged: boolean; stopEventIds: string[] } }
  | { type: "prescription_issued"; payload: { context: RecommendationContext; prescription: Prescription; expectedStateRevision: number } }
  | { type: "set_recorded"; payload: { visitId: string; identity: Identity; prescriptionId?: string; setIndex?: number; role: SetRole; startedAt: string; endedAt: string; actual: Actual } }
  | { type: "set_corrected"; payload: { actual: Actual } }
  | { type: "event_voided"; payload: { targetEventId: string; reason: string } }
  | { type: "conflict_resolved"; payload: { targetEntityId: string; targetRevision: number; expectedCandidateKeys: string[]; selectedCandidateKey: string } }
);
export interface Conflict {
  entityId: string;
  revision: number;
  candidateKeys: string[];
}
export interface VisitView {
  id: string;
  setting: Setting;
  template: Template;
  startedAt: string;
  date: string;
  endedAt?: string;
  lastActivityAt: string;
  plannedIdentities: Identity[];
}
export interface SetView {
  id: string;
  eventId: string;
  revision: number;
  visitId: string;
  identity: Identity;
  prescriptionId?: string;
  setIndex?: number;
  role: SetRole;
  startedAt: string;
  endedAt: string;
  actual: Actual;
  originalActual: Actual;
  issued?: Prescription;
  dependencyChanged: boolean;
  policyEligible: boolean;
}
export interface Projection {
  visits: VisitView[];
  sets: SetView[];
  prescriptions: Prescription[];
  authoritativeEvents: EngineEvent[];
  conflicts: Conflict[];
  pendingEventIds: string[];
  unsupportedEventIds: string[];
  invalidEventIds: string[];
  quarantinedEventIds: string[];
  voidedEventIds: string[];
  ineligibleEventIds: string[];
}
export interface EngineState {
  config: ResolvedConfig;
  events: EngineEvent[];
  revision: number;
  observedAt: string | null;
  projection: Projection;
}
export interface ApplyResult {
  status: "accepted" | "duplicate" | "conflict" | "rejected";
  reasons: string[];
  state: EngineState;
}
export interface PlanContext {
  now: string;
  setting: Setting;
  budgetSeconds?: number;
  straightSets?: boolean;
  /** Verified proposed identities and inventory; selection never invents setup. */
  identities: Identity[];
  inventories: Record<string, Inventory>;
  visitId?: string;
  desiredSets?: number;
  recoveryFeedback?: "manageable" | "unknown" | "difficult";
}
export interface VisitPlan {
  status: "proposal" | "hold" | "needs_setup" | "needs_migration";
  template: Template;
  reasons: string[];
  exercises: { identity: Identity; sets: number; block: number; priority: boolean }[];
  estimatedSeconds: number;
  omitted: Identity[];
  missingCoverage: string[];
  recoverySuggestedUntil?: string;
}
export interface Summary {
  attendanceDates: string[];
  nextGymTemplate: "A" | "B";
  completedVisits: number;
  partialVisits: number;
  calibrationVisits: number;
  confirmedWorkingSets: number;
  calibrationSets: number;
  bodyweightReps: number;
  externalTonnageByConvention: Record<string, number>;
  conflicts: number;
  pending: number;
}
