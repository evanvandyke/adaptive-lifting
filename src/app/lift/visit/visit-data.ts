/**
 * The lifts, and how a visit is laid out from them.
 *
 * `EXERCISES` is the catalogue: one entry per lift, and everything fixed about a lift is in its entry. The numbers
 * for a given day (sets, reps, weight, last time) are not here: the coach works those out from what was logged and
 * hands them over in `Plan.lifts`. Plain data and pure helpers: no React, no styling.
 */

/** `machine`: a weight on a stack (the lat pulldown). It has a weight and no bar or dumbbell to draw. */
export type LoadMode = 'barbell' | 'dumbbell' | 'bodyweight' | 'machine';
/** Every lift in the catalogue. Each id is also the name of the figure move that shows it. */
export type ExerciseId =
  | 'squat' | 'bench' | 'row' | 'calf' | 'deadbug'
  | 'pushup' | 'airsquat' | 'bridge'
  | 'goblet' | 'splitsquat' | 'incline' | 'onearmrow' | 'pulldown' | 'singlecalf' | 'birddog'
  | 'rdl' | 'lateralraise' | 'loadedcalf' | 'loadedsplit' | 'wallpushup' | 'inclinepushup' | 'kneepushup' | 'singlebridge';
/** The part of the body a lift trains. Time away is judged by group: a push-up keeps the flat press warm. */
export type Group = 'legs' | 'push' | 'pull' | 'hinge' | 'calf' | 'trunk' | 'shoulders';
/** `up`: today's target is higher than last time's result. `held`: the same target as last time. */
export type TargetNote = 'up' | 'held';
export type Setting = 'gym' | 'home';

export interface Exercise {
  id: ExerciseId;
  group: Group;
  /** Full name: "Back squat". */
  name: string;
  /** Short name for results: "Squat", "Flat press". */
  shortName: string;
  /** The shortest name, for naming a block: "Squat", "Flat press", "Push-up". */
  blockName: string;
  mode: LoadMode;
  /** How many dumbbells the lift uses: 2 for a pair, 1 for a single (goblet squat, one-arm row), 0 for anything else. */
  dumbbells: 0 | 1 | 2;
  /** What the weight number means, lower case: "lb on the bar", "lb per hand", "lb, one dumbbell", "lb on the stack", "bodyweight". */
  unitLine: string;
  /** Reps are counted per side ("8 each side"). */
  perSide: boolean;
  /** The rep range the lift is trained in: the low end and the top. */
  range: readonly [number, number];
  /** One short technique cue. */
  cue: string;
  /** Where to set up. */
  setup: string;
  /** The figure move that shows this lift. The same word as the id. */
  figure: ExerciseId;
  /** The pose of that move that names the lift when the figure stands still: the bottom of a squat, the start of a press. */
  pose: 'start' | 'end';
  /** What this lift can be swapped for, in the order the swap list shows them. Three at most. Empty when there is nothing to offer. */
  alternatives: readonly ExerciseId[];
  /** The easier lift to move to when the first try at this one is too heavy. Absent when there is none. */
  easier?: ExerciseId;
  /** First use of a weighted lift: the weight the tries start at, the heaviest they may reach, and the step between them. Absent for bodyweight. */
  first?: { starter: number; ceiling: number; step: number };
  /** Weight controls move in real steps: 5 lb on the bar in total, 5 lb per hand. 0 means the weight is fixed. */
  weightStep: number;
  weightMin: number;
  weightMax: number;
}

/**
 * A lift's numbers for one visit, worked out by the coach. Every lift in the catalogue has them, so a lift swapped
 * in mid-visit has its own numbers too.
 */
export interface LiftNumbers {
  sets: number;
  reps: number;
  /** 0 for bodyweight. */
  weight: number;
  /** The last visit that had this lift: one reps figure per set. null when it has never been done. */
  last: { reps: number[]; weight: number } | null;
  note: TargetNote;
  /**
   * What stands before its first set today. `trials`: never done, weighted: a rehearsal, then up to three tries to
   * find a starting weight. `check`: never done, bodyweight: a rehearsal, then one check set. `estimate`: never
   * done, but its muscles have been trained: no setup, a low guess, "First try". null: it has history.
   */
  intro: 'trials' | 'check' | 'estimate' | null;
}

export interface Block {
  index: number;
  kind: 'single' | 'superset';
  /** "Squat", "Bench and row", "Calf raise and dead bug". */
  name: string;
  /** The words for the block-complete moment: "Squat done". */
  doneLine: string;
  exerciseIds: ExerciseId[];
  /** Rounds in a superset; for a single exercise, its sets. */
  rounds: number;
  /** Working sets in the block. */
  sets: number;
  /** Index of the block's first step. */
  firstStep: number;
}

