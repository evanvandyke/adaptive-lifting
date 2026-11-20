'use client';
import { useEffect, useMemo, useReducer } from 'react';
import { blockName, EXERCISES, REST, type Block, type Exercise, type ExerciseId, type Plan, type Step } from './visit-data';

/** Where the visit is. `rest` only happens after a set that has rest; superset partners go `set` to `set`. */
export type Phase = 'start' | 'set' | 'rest' | 'finish';
/** A logged set against last visit's same set. Heavier beats, lighter is under; at the same weight the reps decide. */
export type Comparison = 'beat' | 'matched' | 'under' | 'none';
/** The last three happen only on a first visit: a try was logged and another follows, a starting point was found, a lift gave way to an easier one. */
export type EventKind = 'set' | 'block' | 'finish' | 'undo' | 'fix' | 'trial' | 'found' | 'easier';

/** The numbers on screen for the set on deck, before he confirms them. */
export interface Draft { weight: number; reps: number }

export interface LoggedSet {
  stepIndex: number;
  /** The lift that was actually done: the plan's, or the alternative it was swapped for. */
  exerciseId: ExerciseId;
  /** 0 for bodyweight. */
  weight: number;
  reps: number;
  /** When it was confirmed, `Date.now()` milliseconds. */
  at: number;
  comparison: Comparison;
  /** He passed on this set: no reps, and it counts for nothing. */
  skipped?: boolean;
  /** A try he called right: it is set one of the lift. */
  fromTry?: boolean;
}

/* ---------- a lift that is new ---------- */

/** What he said about a try: step up, stay here, or come back down. */
export type TrialAnswer = 'heavier' | 'right' | 'tooHeavy';
/** At most this many tries at one lift. */
export const TRIES_MAX = 3;

/** A try at a starting weight (`trial`), or a check set (`check`). A try he calls right is also logged as set one; any other is not a working set. */
export interface Trial {
  kind: 'trial' | 'check';
  exerciseId: ExerciseId;
  /** 1 to 3 for a try; 1 for a check. */
  tryNumber: number;
  weight: number;
  /** The reps he did: the try's target until corrected, or the count he saved for a check. */
  reps: number;
  /** null for a check. */
  answer: TrialAnswer | null;
  at: number;
}

/** Where a lift starts, found today. `how` is the same word as `Step.firstUse`. */
export interface Found { weight: number; reps: number; how: 'trial' | 'check' | 'first' | 'swap' | 'lightest' | 'under' | 'eased' }

/**
 * What stands between him and the working set on deck, on a first visit. `rehearse`: do the lift with no weight.
 * `trial`: a try at `draft.weight` for `draft.reps`, answered with `answerTrial`. `check`: a check set of up to
 * `draft.reps`, ended with `saveCheck`. While a setup is up, `confirm`, `swap` and the steppers do nothing.
 * Between two tries the phase is `rest` and the setup is the try to come.
 */
export interface Setup {
  kind: 'rehearse' | 'trial' | 'check';
  exerciseId: ExerciseId;
  /** The try on deck, 1 to `triesMax`; 0 while rehearsing. */
  tryNumber: number;
  triesMax: number;
  /** The lift whose first try was too heavy and that this easier one stands in for, or null. */
  easierThan: ExerciseId | null;
  /** The heaviest weight that went well so far, or null before any has. */
  lastGood: number | null;
  /** A try that cannot be followed by a heavier one (the third, or the heaviest a first visit may reach): "heavier" is not an answer to it. */
  lastTry: boolean;
}

/** The running rest. All three move when rest is added. */
export interface Rest {
  startedAt: number;
  /** The timestamp the clock counts to. */
  endsAt: number;
  /** Whole seconds from start to end, for a fraction. */
  total: number;
}

/** What just happened, so a view can play the matching moment once. Key effects and animations on `id`. */
export interface VisitEvent {
  /** Goes up by one with every event and is never reused, not even after a reset or a jump. */
  id: number;
  /** `set`: a set was logged. `block`: that set finished its block. `finish`: it finished the visit (and the last block). `undo`: the last set was taken back. `fix`: the last logged set's reps were corrected in place. */
  kind: EventKind;
  at: number;
  /** The step that was logged, taken back or corrected. */
  stepIndex: number;
  blockIndex: number;
  /** The logged set against last time (recomputed on a `fix`); `none` on an undo. */
  comparison: Comparison;
}

export interface Count { done: number; total: number; complete: boolean }
export type StepStatus = 'logged' | 'current' | 'ahead';

export interface Progress {
  /** The whole visit: sets logged of ten. */
  visit: Count;
  /** The block and the exercise of `focusStep`. */
  block: Count;
  exercise: Count;
  /** Every block, in order, and every exercise by id. */
  blocks: Count[];
  exercises: Record<ExerciseId, Count>;
  /** How many of the three blocks are finished. */
  blocksDone: number;
  /** One status per step, in order: ten countable things. `current` is the step on deck; none at the finish. */
  steps: StepStatus[];
}

