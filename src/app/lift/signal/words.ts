/**
 * Signal's words. It says little, and says a number once. Pure functions, sentence case, no middle dots.
 */
import { duration, repsWord } from '../visit/copy';
import type { Setup, Trial, TrialAnswer, Visit } from '../visit/use-visit';
import { EXERCISES, type Block, type Exercise, type ExerciseId, type Plan, type Setting, type Step } from '../visit/visit-data';

export const SETTING_QUESTION = 'Where are you lifting today?';
export const SETTING_CHOICES: { setting: Setting; name: string; line: string }[] = [
  { setting: 'home', name: 'Home', line: 'Bodyweight at home' },
  { setting: 'gym', name: 'Gym', line: 'Dumbbells and machines at the gym' },
];
export const settingSwitchWords = (setting: Setting) => setting === 'home' ? 'Do the gym workout' : 'Do the home workout';
export const settingHintWords = (setting: Setting) => `Change it anytime with “${settingSwitchWords(setting)}”.`;
export const soundActionWords = (on: boolean) => on ? 'Turn sound off' : 'Turn sound on';
export const SIGN_OUT = { action: 'Sign out', title: 'Sign out?', line: 'Workouts saved on this phone stay saved.', stay: 'Stay signed in' };

interface Result { weight: number; reps: number }

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The name on the set screen. Where the drawing already shows dumbbells, "dumbbell" is not said again:
 * "Dumbbell flat press" reads "Flat press", "One-arm dumbbell row" reads "One-arm row".
 */
export function title(exercise: Exercise): string {
  return exercise.mode === 'dumbbell' ? capital(exercise.name.replace(/\bdumbbell /i, '')) : exercise.name;
}

/** The figure button's name: "How to do the back squat". */
export const howLabel = (exercise: Exercise) => `How to do the ${exercise.name.toLowerCase()}`;

/**
 * The quiet word before the set markers. Live: "Set", or "Round" inside a superset. In a rest the screen already
 * shows the set to come, so the word says so: "Next set", "Next round".
 */
export function setWord(step: Step, mode: 'live' | 'rest' = 'live'): string {
  const unit = step.partnerId ? 'round' : 'set';
  return mode === 'rest' ? `Next ${unit}` : capital(unit);
}

/** "Squat, set 1", "Bench press, round 2". The step names the lift that was done, swapped or not. */
export function setName(step: Step): string {
  return `${EXERCISES[step.exerciseId].shortName}, ${step.partnerId ? 'round' : 'set'} ${step.partnerId ? step.round : step.setNumber}`;
}

/** The unit after the big reps numeral: "reps", "rep", "reps each side". */
export const repsUnit = (exercise: Exercise, reps: number) => (exercise.perSide ? `${repsWord(reps)} each side` : repsWord(reps));

/** The unit after the big weight numeral: "lb", or "lb each" for a pair of dumbbells. */
export const weightUnit = (exercise: Exercise) => (exercise.dumbbells === 2 ? 'lb each' : 'lb');

/** A count, in the one form used everywhere: "6 reps", "1 rep", "8 reps each side". */
export const repsCount = (exercise: Exercise, reps: number) => `${reps} ${repsUnit(exercise, reps)}`;

/**
 * The logged line: "Bench press: 8 reps". Which set it was is not said: the markers under the title say that,
 * and the Fix sheet names it in full.
 */
export const loggedWords = (step: Step, set: Result & { skipped?: boolean }) => (
  set.skipped ? `${EXERCISES[step.exerciseId].shortName}: skipped` : `${EXERCISES[step.exerciseId].shortName}: ${repsCount(EXERCISES[step.exerciseId], set.reps)}`
);

/** What a set that beat last time adds to the logged line: "up one", "up two", "up 5 lb". Null for anything else. */
export function beatWords(step: Step, set: Result): string | null {
  if (!step.last || set.reps === 0) return null;
  if (set.weight > step.last.weight) return `up ${set.weight - step.last.weight} lb`;
  if (set.weight === step.last.weight && set.reps > step.last.reps) return `up ${word(set.reps - step.last.reps)}`;
  return null;
}

