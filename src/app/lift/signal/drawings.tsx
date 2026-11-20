'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { plateLine } from '../visit/copy';
import { playSound } from '../visit/feedback';
import { platesPerSide, type Exercise } from '../visit/visit-data';
import { useTones } from './ground';
import { useBoxHeight } from './hooks';
import { Lifter } from './lifter/lifter';
import { bounds } from './lifter/rig';
import s from './signal.module.css';

/** How tall each plate stands, as a share of the tallest. The number is inside the plate, so the height only has to step. */
const PLATE_HEIGHT: Record<number, number> = { 45: 1, 35: 0.86, 25: 0.72, 10: 0.56, 5: 0.44, 2.5: 0.34 };
/** Bar geometry, in px. The bar keeps the column's full width; the plates always sit at its ends. */
const STUB = 14;
const GAP = 2;
const BARE_SLEEVE = 44;
/** The plates wait for the words to be in place, then land one every this many ms, inner plates first: about 300 ms in all. */
const WAIT_MS = 80;
const STAGGER_MS = 50;
const SLIDE_MS = 160;

/**
 * Wide enough to carry its number, 28 px up to three a side. From four a side the plates narrow, so the shaft
 * between the collars stays at least 90 px in a 335 px column and the bar still looks like a bar.
 */
const plateWidth = (count: number) => (count <= 3 ? 28 : count === 4 ? 23 : count === 5 ? 18 : count === 6 ? 14 : 12);

/**
 * The whole bar, front view: a thin shaft, a collar and a thicker sleeve each side, and the plates on both ends,
 * each carrying its own number. No caption. When the lift arrives its plates slide on, inner first. When the
 * weight changes, a plate that is still wanted stays where it is and only the ones that changed slide on, so a
 * held stepper shows the plates swapping as it goes.
 */
export function Barbell({ weight, still }: { weight: number; still?: boolean }) {
  const load = platesPerSide(weight);
  const count = load.plates.length;
  const width = plateWidth(count);
  const stack = count * width + Math.max(0, count - 1) * GAP;
  const sleeve = Math.max(BARE_SLEEVE, STUB + stack + GAP);
  // The bar has arrived once its first plates have landed: after that a changed plate slides on at once.
  const [arrived, setArrived] = useState(false);
  const landed = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => { landed.current = true; setArrived(true); }, WAIT_MS + SLIDE_MS + 5 * STAGGER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // One clack as the plates stop.
  useEffect(() => {
    if (still || count === 0) return;
    const timer = window.setTimeout(() => playSound('tick'), landed.current ? SLIDE_MS : WAIT_MS + SLIDE_MS + (count - 1) * STAGGER_MS);
    return () => window.clearTimeout(timer);
  }, [still, count, weight]);

  const plates = (side: 'left' | 'right') => load.plates.map((plate, index) => {
    // Heaviest nearest the collar: index 0 is the innermost plate.
    const fromEnd = sleeve - GAP - (index + 1) * width - index * GAP;
    const style = {
      [side]: fromEnd, width, '--h': PLATE_HEIGHT[plate] ?? 0.5, animationDelay: arrived ? '0ms' : `${WAIT_MS + index * STAGGER_MS}ms`,
    } as CSSProperties;
    // Keyed on its place and its size: the same plate in the same place is the same element, and does not slide again.
    return <span key={`${side}${index}:${plate}`} className={s.plate} data-side={side} data-small={width < 26 || String(plate).length > 2 || undefined} data-tiny={width < 20 || undefined} style={style}>{plate}</span>;
  });

  return (
    <div className={s.bar} role="img" aria-label={count === 0 ? 'The bar, no plates' : `The bar with ${plateLine(load)}`} data-still={still || undefined}>
      <span className={s.shaft} style={{ left: sleeve, right: sleeve }} />
      <span className={s.sleeve} data-side="left" style={{ left: 0, width: sleeve }} />
      <span className={s.sleeve} data-side="right" style={{ right: 0, width: sleeve }} />
      <span className={s.collar} style={{ left: sleeve }} />
      <span className={s.collar} style={{ right: sleeve }} />
      {plates('left')}
      {plates('right')}
    </div>
  );
}

/** How many times he does the lift when it first arrives. */
const SHOW_REPS = 5;
/** Of the room between the markers and the numbers, the share a standing figure takes: 120 px of 138 at 620. */
const FIGURE_SHARE = 0.87;

/** The margin the figure's own crop leaves around its ink, in its units (`FIT_MARGIN` in lifter/figure.tsx). */
const CROP_MARGIN = 2;

/**
 * How far the resting figure's ink starts from the left edge of its box, in the figure's units. The box is the
 * whole movement's, so a pose that reaches less far left than the other (the dead bug at rest) would stand a few
 * px right of the text edge. The figure is drawn this much further left, always, so at rest his ink starts where
 * the words start, and nothing shifts when he plays.
 */
function restInset(exercise: Exercise): number {
  const pose = bounds(exercise.figure, [exercise.pose === 'end' ? 1 : 0], true);
  const whole = bounds(exercise.figure, [0, 1], true);
  return pose.x - whole.x + CROP_MARGIN;
}

/**
 * The rehearsal's figure: the lift with nothing in his hands, on the same bench or floor, going for as long as the
 * screen is up. Cropped on its own he would be a little larger than the figure of the try that follows (the crop
 * without the weights is smaller), and would jump when the try arrives. So the try's figure is drawn here too,
 * unseen, and gives the box; the empty-handed one is laid over it at the same scale and the same place.
 */
