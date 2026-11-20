import assert from 'node:assert/strict';
import { test } from 'node:test';
import { liftNumbers, planVisit, type RecordedSet, type VisitRecord } from './coach.ts';
import type { ExerciseId } from '../visit/visit-data.ts';

const DAY = 86_400_000;
// A Wednesday, local noon.
const NOW = new Date(2026, 10, 18, 12).getTime();

type Did = [ExerciseId, number, number[], { sets?: number; reps?: number; weight?: number }?];

function visit(daysAgo: number, template: VisitRecord['template'], did: Did[], extra: Partial<VisitRecord> = {}): VisitRecord {
  const finishedAt = NOW - daysAgo * DAY;
  const sets: RecordedSet[] = [];
  const targets: VisitRecord['targets'] = {};
  for (const [exerciseId, weight, reps, target] of did) {
    for (const count of reps) sets.push({ exerciseId, weight, reps: count, at: finishedAt, skipped: count === 0 || undefined });
    targets[exerciseId] = { sets: target?.sets ?? reps.length, reps: target?.reps ?? Math.min(...reps), weight: target?.weight ?? weight };
  }
  return {
    id: `t${daysAgo}`, startedAt: finishedAt - 1_800_000, finishedAt, setting: template === 'home' ? 'home' : 'gym', template,
    planName: 'x', endedEarly: false, sets, hurt: [], swaps: {}, targets, ...extra,
  };
}

test('nothing done yet: home is all check sets, the gym is tries', () => {
  const home = planVisit([], 'home', NOW);
  assert.equal(home.template, 'home');
  assert.equal(home.first, 'checks');
  assert.equal(home.totalSets, 8);
  assert.deepEqual(home.week, { visit: 1, of: 3 });
  assert.equal(home.lifts.pushup.intro, 'check');
  const gym = planVisit([], 'gym', NOW);
  assert.equal(gym.template, 'A');
  assert.equal(gym.first, 'trials');
  assert.equal(gym.lifts.goblet.intro, 'trials');
  assert.equal(gym.lifts.goblet.weight, 20);
  assert.equal(gym.steps[gym.steps.length - 1].restAfter.seconds, 0);
});

test('gym visits take turns, and home visits do not disturb the turn', () => {
  const a = visit(4, 'A', [['goblet', 20, [6, 6]]]);
  assert.equal(planVisit([a], 'gym', NOW).template, 'B');
  assert.equal(planVisit([a, visit(2, 'home', [['pushup', 0, [6, 6]]])], 'gym', NOW).template, 'B');
  assert.equal(planVisit([a, visit(2, 'B', [['rdl', 15, [6, 6]]])], 'gym', NOW).template, 'A');
});

test('every set at the target: one more rep', () => {
  const n = liftNumbers('pushup', [visit(2, 'home', [['pushup', 0, [8, 8]]])], NOW);
  assert.deepEqual([n.sets, n.reps, n.note, n.intro], [2, 9, 'up', null]);
  assert.deepEqual(n.last, { reps: [8, 8], weight: 0 });
});

test('every set two over: two more reps', () => {
  const n = liftNumbers('pushup', [visit(2, 'home', [['pushup', 0, [10, 10], { reps: 8 }]])], NOW);
  assert.equal(n.reps, 10);
});

test('a set short: the same again', () => {
  const n = liftNumbers('pushup', [visit(2, 'home', [['pushup', 0, [8, 6], { reps: 8 }]])], NOW);
  assert.deepEqual([n.reps, n.note], [8, 'held']);
});

test('the third visit adds a set and holds the reps', () => {
  const history = [visit(4, 'home', [['pushup', 0, [8, 8]]]), visit(2, 'home', [['pushup', 0, [9, 9]]])];
  const n = liftNumbers('pushup', history, NOW);
  assert.deepEqual([n.sets, n.reps, n.note], [3, 9, 'held']);
});

