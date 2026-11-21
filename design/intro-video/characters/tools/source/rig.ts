/**
 * The pictogram lifter's rig: pure geometry, no React.
 *
 * Units are figure units: x to the right, y up, the floor at y = 0. The body is the same size, in these units, in
 * every move; each move is framed in a square box, one of two sizes, so the compact lifts are not lost in a box sized
 * for raised arms. A move is a function of t (0 = start pose, 1 = end pose) that places the joints and returns the
 * shapes to draw. Limb lengths hold because the mid joints
 * (elbow, knee) are never interpolated: they are solved each frame, either forward from angles or by two-bone IK
 * from the limb's two ends.
 */

export type P = { x: number; y: number };
export type Tone = 'near' | 'far';

interface Base {
  tone: Tone;
  /** Cut a thin gap around this shape out of every layer beneath it, so it reads as passing in front. */
  halo?: boolean;
  /** Equipment: left out when the figure is drawn alone. */
  eq?: boolean;
  /** A weight he holds or carries (a dumbbell, the squat's plate): left out when he is shown empty-handed. */
  weight?: boolean;
  /** Furniture line: never thinner than one screen pixel. */
  furn?: boolean;
  /** Names a limb so its length can be checked. */
  id?: string;
}
export type Shape =
  | (Base & { k: 'line'; pts: P[]; w: number })
  | (Base & { k: 'disc'; c: P; r: number })
  | (Base & { k: 'box'; c: P; w: number; h: number; r: number; rot?: number });

export interface Scene {
  /** The side of the square box, in figure units. */
  box: number;
  /** Where the figure's (0, 0) sits in the box, in SVG coordinates (y down). */
  origin: P;
  /** Drawn first and never cut: the floor line and the furniture. */
  ground: Shape[];
  /** Back to front. A layer's halo shapes cut every layer before it. */
  layers: Shape[][];
}

const SNUG = 204; // squat, bench, row
const ROOMY = 228; // calf (a step, and a rise), dead bug (a long reach), the standing figure (arms overhead)

const HEAD_R = 13;
const NECK = 26; // shoulder point to head centre: torso cap 10 + gap 3 + head radius 13
const TORSO = 58;
const TORSO_W = 20;
const UPPER = 32;
const FORE = 30;
const THIGH = 44;
const SHIN = 44;
const ARM_W = 13;
const LEG_W = 15;
const FOOT_W = 10;
const ANKLE_H = LEG_W / 2; // ankle height when the foot is flat

const RAD = Math.PI / 180;
const pt = (x: number, y: number): P => ({ x, y });
const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixP = (a: P, b: P, t: number): P => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
/** A vector of length `len` pointing `deg` degrees anticlockwise from +x. */
const dir = (deg: number, len = 1): P => ({ x: Math.cos(deg * RAD) * len, y: Math.sin(deg * RAD) * len });
const turn = (p: P, deg: number): P => {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
};

/**
 * Two-bone IK: the middle joint of a limb with segments a and b, from its root to its end.
 * bend = 1 puts the joint on the left of the root-to-end direction, -1 on the right. With the body's front as
 * "forward", knees take 1 and elbows take -1 in every side pose, whichever way the body is lying.
 */
function ik(root: P, end: P, a: number, b: number, bend: 1 | -1): P {
  const dx = end.x - root.x;
  const dy = end.y - root.y;
  const raw = Math.hypot(dx, dy) || 0.001;
  const d = Math.min(a + b - 0.001, Math.max(Math.abs(a - b) + 0.001, raw));
  const ux = dx / raw;
  const uy = dy / raw;
  const along = (a * a - b * b + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, a * a - along * along));
  return { x: root.x + ux * along - uy * off * bend, y: root.y + uy * along + ux * off * bend };
}

const line = (pts: P[], w: number, tone: Tone = 'near', extra: Partial<Base> = {}): Shape => ({ k: 'line', pts, w, tone, ...extra });
const disc = (c: P, r: number, tone: Tone = 'near', extra: Partial<Base> = {}): Shape => ({ k: 'disc', c, r, tone, ...extra });
const box = (c: P, w: number, h: number, r: number, tone: Tone = 'near', extra: Partial<Base> & { rot?: number } = {}): Shape => ({ k: 'box', c, w, h, r, tone, ...extra });

const furniture = (pts: P[], w: number): Shape => line(pts, w, 'far', { eq: true, furn: true });
const floor = (x0: number, x1: number): Shape => furniture([pt(x0, -1.5), pt(x1, -1.5)], 3);

const head = (c: P, extra: Partial<Base> = {}): Shape => disc(c, HEAD_R, 'near', extra);
const torso = (hip: P, shoulder: P): Shape => line([hip, shoulder], TORSO_W, 'near', { id: 'torso' });

/** The foot: a short stroke under the ankle. footDeg 0 is flat on the floor, toes toward +x. */
const foot = (ankle: P, footDeg: number, tone: Tone): Shape =>
  line([add(ankle, turn(pt(1, -2.5), footDeg)), add(ankle, turn(pt(15, -2.5), footDeg))], FOOT_W, tone);

function leg(hip: P, ankle: P, footDeg: number, tone: Tone = 'near', knee: P = ik(hip, ankle, THIGH, SHIN, 1)): Shape[] {
  return [line([hip, knee, ankle], LEG_W, tone, { id: tone === 'near' ? 'leg' : 'far leg' }), foot(ankle, footDeg, tone)];
}

