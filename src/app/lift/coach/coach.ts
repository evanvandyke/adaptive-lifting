/**
 * The coach: from the visits already done, today's plan. Pure functions and plain data, no React, no storage.
 *
 * The rules, in one place (each is a number to tune, not a law):
 *  - Gym visits alternate Workout A and Workout B. Home has one workout.
 *  - A lift has 2 sets for its first two visits, then 3. The visit that adds the set holds the reps.
 *  - Double progression. Every set at the target: one more rep next time (two, if every set beat it by two).
 *    Every set at the top of the range: the next weight up, back at the low end. Any set short: the same again.
 *    Short two visits running: one rep fewer (or, already at the low end, one weight step down).
 *  - A set he skipped, a visit he ended early, or a lift that hurt: the same numbers again.
 *  - Time away is judged by muscle group. 14 days or more: 85% of the weight and the low end of the range.
 *    42 days or more: 70%, and back to 2 sets.
 *  - A lift never done starts with a rehearsal and tries (weighted) or a check set (no weight). The one exception:
 *    the flat and incline press, and the two rows, stand in for each other, so the second starts from the first.
 */
import { EXERCISES, layOut, type ExerciseId, type Group, type LiftNumbers, type Plan, type Setting } from '../visit/visit-data.ts';

export interface RecordedSet { exerciseId: ExerciseId; weight: number; reps: number; at: number; skipped?: boolean }

/** One finished visit, as it is kept. */
export interface VisitRecord {
  /** Unique: made from the user and the time it started. */
  id: string;
  startedAt: number;
  finishedAt: number;
  setting: Setting;
  template: Plan['template'];
  planName: string;
  endedEarly: boolean;
  sets: RecordedSet[];
  /** Lifts he said hurt. */
  hurt: ExerciseId[];
  /** The plan's lift, and the lift he did in its place. */
  swaps: Partial<Record<ExerciseId, ExerciseId>>;
  /** What each lift he did was asked for: its sets, reps and weight that day. */
  targets: Partial<Record<ExerciseId, { sets: number; reps: number; weight: number }>>;
}

export const TEMPLATES: Record<Plan['template'], { name: string; layout: ExerciseId[][] }> = {
  A: { name: 'Workout A', layout: [['goblet'], ['bench', 'row'], ['calf', 'deadbug']] },
  B: { name: 'Workout B', layout: [['rdl'], ['incline', 'pulldown'], ['splitsquat', 'deadbug']] },
  home: { name: 'Home workout', layout: [['pushup', 'airsquat'], ['bridge', 'deadbug']] },
};

export const VISITS_PER_WEEK = 3;
const DAY = 86_400_000;
const AWAY_DAYS = 14;
const LONG_AWAY_DAYS = 42;
/** A lift not done itself for this long comes back lighter, whatever else trained the same muscles. */
const LIFT_AWAY_DAYS = 28;
const START_SETS = 2;
const FULL_SETS = 3;
/** Visits with a lift before it gets its third set. */
const VISITS_AT_START_SETS = 2;
/** Seconds a set takes, for the estimate on the start screen. */
const SET_SECONDS = 45;
const SETUP_SECONDS = 150;

/** Lifts close enough that one's weight says something about the other's: [from, to, fraction]. */
const STAND_INS: [ExerciseId, ExerciseId, number][] = [
  ['bench', 'incline', 0.85], ['incline', 'bench', 1],
  ['row', 'onearmrow', 1], ['onearmrow', 'row', 1],
];

interface Session { at: number; reps: number[]; weight: number; target: { sets: number; reps: number; weight: number } | null; complete: boolean; hurt: boolean }

const real = (set: RecordedSet) => !set.skipped && set.reps > 0;

/** Every visit that had this lift, oldest first. */
function sessionsOf(id: ExerciseId, history: readonly VisitRecord[]): Session[] {
  const sessions: Session[] = [];
  for (const record of history) {
    const all = record.sets.filter(set => set.exerciseId === id);
    // A set logged at no reps was still tried: it counts as short, not as missing.
    const sets = all.filter(set => !set.skipped);
    if (!sets.some(real)) continue;
    const target = record.targets?.[id] ?? null;
    const lifted = sets.filter(real).map(set => set.weight);
    sessions.push({
      at: record.finishedAt, reps: sets.map(set => set.reps), weight: Math.min(...lifted), target,
      // Every planned set done, none skipped.
      complete: all.length === sets.length && (target ? sets.length >= target.sets : sets.length >= START_SETS),
      hurt: (record.hurt ?? []).includes(id),
    });
  }
  return sessions.sort((a, b) => a.at - b.at);
}