test('the top of the range: the next weight, back at the low end', () => {
  const history = [
    visit(6, 'A', [['bench', 20, [10, 10]]]), visit(4, 'A', [['bench', 20, [11, 11]]]),
    visit(2, 'A', [['bench', 20, [12, 12, 12]]]),
  ];
  const n = liftNumbers('bench', history, NOW);
  assert.deepEqual([n.sets, n.weight, n.reps, n.note], [3, 25, 8, 'up']);
});

test('no weight, top of the range: stays at the top', () => {
  const history = [visit(6, 'home', [['pushup', 0, [10, 10]]]), visit(4, 'home', [['pushup', 0, [11, 11]]]), visit(2, 'home', [['pushup', 0, [12, 12, 12]]])];
  assert.equal(liftNumbers('pushup', history, NOW).reps, 12);
});

test('short two visits running: one rep fewer; at the low end, a step lighter', () => {
  const short = (daysAgo: number, reps: number) => visit(daysAgo, 'A', [['bench', 25, [reps, reps - 2, reps - 2], { reps }]]);
  const base = [visit(10, 'A', [['bench', 25, [9, 9]]]), visit(8, 'A', [['bench', 25, [9, 9]]])];
  assert.equal(liftNumbers('bench', [...base, short(4, 10), short(2, 10)], NOW).reps, 9);
  const low = liftNumbers('bench', [...base, short(4, 8), short(2, 8)], NOW);
  assert.deepEqual([low.weight, low.reps], [20, 8]);
});

test('a skipped set or a lift that hurt is never progress', () => {
  const skipped = liftNumbers('pushup', [visit(2, 'home', [['pushup', 0, [8, 0], { sets: 2, reps: 8 }]])], NOW);
  assert.deepEqual([skipped.reps, skipped.note], [8, 'held']);
  const hurt = liftNumbers('pushup', [visit(2, 'home', [['pushup', 0, [8, 8]]], { hurt: ['pushup'] })], NOW);
  assert.deepEqual([hurt.reps, hurt.note], [8, 'held']);
  const plan = planVisit([visit(2, 'home', [['pushup', 0, [8, 8]]], { hurt: ['pushup'] })], 'home', NOW);
  assert.match(plan.note ?? '', /Push-up hurt last time/);
});

test('he changed the weight on the day: that weight, at what he got', () => {
  const n = liftNumbers('bench', [visit(2, 'A', [['bench', 30, [9, 8], { reps: 8, weight: 25 }]])], NOW);
  assert.deepEqual([n.weight, n.reps], [30, 9]);
});

test('time away comes back lighter, judged by muscle group', () => {
  const old = visit(20, 'A', [['bench', 40, [10, 10]]]);
  const away = liftNumbers('bench', [old], NOW);
  assert.deepEqual([away.weight, away.reps, away.note], [30, 8, 'held']);
  // Push-ups since then kept the press warm.
  const warm = liftNumbers('bench', [old, visit(3, 'home', [['pushup', 0, [8, 8]]])], NOW);
  assert.deepEqual([warm.weight, warm.reps], [40, 11]);
  const long = liftNumbers('bench', [visit(50, 'A', [['bench', 40, [10, 10]]]), visit(48, 'A', [['bench', 40, [10, 10]]]), visit(46, 'A', [['bench', 40, [10, 10, 10]]])], NOW);
  assert.deepEqual([long.weight, long.sets], [25, 2]);
  const body = liftNumbers('pushup', [visit(20, 'home', [['pushup', 0, [10, 10]]])], NOW);
  assert.equal(body.reps, 8);
});

test('a close relative stands in: incline starts under the flat press, with no tries', () => {
  const n = liftNumbers('incline', [visit(2, 'A', [['bench', 30, [8, 8]]])], NOW);
  assert.deepEqual([n.intro, n.weight, n.reps], ['estimate', 25, 8]);
  assert.equal(liftNumbers('rdl', [visit(2, 'A', [['bench', 30, [8, 8]]])], NOW).intro, 'trials');
});