export interface VisitActions {
  /** Start screen to the first set. */
  start: () => void;
  /** Reps up or down by `delta`, held to 0 to 30. */
  adjustReps: (delta: number) => void;
  /** Weight up or down by `steps` real steps (5 lb), held to the exercise's range. Does nothing for bodyweight. */
  adjustWeight: (steps: number) => void;
  /** Log the set on deck with the draft's numbers. Ignored for 600 ms after a start, a confirm or a `startNext`. */
  confirm: () => void;
  /**
   * Take back the last logged set and return to it with its numbers. Ignored for 600 ms after the confirm.
   * On a first visit, when the last thing he did was a try or a check set (`lastDone` is `trial`), it takes that
   * back instead and returns to the screen he answered it on.
   */
  undo: () => void;
  /**
   * Correct the reps of the last logged set in place, by `deltaReps`, held to 0 to 30. Its comparison is recomputed and a
   * `fix` event is emitted. The phase, the step on deck and the rest clock do not move. Allowed until the next set is
   * confirmed (the same window as `undo`, shown by `canUndo`), and never for a set a demo jump filled in.
   * When `lastDone` is `trial` it corrects that try or check instead; a corrected check moves the starting reps with it.
   */
  adjustLastLogged: (deltaReps: number) => void;
  /**
   * Swap the lift on deck for one of `swapOptions`: an alternative, or the plan's own lift to swap back. The sets
   * of that lift still to come use it; sets already logged keep the lift they were done with. The draft becomes the
   * new lift's own numbers, never the replaced lift's weight. Works in `set` and `rest`; the rest clock keeps running.
   * No event and no tap guard.
   */
  swap: (to: ExerciseId) => void;
  /** Move the end of the running rest by `seconds` (negative shortens). After the clock has ended it counts from now. */
  addRest: (seconds: number) => void;
  /** Leave the rest for the next set, at any time. Ignored for 600 ms after the confirm that began the rest, so a double tap on a control that sits where Done was cannot skip it. */
  startNext: () => void;
  /** First visit: he has tried the lift with no weight. Leads to the first try, the check set, or (bodyweight) straight to its sets. Guarded like `confirm`. */
  rehearsed: () => void;
  /** First visit: log the try on deck with his answer. Guarded like `confirm`. */
  answerTrial: (answer: TrialAnswer) => void;
  /**
   * First visit at home: log the check set with the reps he got. His sets start two fewer, held to the top of the
   * lift's range. A count under the low end is not a find: the lift's `easier` takes its place and is rehearsed, or,
   * with none, his sets start one fewer than he got.
   */
  saveCheck: (reps: number) => void;
  /** Pass on the set on deck: it is logged with no reps and the visit moves on, with no rest. A lift still being set up starts at its lightest numbers. */
  skip: () => void;
  /** Stop here. With something logged the visit finishes as it stands; with nothing logged it goes back to the start. */
  endEarly: () => void;
  /** Something hurts on the lift on deck: it is noted for next time. With `lighter`, a minute and a half of rest and one step lighter (two reps fewer with no weight). */
  hurts: (lighter: boolean, id?: ExerciseId) => void;
  /** Back to the start screen with nothing logged. */
  reset: () => void;
}

export interface Visit extends VisitActions {
  /** The plan being run: Workout A, or the home workout. */
  plan: Plan;
  /** Everything about the visit as plain data, to save and to hand back as `saved`. */
  snapshot: VisitState;
  /** Lifts he said hurt today. */
  hurt: readonly ExerciseId[];
  /** He stopped before the last set. */
  endedEarly: boolean;
  /**
   * The visit's steps as they stand now: the plan's, with swapped lifts in place. A logged step shows the lift it
   * was done with; a step still to come shows the lift it will be done with. Same length and order as `plan.steps`.
   */
  steps: readonly Step[];
  /** The plan's blocks, named for the lifts actually in them: after a swap, "Goblet squat done", "Push-up and row done". */
  blocks: readonly Block[];
  /**
   * What the lift on deck can be swapped for, in the order "Show another" steps through: the plan's own lift first,
   * then its alternatives. Empty when the plan's lift has no alternative, and outside `set` and `rest`.
   */
  swapOptions: readonly ExerciseId[];
  phase: Phase;
  /** 0 to 9: the step on deck. In `rest` this is already the step he is resting toward; at the finish it stays on the last step. */
  stepIndex: number;
  draft: Draft;
  /** Logged sets in order; `logged[i]` is step `i`. */
  logged: readonly LoggedSet[];
  rest: Rest | null;
  lastEvent: VisitEvent | null;
  /** `Date.now()` at Start, or null on the start screen. */
  startedAt: number | null;
  finishedAt: number | null;
  /** The clock every derived value was computed from. Updated by actions, a one-second tick and a return to visibility. */
  now: number;

  /** The step on deck, its exercise, its block, and its superset partner (null when done alone). */
  step: Step;
  exercise: Exercise;
  block: Block;
  partner: Exercise | null;
  /** The step after `step`, or null. */
  nextStep: Step | null;
  /** What to show as "Up next": `step` on the start screen and during a rest, `nextStep` during a set, null at the finish. */
  upNext: Step | null;
  /** The most recent logged set, or null. */
  lastLogged: LoggedSet | null;
  /** First visit: what is in the way of the set on deck, or null. Always null on an ordinary visit. */
  setup: Setup | null;
  /** First visit: every try and check set so far, in order. */
  trials: readonly Trial[];
  lastTrial: Trial | null;
  /** Which he did most recently: a working set, or a try or check. null before either. */
  lastDone: 'set' | 'trial' | null;
  /** True when `undo` would take back the last try or check. */
  canUndoTrial: boolean;
  /** First visit: where each lift starts, as found so far. */
  found: Readonly<Partial<Record<ExerciseId, Found>>>;
  /** The step `progress.block` and `progress.exercise` describe: the step on deck during a set, the step just logged during a rest and at the finish. */
  focusStep: Step;
  progress: Progress;
  /** Whole seconds left on the rest clock, rounded up; 0 outside a rest. */
  restRemaining: number;
  restTotal: number;
  /** Share of the rest that has passed, 0 to 1. */
  restFraction: number;
  /** In `rest` with the clock at zero: "Ready when you are". */
  restOver: boolean;
  /** True when `undo` has a set to take back. The 600 ms guard is not reflected here: an early tap is quietly dropped. */
  canUndo: boolean;
  /** Whole seconds since Start; frozen at the finish. */
  elapsedSeconds: number;
  /** What the steppers can still do, for `aria-disabled`. `weight` is false for bodyweight. */
  can: { repsDown: boolean; repsUp: boolean; weightDown: boolean; weightUp: boolean; weight: boolean };
}