/**
 * The quiet line under the numbers, for this set only. One of:
 * "Last time 6" (the weight is said only when today's differs, and a raised target is said once: "Last time 8.
 * Up one rep today."); "First try at this weight" or "First try", on the first set only of a lift that is new
 * today (`fresh`: none of its sets is logged yet); and on a first visit "Starting weight", "Starting reps",
 * "The lightest weight here. Do what you can." or "Starting where you are." Null when there is nothing to say.
 */
export function lastWords(step: Step, weight: number, fresh = true): string | null {
  const exercise = EXERCISES[step.exerciseId];
  if (step.firstUse === 'trial') return 'Starting weight';
  if (step.firstUse === 'check') return 'Starting reps';
  if (step.firstUse === 'lightest') return 'The lightest weight here. Do what you can.';
  if (step.firstUse === 'under') return 'Starting where you are.';
  if (step.firstUse === 'eased') return 'Lighter today. Stop if it hurts.';
  if (step.firstUse === 'first') return fresh ? 'First try' : null;
  if (step.firstUse === 'swap' || (step.swappedFrom !== null && !step.last)) {
    return !fresh ? null : exercise.weightStep > 0 ? 'First try at this weight' : 'First try';
  }
  if (!step.last) return null;
  let line = `Last time ${step.last.reps}`;
  if (exercise.weightStep > 0 && weight !== step.last.weight) line += ` at ${step.last.weight} lb`;
  const more = step.target.reps - step.last.reps;
  return step.note === 'up' && more > 0 ? `${line}. Up ${more === 1 ? 'one rep' : `${word(more)} reps`} today.` : line;
}

/** What Done leads to, always by name: "Next: rest", "Next: row", "Next: dead bug". On the visit's last set: "Last set". */
export function nextWords(step: Step, steps: readonly Step[], visit?: Pick<Visit, 'plan' | 'found'>): string {
  const next = steps[step.index + 1];
  if (!next) return 'Last set';
  // A lift that is new comes up with its rehearsal in place of the rest.
  const intro = visit?.plan.lifts[next.exerciseId].intro;
  const isNew = (intro === 'trials' || intro === 'check') && !visit?.found[next.exerciseId];
  if (step.restAfter.seconds > 0 && !isNew) return 'Next: rest';
  return `Next: ${EXERCISES[next.exerciseId].shortName.toLowerCase()}`;
}

/**
 * The start screen's rows: "Goblet squat" over "2 sets of 7 at 25 lb"; "Flat press, then row" over "2 rounds".
 * A lift that is new has no numbers yet: its name is enough.
 */
export function blockWords(block: Block, plan: Plan): { name: string; line: string | null } {
  const [first, second] = block.exerciseIds.map(id => EXERCISES[id]);
  const isNew = block.exerciseIds.some(id => plan.lifts[id].intro === 'trials' || plan.lifts[id].intro === 'check');
  const name = second ? `${first.shortName}, then ${second.shortName.toLowerCase()}` : first.name;
  if (isNew) return { name, line: null };
  if (second) return { name, line: `${block.rounds} rounds` };
  const { reps, weight } = plan.lifts[first.id];
  const count = `${block.rounds} sets of ${reps}`;
  return { name, line: first.mode === 'bodyweight' ? count : `${count} at ${weight} lb` };
}

/** "Squat done.", "Bench and row done.", and after a swap "Goblet squat done." */
export const blockDoneWords = (block: Block) => `${block.doneLine}.`;

/** A lift's own numbers in one line, for the swap list: "10 lb each, 8 reps", "8 reps each side". */
export function numbersLine(exercise: Exercise, numbers: Result): string {
  const count = `${numbers.reps} ${repsUnit(exercise, numbers.reps)}`;
  return exercise.mode === 'bodyweight' ? count : `${numbers.weight} ${weightUnit(exercise)}, ${count}`;
}