/** The arm in two strokes, so the forearm alone can pass in front of the body with a gap. */
function arm(shoulder: P, wrist: P, elbow: P = ik(shoulder, wrist, UPPER, FORE, -1)): { upper: Shape; fore: Shape } {
  return {
    upper: line([shoulder, elbow], ARM_W, 'near', { id: 'upper arm' }),
    fore: line([elbow, wrist], ARM_W, 'near', { id: 'forearm', halo: true }),
  };
}

/**
 * A dumbbell seen from the side, held at its middle so the fist covers the handle. `handleDeg` is the way the handle
 * points: 0 is level, 90 is on end (the goblet), and anything else follows a raised arm.
 */
function dumbbell(c: P, handleDeg = 0): Shape[] {
  const mark = { halo: true, eq: true, weight: true };
  const at = (along: number) => add(c, dir(handleDeg, along));
  const end = (along: number) => box(at(along), 10, 20, 2.5, 'near', { ...mark, rot: handleDeg || undefined });
  return [line([at(-9), at(9)], 5, 'near', mark), end(-12), end(12)];
}

// ---------------------------------------------------------------------------------------------------------------------
// Squat. Feet planted; the shin and thigh angles run from standing to thigh-level; the torso's lean is then solved so
// the bar stays on one vertical line over the middle of the foot the whole way down.

const BAR_OVER = 5.5; // the foot's silhouette runs from x = -7.5 to x = 20
const BAR_BACK = 7; // the bar rests on the upper back: behind and just below the shoulder point, in the torso's frame
const BAR_DOWN = 3;
const PLATE_R = 24;