export const REPS_MIN = 0;
export const REPS_MAX = 30;
/** A second tap inside this window is treated as the same tap. */
export const GUARD_MS = 600;
/** `reset` is ignored for this long after the visit finishes. */
export const FINISH_GUARD_MS = 1500;
/** Rest given when something hurts, before a lighter go. */
const HURT_REST_SECONDS = 90;

export type VisitState = State;

interface State {
  plan: Plan;
  hurt: ExerciseId[];
  endedEarly: boolean;
  /** Swaps in force, by the plan's lift: the sets of that lift still to come are done as the value. */
  swaps: Partial<Record<ExerciseId, ExerciseId>>;
  phase: Phase;
  stepIndex: number;
  draft: Draft;
  logged: LoggedSet[];
  rest: Rest | null;
  lastEvent: VisitEvent | null;
  startedAt: number | null;
  finishedAt: number | null;
  now: number;
  /** `confirm` is ignored before this time. */
  guardUntil: number;
  /** Events so far. Survives a reset and a jump, so an event id is never reused. */
  seq: number;
  setup: Setup | null;
  trials: Trial[];
  found: Partial<Record<ExerciseId, Found>>;
  /** The state just before the last try or check was answered, for `undo`. */
  beforeTrial: State | null;
}

type Action = (
  | { type: 'start'; at: number }
  | { type: 'adjustReps'; delta: number }
  | { type: 'adjustWeight'; steps: number }
  | { type: 'confirm'; at: number }
  | { type: 'undo'; at: number }
  | { type: 'adjustLastLogged'; at: number; delta: number }
  | { type: 'swap'; to: ExerciseId }
  | { type: 'addRest'; at: number; seconds: number }
  | { type: 'startNext'; at: number }
  | { type: 'rehearsed'; at: number }
  | { type: 'answerTrial'; at: number; answer: TrialAnswer }
  | { type: 'saveCheck'; at: number; reps: number }
  | { type: 'skip'; at: number }
  | { type: 'endEarly'; at: number }
  | { type: 'hurts'; at: number; lighter: boolean; id: ExerciseId | null }
  | { type: 'tick'; at: number }
  | { type: 'reset'; at: number }
// Every action carries the plan the hook was called with: a state built for another plan starts over first.
) & { plan: Plan };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function compare(step: Step, weight: number, reps: number): Comparison {
  if (!step.last) return 'none';
  // No reps is never a win, whatever was on the bar.
  if (reps === 0) return 'under';
  if (weight !== step.last.weight) return weight > step.last.weight ? 'beat' : 'under';
  if (reps === step.last.reps) return 'matched';
  return reps > step.last.reps ? 'beat' : 'under';
}

type Swaps = State['swaps'];

type Finds = State['found'];

/**
 * The step at `index` as it stands: the lift it was logged with, or (still to come) the lift a swap has put there.
 * A swapped step carries the other lift's own numbers. A lift whose start was found today carries what was found.
 */
function stepAt(plan: Plan, swaps: Swaps, logged: readonly LoggedSet[], index: number, found: Finds = {}): Step {
  const steps = plan.steps;
  const base = steps[index];
  const idAt = (at: number) => (at < logged.length ? logged[at].exerciseId : swaps[steps[at].exerciseId] ?? steps[at].exerciseId);
  const exerciseId = idAt(index);
  // The partner is the other set of the same round: the one before if this set ends the round, else the one after.
  const partnerId = base.partnerId === null ? null : idAt(base.endsRound ? index - 1 : index + 1);
  let step = base;
  if (exerciseId !== base.exerciseId) {
    const numbers = plan.lifts[exerciseId];
    const lastReps = numbers.last?.reps[Math.min(base.setNumber, numbers.last.reps.length) - 1];
    step = {
      ...base, exerciseId, partnerId, target: { weight: numbers.weight, reps: numbers.reps },
      last: numbers.last && lastReps !== undefined ? { weight: numbers.last.weight, reps: lastReps } : null,
      note: numbers.note, swappedFrom: base.exerciseId, firstUse: numbers.last ? null : 'swap',
    };
  } else if (partnerId !== base.partnerId) {
    step = { ...base, partnerId };
  }
  const find = found[exerciseId];
  return find ? { ...step, target: { weight: find.weight, reps: find.reps }, last: null, note: 'held', firstUse: find.how } : step;
}

/** The lift the step at `index` will be done with. */
function liftAt(state: State, index: number, swaps: Swaps = state.swaps): ExerciseId {
  const planned = state.plan.steps[index].exerciseId;
  return index < state.logged.length ? state.logged[index].exerciseId : swaps[planned] ?? planned;
}

/** A lift that has never been done, and has not been found or started today, is rehearsed before its first set. */
function setupFor(state: Pick<State, 'plan' | 'logged' | 'swaps' | 'found'>, index: number, found: Finds = state.found, swaps: Swaps = state.swaps, easierThan: ExerciseId | null = null): Setup | null {
  const planned = state.plan.steps[index].exerciseId;
  const exerciseId = index < state.logged.length ? state.logged[index].exerciseId : swaps[planned] ?? planned;
  const intro = state.plan.lifts[exerciseId].intro;
  if (intro !== 'trials' && intro !== 'check') return null;
  if (found[exerciseId] || state.logged.some(set => set.exerciseId === exerciseId && !set.skipped)) return null;
  return { kind: 'rehearse', exerciseId, tryNumber: 0, triesMax: TRIES_MAX, easierThan, lastGood: null, lastTry: false };
}

const lastOf = <T,>(items: readonly T[]): T | null => items[items.length - 1] ?? null;
/** Which he did most recently: a working set, or a try or check. */
function lastDone(state: Pick<State, 'logged' | 'trials'>): 'set' | 'trial' | null {
  const set = lastOf(state.logged);
  const trial = lastOf(state.trials);
  if (!trial) return set ? 'set' : null;
  return set && set.at >= trial.at ? 'set' : 'trial';
}