/**
 * The one line with weight on the finish: the best thing that happened, read from what was logged.
 * "Bench press: 8 and 8 at 40 lb. One more rep than last time." "Row: up a rep, and you got it."
 * Each set counts for the lift it was done with. A lift with no last time, or one swapped in today, says only
 * what was done. Best news first; if nothing improved, a lift done for the first time; if none, the first lift.
 */
export function observation(visit: Visit): string | null {
  const better: string[] = [];
  const fresh: string[] = [];
  const same: string[] = [];
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const list = (values: number[]) => (values.length < 3 ? values.join(' and ') : `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`);
  for (const id of new Set(visit.logged.map(set => set.exerciseId))) {
    const exercise = EXERCISES[id];
    const numbers = visit.plan.lifts[id];
    const sets = visit.logged.filter(set => set.exerciseId === id);
    const planned = visit.steps.filter(step => step.exerciseId === id).length;
    if (sets.length < planned || sets.some(set => set.reps === 0)) continue;
    const reps = sets.map(set => set.reps);
    const weight = Math.min(...sets.map(set => set.weight));
    const count = `${list(reps)}${exercise.perSide ? ' reps each side' : ''}`;
    const done = `${exercise.shortName}: ${exercise.weightStep > 0 ? `${count} at ${weight} lb` : count}.`;
    const last = numbers.last;
    if (!last || last.reps.length === 0 || sets.some(set => set.comparison === 'none')) {
      fresh.push(done);
      continue;
    }
    // Set for set against last time: a set added today is not "more reps".
    const shared = Math.min(reps.length, last.reps.length);
    const more = sum(reps.slice(0, shared)) - sum(last.reps.slice(0, shared));
    if (weight > last.weight) better.push(`${done} ${weight - last.weight} lb more than last time.`);
    else if (weight < last.weight) continue;
    else if (numbers.note === 'up' && reps.every(value => value >= numbers.reps) && numbers.reps > Math.max(...last.reps)) {
      const step = numbers.reps - Math.max(...last.reps);
      better.push(`${exercise.shortName}: up ${step === 1 ? 'a rep' : `${word(step)} reps`}, and you got it.`);
    } else if (more > 0) better.push(`${done} ${capital(word(more))} more ${repsWord(more)} than last time.`);
    else if (reps.length > last.reps.length && more === 0) better.push(`${done} One more set than last time.`);
    else if (more === 0) same.push(`${done} Same as last time.`);
  }
  return better[0] ?? fresh[0] ?? same[0] ?? null;
}

/* ---------- first visits ---------- */

/** The start screen's two quiet sentences: what today is, and the one caution, said here once. */
export const firstStartWords = (plan: Plan): [string, string] => [
  plan.first === 'checks' ? `Today we find your starting reps. About ${plan.minutes} minutes.` : `Today we find your starting weights. About ${plan.minutes} minutes.`,
  'Stop any try early if it gets hard.',
];
/** The finish's title: "Workout A done.", or when he stopped early "Done for today." */
export const finishTitle = (visit: Pick<Visit, 'plan' | 'endedEarly'>) => (visit.endedEarly ? 'Done for today.' : `${visit.plan.name} done.`);
/** The finish's one line. */
export const firstFinishWords = (plan: Plan) => (plan.first === 'checks' ? 'Your starting reps are set, for now.' : 'Your starting weights are set, for now.');

/** The rehearsal's one sentence. A lift with no weight is not told to put the weight down. */
export function rehearseWords(exercise: Exercise, easierThan: ExerciseId | null): string {
  if (easierThan) return 'That was too heavy for today. Try this one, a few slow ones.';
  return exercise.weightStep > 0 ? 'Try it with no weight first. A few slow ones.' : 'Try it first. A few slow ones.';
}

