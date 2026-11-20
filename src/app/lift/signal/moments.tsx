'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { duration } from '../visit/copy';
import { FINISH_GUARD_MS, GUARD_MS, type Visit, type VisitEvent } from '../visit/use-visit';
import { useTones } from './ground';
import { useArmed, useBoxHeight, type CoverStage } from './hooks';
import { Lifter } from './lifter/lifter';
import { Markers, Slab, Track, type MarkerState } from './parts';
import type { ExerciseId } from '../visit/visit-data';
import { blockDoneWords, finishTitle, firstFinishWords, foundWords, observation } from './words';
import s from './signal.module.css';

const land = (n: number) => ({ '--n': n }) as CSSProperties;

/**
 * A moment's title of three words or fewer is sized to fit one line ("Goblet squat done.", "Starting weight
 * found."): broken in two, one of its lines would be a single word. A longer one breaks as a balanced pair.
 */
function oneLine(text: string): { 'data-one': true; style: CSSProperties } | Record<string, never> {
  if (text.split(' ').length > 3) return {};
  return { 'data-one': true, style: { fontSize: Math.min(40, Math.floor(335 / (text.length * 0.56))) } };
}

/**
 * The figure on the black ground, cropped to himself so his left edge is the words' left edge. He arrives as the
 * black lands, standing, then makes his one move and holds it. (His arms pass outside his box as they rise:
 * nothing here clips them.)
 */
function Hero({ move, landed }: { move: 'cheer' | 'victory'; landed: boolean }) {
  const [box, height] = useBoxHeight<HTMLDivElement>();
  const tones = useTones();
  const size = Math.min(200, height);
  return (
    <div ref={box} className={s.hero}>
      {landed && size >= 60 && <Lifter move={move} reps={1} fit size={size} tone={tones.event} className={s.heroFigure} />}
    </div>
  );
}

/**
 * Block done: the ground turns, the figure puts one arm up, a few words, and the track stays where it was.
 * It holds for 0.8 s and drops away to the next set, already resting. A tap anywhere skips it.
 * (A set stamps its marker, a block gets one arm, the workout gets both.)
 */
export function BlockDone({ visit, event, stage, onSkip }: { visit: Visit; event: VisitEvent; stage: CoverStage; onSkip: () => void }) {
  // The tap that logged the set may have a second half: it does not skip the moment it caused.
  const skip = () => { if (Date.now() - event.at >= GUARD_MS) onSkip(); };
  return (
    <div className={`${s.cover} ${s.dark}`} data-stage={stage} data-moment="block" onClick={skip}>
      <Track steps={visit.progress.steps} blocks={visit.plan.blocks} />
      <div className={s.momentBody} aria-hidden="true">
        <Hero move="cheer" landed={stage !== 'rise'} />
        <p className={s.big} {...oneLine(blockDoneWords(visit.blocks[event.blockIndex]))}>{blockDoneWords(visit.blocks[event.blockIndex])}</p>
      </div>
    </div>
  );
}

/**
 * Found, on a first visit: the same small moment, for a starting point. "Starting weight found." and under it
 * "Goblet squat: 20 lb, for now." Then the ordinary set screen, at that weight.
 */
export function Found({ visit, event, lift, stage, onSkip }: { visit: Visit; event: VisitEvent; lift: ExerciseId; stage: CoverStage; onSkip: () => void }) {
  const skip = () => { if (Date.now() - event.at >= GUARD_MS) onSkip(); };
  const words = foundWords(visit, lift);
  return (
    <div className={`${s.cover} ${s.dark}`} data-stage={stage} data-moment="found" onClick={skip}>
      <Track steps={visit.progress.steps} blocks={visit.plan.blocks} />
      <div className={s.momentBody} aria-hidden="true">
        <Hero move="cheer" landed={stage !== 'rise'} />
        <p className={s.big} {...oneLine(words.title)}>{words.title}</p>
        <p className={s.best}>{words.line}</p>
      </div>
    </div>
  );
}

/**
 * Finish: the ground turns and stays. The figure raises both arms once. Then, one after another: the words, the
 * one thing worth saying about today, how long it took, and the week, whose second marker fills last as its own
 * small beat. Then Done. Nothing here takes a tap before it can be seen, or within 1500 ms of the last set.
 */
export function Finish({ visit, stage, blocked, onFix }: { visit: Visit; stage: CoverStage; blocked: boolean; onFix: (opener: HTMLElement) => void }) {
  const armed = useArmed(FINISH_GUARD_MS);
  const done = useRef<HTMLButtonElement>(null);
  const { plan } = visit;
  // A first visit has one thing to say, and it is not a comparison.
  const settled = plan.first !== null && !visit.endedEarly;
  const best = settled ? firstFinishWords(plan) : observation(visit);
  const heading = finishTitle(visit);
  const week: MarkerState[] = Array.from({ length: plan.week.of }, (_, index) => (index < plan.week.visit ? 'logged' : 'ahead'));

  // The last set's Done left the screen and took focus with it: hand it to this Done once it works.
  useEffect(() => {
    if (!armed) return;
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) done.current?.focus({ preventScroll: true });
  }, [armed]);

  return (
    <div
      className={`${s.cover} ${s.dark}`} data-stage={stage === 'rise' ? 'rise' : 'hold'} data-moment="finish"
      data-armed={armed || undefined} inert={blocked}
    >
      <Track steps={visit.progress.steps} blocks={plan.blocks} />
      <Hero move="victory" landed={stage !== 'rise'} />
      <h1 className={`${s.big} ${s.land}`} data-long={heading.length > 16 || undefined} style={land(0)}>{heading}</h1>
      {best && <p className={`${s.best} ${s.land}`} style={land(1)}>{best}</p>}
      {!settled && <p className={`${s.fact} ${s.land}`} style={land(2)}>{capital(duration(visit.elapsedSeconds))}</p>}
      <p className={`${s.sets} ${s.land}`} style={land(3)}>
        {/* Today's marker: hollow until everything else has landed, then it fills with a stamp. */}
        <Markers states={week} pop={{ index: plan.week.visit - 1, twice: false, late: true }} />
        <span>{plan.week.visit} of {plan.week.of} this week</span>
      </p>
      <div className={`${s.finishSlot} ${s.land}`} style={land(4)}>
        <Slab buttonRef={done} onClick={() => { if (armed) visit.reset(); }}>Done</Slab>
      </div>
      <div className={`${s.foot} ${s.land}`} style={land(5)}>
        {/* The last set has no rest after it to fix it in: this is its door. */}
        {visit.canUndo
          ? <button type="button" className={s.word} onClick={event => { if (armed) onFix(event.currentTarget); }}>Fix last set</button>
          : <span />}
      </div>
    </div>
  );
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