function squat(t: number): Scene {
  const ankle = pt(0, ANKLE_H);
  const shin = mix(6, 28, t); // forward lean of the shin, degrees from upright
  const thigh = mix(-2.5, 90, t); // backward lean of the thigh; 90 is level
  const knee = add(ankle, dir(90 - shin, SHIN));
  const hip = add(knee, dir(90 + thigh, THIGH));
  // bar.x = hip.x + (TORSO - BAR_DOWN) sin(lean) - BAR_BACK cos(lean), solved for the lean.
  const a = TORSO - BAR_DOWN;
  const lean = (Math.asin((BAR_OVER - hip.x) / Math.hypot(a, BAR_BACK)) + Math.atan2(BAR_BACK, a)) / RAD;
  const up = 90 - lean;
  const shoulder = add(hip, dir(up, TORSO));
  const inTorso = (forward: number, along: number) => add(shoulder, add(dir(up - 90, forward), dir(up, along)));
  const bar = inTorso(-BAR_BACK, -BAR_DOWN);
  // The arm is rigid with the torso: elbow down and back, hand on the bar. The forearm points partly at the viewer,
  // so it is drawn a little short of its true length, and stays that length for the whole movement.
  const limb = arm(shoulder, bar, inTorso(-20, -25));
  return {
    box: SNUG,
    origin: pt(105, 196.5),
    ground: [floor(-46, 40)],
    layers: [
      [
        // The plate is behind him, so it takes the second tone and he stays whole in front of it.
        disc(bar, PLATE_R, 'far', { eq: true, weight: true }),
        torso(hip, shoulder),
        ...leg(hip, ankle, 0, 'near', knee),
        head(add(shoulder, dir(up + mix(6, 12, t), NECK))),
        limb.upper,
        { ...limb.fore, id: undefined, halo: false },
      ],
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Dumbbell bench press. On the back, head to the left. The upper arm turns about the shoulder and the forearm stays
// vertical under the dumbbell the whole way, from a straight arm over the shoulder down to the dumbbell just above
// the chest, the elbow a little below the line of the body.

function bench(t: number): Scene {
  const shoulder = pt(0, 56);
  const hip = pt(TORSO, 56);
  const elbow = add(shoulder, dir(mix(90, -12.6, t), UPPER));
  const wrist = add(elbow, pt(0, FORE));
  const limb = arm(shoulder, wrist, elbow);
  return {
    box: SNUG,
    origin: pt(62, 164.5),
    ground: [floor(-46, 126), furniture([pt(12, 38), pt(12, 2)], 8), furniture([pt(-36, 42), pt(62, 42)], 8)],
    layers: [
      [torso(hip, shoulder), head(pt(-NECK, 59)), ...leg(hip, pt(96, ANKLE_H), 0)],
      [limb.upper, { ...limb.fore, halo: false }, ...dumbbell(wrist)],
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Chest-supported dumbbell row. Face down along a bench tipped up 40 degrees: a thick pad under the whole torso, on a
// post and a foot, so it is plainly a bench. The head is past the top of the pad, the knees are bent with the toes on
// the floor behind, and the arm hangs straight down from the shoulder with the dumbbell well clear of the floor (a
// push-up has its hands on the floor and its legs in line with its back; this has neither). The back is one straight
// stroke and does not move; the upper arm turns about the shoulder until the elbow is past the line of the back, and
// the forearm hangs vertical under it the whole way, so the dumbbell finishes beside the ribs.

function row(t: number): Scene {
  const up = 40;
  const shoulder = pt(46, 112);
  const hip = add(shoulder, dir(up, -TORSO));
  const elbow = add(shoulder, dir(mix(-90, -176, t), UPPER));
  const wrist = add(elbow, pt(0, -FORE));
  const limb = arm(shoulder, wrist, elbow);
  const under = dir(up - 90, 16); // from the torso's centre line to the pad's: half the torso and half the pad
  const padLow = add(add(hip, dir(up, -14)), under);
  const padHigh = add(add(shoulder, dir(up, -14)), under);
  const post = mixP(padLow, padHigh, 0.28); // clear of the dumbbell at both ends of the pull
  return {
    box: SNUG,
    origin: pt(95, 171.5),
    ground: [
      floor(-70, 84),
      furniture([pt(post.x - 26, 4), pt(post.x + 30, 4)], 8), // the foot
      furniture([post, pt(post.x, 4)], 8),
      furniture([padLow, padHigh], 12),
    ],
    layers: [
      [torso(hip, shoulder), head(add(shoulder, dir(up, NECK))), ...leg(hip, pt(-56, TOE_ANKLE), TOES)],
      [limb.upper, limb.fore, ...dumbbell(wrist)],
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Calf raise. The ball of the foot stays on the edge of the step and the foot turns about it, so the ankle, and the
// whole straight body above it, rises. The hand stays where it is on the rail.

/** The calf raise's body: where the foot, the hip and the shoulder are. */
function calfBody(t: number) {
  const ball = pt(15, 19); // the toe end of the foot, resting on a step 14 high
  const footDeg = mix(24, -38, t); // heels low, then up on the toes
  const ankle = add(ball, turn(pt(-15, 2.5), footDeg));
  // The body leans a little from the ankle so its weight sits over the ball of the foot, the only thing holding it up.
  const hip = add(ankle, dir(90 - mix(6, 3.5, t), THIGH + SHIN - 0.1));
  const shoulder = add(hip, dir(86, TORSO));
  return { footDeg, ankle, hip, shoulder };
}

function calf(t: number): Scene {
  const { footDeg, ankle, hip, shoulder } = calfBody(t);
  const limb = arm(shoulder, pt(49, 128));
  return {
    box: ROOMY,
    origin: pt(87, 220),
    ground: [floor(-34, 88), box(pt(42.5, 7), 59, 14, 3, 'far', { eq: true }), furniture([pt(52, 14), pt(52, 136)], 6)],
    layers: [
      [torso(hip, shoulder), head(add(shoulder, dir(88, NECK))), ...leg(hip, ankle, footDeg)],
      [limb.upper, { ...limb.fore, halo: false }],
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Dead bug. On the back on the floor, head to the left; the torso does not move. One arm swings back overhead as a
// straight arm (an angle, not a straight-line path, so it does not shorten on the way) while the opposite leg reaches
// out low. The two limbs that move are full tone, so the eye follows the movement; the arm and the leg that hold
// their start position are the second tone, behind.

function deadbug(t: number): Scene {
  const shoulder = pt(0, 10);
  const hip = pt(TORSO, 10);
  const reach = mix(90, 172, t);
  const movingArm = line([shoulder, add(shoulder, dir(reach, UPPER)), add(shoulder, dir(reach, UPPER + FORE))], ARM_W, 'near', { id: 'arm' });
  const heldArm = line([shoulder, add(shoulder, dir(90, UPPER + FORE))], ARM_W, 'far');
  const bentAnkle = pt(TORSO + SHIN, 10 + THIGH);
  const movingAnkle = mixP(bentAnkle, add(hip, dir(6, THIGH + SHIN - 0.2)), t);
  // The held limbs sit exactly behind the moving ones at the start, so they are only drawn once they part.
  const held = t > 0.001 ? [...leg(hip, bentAnkle, 90, 'far', pt(TORSO, 10 + THIGH)), heldArm] : [];
  return {
    box: ROOMY,
    origin: pt(71.5, 152),
    ground: [floor(-58, 146)],
    layers: [
      [...held, torso(hip, shoulder), ...leg(hip, movingAnkle, mix(90, 96, t))],
      [movingArm],
      // The head is drawn last so it stays a whole circle; the reaching arm passes behind it.
      [head(pt(-NECK, HEAD_R), { halo: true })],
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The standing figure, seen from the front, as on the floor sign: both arms and legs are full tone. `stand` is the
// relaxed pose; `tall`, `cheer` and `victory` are reached from it. Arms turn about the shoulder, so they sweep out
// and up rather than through the body. The ladder: `tall` straightens, `cheer` puts one arm up, `victory` both.

interface Front {
  feet: number; // half the distance between the ankles
  spine: number; // hip line to shoulder line
  drop: number; // how far the shoulders hang below the top of the chest
  neck: number; // gap under the head
  wide: number; // shoulder joint, from the centre line
  armDeg: number; // the direction of the arm on the right of the picture; the other mirrors it
  otherDeg?: number; // unless it is given its own direction, measured the same way before mirroring
}
const STAND: Front = { feet: 9.5, spine: 56, drop: 1.5, neck: 2.5, wide: 25.5, armDeg: -90 };
const TALL: Front = { feet: 13.5, spine: 58, drop: 0, neck: 4, wide: 26, armDeg: -87 };
const VICTORY: Front = { feet: 15, spine: 58, drop: 0, neck: 4, wide: 26, armDeg: 62 };
// One straight arm, straight up; the other stays at the side. Nothing else moves but the stance of `tall`.
const CHEER: Front = { feet: 13.5, spine: 58, drop: 0, neck: 4, wide: 26, armDeg: -87, otherDeg: 88 };
const RAISE_LOW: Front = { feet: 13.5, spine: 58, drop: 0, neck: 4, wide: 26, armDeg: -84 };
const RAISE_HIGH: Front = { feet: 13.5, spine: 58, drop: 0, neck: 4, wide: 26, armDeg: 0 };

function front(from: Front, to: Front, t: number, origin: P = pt(114, 221), loaded = false): Scene {
  const v = (key: Exclude<keyof Front, 'otherDeg'>) => mix(from[key], to[key], t);
  const feet = v('feet');
  const hipY = ANKLE_H + Math.sqrt((THIGH + SHIN) ** 2 - (feet - 8) ** 2);
  const top = hipY + v('spine') + ARM_W / 2;
  const shoulderY = hipY + v('spine') - v('drop');
  const other = mix(from.otherDeg ?? from.armDeg, to.otherDeg ?? to.armDeg, t);
  const legs: Shape[] = [];
  const arms: Shape[] = [];
  const weights: Shape[] = [];
  for (const s of [-1, 1] as const) {
    const joint = pt(s * v('wide'), shoulderY);
    const a = s === 1 ? v('armDeg') : 180 - other;
    const hand = add(joint, dir(a, UPPER + FORE));
    legs.push(line([pt(s * 8, hipY), pt(s * feet, ANKLE_H)], LEG_W, 'near', { id: 'leg' }));
    arms.push(line([joint, add(joint, dir(a, UPPER)), hand], ARM_W, 'near', { id: 'arm' }));
    if (loaded) weights.push(...dumbbell(hand, a + 90)); // the handle lies across the hand
  }
  const trunk = [box(pt(0, (top + hipY - 3) / 2), 32, top - hipY + 3, 6), head(pt(0, top + v('neck') + HEAD_R))];
  // With weights the arms go in the weights' layer, so a dumbbell's gap is cut from the body beside it and not from
  // the hand that holds it.
  return { box: ROOMY, origin, ground: [], layers: loaded ? [[...legs, ...trunk], [...arms, ...weights]] : [[...legs, ...arms, ...trunk]] };
}

// ---------------------------------------------------------------------------------------------------------------------
// The second set: the home workout (push-up, air squat, glute bridge) and the lifts a swap can bring in.

const TOES = -60; // a foot on its toes behind the body
const TOE_ANKLE = 19.2; // how high the ankle sits then

// Push-up. The body is one straight line from shoulder to ankle and turns about the toes; the hands stay where they
// are on the floor and the elbow is solved from there, so it folds up past the back. The shoulders travel forward as
// they come down, so where the hands are set is a trade: under the shoulders at the top leaves the forearm leaning
// back 30 degrees at the bottom; far enough back for an upright forearm at the bottom leaves the arm leaning at the
// top. At 16 back the forearm is about 12 degrees off upright at the bottom and the straight arm about 15 at the top.
const HANDS_BACK = 16;

function pushup(t: number): Scene {
  const ankle = pt(0, TOE_ANKLE);
  const reach = TORSO + THIGH + SHIN;
  const top = 6.5 + Math.sqrt((UPPER + FORE) ** 2 - HANDS_BACK ** 2);
  const hand = pt(Math.sqrt(reach ** 2 - (top - ankle.y) ** 2) - HANDS_BACK, 6.5);
  const y = mix(top, 25, t);
  const shoulder = pt(Math.sqrt(reach ** 2 - (y - ankle.y) ** 2), y);
  const hip = mixP(shoulder, ankle, TORSO / reach);
  const slope = Math.atan2(shoulder.y - ankle.y, shoulder.x - ankle.x) / RAD;
  const limb = arm(shoulder, hand);
  return {
    box: SNUG,
    origin: pt(14.5, 147),
    ground: [floor(-8, 182)],
    layers: [
      [torso(hip, shoulder), head(add(shoulder, dir(slope + 12, NECK))), ...leg(hip, ankle, TOES)],
      [limb.upper, limb.fore],
    ],
  };
}

/** The squat's legs: feet planted, from standing to thigh-level. */
function squatLegs(t: number, deepShin: number) {
  const ankle = pt(0, ANKLE_H);
  const knee = add(ankle, dir(90 - mix(6, deepShin, t), SHIN));
  const hip = add(knee, dir(90 + mix(-2.5, 90, t), THIGH));
  return { ankle, knee, hip };
}

// Air squat. The squat's legs with nothing on the back: the shoulders stay over the front of the foot and the arms
// come up to level in front as a counterweight.
function airsquat(t: number): Scene {
  const { ankle, knee, hip } = squatLegs(t, 28);
  const up = 90 - Math.asin((9 - hip.x) / TORSO) / RAD;
  const shoulder = add(hip, dir(up, TORSO));
  const reach = mix(-48, 0, t);
  return {
    box: SNUG,
    origin: pt(83, 196.5),
    ground: [floor(-46, 84)],
    layers: [
      [
        torso(hip, shoulder),
        ...leg(hip, ankle, 0, 'near', knee),
        head(add(shoulder, dir(up + mix(2, 14, t), NECK))),
        line([shoulder, add(shoulder, dir(reach, UPPER)), add(shoulder, dir(reach, UPPER + FORE))], ARM_W, 'near', { id: 'arm' }),
      ],
    ],
  };
}

// Glute bridge. On the back, head to the left, feet planted where the shins will stand upright at the top. The
// torso turns about the shoulders until shoulder, hip and knee are one straight line; the arm stays on the floor.
function bridge(t: number): Scene {
  const shoulder = pt(0, 10);
  const lift = Math.atan2(ANKLE_H + SHIN - shoulder.y, Math.sqrt((TORSO + THIGH) ** 2 - (ANKLE_H + SHIN - shoulder.y) ** 2)) / RAD;
  const ankle = pt(Math.cos(lift * RAD) * (TORSO + THIGH), ANKLE_H);
  const hip = add(shoulder, dir(mix(0, lift, t), TORSO));
  const alongFloor = -Math.asin(3.5 / (UPPER + FORE)) / RAD; // from the shoulder down to a hand resting on the floor
  return {
    box: SNUG,
    origin: pt(65, 130),
    ground: [floor(-44, 118)],
    layers: [
      [
        line([shoulder, add(shoulder, dir(alongFloor, UPPER)), add(shoulder, dir(alongFloor, UPPER + FORE))], ARM_W, 'near', { id: 'arm' }),
        torso(hip, shoulder),
        ...leg(hip, ankle, 0),
        head(pt(-NECK, HEAD_R)),
      ],
    ],
  };
}

// Goblet squat. The squat's legs with one dumbbell held on end at the chest, elbows under it. The weight in front
// lets the torso stay more upright, so the knees travel further over the toes.
function goblet(t: number): Scene {
  const { ankle, knee, hip } = squatLegs(t, 34);
  const up = 90 - Math.asin((mix(7.5, 5, t) - hip.x) / TORSO) / RAD;
  const shoulder = add(hip, dir(up, TORSO));
  const held = add(shoulder, add(dir(up - 90, 22), dir(up, -9)));
  const limb = arm(shoulder, held);
  return {
    box: SNUG,
    origin: pt(95, 196.5),
    ground: [floor(-42, 56)],
    layers: [
      [torso(hip, shoulder), ...leg(hip, ankle, 0, 'near', knee), head(add(shoulder, dir(up + mix(1, 8, t), NECK)))],
      [limb.upper, { ...limb.fore, halo: false }, ...dumbbell(held, 90)],
    ],
  };
}

/** The split squat's hip and shoulder. */
function splitBody(t: number) {
  const hip = mixP(pt(-8, 86), pt(-14, ANKLE_H + SHIN), t);
  return { hip, shoulder: add(hip, dir(90 - mix(3, 7, t), TORSO)) };
}

// Split squat. The front foot flat, the back foot on its toes, the torso upright between them. The hips drop
// straight down until the front thigh is level and the back knee is just off the floor. Hand on the hip.
function splitsquat(t: number): Scene {
  const { hip, shoulder } = splitBody(t);
  const limb = arm(shoulder, add(hip, pt(2, 3)));
  return {
    box: SNUG,
    origin: pt(106, 192),
    ground: [floor(-70, 62)],
    layers: [
      [
        ...leg(hip, pt(-52, TOE_ANKLE), TOES, 'far'),
        torso(hip, shoulder),
        ...leg(hip, pt(30, ANKLE_H), 0),
        head(add(shoulder, dir(90, NECK))),
        limb.upper,
        { ...limb.fore, halo: false },
      ],
    ],
  };
}

// Incline dumbbell press. The bench press on a bench tipped up 40 degrees: the same turn of the upper arm about the
// shoulder, the forearm vertical under the dumbbell all the way.
function incline(t: number): Scene {
  const up = 140;
  const hip = pt(0, 54);
  const shoulder = add(hip, dir(up, TORSO));
  const elbow = add(shoulder, dir(mix(90, -45, t), UPPER));
  const wrist = add(elbow, pt(0, FORE));
  const limb = arm(shoulder, wrist, elbow);
  const under = add(hip, dir(up + 90, 14)); // on the back pad's centre line
  const seatBack = add(under, dir(up, (40 - under.y) / Math.sin(up * RAD)));
  return {
    box: SNUG,
    origin: pt(111, 182),
    ground: [
      floor(-84, 66),
      furniture([pt(4, 36), pt(4, 2)], 8),
      furniture([pt(24, 40), seatBack, add(under, dir(up, TORSO + 16))], 8), // the seat and the back pad, one stroke
    ],
    layers: [
      [torso(hip, shoulder), head(add(shoulder, dir(up, NECK))), ...leg(hip, pt(42, ANKLE_H), 0)],
      [limb.upper, { ...limb.fore, halo: false }, ...dumbbell(wrist)],
    ],
  };
}

// One-arm dumbbell row. One knee and one hand on a bench, the other foot on the floor, the back one straight
// stroke that does not move. The whole body is full tone here, supporting arm and kneeling leg included: they rest
// on the bench, and in the second tone they merged with it. The bench is the only thing in the second tone.
// The rowing arm works as in the supported row: forearm hanging vertical, elbow finishing past the line of the back,
// the dumbbell in clear air between the body and the bench.
function onearmrow(t: number): Scene {
  const up = 10;
  const top = 40; // the bench
  const kneeling = pt(0, top + ANKLE_H);
  const hip = add(kneeling, pt(0, THIGH));
  const shoulder = add(hip, dir(up, TORSO));
  const elbow = add(shoulder, dir(mix(-90, -195, t), UPPER));
  const wrist = add(elbow, pt(0, -FORE));
  const limb = arm(shoulder, wrist, elbow);
  const hand = pt(shoulder.x + Math.sqrt((UPPER + FORE - 0.05) ** 2 - (shoulder.y - top - 6.5) ** 2), top + 6.5);
  const shinEnd = add(kneeling, pt(-SHIN, 0));
  return {
    box: SNUG,
    origin: pt(77, 162),
    ground: [floor(-62, 112), furniture([pt(34, top - 8), pt(34, 2)], 8), furniture([pt(-50, top - 4), pt(102, top - 4)], 8)],
    layers: [
      [
        line([hip, kneeling, shinEnd], LEG_W, 'near', { id: 'kneeling leg' }),
        line([add(shinEnd, pt(-1, 2.5)), add(shinEnd, pt(-15, 2.5))], FOOT_W),
        line([shoulder, mixP(shoulder, hand, 0.5), hand], ARM_W),
        torso(hip, shoulder),
        head(add(shoulder, dir(up + 8, NECK))),
        ...leg(hip, pt(-4, ANKLE_H), 0),
      ],
      [limb.upper, limb.fore, ...dumbbell(wrist)],
    ],
  };
}

// Lat pulldown. Seated, leaning back a touch. The bar comes straight down its cable from full reach to the
// collarbone, and the elbow is solved from the hand, so it travels down in front and finishes under the bar.
// At full reach the arm passes the head; the head is drawn last and whole, and the arm shows above it.
const CABLE_TOP = 198; // where the cable leaves: the top edge of the pulldown's box

function pulldown(t: number): Scene {
  const hip = pt(0, 54);
  const up = 96;
  const shoulder = add(hip, dir(up, TORSO));
  const hand = pt(shoulder.x + 15, mix(shoulder.y + 60, shoulder.y + 2, t));
  const limb = arm(shoulder, hand);
  return {
    box: SNUG,
    origin: pt(85, CABLE_TOP),
    ground: [
      floor(-36, 70),
      furniture([pt(8, 36), pt(8, 2)], 8),
      furniture([pt(-12, 40), pt(26, 40)], 8),
      furniture([hand, pt(hand.x, CABLE_TOP)], 3), // the cable, up to the top edge of the box
    ],
    layers: [
      [torso(hip, shoulder), ...leg(hip, pt(43.9, ANKLE_H), 0)],
      [limb.upper, limb.fore, line([pt(hand.x - 13, hand.y), pt(hand.x + 13, hand.y)], 6, 'near', { eq: true })],
      [head(add(shoulder, dir(up - 4, NECK)), { halo: true })],
    ],
  };
}

// Bird dog. On hands and knees, head to the right; the torso does not move. One arm swings forward as a straight
// arm while the opposite leg reaches straight back. As in the dead bug, the two limbs that move are full tone and
// the arm and the leg that hold the body up are the second tone, behind. Arms are longer than thighs, so the back
// slopes up a little toward the shoulders, as it does on a person.
function birddog(t: number): Scene {
  const hip = pt(0, ANKLE_H + THIGH);
  const shoulderY = 6.5 + UPPER + FORE - 0.1;
  const shoulder = pt(Math.sqrt(TORSO ** 2 - (shoulderY - hip.y) ** 2), shoulderY);
  const slope = Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x) / RAD;
  const knee = pt(0, ANKLE_H);
  const tucked = pt(-Math.sqrt(SHIN ** 2 - (TOE_ANKLE - ANKLE_H) ** 2), TOE_ANKLE);
  const reach = mix(-90, slope - 6, t);
  const movingArm = line([shoulder, add(shoulder, dir(reach, UPPER)), add(shoulder, dir(reach, UPPER + FORE))], ARM_W, 'near', { id: 'arm' });
  const movingAnkle = mixP(tucked, add(hip, dir(180 + slope - 12, THIGH + SHIN - 0.2)), t);
  // The held limbs sit exactly behind the moving ones at the start, so they are only drawn once they part.
  const held = t > 0.001 ? [...leg(hip, tucked, TOES, 'far', knee), line([shoulder, pt(shoulder.x, 6.5)], ARM_W, 'far')] : [];
  return {
    box: ROOMY,
    origin: pt(99.5, 158.5),
    ground: [floor(-60, 78)],
    layers: [
      [...held, torso(hip, shoulder), ...leg(hip, movingAnkle, mix(TOES, -90 + slope - 12, t))],
      [movingArm],
      // The head is drawn last so it stays a whole circle; the reaching arm passes behind it.
      [head(add(shoulder, dir(slope + 8, NECK)), { halo: true })],
    ],
  };
}

// Single-leg calf raise. The calf raise with the far leg folded up behind, out of the way.
function singlecalf(t: number): Scene {
  const base = calf(t);
  const hipLine = base.layers[0][0] as Extract<Shape, { k: 'line' }>;
  const hip = hipLine.pts[0];
  const farKnee = add(hip, dir(-93, THIGH));
  const farAnkle = add(farKnee, dir(-160, SHIN));
  return {
    ...base,
    origin: pt(91, 220),
    layers: [[line([hip, farKnee, farAnkle], LEG_W, 'far', { id: 'far leg' }), foot(farAnkle, -70, 'far'), ...base.layers[0]], ...base.layers.slice(1)],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The third set: lifts named by the lifting project's catalog.

// Knee push-up. The push-up turning about the knees: one straight line from shoulder to knee, shins resting behind.
// The shorter body carries the shoulders further forward on the way down, so with the hands 12 behind the shoulders
// at the top the forearm stands upright at the bottom.
function kneepushup(t: number): Scene {
  const knee = pt(0, ANKLE_H);
  const reach = TORSO + THIGH;
  const top = 6.5 + Math.sqrt((UPPER + FORE) ** 2 - 12 ** 2);
  const hand = pt(Math.sqrt(reach ** 2 - (top - knee.y) ** 2) - 12, 6.5);
  const y = mix(top, 25, t);
  const shoulder = pt(Math.sqrt(reach ** 2 - (y - knee.y) ** 2), y);
  const hip = mixP(shoulder, knee, TORSO / reach);
  const slope = Math.atan2(shoulder.y - knee.y, shoulder.x - knee.x) / RAD;
  const ankle = pt(-Math.sqrt(SHIN ** 2 - (TOE_ANKLE - ANKLE_H) ** 2), TOE_ANKLE);
  const limb = arm(shoulder, hand);
  return {
    box: SNUG,
    origin: pt(57, 150),
    ground: [floor(-50, 140)],
    layers: [
      [torso(hip, shoulder), head(add(shoulder, dir(slope + 10, NECK))), ...leg(hip, ankle, TOES, 'near', knee)],
      [limb.upper, limb.fore],
    ],
  };
}

// Dumbbell Romanian deadlift. A hinge, not a squat: the shins stay upright, the knees only soften, the hips travel
// back and the back stays one straight stroke as it tips to 12 degrees above level. The arm's angle is solved each
// frame so the dumbbell goes straight down close to the legs, from the hip to the upper shin.
function rdl(t: number): Scene {
  const ankle = pt(0, ANKLE_H);
  const knee = add(ankle, dir(90 - mix(3, 0, t), SHIN));
  const hip = add(knee, dir(90 + mix(-1, 38, t), THIGH));
  const up = 90 - mix(2, 78, t);
  const shoulder = add(hip, dir(up, TORSO));
  const swing = Math.asin((mix(10.5, 12, t) - shoulder.x) / (UPPER + FORE)) / RAD; // forward of straight down
  const elbow = add(shoulder, dir(swing - 90, UPPER));
  const wrist = add(shoulder, dir(swing - 90, UPPER + FORE));
  const limb = arm(shoulder, wrist, elbow);
  return {
    box: SNUG,
    origin: pt(91.5, 196.5),
    ground: [floor(-44, 62)],
    layers: [
      [torso(hip, shoulder), ...leg(hip, ankle, 0, 'near', knee), head(add(shoulder, dir(up + mix(0, 10, t), NECK)))],
      [limb.upper, limb.fore, ...dumbbell(wrist)],
    ],
  };
}

// Wall push-up. Standing an arm's length from a wall, the body one straight line from ankle to shoulder, turning
// about the ankle from a slight lean to a deep one; the hands stay on the wall and the elbow drops below them.
function wallpushup(t: number): Scene {
  const ankle = pt(0, ANKLE_H);
  const reach = TORSO + THIGH + SHIN;
  const far = add(ankle, dir(78, reach));
  const hand = pt(far.x + Math.sqrt((UPPER + FORE - 0.1) ** 2 - 10 ** 2), far.y - 10);
  const lean = mix(12, 26, t);
  const shoulder = add(ankle, dir(90 - lean, reach));
  const hip = mixP(shoulder, ankle, TORSO / reach);
  const wall = hand.x + ARM_W / 2 + 3;
  const limb = arm(shoulder, hand);
  return {
    box: SNUG,
    origin: pt(57, 196),
    ground: [floor(-14, wall + 3), furniture([pt(wall, 0), pt(wall, 188)], 6)],
    layers: [
      [torso(hip, shoulder), head(add(shoulder, dir(96 - lean, NECK))), ...leg(hip, ankle, 0)],
      [limb.upper, { ...limb.fore, halo: false }],
    ],
  };
}

// Incline push-up. The push-up with the hands on a bench. The steeper body carries the shoulders a long way forward
// as they come down, so the hands start almost under the shoulders and the forearm is still upright at the bottom.
function inclinepushup(t: number): Scene {
  const ankle = pt(0, TOE_ANKLE);
  const reach = TORSO + THIGH + SHIN;
  const handY = 46 + 6.5; // on a bench 46 high
  const top = handY + Math.sqrt((UPPER + FORE) ** 2 - 6 ** 2);
  const hand = pt(Math.sqrt(reach ** 2 - (top - ankle.y) ** 2) - 6, handY);
  const y = mix(top, handY + 18.5, t);
  const shoulder = pt(Math.sqrt(reach ** 2 - (y - ankle.y) ** 2), y);
  const hip = mixP(shoulder, ankle, TORSO / reach);
  const slope = Math.atan2(shoulder.y - ankle.y, shoulder.x - ankle.x) / RAD;
  const limb = arm(shoulder, hand);
  return {
    box: SNUG,
    origin: pt(21, 174.5),
    ground: [floor(-8, hand.x + 62), furniture([pt(hand.x + 24, 38), pt(hand.x + 24, 2)], 8), furniture([pt(hand.x - 10, 42), pt(hand.x + 56, 42)], 8)],
    layers: [
      [torso(hip, shoulder), head(add(shoulder, dir(slope + 12, NECK))), ...leg(hip, ankle, TOES)],
      [limb.upper, limb.fore],
    ],
  };
}

// Single-leg glute bridge. The bridge on one planted foot. The other leg is held straight, in line with the body:
// at the top it runs on from the planted thigh, so shoulder, hip, knee and the far foot are one line.
function singlebridge(t: number): Scene {
  const shoulder = pt(0, 10);
  const lift = Math.atan2(ANKLE_H + SHIN - shoulder.y, Math.sqrt((TORSO + THIGH) ** 2 - (ANKLE_H + SHIN - shoulder.y) ** 2)) / RAD;
  const ankle = pt(Math.cos(lift * RAD) * (TORSO + THIGH), ANKLE_H);
  const hip = add(shoulder, dir(mix(0, lift, t), TORSO));
  const alongFloor = -Math.asin(3.5 / (UPPER + FORE)) / RAD;
  const out = mix(6, lift, t); // the straight leg: just off the floor, then in line with the body
  const farAnkle = add(hip, dir(out, THIGH + SHIN));
  return {
    box: SNUG,
    origin: pt(48, 145),
    ground: [floor(-44, 150)],
    layers: [
      [
        line([hip, add(hip, dir(out, THIGH)), farAnkle], LEG_W, 'far', { id: 'far leg' }),
        foot(farAnkle, 90 + out, 'far'),
        line([shoulder, add(shoulder, dir(alongFloor, UPPER)), add(shoulder, dir(alongFloor, UPPER + FORE))], ARM_W, 'near', { id: 'arm' }),
        torso(hip, shoulder),
        ...leg(hip, ankle, 0),
        head(pt(-NECK, HEAD_R)),
      ],
    ],
  };
}

/** An arm hanging straight down from the shoulder with a dumbbell in the hand, in front of the body. */
function hanging(shoulder: P): Shape[] {
  const limb = arm(shoulder, add(shoulder, dir(-88, UPPER + FORE)), add(shoulder, dir(-88, UPPER)));
  return [limb.upper, limb.fore, ...dumbbell(add(shoulder, dir(-88, UPPER + FORE)))];
}

// Added-load calf raise. The calf raise with a dumbbell hanging at the side, so no hand is on a rail.
function loadedcalf(t: number): Scene {
  const { footDeg, ankle, hip, shoulder } = calfBody(t);
  return {
    box: ROOMY,
    origin: pt(100, 220),
    ground: [floor(-34, 62), box(pt(34, 7), 42, 14, 3, 'far', { eq: true })],
    layers: [[torso(hip, shoulder), head(add(shoulder, dir(88, NECK))), ...leg(hip, ankle, footDeg)], hanging(shoulder)],
  };
}

// Added-load split squat. The split squat with a dumbbell hanging at the side in place of the hand on the hip.
function loadedsplit(t: number): Scene {
  const { hip, shoulder } = splitBody(t);
  return {
    box: SNUG,
    origin: pt(106, 192),
    ground: [floor(-70, 62)],
    layers: [
      [...leg(hip, pt(-52, TOE_ANKLE), TOES, 'far'), torso(hip, shoulder), ...leg(hip, pt(30, ANKLE_H), 0), head(add(shoulder, dir(90, NECK)))],
      hanging(shoulder),
    ],
  };
}

// To add a move: write its function above and name it here (and give it a cell in the gallery). The `Move` type,
// and so the component's `LifterMove`, follow from this list.
const MOVES = {
  squat,
  bench,
  row,
  calf,
  deadbug,
  stand: () => front(STAND, STAND, 0),
  tall: (t) => front(STAND, TALL, t),
  victory: (t) => front(STAND, VICTORY, t),
  pushup,
  airsquat,
  bridge,
  goblet,
  splitsquat,
  incline,
  onearmrow,
  pulldown,
  birddog,
  singlecalf,
  cheer: (t) => front(STAND, CHEER, t, pt(114, 225)),
  rdl,
  kneepushup,
  wallpushup,
  inclinepushup,
  // Front view, like the standing figure: a dumbbell in each hand, arms from the sides out to level.
  lateralraise: (t) => front(RAISE_LOW, RAISE_HIGH, t, pt(114, 209), true),
  singlebridge,
  loadedcalf,
  loadedsplit,
} satisfies Record<string, (t: number) => Scene>;

export type Move = keyof typeof MOVES;

/** The shapes for a move at t: 0 is the start pose (for `tall` and `victory`, the relaxed stand), 1 the end pose. */
export function scene(move: Move, t: number): Scene {
  return MOVES[move](Math.min(1, Math.max(0, t)));
}

/**
 * The smallest rectangle, in SVG coordinates of the move's box, that holds everything drawn at each of the given
 * moments: used to crop the box to the figure. With `equipment` or `weights` off, those are left out of the measure
 * too. `bold` is the factor the body's strokes are thickened by at small sizes.
 */
export function bounds(move: Move, moments: number[], equipment: boolean, weights = true, bold = 1): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let origin = pt(0, 0);
  const grow = (p: P, r: number) => {
    x0 = Math.min(x0, p.x - r);
    x1 = Math.max(x1, p.x + r);
    y0 = Math.min(y0, p.y - r);
    y1 = Math.max(y1, p.y + r);
  };
  for (const t of moments) {
    const drawn = scene(move, t);
    origin = drawn.origin;
    for (const shape of [...drawn.ground, ...drawn.layers.flat()]) {
      if ((shape.eq && !equipment) || (shape.weight && !weights)) continue;
      if (shape.k === 'line') shape.pts.forEach((p) => grow(p, (shape.w * (shape.furn ? 1 : bold)) / 2));
      else if (shape.k === 'disc') grow(shape.c, shape.r);
      else if (shape.rot) grow(shape.c, Math.hypot(shape.w, shape.h) / 2); // turned: the circle around it
      else {
        grow(pt(shape.c.x - shape.w / 2, shape.c.y - shape.h / 2), 0);
        grow(pt(shape.c.x + shape.w / 2, shape.c.y + shape.h / 2), 0);
      }
    }
  }
  return { x: origin.x + x0, y: origin.y - y1, w: x1 - x0, h: y1 - y0 };
}