/** The quiet word before the markers on a try: "Try", and in the rest before one "Next try". A check set has no word. */
export const setupWord = (setup: Pick<Setup, 'kind'>, mode: 'live' | 'rest') => (setup.kind === 'check' ? '' : mode === 'rest' ? 'Next try' : 'Try');
/**
 * The quiet line under the numbers. On a try it is the question: "Do 6, then say how it felt." In the rest before
 * a heavier try: "One step heavier." On a check set: "Stop when you could still do two more."
 */
export function setupLine(setup: Pick<Setup, 'kind'>, mode: 'live' | 'rest', reps: number): string {
  if (setup.kind === 'check') return 'Stop when you could still do two more.';
  return mode === 'rest' ? 'One step heavier.' : `Do ${reps}, then say how it felt.`;
}

/** The answers to a try, each set on two lines. The last try has no heavier one after it, so it has two answers. */
export const TRIAL_ANSWERS: { answer: TrialAnswer; lines: [string, string] }[] = [
  { answer: 'heavier', lines: ['Go', 'heavier'] },
  { answer: 'right', lines: ['This is', 'right'] },
  { answer: 'tooHeavy', lines: ['Too', 'heavy'] },
];

/** A weight with its unit: "20 lb", "10 lb each". */
export const weightWords = (exercise: Exercise, weight: number) => `${weight} ${weightUnit(exercise)}`;

/**
 * The logged line for a try or a check. It is not a set and does not read like one: "Try: 6 reps at 20 lb",
 * "Try: 10 reps". A try that was too heavy has no count: "Try at 10 lb: too heavy".
 */
export function trialWords(trial: Trial): string {
  const exercise = EXERCISES[trial.exerciseId];
  if (trial.answer === 'tooHeavy') return `Try at ${trial.weight} lb: too heavy`;
  const count = repsCount(exercise, trial.reps);
  return trial.kind === 'check' ? `Try: ${count}` : `Try: ${count} at ${trial.weight} lb`;
}

/** "Goblet squat, try 2", "Push-up, try": the Fix sheet's title for a try or a check. */
export const trialName = (trial: Trial) => `${EXERCISES[trial.exerciseId].shortName}, ${trial.kind === 'check' ? 'try' : `try ${trial.tryNumber}`}`;

/**
 * The found moment: "Starting weight found." over "Goblet squat: 20 lb, for now."; at home "Starting reps found."
 * over "Push-up: 8 reps, for now. Two under what you did." (the relation is said when that is what it is).
 */
export function foundWords(visit: Pick<Visit, 'found' | 'lastTrial'>, id: ExerciseId): { title: string; line: string } {
  const exercise = EXERCISES[id];
  const find = visit.found[id];
  if (!find) return { title: '', line: '' };
  if (find.how !== 'check') return { title: 'Starting weight found.', line: `${exercise.shortName}: ${weightWords(exercise, find.weight)}, for now.` };
  const did = visit.lastTrial?.exerciseId === id ? visit.lastTrial.reps : null;
  const line = `${exercise.shortName}: ${repsCount(exercise, find.reps)}, for now.`;
  return { title: 'Starting reps found.', line: did !== null && did - find.reps === 2 ? `${line} Two under what you did.` : line };
}

/** Something the view did that the engine has no event for (a swap, added rest, a stepper), so it can be announced. */
export interface Notice { at: number; startedAt: number | null; text: string }

/**
 * What a screen reader hears, read straight from the visit: a set logged, a block done, rest over, the finish,
 * a fix, an undo, and whatever the page itself reports (a swap, added rest, a stepper's new value). `id` changes with every new message, so the same words twice are still two announcements.
 */