export interface RestLength { seconds: number }

export interface Step {
  /** The order he lifts in, from 0. */
  index: number;
  blockIndex: number;
  exerciseId: ExerciseId;
  /** 1-based set of this exercise, and how many it has: "Set 2 of 2". */
  setNumber: number;
  setsInExercise: number;
  /** 1-based round of the block, and how many it has. In a single-exercise block the round is the set. */
  round: number;
  roundsInBlock: number;
  /** The other exercise of the superset, or null when the exercise is done alone. */
  partnerId: ExerciseId | null;
  /** 1-based place among the block's sets, and how many the block has. */
  setInBlock: number;
  setsInBlock: number;
  /** Today's target for this set. */
  target: { weight: number; reps: number };
  /** Last visit's result for this same set, or null when there is none. */
  last: { weight: number; reps: number } | null;
  note: TargetNote;
  /** Rest after this set. 0 between superset partners and after the last set of the visit. */
  restAfter: RestLength;
  /** This set finishes its exercise, its round, its block. */
  endsExercise: boolean;
  endsRound: boolean;
  endsBlock: boolean;
  /** The plan's lift this set was swapped away from, or null when it is the plan's own lift. */
  swappedFrom: ExerciseId | null;
  /**
   * How this set's numbers were arrived at when the lift is new, or null. `trial`: a starting weight found by
   * tries. `check`: a starting rep count found by a check set. `first`: a bodyweight lift at the low end of its
   * range. `swap`: a first go at a guessed number. `lightest`: the first try was too heavy and there is nothing
   * lighter. `under`: a check set came in under the range, so it starts one fewer than he did.
   */
  firstUse: 'trial' | 'check' | 'first' | 'swap' | 'lightest' | 'under' | 'eased' | null;
}

/** The rests. */
export const REST = {
  /** After a set of a lift done alone. */
  afterStraightSet: { seconds: 150 },
  /** After a superset round. */
  afterRound: { seconds: 90 },
  /** Between two tries at a starting weight. */
  betweenTries: { seconds: 60 },
  /** Between superset partners, and after the last set of the visit. */
  none: { seconds: 0 },
} as const satisfies Record<string, RestLength>;

/* ---------- the catalogue: one entry per lift ---------- */

const BODY = { mode: 'bodyweight' as const, dumbbells: 0 as const, unitLine: 'bodyweight', weightStep: 0, weightMin: 0, weightMax: 0 };
const PAIR = { mode: 'dumbbell' as const, dumbbells: 2 as const, unitLine: 'lb per hand', weightStep: 5, weightMin: 5, weightMax: 150 };
const ONE = { mode: 'dumbbell' as const, dumbbells: 1 as const, unitLine: 'lb, one dumbbell', weightStep: 5, weightMin: 5, weightMax: 150 };
const SMALL = { mode: 'dumbbell' as const, dumbbells: 2 as const, unitLine: 'lb per hand', weightStep: 2.5, weightMin: 2.5, weightMax: 50, first: { starter: 5, ceiling: 10, step: 2.5 } };
const FIRST_DB = { starter: 15, ceiling: 25, step: 5 };