/** A step opens at its target reps, and at the weight he last logged for that same lift today (a correction carries forward). */
function draftFor(step: Step, logged: readonly LoggedSet[]): Draft {
  let weight = step.target.weight;
  for (const set of logged) if (set.exerciseId === step.exerciseId && !set.skipped) weight = set.weight;
  // Eased because it hurt: never back above the lighter weight.
  if (step.firstUse === 'eased') weight = Math.min(weight, step.target.weight);
  return { weight, reps: step.target.reps };
}

function initial(plan: Plan, seq: number): State {
  return {
    plan, hurt: [], endedEarly: false,
    swaps: {}, phase: 'start', stepIndex: 0, draft: draftFor(plan.steps[0], []), logged: [], rest: null, lastEvent: null,
    startedAt: null, finishedAt: null, now: 0, guardUntil: 0, seq,
    setup: null, trials: [], found: {}, beforeTrial: null,
  };
}

/** Stamp the next state with what just happened. */
function withEvent(next: State, kind: EventKind, at: number, stepIndex: number, comparison: Comparison): State {
  const id = next.seq + 1;
  return { ...next, seq: id, lastEvent: { id, kind, at, stepIndex, blockIndex: next.plan.steps[stepIndex].blockIndex, comparison } };
}

function reduce(given: State, action: Action): State {
  // A new plan replaces the one on the start screen. A visit under way keeps the plan it started with.
  const state = given.phase !== 'start' || given.plan.id === action.plan.id ? given : initial(action.plan, given.seq);
  const steps = state.plan.steps;
  const numbersOf = (id: ExerciseId) => ({ weight: state.plan.lifts[id].weight, reps: state.plan.lifts[id].reps });
  const at = (index: number, logged: readonly LoggedSet[] = state.logged, swaps: Swaps = state.swaps, found: Finds = state.found) => stepAt(state.plan, swaps, logged, index, found);
  switch (action.type) {
    case 'start': {
      if (state.phase !== 'start') return state;
      return { ...state, phase: 'set', startedAt: action.at, now: action.at, guardUntil: action.at + GUARD_MS, setup: setupFor(state, 0) };
    }
    case 'adjustReps': {
      if ((state.phase !== 'set' && state.phase !== 'rest') || state.setup) return state;
      const reps = clamp(Math.round(state.draft.reps + action.delta), REPS_MIN, REPS_MAX);
      return reps === state.draft.reps ? state : { ...state, draft: { ...state.draft, reps } };
    }
    case 'adjustWeight': {
      if ((state.phase !== 'set' && state.phase !== 'rest') || state.setup) return state;
      const { weightStep, weightMin, weightMax } = EXERCISES[at(state.stepIndex).exerciseId];
      if (weightStep === 0) return state;
      const weight = clamp(state.draft.weight + Math.round(action.steps) * weightStep, weightMin, weightMax);
      return weight === state.draft.weight ? state : { ...state, draft: { ...state.draft, weight } };
    }
    case 'confirm': {
      if (state.phase !== 'set' || state.setup || action.at < state.guardUntil) return state;
      const step = at(state.stepIndex);
      const comparison = compare(step, state.draft.weight, state.draft.reps);
      const logged: LoggedSet[] = [...state.logged, {
        stepIndex: step.index, exerciseId: step.exerciseId, weight: state.draft.weight, reps: state.draft.reps,
        at: action.at, comparison,
      }];
      const base: State = { ...state, logged, now: action.at, guardUntil: action.at + GUARD_MS };
      if (step.index === steps.length - 1) {
        return withEvent({ ...base, phase: 'finish', rest: null, finishedAt: action.at }, 'finish', action.at, step.index, comparison);
      }
      // A lift that is new comes up with its rehearsal, and that takes the place of the rest.
      const setup = setupFor(base, step.index + 1);
      const seconds = setup ? 0 : step.restAfter.seconds;
      return withEvent({
        ...base, setup,
        phase: seconds > 0 ? 'rest' : 'set',
        stepIndex: step.index + 1,
        draft: draftFor(at(step.index + 1, logged), logged),
        rest: seconds > 0 ? { startedAt: action.at, endsAt: action.at + seconds * 1000, total: seconds } : null,
      }, step.endsBlock ? 'block' : 'set', action.at, step.index, comparison);
    }
    case 'undo': {
      if (state.phase !== 'start' && lastDone(state) === 'trial') {
        // Back to the screen the try was answered on, as it was. Only while nothing has been logged around it.
        const before = state.beforeTrial;
        const trial = lastOf(state.trials);
        if (!before || !trial || before.logged.length !== state.logged.length || action.at - trial.at < GUARD_MS) return state;
        return withEvent({ ...before, seq: state.seq, now: action.at, guardUntil: action.at + GUARD_MS }, 'undo', action.at, before.stepIndex, 'none');
      }
      const last = state.logged[state.logged.length - 1];
      if (state.phase === 'start' || !last || action.at - last.at < GUARD_MS) return state;
      // He comes back to the lift he did. If the lift was swapped after this set, the swap goes back with it.
      const planned = steps[last.stepIndex].exerciseId;
      const swaps: Swaps = { ...state.swaps };
      if (last.exerciseId === planned) delete swaps[planned];
      else swaps[planned] = last.exerciseId;
      const rest = state.logged.slice(0, -1);
      return withEvent({
        ...state, swaps,
        // A skipped set holds no numbers of its own: the step comes back at its target.
        phase: 'set', stepIndex: last.stepIndex, setup: null,
        draft: last.skipped ? draftFor(at(last.stepIndex, rest, swaps), rest) : { weight: last.weight, reps: last.reps },
        logged: rest, rest: null, finishedAt: null, endedEarly: false, now: action.at,
      }, 'undo', action.at, last.stepIndex, 'none');
    }
    case 'adjustLastLogged': {
      if (state.phase !== 'start' && lastDone(state) === 'trial') {
        const trial = state.trials[state.trials.length - 1];
        const reps = clamp(Math.round(trial.reps + action.delta), REPS_MIN, REPS_MAX);
        if (reps === trial.reps) return state;
        const trials = [...state.trials.slice(0, -1), { ...trial, reps }];
        // A check set decides where the lift starts: correct the count and the start moves with it.
        const find = state.found[trial.exerciseId];
        if (trial.kind !== 'check' || !find || (find.how !== 'check' && find.how !== 'under')) return withEvent({ ...state, trials }, 'fix', action.at, state.stepIndex, 'none');
        const found: Finds = { ...state.found, [trial.exerciseId]: { ...find, ...startAfterCheck(EXERCISES[trial.exerciseId], reps) } };
        const untouched = !state.setup && !state.logged.some(set => set.exerciseId === trial.exerciseId) && at(state.stepIndex).exerciseId === trial.exerciseId;
        const draft = untouched ? draftFor(at(state.stepIndex, state.logged, state.swaps, found), state.logged) : state.draft;
        return withEvent({ ...state, trials, found, draft }, 'fix', action.at, state.stepIndex, 'none');
      }
      const last = state.logged[state.logged.length - 1];
      if (state.phase === 'start' || !last || last.skipped) return state;
      const reps = clamp(Math.round(last.reps + action.delta), REPS_MIN, REPS_MAX);
      if (reps === last.reps) return state;
      const comparison = compare(at(last.stepIndex), last.weight, reps);
      // Only the logged set changes: where he is, the rest clock and the tap guard stay as they were.
      return withEvent(
        { ...state, logged: [...state.logged.slice(0, -1), { ...last, reps, comparison }] },
        'fix', action.at, last.stepIndex, comparison,
      );
    }
    case 'swap': {
      if (state.phase !== 'set' && state.phase !== 'rest') return state;
      const planned = steps[state.stepIndex].exerciseId;
      if (action.to !== planned && !EXERCISES[planned].alternatives.includes(action.to)) return state;
      if ((state.swaps[planned] ?? planned) === action.to) return state;
      const swaps: Swaps = { ...state.swaps };
      if (action.to === planned) delete swaps[planned];
      else swaps[planned] = action.to;
      if (state.setup) {
        // Swapped away while the lift was still being set up: the new lift is set up in its turn, if it is new too.
        // A rest between tries has nothing left to wait for.
        const setup = setupFor(state, state.stepIndex, state.found, swaps);
        return { ...state, swaps, setup, phase: 'set', rest: null, draft: draftFor(at(state.stepIndex, state.logged, swaps), state.logged) };
      }
      // A new lift swapped in mid-visit needs no setup: it starts at its lightest numbers, marked as a first try.
      const intro = state.plan.lifts[action.to].intro;
      const found: Finds = (intro === 'trials' || intro === 'check') && !state.found[action.to]
        ? { ...state.found, [action.to]: { ...numbersOf(action.to), how: 'swap' } }
        : state.found;
      // The new lift's own numbers. Where he is and the rest clock stay as they were.
      return { ...state, swaps, found, draft: draftFor(at(state.stepIndex, state.logged, swaps, found), state.logged) };
    }
    case 'addRest': {
      if (state.phase !== 'rest' || !state.rest) return state;
      const endsAt = Math.max(action.at, Math.max(state.rest.endsAt, action.at) + action.seconds * 1000);
      const total = Math.max(0, Math.round((endsAt - state.rest.startedAt) / 1000));
      return { ...state, rest: { ...state.rest, endsAt, total }, now: action.at };
    }
    case 'startNext': {
      if (state.phase !== 'rest' || action.at < state.guardUntil) return state;
      return { ...state, phase: 'set', rest: null, now: action.at, guardUntil: action.at + GUARD_MS };
    }
    case 'rehearsed': {
      const { setup } = state;
      if (!setup || setup.kind !== 'rehearse' || state.phase !== 'set' || action.at < state.guardUntil) return state;
      const exercise = EXERCISES[setup.exerciseId];
      const base: State = { ...state, now: action.at, guardUntil: action.at + GUARD_MS };
      // No weight to find: one check set of up to the top of the range.
      if (state.plan.lifts[exercise.id].intro === 'check' || !exercise.first) {
        return { ...base, setup: { ...setup, kind: 'check', tryNumber: 1, triesMax: 1, lastTry: true }, draft: { weight: 0, reps: exercise.range[1] } };
      }
      // A weighted lift: the first try, at the lightest weight, for the low end of the range.
      const { starter, step, ceiling } = exercise.first;
      return { ...base, setup: { ...setup, kind: 'trial', tryNumber: 1, lastTry: starter + step > ceiling }, draft: { weight: starter, reps: exercise.range[0] } };
    }
    case 'answerTrial': {
      const { setup } = state;
      if (!setup || setup.kind !== 'trial' || state.phase !== 'set' || action.at < state.guardUntil) return state;
      const exercise = EXERCISES[setup.exerciseId];
      const first = exercise.first ?? { starter: 0, ceiling: 0, step: 0 };
      const { weight, reps } = state.draft;
      const trials: Trial[] = [...state.trials, { kind: 'trial', exerciseId: exercise.id, tryNumber: setup.tryNumber, weight, reps, answer: action.answer, at: action.at }];
      const base: State = { ...state, trials, beforeTrial: { ...state, beforeTrial: null }, now: action.at, guardUntil: action.at + GUARD_MS };
      // He has just worked: whatever the try settles, the lift's first set comes up in rest mode, as after a block.
      const restFor = () => {
        const { seconds } = steps[state.stepIndex].partnerId ? REST.afterRound : REST.afterStraightSet;
        return { startedAt: action.at, endsAt: action.at + seconds * 1000, total: seconds };
      };
      // `trial`: a starting weight was found (event `found`). `lightest`: nothing lighter to offer, so no find is claimed (event `trial`).
      const settle = (start: number, how: 'trial' | 'lightest'): State => {
        const found: Finds = { ...state.found, [exercise.id]: { weight: start, reps: exercise.range[0], how } };
        return withEvent(
          { ...base, setup: null, found, phase: 'rest', rest: restFor(), draft: draftFor(at(state.stepIndex, state.logged, state.swaps, found), state.logged) },
          how === 'trial' ? 'found' : 'trial', action.at, state.stepIndex, 'none',
        );
      };
      if (action.answer === 'right') {
        // He did the reps at a weight that is right: that was set one. It is logged, and the visit moves on as after any set.
        const found: Finds = { ...state.found, [exercise.id]: { weight, reps: exercise.range[0], how: 'trial' } };
        const step = at(state.stepIndex, state.logged, state.swaps, found);
        const logged: LoggedSet[] = [...state.logged, { stepIndex: step.index, exerciseId: exercise.id, weight, reps, at: action.at, comparison: 'none', fromTry: true }];
        const counted: State = { ...base, logged, found, setup: null };
        if (step.index === steps.length - 1) {
          return withEvent({ ...counted, phase: 'finish', rest: null, finishedAt: action.at }, 'finish', action.at, step.index, 'none');
        }
        const setup = setupFor(counted, step.index + 1);
        const seconds = setup ? 0 : step.restAfter.seconds;
        return withEvent({
          ...counted, setup,
          phase: seconds > 0 ? 'rest' : 'set',
          stepIndex: step.index + 1,
          draft: draftFor(at(step.index + 1, logged, state.swaps, found), logged),
          rest: seconds > 0 ? { startedAt: action.at, endsAt: action.at + seconds * 1000, total: seconds } : null,
        }, 'found', action.at, step.index, 'none');
      }
      if (action.answer === 'heavier') {
        // The last try has no heavier one after it: this is not one of its answers.
        if (setup.lastTry) return state;
        const next = weight + first.step;
        const { seconds } = REST.betweenTries;
        const tryNumber = setup.tryNumber + 1;
        return withEvent({
          ...base, phase: 'rest',
          setup: { ...setup, tryNumber, lastGood: weight, lastTry: tryNumber >= setup.triesMax || next + first.step > first.ceiling },
          draft: { weight: next, reps }, rest: { startedAt: action.at, endsAt: action.at + seconds * 1000, total: seconds },
        }, 'trial', action.at, state.stepIndex, 'none');
      }
      // Too heavy: back to the last weight that went well.
      if (setup.lastGood !== null) return settle(setup.lastGood, 'trial');
      // Too heavy on the first try: the easier lift takes its place, and is rehearsed like any new lift.
      if (exercise.easier) {
        const planned = steps[state.stepIndex].exerciseId;
        const swaps: Swaps = { ...state.swaps, [planned]: exercise.easier };
        if (exercise.easier === planned) delete swaps[planned];
        return withEvent({
          ...base, swaps, setup: setupFor(state, state.stepIndex, state.found, swaps, exercise.id),
          draft: draftFor(at(state.stepIndex, state.logged, swaps), state.logged),
        }, 'easier', action.at, state.stepIndex, 'none');
      }
      // Nothing easier in the catalogue: it stays at the lightest weight, and says so.
      return settle(weight, 'lightest');
    }
    case 'saveCheck': {
      const { setup } = state;
      if (!setup || setup.kind !== 'check' || state.phase !== 'set' || action.at < state.guardUntil) return state;
      const exercise = EXERCISES[setup.exerciseId];
      const reps = clamp(Math.round(action.reps), REPS_MIN, REPS_MAX);
      const trials: Trial[] = [...state.trials, { kind: 'check', exerciseId: exercise.id, tryNumber: 1, weight: 0, reps, answer: null, at: action.at }];
      const base: State = { ...state, trials, beforeTrial: { ...state, beforeTrial: null }, now: action.at, guardUntil: action.at + GUARD_MS };
      // Under the low end with an easier lift to offer: that lift takes its place, and is rehearsed like any new lift.
      if (reps < exercise.range[0] && exercise.easier) {
        const planned = steps[state.stepIndex].exerciseId;
        const swaps: Swaps = { ...state.swaps, [planned]: exercise.easier };
        if (exercise.easier === planned) delete swaps[planned];
        return withEvent({
          ...base, swaps, setup: setupFor(state, state.stepIndex, state.found, swaps, exercise.id),
          draft: draftFor(at(state.stepIndex, state.logged, swaps), state.logged),
        }, 'easier', action.at, state.stepIndex, 'none');
      }
      const start = startAfterCheck(exercise, reps);
      const found: Finds = { ...state.found, [exercise.id]: { weight: 0, ...start } };
      // He has just worked: the first set comes up in rest mode. Under the low end no find is claimed (event `trial`).
      const { seconds } = steps[state.stepIndex].partnerId ? REST.afterRound : REST.afterStraightSet;
      return withEvent({
        ...base, found, setup: null, phase: 'rest', rest: { startedAt: action.at, endsAt: action.at + seconds * 1000, total: seconds },
        draft: draftFor(at(state.stepIndex, state.logged, state.swaps, found), state.logged),
      }, start.how === 'check' ? 'found' : 'trial', action.at, state.stepIndex, 'none');
    }
    case 'skip': {
      if ((state.phase !== 'set' && state.phase !== 'rest') || action.at < state.guardUntil) return state;
      const id = liftAt(state, state.stepIndex);
      // A lift still being set up is given its lightest numbers, so its later sets are ordinary ones.
      const found: Finds = state.setup && !state.found[id] ? { ...state.found, [id]: { ...numbersOf(id), how: 'swap' } } : state.found;
      const step = at(state.stepIndex, state.logged, state.swaps, found);
      const logged: LoggedSet[] = [...state.logged, { stepIndex: step.index, exerciseId: step.exerciseId, weight: 0, reps: 0, at: action.at, comparison: 'none', skipped: true }];
      const base: State = { ...state, logged, found, setup: null, rest: null, now: action.at, guardUntil: action.at + GUARD_MS };
      if (step.index === steps.length - 1) {
        return withEvent({ ...base, phase: 'finish', finishedAt: action.at }, 'finish', action.at, step.index, 'none');
      }
      return withEvent({
        ...base, phase: 'set', stepIndex: step.index + 1, setup: setupFor(base, step.index + 1),
        draft: draftFor(at(step.index + 1, logged, state.swaps, found), logged),
      }, step.endsBlock ? 'block' : 'set', action.at, step.index, 'none');
    }
    case 'endEarly': {
      if (state.phase !== 'set' && state.phase !== 'rest') return state;
      const last = lastOf(state.logged);
      // Nothing done: there is no visit to keep.
      if (!last || state.logged.every(set => set.skipped)) return initial(state.plan, state.seq);
      return withEvent(
        { ...state, phase: 'finish', rest: null, setup: null, finishedAt: action.at, endedEarly: true, now: action.at },
        'finish', action.at, last.stepIndex, 'none',
      );
    }
    case 'hurts': {
      if (state.phase !== 'set' && state.phase !== 'rest') return state;
      const onDeck = liftAt(state, state.stepIndex);
      const id = action.id ?? onDeck;
      const hurt = state.hurt.includes(id) ? state.hurt : [...state.hurt, id];
      const exercise = EXERCISES[id];
      if (id !== onDeck) {
        // The lift he just did, not the one on deck: its later sets today are eased from what he last did.
        const did = [...state.logged].reverse().find(set => set.exerciseId === id && !set.skipped);
        if (!action.lighter || !did) return { ...state, hurt };
        const eased = exercise.weightStep > 0
          ? { weight: Math.max(exercise.weightMin, did.weight - exercise.weightStep), reps: did.reps }
          : { weight: 0, reps: Math.max(1, did.reps - 2) };
        return { ...state, hurt, found: { ...state.found, [id]: { ...eased, how: 'eased' } } };
      }
      if (!action.lighter || state.setup) return { ...state, hurt };
      const draft: Draft = exercise.weightStep > 0
        ? { ...state.draft, weight: Math.max(exercise.weightMin, state.draft.weight - exercise.weightStep) }
        : { ...state.draft, reps: Math.max(1, state.draft.reps - 2) };
      // The lighter numbers stand for the rest of this lift's sets today.
      const found: Finds = { ...state.found, [id]: { ...draft, how: 'eased' } };
      return {
        ...state, hurt, draft, found, phase: 'rest', now: action.at, guardUntil: action.at + GUARD_MS,
        rest: { startedAt: action.at, endsAt: action.at + HURT_REST_SECONDS * 1000, total: HURT_REST_SECONDS },
      };
    }
    case 'tick': {
      return state.phase === 'set' || state.phase === 'rest' ? { ...state, now: Math.max(state.now, action.at) } : state;
    }
    case 'reset':
      // The finish's own controls sit where Done was: a second tap of a double tap on the last set must not wipe the visit.
      if (state.phase === 'finish' && state.finishedAt !== null && action.at - state.finishedAt < FINISH_GUARD_MS) return state;
      return initial(state.plan, state.seq);
  }
}