export function announcement(visit: Visit, notice: Notice | null = null): { id: string; text: string } {
  const { lastEvent: event, lastLogged: set, lastTrial: trial, phase, stepIndex, setup } = visit;
  const corrected = event?.kind === 'fix' || event?.kind === 'undo';
  // A try screen has arrived (from the rehearsal, or out of the rest before it): it asks its question.
  if (setup?.kind === 'trial' && phase === 'set' && !corrected) {
    const exercise = EXERCISES[setup.exerciseId];
    const ask = `Try ${setup.tryNumber}: ${weightWords(exercise, visit.draft.weight)}. ${setupLine(setup, 'live', visit.draft.reps)}`;
    return { id: `try-${setup.exerciseId}-${setup.tryNumber}`, text: setup.tryNumber > 1 ? `Rest over. ${ask}` : ask };
  }
  if (notice && notice.startedAt === visit.startedAt && phase !== 'finish' && notice.at >= (event?.at ?? 0)) {
    return { id: `n${notice.at}`, text: notice.text };
  }
  if (!event) return { id: 'none', text: '' };
  // First visits: a try, a starting point found or settled, a lift giving way to an easier one.
  if (event.kind === 'undo') return { id: `e${event.id}`, text: setup && setup.kind !== 'rehearse' ? 'Taken back.' : 'Set taken back.' };
  if (event.kind === 'easier') return { id: `e${event.id}`, text: `Too heavy for today. ${visit.exercise.name} instead. Try it first.` };
  if (trial && event.kind === 'fix' && visit.lastDone === 'trial') return { id: `e${event.id}`, text: `${trialName(trial)}, fixed: ${repsCount(EXERCISES[trial.exerciseId], trial.reps)}.` };
  if (trial && visit.lastDone === 'trial' && (event.kind === 'trial' || event.kind === 'found')) {
    // The rest after it has ended: the first set is up.
    if (phase === 'set') return { id: `e${event.id}-over`, text: `Rest over. ${setName(visit.step)}.` };
    if (event.kind === 'found') {
      const found = foundWords(visit, trial.exerciseId);
      return { id: `e${event.id}`, text: `${found.title} ${found.line} Rest.` };
    }
    // A try with no find: another try follows, or the lift starts where it can.
    const next = setup ? 'Rest, then one step heavier.' : `${lastWords(visit.step, visit.draft.weight) ?? ''} Rest.`;
    return { id: `e${event.id}`, text: `${trialWords(trial)}. ${next}` };
  }
  if (!set) return { id: 'none', text: '' };
  const step = visit.steps[set.stepIndex];
  // A fix is news whenever it is made: a late one, and one made from the finish, included.
  if (event.kind === 'fix') return { id: `e${event.id}`, text: `${setName(step)}, fixed: ${repsCount(EXERCISES[step.exerciseId], set.reps)}.` };
  if (phase === 'finish') {
    const count = visit.logged.filter(set => !set.skipped).length;
    const said = visit.plan.first && !visit.endedEarly ? firstFinishWords(visit.plan) : `${count} ${count === 1 ? 'set' : 'sets'} in ${duration(visit.elapsedSeconds)}.`;
    return { id: `e${event.id}-finish`, text: `${finishTitle(visit)} ${said}` };
  }
  // The set on deck came out of a rest: the rest ending is the news now. Not when a rehearsal took the rest's
  // place (a lift that is new, on a first visit): there was no rest to be over.
  const rested = !setup && !(visit.step.firstUse === 'first' && visit.progress.exercises[visit.step.exerciseId].done === 0);
  if (phase === 'set' && rested && step.index === stepIndex - 1 && step.restAfter.seconds > 0) {
    return { id: `e${event.id}-over`, text: `Rest over. ${setName(visit.step)}.` };
  }
  const parts = [set.skipped ? `${setName(step)}, skipped.` : `${loggedWords(step, set)}, logged.`];
  const beat = beatWords(step, set);
  if (beat) parts.push(`${capital(beat)} on last time.`);
  if (event.kind === 'block') parts.push(blockDoneWords(visit.blocks[event.blockIndex]));
  if (phase === 'rest') parts.push('Rest.');
  if (setup?.kind === 'rehearse') parts.push(`${EXERCISES[setup.exerciseId].name} is next. ${rehearseWords(EXERCISES[setup.exerciseId], setup.easierThan)}`);
  return { id: `e${event.id}`, text: parts.join(' ') };
}