test('a swap made last time stays made', () => {
  const history = [visit(2, 'home', [['kneepushup', 0, [8, 8]], ['airsquat', 0, [10, 10]]], { swaps: { pushup: 'kneepushup' } })];
  const plan = planVisit(history, 'home', NOW);
  assert.deepEqual(plan.blocks[0].exerciseIds, ['kneepushup', 'airsquat']);
  assert.equal(plan.first, null);
});

test('the week counts visits since Monday', () => {
  const plan = planVisit([visit(9, 'home', [['pushup', 0, [8, 8]]]), visit(1, 'home', [['pushup', 0, [8, 8]]])], 'home', NOW);
  assert.deepEqual(plan.week, { visit: 2, of: 3 });
});

test('a plan survives being saved and read back', () => {
  const plan = planVisit([visit(2, 'home', [['pushup', 0, [8, 8]]])], 'home', NOW);
  assert.deepEqual(JSON.parse(JSON.stringify(plan)), plan);
});

test('short once more after a drop is held, and a visit cut short is never the second strike', () => {
  const full = (daysAgo: number, target: number, reps: number[]) => visit(daysAgo, 'A', [['bench', 25, reps, { reps: target, sets: 3 }]]);
  const base = [visit(12, 'A', [['bench', 25, [9, 9]]]), visit(10, 'A', [['bench', 25, [9, 9]]])];
  // Short at 10 twice gave 9. Short once at 9 stays at 9.
  assert.equal(liftNumbers('bench', [...base, full(6, 10, [10, 8, 8]), full(4, 10, [10, 8, 8]), full(2, 9, [9, 8, 8])], NOW).reps, 9);
  // Short at 10, then one set of 9 before stopping: still 10.
  const cut = visit(2, 'A', [['bench', 25, [9], { reps: 10, sets: 3 }]], { endedEarly: true });
  assert.equal(liftNumbers('bench', [...base, full(4, 10, [10, 8, 8]), cut], NOW).reps, 10);
});

test('a start found under the range is not pushed up to it', () => {
  const n = liftNumbers('airsquat', [visit(2, 'home', [['airsquat', 0, [2, 2], { reps: 2 }]])], NOW);
  assert.deepEqual([n.reps, n.note], [3, 'up']);
});

test('a set tried and logged at no reps is short, not missing', () => {
  const record = visit(2, 'home', [['pushup', 0, [8, 8], { reps: 8 }]]);
  record.sets[1] = { ...record.sets[1], reps: 0 };
  const n = liftNumbers('pushup', [record], NOW);
  assert.deepEqual([n.reps, n.note], [8, 'held']);
});

test('a gym visit stopped after one set does not use up its turn', () => {
  const cut = visit(2, 'A', [['goblet', 20, [6], { sets: 2 }], ['bench', 25, [], { sets: 2, reps: 8 }], ['row', 25, [], { sets: 2, reps: 8 }]], { endedEarly: true });
  assert.equal(planVisit([cut], 'gym', NOW).template, 'A');
});

test('a lift left alone for a month comes back lighter even if its muscles were trained', () => {
  const n = liftNumbers('bench', [visit(58, 'A', [['bench', 40, [12, 12]]]), visit(1, 'home', [['pushup', 0, [8, 8]]])], NOW);
  assert.deepEqual([n.weight, n.reps, n.note], [30, 8, 'held']);
});

test('a swap carried over is carried again', () => {
  const first = planVisit([visit(4, 'home', [['kneepushup', 0, [8, 8]], ['airsquat', 0, [10, 10]]], { swaps: { pushup: 'kneepushup' } })], 'home', NOW);
  assert.deepEqual(first.swapped, { kneepushup: 'pushup' });
});

test('a record from an older version does not stop the plan', () => {
  const old = { id: 'old', startedAt: NOW - DAY, finishedAt: NOW - DAY, setting: 'home', template: 'home', planName: 'x', endedEarly: false, sets: [{ exerciseId: 'pushup', weight: 0, reps: 8, at: NOW - DAY }] } as unknown as VisitRecord;
  assert.equal(planVisit([old], 'home', NOW).lifts.pushup.reps, 8);
});