/**
 * Where a check set of `reps` starts the lift. In its range or over: two fewer, never under the low end or over the
 * top (`check`). Under the low end: one fewer than he did, at least 1 (`under`).
 */
function startAfterCheck(exercise: Exercise, reps: number): { reps: number; how: 'check' | 'under' } {
  if (reps < exercise.range[0]) return { reps: Math.max(1, reps - 1), how: 'under' };
  return { reps: clamp(reps - 2, exercise.range[0], exercise.range[1]), how: 'check' };
}

/** A saved visit's steps as they stood: swaps and found starting points applied. */
export function stepsOf(state: VisitState): Step[] {
  return state.plan.steps.map(base => stepAt(state.plan, state.swaps, state.logged, base.index, state.found));
}

function count(done: number, total: number): Count {
  return { done, total, complete: done >= total };
}

function derive(state: State) {
  const { phase, stepIndex, logged, rest, now } = state;
  const { plan } = state;
  const steps = plan.steps.map(base => stepAt(plan, state.swaps, logged, base.index, state.found));
  // A block is named for the lifts in it, in the order they first come up: the plan's names until something is swapped.
  const blocks = plan.blocks.map(block => {
    const ids = [...new Set(steps.filter(item => item.blockIndex === block.index).map(item => item.exerciseId))];
    if (ids.length === block.exerciseIds.length && ids.every((id, place) => id === block.exerciseIds[place])) return block;
    const name = blockName(ids);
    return { ...block, name, doneLine: `${name} done`, exerciseIds: ids };
  });
  const step = steps[stepIndex];
  const exercise = EXERCISES[step.exerciseId];
  const nextStep = steps[stepIndex + 1] ?? null;
  const lastLogged = logged[logged.length - 1] ?? null;
  const focusStep = (phase === 'rest' || phase === 'finish') && lastLogged ? steps[lastLogged.stepIndex] : step;

  const blockCounts = blocks.map(block => count(logged.filter(set => steps[set.stepIndex].blockIndex === block.index).length, block.sets));
  // Every lift the engine knows. One that is not in this visit counts 0 of 0; the gym five read as they always have.
  const exercises = Object.fromEntries(
    Object.values(EXERCISES).map(item => [item.id, count(
      logged.filter(set => set.exerciseId === item.id).length,
      steps.filter(planned => planned.exerciseId === item.id).length,
    )]),
  ) as Record<ExerciseId, Count>;
  const onDeck = phase === 'finish' ? -1 : stepIndex;
  const progress: Progress = {
    visit: count(logged.length, steps.length),
    block: blockCounts[focusStep.blockIndex],
    exercise: exercises[focusStep.exerciseId],
    blocks: blockCounts,
    exercises,
    blocksDone: blockCounts.filter(block => block.complete).length,
    steps: steps.map(item => (item.index < logged.length ? 'logged' : item.index === onDeck ? 'current' : 'ahead')),
  };

  const resting = phase === 'rest' && rest !== null;
  const msLeft = resting ? Math.max(0, rest.endsAt - now) : 0;
  const active = phase === 'set' || phase === 'rest';
  const adjustable = active && !state.setup;
  const hasWeight = adjustable && exercise.weightStep > 0;
  const planned = plan.steps[stepIndex].exerciseId;
  const alternatives = EXERCISES[planned].alternatives;

  return {
    plan, steps, blocks, snapshot: state, hurt: state.hurt, endedEarly: state.endedEarly,
    swapOptions: active && alternatives.length > 0 ? [planned, ...alternatives] : [],
    step, exercise, block: blocks[step.blockIndex],
    partner: step.partnerId ? EXERCISES[step.partnerId] : null,
    nextStep,
    upNext: phase === 'finish' ? null : phase === 'set' ? nextStep : step,
    lastLogged, focusStep, progress,
    setup: state.setup, trials: state.trials, lastTrial: lastOf(state.trials), found: state.found,
    lastDone: phase === 'start' ? null : lastDone(state),
    canUndoTrial: phase !== 'start' && lastDone(state) === 'trial' && state.beforeTrial !== null && state.beforeTrial.logged.length === logged.length,
    restRemaining: Math.ceil(msLeft / 1000),
    restTotal: resting ? rest.total : 0,
    restFraction: resting && rest.total > 0 ? clamp(1 - msLeft / (rest.total * 1000), 0, 1) : resting ? 1 : 0,
    restOver: resting && msLeft === 0,
    canUndo: phase !== 'start' && lastLogged !== null,
    elapsedSeconds: state.startedAt === null ? 0 : Math.max(0, Math.floor(((state.finishedAt ?? now) - state.startedAt) / 1000)),
    can: {
      repsDown: adjustable && state.draft.reps > REPS_MIN,
      repsUp: adjustable && state.draft.reps < REPS_MAX,
      weightDown: hasWeight && state.draft.weight > exercise.weightMin,
      weightUp: hasWeight && state.draft.weight < exercise.weightMax,
      weight: hasWeight,
    },
  };
}