function EmptyHanded({ exercise, size, tone }: { exercise: Exercise; size: number; tone: 'ink' | 'yellow' }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; height: number } | null>(null);
  useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const read = () => {
      const [box, figure] = element.querySelectorAll('svg');
      if (!box || !figure) return;
      const a = box.viewBox.baseVal;
      const b = figure.viewBox.baseVal;
      const scale = box.getBoundingClientRect().height / a.height;
      if (!Number.isFinite(scale) || scale <= 0) return;
      const next = { left: Math.round((b.x - a.x) * scale * 10) / 10, top: Math.round((b.y - a.y) * scale * 10) / 10, height: Math.round(b.height * scale * 10) / 10 };
      setPlace(now => (now && now.left === next.left && now.top === next.top && now.height === next.height ? now : next));
    };
    const sized = new ResizeObserver(read);
    sized.observe(element);
    const changed = new MutationObserver(read);
    changed.observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: ['viewBox'] });
    return () => {
      sized.disconnect();
      changed.disconnect();
    };
  }, []);
  return (
    <span ref={wrap} className={s.twin}>
      <Lifter move={exercise.figure} pose={exercise.pose} fit fitBox="move" size={size} tone={tone} className={`${s.bodyFigure} ${s.twinBox}`} />
      <span className={s.twinOver} style={place ? { left: place.left, top: place.top } : { visibility: 'hidden' }}>
        <Lifter move={exercise.figure} reps="loop" weights={false} fit fitBox="move" size={place?.height ?? size} tone={tone} className={s.twinFigure} />
      </span>
    </span>
  );
}

/**
 * Every lift that is not a barbell lift draws the figure doing it: with his dumbbells, on his bench, at his
 * machine. That is what makes one lift look different from the next, and what shows a lift he does not know.
 * A standing or benched figure takes most of the room between the markers and the numbers and leaves air on both
 * sides of it (120 px tall at 620, more on a taller screen). A lying one runs to two thirds of the column.
 * The crop is the whole movement's, so he never shifts while he plays.
 * When the lift first arrives he does it five times, then rests in the pose that names it; on later sets he is
 * in that pose from the start. On a rehearsal (`loop`) he does it empty-handed for as long as the screen is up.
 * The figure is a button with no chrome: a tap opens the How sheet, where he keeps doing it beside the words.
 */
function Body({ exercise, play, still, loop, onHow }: { exercise: Exercise; play: boolean; still?: boolean; loop?: boolean; onHow?: (opener: HTMLElement) => void }) {
  const [box, height] = useBoxHeight<HTMLDivElement>();
  const tones = useTones();
  const size = Math.min(230, Math.round(height * FIGURE_SHARE));
  const drawn = size >= 60;
  // Px per unit of the figure as drawn (a lying figure is drawn smaller than `size` asks, to fit the column).
  const button = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = button.current;
    if (!element) return;
    const read = () => {
      const svg = element.querySelector('svg');
      const units = svg?.viewBox.baseVal.height;
      if (svg && units) setScale(Math.round((svg.getBoundingClientRect().height / units) * 1000) / 1000);
    };
    const sized = new ResizeObserver(read);
    sized.observe(element);
    return () => sized.disconnect();
  }, [drawn]);
  // Once he has shown the lift he does not show it again by himself, whatever happens around him.
  const [shown, setShown] = useState(play);
  // He waited while a moment covered the screen: now it can be seen.
  if (play && !shown) setShown(true);
  return (
    <div ref={box} className={s.body}>
      {drawn && (
        <button
          ref={button} type="button" className={s.bodyButton} aria-label={`How to do the ${exercise.name.toLowerCase()}`}
          style={scale > 0 ? { marginLeft: -Math.round(restInset(exercise) * scale * 10) / 10 } : { visibility: 'hidden' }}
          onClick={event => { if (!still) onHow?.(event.currentTarget); }}
        >
          {loop && !still
            ? <EmptyHanded exercise={exercise} size={size} tone={tones.figure} />
            : <Lifter move={exercise.figure} reps={shown ? SHOW_REPS : 0} pose={exercise.pose} fit fitBox="move" size={size} tone={tones.figure} className={s.bodyFigure} />}
        </button>
      )}
    </div>
  );
}

interface DrawingProps {
  exercise: Exercise;
  weight: number;
  /** The frozen screen under the rising black: nothing moves or sounds. */
  still?: boolean;
  /** This lift has just arrived for the first time and can be seen: the figure shows it. */
  play?: boolean;
  /** The figure was tapped: open the How sheet. */
  onHow?: (opener: HTMLElement) => void;
  /** A rehearsal: the figure, whatever the lift, doing it for as long as the screen is up. */
  rehearse?: boolean;
}

/** A barbell lift draws the whole bar; every other lift draws the figure doing it. It takes whatever height is left over. */
export function Drawing({ exercise, weight, still, play, onHow, rehearse }: DrawingProps) {
  const bar = exercise.mode === 'barbell' && !rehearse;
  return (
    <div className={s.drawing} data-mode={bar ? 'barbell' : 'figure'}>
      {bar
        ? <Barbell weight={weight} still={still} />
        : <Body exercise={exercise} play={!still && play === true} still={still} loop={rehearse} onHow={onHow} />}
    </div>
  );
}