export const EXERCISES: Record<ExerciseId, Exercise> = {
  // Squat
  squat: {
    id: 'squat', group: 'legs', name: 'Back squat', shortName: 'Squat', blockName: 'Squat', mode: 'barbell', dumbbells: 0, unitLine: 'lb on the bar', perSide: false,
    range: [6, 8], cue: 'Brace first, then sit down between your hips.', setup: 'Rack, bar at shoulder height',
    weightStep: 5, weightMin: 45, weightMax: 495, figure: 'squat', pose: 'end', alternatives: ['goblet', 'splitsquat', 'airsquat'], easier: 'goblet',
  },
  goblet: {
    id: 'goblet', group: 'legs', name: 'Goblet squat', shortName: 'Goblet squat', blockName: 'Goblet squat', ...ONE, perSide: false,
    range: [6, 8], cue: 'Dumbbell at your chest, elbows inside your knees.', setup: 'One dumbbell, held upright at your chest',
    figure: 'goblet', pose: 'end', alternatives: ['airsquat', 'splitsquat'], easier: 'airsquat', first: { starter: 20, ceiling: 40, step: 10 },
  },
  airsquat: {
    id: 'airsquat', group: 'legs', name: 'Air squat', shortName: 'Air squat', blockName: 'Air squat', ...BODY, perSide: false,
    range: [8, 15], cue: 'Sit down between your hips, heels down.', setup: 'Standing, feet a little wider than your hips',
    figure: 'airsquat', pose: 'end', alternatives: ['splitsquat'],
  },
  splitsquat: {
    id: 'splitsquat', group: 'legs', name: 'Split squat', shortName: 'Split squat', blockName: 'Split squat', ...BODY, perSide: true,
    range: [6, 10], cue: 'Straight down. Front heel stays on the floor.', setup: 'One long step forward, back heel up', figure: 'splitsquat', pose: 'end', alternatives: ['airsquat'],
  },
  loadedsplit: {
    id: 'loadedsplit', group: 'legs', name: 'Split squat with dumbbells', shortName: 'Loaded split squat', blockName: 'Loaded split squat', ...SMALL, perSide: true,
    range: [6, 10], cue: 'Straight down. Front heel stays on the floor.', setup: 'One long step forward, a dumbbell at each side', figure: 'loadedsplit', pose: 'end', alternatives: ['splitsquat'], easier: 'splitsquat',
  },

  // Push
  bench: {
    id: 'bench', group: 'push', name: 'Dumbbell flat press', shortName: 'Flat press', blockName: 'Flat press', ...PAIR, perSide: false,
    range: [8, 12], cue: 'Shoulder blades back and down, feet planted.', setup: 'Flat bench',
    figure: 'bench', pose: 'start', alternatives: ['incline', 'pushup', 'kneepushup'], easier: 'kneepushup', first: FIRST_DB,
  },
  incline: {
    id: 'incline', group: 'push', name: 'Dumbbell incline press', shortName: 'Incline press', blockName: 'Incline press', ...PAIR, perSide: false,
    range: [8, 12], cue: 'Shoulder blades back. Press up, not forward.', setup: 'Bench at a low incline', figure: 'incline', pose: 'start', alternatives: ['bench'], easier: 'bench', first: FIRST_DB,
  },
  pushup: {
    id: 'pushup', group: 'push', name: 'Push-up', shortName: 'Push-up', blockName: 'Push-up', ...BODY, perSide: false,
    range: [6, 12], cue: 'One straight line from head to heels.', setup: 'On the floor, hands under your shoulders',
    figure: 'pushup', pose: 'start', alternatives: ['kneepushup', 'inclinepushup', 'wallpushup'], easier: 'kneepushup',
  },
  kneepushup: {
    id: 'kneepushup', group: 'push', name: 'Knee push-up', shortName: 'Knee push-up', blockName: 'Knee push-up', ...BODY, perSide: false,
    range: [6, 12], cue: 'One straight line from head to knees.', setup: 'On the floor, on your knees, hands under your shoulders', figure: 'kneepushup', pose: 'start', alternatives: ['wallpushup'], easier: 'wallpushup',
  },
  inclinepushup: {
    id: 'inclinepushup', group: 'push', name: 'Incline push-up', shortName: 'Incline push-up', blockName: 'Incline push-up', ...BODY, perSide: false,
    range: [6, 12], cue: 'One straight line from head to heels.', setup: 'Hands on a bench or a sturdy counter', figure: 'inclinepushup', pose: 'end', alternatives: ['wallpushup'], easier: 'wallpushup',
  },
  wallpushup: {
    id: 'wallpushup', group: 'push', name: 'Wall push-up', shortName: 'Wall push-up', blockName: 'Wall push-up', ...BODY, perSide: false,
    range: [6, 12], cue: 'Body straight. Chest to the wall, then press away.', setup: 'An arm\'s length from a wall, hands at chest height', figure: 'wallpushup', pose: 'end', alternatives: [],
  },
  lateralraise: {
    id: 'lateralraise', group: 'shoulders', name: 'Dumbbell lateral raise', shortName: 'Lateral raise', blockName: 'Lateral raise', ...SMALL, perSide: false,
    range: [10, 15], cue: 'Lift out to the sides, no higher than your shoulders.', setup: 'Standing, a light dumbbell in each hand', figure: 'lateralraise', pose: 'end', alternatives: [],
  },

  // Pull
  row: {
    id: 'row', group: 'pull', name: 'Supported row', shortName: 'Row', blockName: 'Row', ...PAIR, perSide: false,
    range: [8, 12], cue: 'Chest stays on the pad. Pull to your hips.', setup: 'Bench at a low incline, chest down',
    figure: 'row', pose: 'start', alternatives: ['onearmrow', 'pulldown'], first: FIRST_DB,
  },
  onearmrow: {
    id: 'onearmrow', group: 'pull', name: 'One-arm dumbbell row', shortName: 'One-arm row', blockName: 'One-arm row', ...ONE, perSide: true,
    range: [8, 12], cue: 'Flat back. Pull your elbow to your hip.', setup: 'One hand and one knee on a flat bench', figure: 'onearmrow', pose: 'start', alternatives: [], first: FIRST_DB,
  },
  pulldown: {
    id: 'pulldown', group: 'pull', name: 'Lat pulldown', shortName: 'Pulldown', blockName: 'Pulldown', mode: 'machine', dumbbells: 0, unitLine: 'lb on the stack', perSide: false,
    range: [8, 12], cue: 'Elbows down to your sides, bar to your collarbone.', setup: 'Pulldown machine, pad snug on your thighs', weightStep: 10, weightMin: 10, weightMax: 300,
    figure: 'pulldown', pose: 'start', alternatives: ['row'], easier: 'row', first: { starter: 40, ceiling: 80, step: 20 },
  },

  // Hinge
  rdl: {
    id: 'rdl', group: 'hinge', name: 'Dumbbell Romanian deadlift', shortName: 'Romanian deadlift', blockName: 'Romanian deadlift', ...PAIR, perSide: false,
    range: [6, 10], cue: 'Hips back, flat back, dumbbells close to your legs.', setup: 'Standing, a dumbbell in each hand', figure: 'rdl', pose: 'end', alternatives: ['bridge'], easier: 'bridge', first: { starter: 15, ceiling: 35, step: 10 },
  },
  bridge: {
    id: 'bridge', group: 'hinge', name: 'Glute bridge', shortName: 'Glute bridge', blockName: 'Glute bridge', ...BODY, perSide: false,
    range: [8, 15], cue: 'Squeeze at the top. Ribs down.', setup: 'On your back, knees bent, feet planted',
    figure: 'bridge', pose: 'end', alternatives: ['singlebridge'],
  },
  singlebridge: {
    id: 'singlebridge', group: 'hinge', name: 'Single-leg bridge', shortName: 'Single-leg bridge', blockName: 'Single-leg bridge', ...BODY, perSide: true,
    range: [8, 15], cue: 'Hips level. Squeeze at the top.', setup: 'On your back, one foot planted, the other leg straight', figure: 'singlebridge', pose: 'end', alternatives: ['bridge'], easier: 'bridge',
  },

  // Calf
  calf: {
    id: 'calf', group: 'calf', name: 'Calf raise', shortName: 'Calf raise', blockName: 'Calf raise', ...BODY, perSide: false,
    range: [10, 15], cue: 'Pause at the top. Slow on the way down.', setup: 'Edge of a step, one hand on the rail',
    figure: 'calf', pose: 'end', alternatives: ['singlecalf'],
  },
  singlecalf: {
    id: 'singlecalf', group: 'calf', name: 'Single-leg calf raise', shortName: 'Single-leg calf raise', blockName: 'Single-leg calf raise', ...BODY, perSide: true,
    range: [10, 15], cue: 'Pause at the top. Slow on the way down.', setup: 'Edge of a step on one foot, one hand on the rail', figure: 'singlecalf', pose: 'end', alternatives: ['calf'], easier: 'calf',
  },
  loadedcalf: {
    id: 'loadedcalf', group: 'calf', name: 'Calf raise with dumbbells', shortName: 'Loaded calf raise', blockName: 'Loaded calf raise', ...SMALL, perSide: false,
    range: [10, 15], cue: 'Pause at the top. Slow on the way down.', setup: 'Edge of a step, a dumbbell at each side', figure: 'loadedcalf', pose: 'end', alternatives: ['calf'], easier: 'calf',
  },

  // Trunk
  deadbug: {
    id: 'deadbug', group: 'trunk', name: 'Dead bug', shortName: 'Dead bug', blockName: 'Dead bug', ...BODY, perSide: true,
    range: [6, 10], cue: 'Low back stays flat on the floor.', setup: 'On the floor, on your back',
    figure: 'deadbug', pose: 'end', alternatives: ['birddog'],
  },
  birddog: {
    id: 'birddog', group: 'trunk', name: 'Bird dog', shortName: 'Bird dog', blockName: 'Bird dog', ...BODY, perSide: true,
    range: [6, 10], cue: 'Hips level. Reach long, not high.', setup: 'On your hands and knees', figure: 'birddog', pose: 'end', alternatives: [],
  },
};