/** When each muscle group was last trained. */
function lastTrained(history: readonly VisitRecord[]): Partial<Record<Group, number>> {
  const seen: Partial<Record<Group, number>> = {};
  for (const record of history) {
    for (const set of record.sets) {
      if (!real(set) || !EXERCISES[set.exerciseId]) continue;
      const group = EXERCISES[set.exerciseId].group;
      seen[group] = Math.max(seen[group] ?? 0, record.finishedAt);
    }
  }
  return seen;
}

const floorTo = (value: number, step: number) => Math.floor(value / step) * step;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** One lift's numbers for a visit on `now`. */
export function liftNumbers(id: ExerciseId, history: readonly VisitRecord[], now: number): LiftNumbers {
  const exercise = EXERCISES[id];
  const [low, top] = exercise.range;
  const weighted = exercise.weightStep > 0;
  const sessions = sessionsOf(id, history);
  const last = sessions[sessions.length - 1];

  if (!last) {
    const starter = exercise.first?.starter ?? exercise.weightMin;
    const fresh: LiftNumbers = { sets: START_SETS, reps: low, weight: weighted ? starter : 0, last: null, note: 'held', intro: weighted ? (exercise.first ? 'trials' : 'estimate') : 'check' };
    if (!weighted) return fresh;
    // A close relative has been lifted: start from it, a little under, and skip the tries.
    for (const [from, to, fraction] of STAND_INS) {
      if (to !== id) continue;
      const known = sessionsOf(from, history).pop();
      if (!known) continue;
      const guess = clamp(floorTo(known.weight * fraction, exercise.weightStep), exercise.weightMin, exercise.weightMax);
      return { ...fresh, weight: guess, intro: 'estimate' };
    }
    return fresh;
  }

  const before = sessions[sessions.length - 2];
  const least = Math.max(1, Math.min(...last.reps));
  const asked = last.target?.reps ?? least;
  // A start found under the range stays where it was found: the range's low end is not forced on him.
  const fit = (value: number) => clamp(value, Math.min(low, Math.max(1, value)), top);
  // He may have changed the weight on the day: what he lifted is what counts, and its target is what he got.
  const moved = last.target !== null && last.weight !== last.target.weight;
  const target = moved ? fit(least) : fit(asked);
  const made = last.complete && last.reps.every(reps => reps >= target);
  const short = last.reps.some(reps => reps < target);
  const addsSet = sessions.length === VISITS_AT_START_SETS;
  let sets = sessions.length >= VISITS_AT_START_SETS ? FULL_SETS : START_SETS;
  let reps = target;
  let weight = last.weight;
  let note: LiftNumbers['note'] = 'held';

  if (last.hurt || addsSet) {
    // The same again: a lift that hurt is not pushed, and a visit that adds a set adds nothing else.
  } else if (made && last.reps.every(value => value >= top)) {
    if (weighted && weight + exercise.weightStep <= exercise.weightMax) {
      weight += exercise.weightStep;
      reps = low;
      note = 'up';
    } else reps = top;
  } else if (made) {
    reps = Math.min(top, target + (last.reps.every(value => value >= target + 2) ? 2 : 1));
    note = reps > target ? 'up' : 'held';
  } else if (short && last.complete && before && before.complete && !before.hurt && !moved) {
    // Short twice running, at the same numbers, on two full visits: one step easier. Anything less is held.
    const beforeTarget = before.target?.reps ?? Math.min(...before.reps);
    const shortBefore = before.weight === last.weight && beforeTarget === target && before.reps.some(value => value < beforeTarget);
    if (shortBefore) {
      if (target > low || !weighted) reps = Math.max(1, target - 1);
      else weight = Math.max(exercise.weightMin, weight - exercise.weightStep);
    }
  }

  // Time away, by muscle group: come back lighter.
  const trained = lastTrained(history)[exercise.group] ?? last.at;
  // Another lift for the same muscles keeps the group fresh, but not this lift for ever.
  const liftAway = Math.floor((now - last.at) / DAY);
  const away = Math.max(Math.floor((now - trained) / DAY), liftAway >= LIFT_AWAY_DAYS ? AWAY_DAYS : 0);
  if (away >= AWAY_DAYS) {
    const long = away >= LONG_AWAY_DAYS;
    note = 'held';
    if (weighted) {
      weight = clamp(floorTo(last.weight * (long ? 0.7 : 0.85), exercise.weightStep), exercise.weightMin, exercise.weightMax);
      reps = low;
    } else {
      reps = Math.min(target, clamp(Math.floor(target * (long ? 0.6 : 0.8)), low, top));
    }
    if (long) sets = START_SETS;
  }

  if (weighted) weight = clamp(weight, exercise.weightMin, exercise.weightMax);
  return { sets, reps, weight, last: { reps: last.reps, weight: last.weight }, note, intro: null };
}

