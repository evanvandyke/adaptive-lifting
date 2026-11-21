'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Figure } from './figure';
import type { Move } from './rig';

/**
 * The pictogram lifter: the yellow-sign figure who shows each lift.
 *
 * The interface below is the one agreed in BUILD-BRIEF-03-signal.md and the screens are coded against it. The poses
 * and the drawing live in rig.ts and figure.tsx; this file only decides which moment of a movement to show.
 * The figure's box is square for every move (width = height = `size`) and every move is drawn at one scale.
 */
// The moves are named in one place, the list at the foot of rig.ts; this is that list under its public name.
export type LifterMove = Move;

export interface LifterProps {
  /** Which movement or pose. The lifts have a start and an end pose; `stand`, `tall`, `cheer` and `victory` are single poses reached from `stand`. */
  move: LifterMove;
  /**
   * How many times to play the movement when the component mounts or when `playKey` changes.
   * 0 (the default) draws the lift in its `pose` and nothing moves. `'loop'` repeats until the component unmounts or
   * `reps` or `playKey` changes. Each repetition is followed by a short beat in the start pose. A counted play comes
   * to rest in `pose`: with `pose="end"` it travels once more to the end pose after the last repetition and holds.
   * For `tall`, `cheer` and `victory`, any value above 0, and `'loop'`, plays the one move from `stand` into the pose
   * and holds it. Playing pauses while the page is hidden and picks up where it stopped.
   */
  reps?: number | 'loop';
  /** Change this to play again. */
  playKey?: string | number;
  /** Rendered height in CSS px; width follows the figure's box. Default 200. */
  size?: number;
  /** `ink` draws a black figure for the yellow ground; `yellow` draws a yellow figure for the black ground. Default `ink`. */
  tone?: 'ink' | 'yellow';
  /** Draw the equipment the lift uses (bar, dumbbells, bench, step). Default true. */
  equipment?: boolean;
  /**
   * Draw what he holds or carries: dumbbells, and the squat's bar and plate. Default true. False shows the lift
   * empty-handed, for "try it with no weight first": benches, steps, rails, walls, cables and the floor stay, and so
   * does the pulldown's bar, which is part of the machine. His hands stay where they would be.
   */
  weights?: boolean;
  /** Accessible name. When absent the figure is decorative and hidden from assistive tech. */
  label?: string;
  className?: string;
  /**
   * Which pose a lift rests in: when nothing plays (`reps` is 0, or the person asked for reduced motion), and after
   * a counted play. Default `start`. `end` is the bottom of the squat, the top of the bridge, the pulled row: usually
   * the pose that names the lift best. `stand`, `tall`, `cheer` and `victory` have one pose and ignore this.
   */
  pose?: 'start' | 'end';
  /**
   * Crop the box to the figure and its equipment in the drawn pose, with a small even margin, so the figure fills
   * its box and sits flush to the box's left edge. `size` is then the rendered height and the width follows the
   * cropped box (a figure lying down is much wider than it is tall). While a movement plays, the crop is the start
   * and end poses together, so nothing jumps. Default false: the move's square box.
   */
  fit?: boolean;
  /**
   * What `fit` crops to. `pose` (the default) is the drawn pose while still and the whole move while playing, so the
   * box changes when playing starts or stops. `move` is always the start and end poses together, still or playing,
   * so a figure that has played never shifts sideways.
   */
  fitBox?: 'pose' | 'move';
}

const OUT_MS = 1100; // start pose to end pose
const BACK_MS = 900; // and back
const BEAT_MS = 250; // held in the start pose between repetitions, so each one reads as a repetition
// `stand` into the held pose. `cheer` is a small acknowledgment and a touch quicker than the two-armed finish.
const ONCE_MS = { tall: 500, cheer: 450, victory: 500 } as const;
type Held = keyof typeof ONCE_MS;
const isHeld = (move: LifterMove): move is Held => move in ONCE_MS;

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

/**
 * Where the movement is after `elapsed` ms of playing. `once` is the length of a held pose's single move, or 0 for
 * a lift; `reps` may be Infinity, for a loop; `toEnd` adds a last journey to the end pose, where a counted play rests.
 */
