'use client';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type Ref } from 'react';
import { HapticTap } from '../visit/haptic-tap';
import { useSoundPreference } from '../visit/feedback';
import type { StepStatus } from '../visit/use-visit';
import { EXERCISES, type Block, type ExerciseId } from '../visit/visit-data';
import { useTones } from './ground';
import { Lifter, type LifterProps } from './lifter/lifter';
import { soundActionWords } from './words';
import s from './signal.module.css';

/** Waves and a slash make the preference visible without relying on color. */
export function SoundButton() {
  const [on, setOn] = useSoundPreference();
  return (
    <button type="button" className={s.soundButton} aria-pressed={on} aria-label={soundActionWords(on)} onClick={() => setOn(!on)}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M4 11h4l6-5v16l-6-5H4z" />
        {on ? <path d="M18 10a6 6 0 0 1 0 8M21 6a11 11 0 0 1 0 16" /> : <path d="M3 25 25 3" />}
      </svg>
    </button>
  );
}

/** The one check shape: two round-ended strokes. It takes the color of the text around it. */
export function Check({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2.5 8.6 6.3 12.2 13.5 4.2" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The workout track: one segment per set, grouped by block (2, 4, 4 at the gym; 4, 4 at home). Logged is solid, the rest are outlined; it only fills left to
 * right. No count in words beside it (the start and finish screens say "10 sets").
 */
export function Track({ steps, blocks }: { steps: readonly StepStatus[]; blocks: readonly Block[] }) {
  const done = steps.filter(status => status === 'logged').length;
  const starts = new Set(blocks.map(block => block.firstStep));
  return (
    <div className={s.track} role="img" aria-label={`${done} of ${steps.length} sets done`}>
      {steps.map((status, index) => (
        <span key={index} className={s.seg} data-logged={status === 'logged' || undefined} data-group={(index > 0 && starts.has(index)) || undefined} />
      ))}
    </div>
  );
}

export type MarkerState = 'logged' | 'current' | 'ahead';

/** A row of round markers: logged is a solid disc with a check, current a ring with a solid center, ahead a thin ring. */
export interface Pop { index: number; twice: boolean; late?: boolean }

/**
 * `pop` names the marker that answers a set: it stamps once when its set or round was just finished, twice when
 * the set beat last time. `late` (the finish's week marker) holds it hollow until everything else has landed.
 */
export function Markers({ states, pop }: { states: readonly MarkerState[]; pop?: Pop | null }) {
  return (
    <span className={s.markerRow} aria-hidden="true">
      {states.map((state, index) => (
        <span
          key={index} className={s.marker} data-state={state}
          data-pop={pop && index === pop.index ? (pop.late ? 'late' : pop.twice ? 'twice' : 'once') : undefined}
        >
          {state === 'logged' && <Check />}
        </span>
      ))}
    </span>
  );
}

/**
 * The lift's figure, small and yellow, in a solid ink disc: cropped to the figure, in the pose that names it (the
 * catalogue says which: the bottom of a squat, the start of a press), filling about 70% of the disc. Decorative
 * here; whatever is around it carries the name.
 */
export function FigureDisc({ move, turned }: { move: ExerciseId; turned?: boolean }) {
  const tones = useTones();
  // On a sheet the ground has turned, so the disc turns with it: the sheet's own ink, and the figure in the other tone.
  if (turned) {
    return (
      <span className={`${s.disc} ${s.discTurned}`} aria-hidden="true">
        <Lifter move={move} pose={EXERCISES[move].pose} fit size={36} tone={tones.event === 'yellow' ? 'ink' : 'yellow'} className={s.discFigureTurned} />
      </span>
    );
  }
  return (
    <span className={s.disc} aria-hidden="true">
      <Lifter move={move} pose={EXERCISES[move].pose} fit size={36} tone={tones.disc} className={s.discFigure} />
    </span>
  );
}

/**
 * The tallest crop any lift has, in the figure's own units: the calf raise up on its toes beside its rail, 221.
 * (The figure's uncropped box is 200.) Every lift is scaled as if its crop were this tall, so the tallest one
 * just fills the space and none ever grows past it.
 */
const FIGURE_REACH = 222;

/**
 * The figure cropped to itself (so it stands flush left), yet drawn at the one scale every lift shares: `box` px
 * for the tallest crop there is. Cropping alone would not do: `size` is the height of the crop, so a figure lying
 * down would come out twice the size of one standing up. The crop's height is read from the drawn figure, and it
 * stays hidden for the one frame that takes.
 */
export function ScaledFigure({ box, ...figure }: Omit<LifterProps, 'size' | 'fit'> & { box: number }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const [units, setUnits] = useState<number | null>(null);
  useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const read = () => {
      const height = element.querySelector('svg')?.viewBox.baseVal.height;
      if (height) setUnits(Math.round(height * 10) / 10);
    };
    // The first reading comes with the first layout; later ones when the crop changes (a movement starts to play).
    const sized = new ResizeObserver(read);
    sized.observe(element);
    const changed = new MutationObserver(read);
    changed.observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: ['viewBox'] });
    return () => {
      sized.disconnect();
      changed.disconnect();
    };
  }, []);
  // One scale, always. The cap only matters if a pose is ever drawn taller than the tallest known today.
  const size = units === null ? box : Math.min(box, Math.max(24, Math.round((units * box) / FIGURE_REACH)));
  return (
    <span ref={wrap} className={s.scaled} data-ready={units !== null || undefined}>
      <Lifter {...figure} fit size={size} />
    </span>
  );
}

interface SlabProps {
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Wrap it in the engine's `HapticTap`, for the system tick on an iPhone. The set screen's Done only. */
  haptic?: boolean;
  /** The slab has just arrived (after a rest, or for a new lift): it and its ledge fill up from the bottom edge. One firm move. */
  fill?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  className?: string;
}

/** The one big button: a slab on a ledge. Pressed, it sinks 5 px onto the ledge in 60 ms. */
export function Slab({ children, onClick, haptic, fill, buttonRef, className }: SlabProps) {
  const wrap = [s.slabWrap, fill ? s.fill : '', className ?? ''].filter(Boolean).join(' ');
  const inside = (
    <>
      <span className={s.ledge} aria-hidden="true" />
      <button ref={buttonRef} type="button" className={s.slab} onClick={onClick}>{children}</button>
    </>
  );
  return haptic ? <HapticTap className={wrap}>{inside}</HapticTap> : <span className={wrap}>{inside}</span>;
}

/**
 * Several slabs side by side in the action slot, together the size of one Done slab: the answers to a try.
 * Each label is set on two lines, so three fit at 375 wide without the type going under 17 px.
 */
export function Choices({ options, fill }: { options: { key: string; lines: [string, string]; onClick: () => void }[]; fill?: boolean }) {
  return (
    <div className={fill ? `${s.choices} ${s.fill}` : s.choices} data-count={options.length} role="group" aria-label="How did it feel?">
      {options.map(option => (
        <span key={option.key} className={s.slabWrap}>
          <span className={s.ledge} aria-hidden="true" />
          <button type="button" className={`${s.slab} ${s.choice}`} aria-label={option.lines.join(' ')} onClick={option.onClick}>
            <span>{option.lines[0]}</span><span>{option.lines[1]}</span>
          </button>
        </span>
      ))}
    </div>
  );
}