/**
 * The whole visit as one state machine. Call it once, at the top of the client page. It holds no styling and
 * plays no sound. `plan` is today's plan from the coach; a new one replaces it only while he is on the start
 * screen. `saved` is a snapshot to carry on from (a reload, or the phone dropping the page mid-visit).
 */
export function useVisit(options: { plan: Plan; saved?: VisitState | null }): Visit {
  const { plan } = options;
  const [held, dispatch] = useReducer(reduce, null, () => options.saved ?? initial(plan, 0));
  // Until the first action under a new plan, show that plan's start.
  const state = useMemo(() => (held.phase !== 'start' || held.plan.id === plan.id ? held : initial(plan, held.seq)), [held, plan]);

  const actions = useMemo<VisitActions>(() => ({
    start: () => dispatch({ type: 'start', at: Date.now(), plan }),
    adjustReps: delta => dispatch({ type: 'adjustReps', delta, plan }),
    adjustWeight: steps => dispatch({ type: 'adjustWeight', steps, plan }),
    confirm: () => dispatch({ type: 'confirm', at: Date.now(), plan }),
    undo: () => dispatch({ type: 'undo', at: Date.now(), plan }),
    adjustLastLogged: deltaReps => dispatch({ type: 'adjustLastLogged', at: Date.now(), delta: deltaReps, plan }),
    swap: to => dispatch({ type: 'swap', to, plan }),
    addRest: seconds => dispatch({ type: 'addRest', at: Date.now(), seconds, plan }),
    startNext: () => dispatch({ type: 'startNext', at: Date.now(), plan }),
    rehearsed: () => dispatch({ type: 'rehearsed', at: Date.now(), plan }),
    answerTrial: answer => dispatch({ type: 'answerTrial', at: Date.now(), answer, plan }),
    saveCheck: reps => dispatch({ type: 'saveCheck', at: Date.now(), reps, plan }),
    skip: () => dispatch({ type: 'skip', at: Date.now(), plan }),
    endEarly: () => dispatch({ type: 'endEarly', at: Date.now(), plan }),
    hurts: (lighter, id) => dispatch({ type: 'hurts', at: Date.now(), lighter, id: id ?? null, plan }),
    reset: () => dispatch({ type: 'reset', at: Date.now(), plan }),
  }), [plan]);

  // The clocks are read from timestamps, never counted: one tick on each second boundary, and one the moment
  // the page is visible again, so a locked phone comes back to the true time.
  const { phase, startedAt } = state;
  const restEndsAt = state.rest?.endsAt ?? null;
  useEffect(() => {
    if (phase !== 'set' && phase !== 'rest') return;
    let timer = 0;
    const schedule = () => {
      const t = Date.now();
      const wait = restEndsAt !== null && restEndsAt > t
        ? (restEndsAt - t) % 1000 || 1000
        : 1000 - ((t - (startedAt ?? t)) % 1000);
      timer = window.setTimeout(() => {
        dispatch({ type: 'tick', at: Date.now(), plan });
        schedule();
      }, wait + 8);
    };
    const catchUp = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(timer);
      dispatch({ type: 'tick', at: Date.now(), plan });
      schedule();
    };
    // A visit carried over from a reload comes back to the true time at once.
    dispatch({ type: 'tick', at: Date.now(), plan });
    schedule();
    document.addEventListener('visibilitychange', catchUp);
    window.addEventListener('pageshow', catchUp);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', catchUp);
      window.removeEventListener('pageshow', catchUp);
    };
  }, [phase, restEndsAt, startedAt, plan]);

  return useMemo<Visit>(() => ({
    phase: state.phase, stepIndex: state.stepIndex, draft: state.draft, logged: state.logged, rest: state.rest,
    lastEvent: state.lastEvent, startedAt: state.startedAt, finishedAt: state.finishedAt, now: state.now,
    ...derive(state),
    ...actions,
  }), [state, actions]);
}