/** Monday 00:00 of the week `now` is in, local time. */
function weekStart(now: number): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day.getTime();
}

/** Which workout a gym visit is: A and B take turns. */
function gymTemplate(history: readonly VisitRecord[]): 'A' | 'B' {
  // A visit cut short before half its sets does not use up its turn.
  const counts = (record: VisitRecord) => {
    if (!record.endedEarly) return true;
    const planned = Object.values(record.targets ?? {}).reduce((total, target) => total + (target?.sets ?? 0), 0);
    return record.sets.filter(real).length * 2 >= planned;
  };
  const gym = history.filter(record => record.template !== 'home' && counts(record)).sort((a, b) => a.finishedAt - b.finishedAt);
  return gym[gym.length - 1]?.template === 'A' ? 'B' : 'A';
}

/** Today's plan. `history` is every finished visit, in any order. */
export function planVisit(history: readonly VisitRecord[], setting: Setting, now: number): Plan {
  const ordered = [...history].sort((a, b) => a.finishedAt - b.finishedAt);
  const template: Plan['template'] = setting === 'home' ? 'home' : gymTemplate(ordered);
  const lifts = Object.fromEntries((Object.keys(EXERCISES) as ExerciseId[]).map(id => [id, liftNumbers(id, ordered, now)])) as Record<ExerciseId, LiftNumbers>;

  // A swap he made last time on this workout stays made.
  const previous = [...ordered].reverse().find(record => record.template === template);
  const base = TEMPLATES[template].layout;
  const planned = new Set(base.flat());
  const layout = base.map(block => block.map(id => {
    const to = previous?.swaps?.[id];
    return to && EXERCISES[to] && !planned.has(to) && previous.sets.some(set => set.exerciseId === to && real(set)) ? to : id;
  }));
  // Which of the workout's own lifts each stand-in is here for, so the record can say so and the swap lasts.
  const swapped: Plan['swapped'] = {};
  base.forEach((block, b) => block.forEach((id, i) => { if (layout[b][i] !== id) swapped[layout[b][i]] = id; }));

  const { blocks, steps } = layOut(layout, lifts);
  const ids = layout.flat();
  const isNew = (id: ExerciseId) => lifts[id].intro === 'trials' || lifts[id].intro === 'check';
  const allNew = ids.every(isNew);
  const setups = ids.filter(isNew).length;
  const seconds = steps.reduce((total, step) => total + step.restAfter.seconds + SET_SECONDS, 0) + setups * SETUP_SECONDS;

  const start = weekStart(now);
  const thisWeek = ordered.filter(record => record.finishedAt >= start && record.finishedAt <= now).length;

  // One quiet line: something hurt last time, or it has been a while.
  let note: string | null = null;
  const lastVisit = ordered[ordered.length - 1];
  const sore = lastVisit?.hurt?.find(id => ids.includes(id));
  const days = lastVisit ? Math.floor((now - lastVisit.finishedAt) / DAY) : 0;
  if (sore) note = `${EXERCISES[sore].shortName} hurt last time. Go easy, or swap it.`;
  else if (days >= AWAY_DAYS) note = `${days} days since the last one. Today starts lighter.`;

  return {
    id: `${template}:${ordered.length}:${lastVisit?.finishedAt ?? 0}:${start}:${Math.floor((now - start) / DAY)}`,
    name: TEMPLATES[template].name, setting, template,
    minutes: Math.max(5, Math.round(seconds / 300) * 5),
    week: { visit: thisWeek + 1, of: Math.max(VISITS_PER_WEEK, thisWeek + 1) },
    totalSets: steps.length, note,
    first: !allNew ? null : ids.some(id => lifts[id].intro === 'trials') ? 'trials' : 'checks',
    blocks, steps, lifts, swapped,
  };
}