/** A block's name from the lifts in it: "Squat", "Bench and row", "Bench, row and push-up". */
export function blockName(ids: readonly ExerciseId[]): string {
  const names = ids.map((id, place) => {
    const name = EXERCISES[id].blockName;
    return place === 0 ? name : name.charAt(0).toLowerCase() + name.slice(1);
  });
  return names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The numbers a new lift starts at: the lightest weight its tries begin with, and the low end of its range. */
export function firstNumbers(exercise: Exercise): { weight: number; reps: number } {
  return { weight: exercise.first?.starter ?? 0, reps: exercise.range[0] };
}

/** A whole visit: what `useVisit` runs. Plain data, so it can be saved with the visit and read back. */
export interface Plan {
  /** Stand-ins carried over from last time: the lift here, and the workout's own lift it stands in for. */
  swapped?: Partial<Record<ExerciseId, ExerciseId>>;
  /** Unique to this visit. */
  id: string;
  /** "Workout A", "Home workout". The finish says "<name> done". */
  name: string;
  setting: Setting;
  template: 'A' | 'B' | 'home';
  minutes: number;
  /** Which visit of the week this is, and how many the week aims for. */
  week: { visit: number; of: number };
  totalSets: number;
  /** One quiet line for the start screen, or null. */
  note: string | null;
  /** Every lift in it is new: the start and the finish say so. `checks` when none of them has a weight. */
  first: 'trials' | 'checks' | null;
  blocks: readonly Block[];
  steps: readonly Step[];
  lifts: Record<ExerciseId, LiftNumbers>;
}

/** Lay a visit out: each inner list is a block, done alone or (two lifts) as a superset. */
export function layOut(layout: readonly ExerciseId[][], lifts: Record<ExerciseId, LiftNumbers>): { blocks: Block[]; steps: Step[] } {
  const blocks: Block[] = [];
  const steps: Step[] = [];
  layout.forEach((exerciseIds, blockIndex) => {
    const [firstId, secondId] = exerciseIds;
    const superset = exerciseIds.length > 1;
    // Partners are done round for round, so a superset has as many rounds as its shorter lift has sets.
    const rounds = Math.max(1, Math.min(...exerciseIds.map(id => lifts[id].sets)));
    const setsInBlock = rounds * exerciseIds.length;
    const name = blockName(exerciseIds);
    blocks.push({
      index: blockIndex, kind: superset ? 'superset' : 'single', name, doneLine: `${name} done`,
      exerciseIds: [...exerciseIds], rounds, sets: setsInBlock, firstStep: steps.length,
    });
    for (let round = 1; round <= rounds; round += 1) {
      exerciseIds.forEach((exerciseId, place) => {
        const numbers = lifts[exerciseId];
        const endsRound = place === exerciseIds.length - 1;
        const lastReps = numbers.last?.reps[Math.min(round, numbers.last.reps.length) - 1];
        steps.push({
          index: steps.length, blockIndex, exerciseId,
          setNumber: round, setsInExercise: rounds,
          round, roundsInBlock: rounds,
          partnerId: superset ? (place === 0 ? secondId : firstId) : null,
          setInBlock: (round - 1) * exerciseIds.length + place + 1, setsInBlock,
          target: { weight: numbers.weight, reps: numbers.reps },
          last: numbers.last && lastReps !== undefined ? { weight: numbers.last.weight, reps: lastReps } : null,
          note: numbers.note,
          restAfter: !endsRound ? REST.none : superset ? REST.afterRound : REST.afterStraightSet,
          endsExercise: round === rounds, endsRound, endsBlock: endsRound && round === rounds,
          swappedFrom: null, firstUse: numbers.intro === 'estimate' ? 'swap' : null,
        });
      });
    }
  });
  // Nothing to rest for after the last set of the visit.
  steps[steps.length - 1].restAfter = REST.none;
  return { blocks, steps };
}

/** The bar and the plates this gym has, heaviest first. */
export const BAR_WEIGHT = 45;
export const PLATES = [45, 35, 25, 10, 5, 2.5] as const;

export interface PlateLoad {
  /** The weight asked for, bar included. */
  total: number;
  bar: number;
  /** The load on one side of the bar. */
  perSide: number;
  /** The plates on one side, heaviest first (nearest the collar first). Empty means the bare bar. */
  plates: number[];
  /** What the plates cannot make up on each side: 0 for every weight the bar stepper can reach. */
  leftover: number;
}

/** Which plates go on each side for a bar weight: the heaviest plate that fits, repeated, the way a lifter loads a bar. */
export function platesPerSide(barWeight: number): PlateLoad {
  const perSide = Math.max(0, (barWeight - BAR_WEIGHT) / 2);
  const plates: number[] = [];
  let left = perSide;
  for (const plate of PLATES) {
    while (left >= plate) {
      plates.push(plate);
      left -= plate;
    }
  }
  return { total: barWeight, bar: BAR_WEIGHT, perSide, plates, leftover: left };
}