function moment(once: number, reps: number, toEnd: boolean, elapsed: number): { t: number; done: boolean } {
  if (once) return elapsed >= once ? { t: 1, done: true } : { t: ease(elapsed / once), done: false };
  const rep = OUT_MS + BACK_MS;
  const cycle = rep + BEAT_MS;
  // The beat falls between repetitions, not after the last one.
  const played = reps * cycle - BEAT_MS;
  if (elapsed >= played) {
    if (!toEnd) return { t: 0, done: true };
    // One more beat in the start pose, then out to the end pose, and stay.
    const last = elapsed - played - BEAT_MS;
    if (last >= OUT_MS) return { t: 1, done: true };
    return { t: last <= 0 ? 0 : ease(last / OUT_MS), done: false };
  }
  const within = elapsed % cycle;
  if (within >= rep) return { t: 0, done: false };
  return { t: within < OUT_MS ? ease(within / OUT_MS) : 1 - ease((within - OUT_MS) / BACK_MS), done: false };
}

const REDUCE = '(prefers-reduced-motion: reduce)';
const watchReduce = (onChange: () => void) => {
  const query = window.matchMedia(REDUCE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const readReduce = () => window.matchMedia(REDUCE).matches;
const noReduce = () => false;

export function Lifter({ move, reps = 0, playKey, size = 200, tone = 'ink', equipment = true, label, className, pose = 'start', fit = false, fitBox = 'pose', weights = true }: LifterProps) {
  const reduce = useSyncExternalStore(watchReduce, readReduce, noReduce);
  const once = isHeld(move) ? ONCE_MS[move] : 0;
  const held = once > 0;
  const count = reps === 'loop' ? Infinity : Number.isFinite(reps) ? Math.max(0, Math.floor(reps)) : 0;
  const plays = count > 0 && !reduce && move !== 'stand';
  // A counted play of a lift ends in the pose asked for; a loop has no end.
  const toEnd = pose === 'end' && Number.isFinite(count);
  const playId = `${move}/${count}/${toEnd ? 'end' : 'start'}/${String(playKey)}`;
  const [frame, setFrame] = useState<{ id: string; t: number } | null>(null);

  useEffect(() => {
    if (!plays) return;
    let handle = 0;
    let last: number | null = null; // the previous frame's time; null just after a start or a resume
    let elapsed = 0; // time spent playing, which leaves out any time the page was hidden
    let shown: number | null = null;
    let finished = false;
    const step = (now: number) => {
      if (last !== null) elapsed += now - last;
      last = now;
      const { t, done } = moment(once, count, toEnd, elapsed);
      if (t !== shown) setFrame({ id: playId, t });
      shown = t;
      finished = done;
      // The last frame lands on the resting pose and asks for nothing more.
      handle = done ? 0 : requestAnimationFrame(step);
    };
    const resume = () => {
      last = null;
      handle = requestAnimationFrame(step);
    };
    const pause = () => {
      cancelAnimationFrame(handle);
      handle = 0;
    };
    // A hidden page is asked for nothing; the movement picks up where it stopped when the page is seen again.
    const seen = () => {
      if (document.hidden) pause();
      else if (!finished && handle === 0) resume();
    };
    if (!document.hidden) resume();
    document.addEventListener('visibilitychange', seen);
    return () => {
      pause();
      document.removeEventListener('visibilitychange', seen);
    };
  }, [plays, once, count, toEnd, playId]);

  // Still: a lift shows the pose asked for, a held move the pose itself. Playing: until the first frame arrives the
  // figure is at the beginning (for a held move, the relaxed stand).
  const still = held || (pose === 'end' && move !== 'stand') ? 1 : 0;
  const t = !plays ? still : frame && frame.id === playId ? frame.t : 0;
  const crop = !fit ? undefined : plays || fitBox === 'move' ? [0, 1] : [still];

  return <Figure move={move} t={t} size={size} tone={tone} equipment={equipment} weights={weights} fit={crop} label={label} className={className} />;
}
