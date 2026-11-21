'use client';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { playSound } from '../visit/feedback';
import { REPS_MAX, REPS_MIN, type Visit } from '../visit/use-visit';
import { EXERCISES, type Exercise, type ExerciseId } from '../visit/visit-data';
import { useTones } from './ground';
import { useArmed } from './hooks';
import { FigureDisc, ScaledFigure, Slab } from './parts';
import { numbersLine, repsCount, setName, SIGN_OUT, trialName, weightUnit } from './words';
import s from './signal.module.css';

/** A sheet opens under the finger that asked for it: its controls stay dead this long, so a double tap changes nothing. */
const SHEET_GUARD_MS = 350;

interface SheetProps {
  label: string;
  /** False while it slides away. */
  open: boolean;
  onClose: () => void;
  /** Leave out the "Close" word: the swap view has "Back" in its place. Escape and a tap outside still close. */
  bare?: boolean;
  /** It opened over a big moment, which is the same color: it draws its top edge so it can be told apart. */
  edged?: boolean;
  /** Which of its views it is showing. When this changes the sheet moves to its new height instead of cutting to it. */
  view?: string;
  /**
   * A selector for the thing on the screen behind that this sheet stands in for. The sheet rises at least to its
   * top edge, so it covers that thing whole and leaves everything above it in view, at any screen height.
   */
  over?: string;
  /** A confirmation can focus its safe default instead of the panel itself. */
  initialFocus?: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}

/** The black sheet: slides up from the bottom edge, closes on Escape and on a tap outside, and keeps focus inside. */
function Sheet({ label, open, onClose, bare, edged, view, over, initialFocus, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const armed = useArmed(SHEET_GUARD_MS);

  // When its view changes (Change to the swap view and back), it moves to its new height in one move: no cut.
  const height = useRef(0);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const behind = over ? element.parentElement?.querySelector(over) : null;
    // Measured from the box the sheet is anchored to (the whole screen, home indicator included), not from the sheet, which is still rising.
    const anchor = element.offsetParent ?? element.parentElement;
    if (behind && anchor) {
      const rise = anchor.getBoundingClientRect().bottom - behind.getBoundingClientRect().top + 2;
      element.style.minHeight = `${Math.round(rise)}px`;
    }
    const next = element.offsetHeight;
    const before = height.current;
    height.current = next;
    if (before === 0 || Math.abs(before - next) < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    element.animate([{ height: `${before}px` }, { height: `${next}px` }], { duration: 180, easing: 'cubic-bezier(0.4, 0, 1, 1)' });
  }, [view, over]);

  useEffect(() => {
    (initialFocus?.current ?? panel.current)?.focus({ preventScroll: true });
  }, [initialFocus]);

  // Escape closes it wherever focus happens to be.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Tab stays inside the sheet.
  const trap = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !panel.current) return;
    const stops = [...panel.current.querySelectorAll<HTMLElement>('button')];
    if (stops.length === 0) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const here = document.activeElement;
    if (event.shiftKey && (here === first || here === panel.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && here === last) { event.preventDefault(); first.focus(); }
  };

  const live = open && armed;
  return (
    <>
      <div className={s.scrim} data-live={live || undefined} onClick={onClose} />
      <div
        ref={panel} className={s.sheet} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        data-open={open} data-live={live || undefined} data-edged={edged || undefined} inert={!open} onKeyDown={trap}
      >
        {children}
        {!bare && <button type="button" className={s.word} onClick={onClose}>Close</button>}
      </div>
    </>
  );
}

/** Sign out only after an explicit second action. Staying signed in is the large, focused default. */
export function SignOutSheet({ open, onClose, onSignOut }: { open: boolean; onClose: () => void; onSignOut: () => void }) {
  const armed = useArmed(SHEET_GUARD_MS);
  const stay = useRef<HTMLButtonElement>(null);
  const leaving = useRef(false);
  return (
    <Sheet label={SIGN_OUT.title} open={open} onClose={onClose} bare initialFocus={stay}>
      <h2 className={s.sheetTitle}>{SIGN_OUT.title}</h2>
      <p className={s.sheetText}>{SIGN_OUT.line}</p>
      <div className={s.sheetSlot}>
        <Slab buttonRef={stay} onClick={() => { if (open && armed) onClose(); }}>{SIGN_OUT.stay}</Slab>
      </div>
      <button type="button" className={s.word} onClick={() => {
        if (!open || !armed || leaving.current) return;
        leaving.current = true;
        onSignOut();
        onClose();
      }}>{SIGN_OUT.action}</button>
    </Sheet>
  );
}

/**
 * How: the figure, large, doing the lift over and over for as long as the sheet is up, then the one cue and where
 * to set up. No name: it is on the screen behind. (The loop is Evan's request; it overrides "nothing idles" for
 * the figure only, and stops when the sheet closes.)
 */
export function HowSheet({ exercise, open, onClose }: { exercise: Exercise; open: boolean; onClose: () => void }) {
  const tones = useTones();
  return (
    <Sheet label={`How to do the ${exercise.name.toLowerCase()}`} open={open} onClose={onClose} over={FIGURE}>
      <div className={s.howFigure}>
        <ScaledFigure
          move={exercise.figure} reps="loop" box={190} tone={tones.event}
          label={`The ${exercise.name.toLowerCase()}, shown over and over`} className={s.sheetFigure}
        />
      </div>
      <p className={s.sheetCue}>{exercise.cue}</p>
      <p className={s.sheetText}>{exercise.setup}</p>
    </Sheet>
  );
}

/** On a figure screen the How sheet draws the same figure: it rises to cover the screen's own, so the lift is drawn once. */
const FIGURE = '[data-screen="set"] [data-mode="figure"]';
/** The Change sheet stands in for the set screen's numbers: it covers them whole and leaves the drawing above in view. */
const NUMBERS = '[data-screen="set"] [data-numbers]';

/** A held stepper waits this long, then steps this often. */
const HOLD_MS = 400;
const REPEAT_MS = 110;

interface Way { name: string; can: boolean; go: () => void }
interface RowProps {
  label: string;
  unit?: string;
  value: number;
  less: Way;
  more: Way;
  /** Holding a stepper repeats it: after 400 ms, every 110 ms, with a tick for each step. The weight only. */
  holds?: boolean;
}

/** One number with a large minus and plus, 60 by 60 and 12 px apart. */
function StepperRow({ label, unit, value, less, more, holds }: RowProps) {
  // The latest handlers, for the timers: a held stepper keeps stepping through re-renders, and stops at the limit.
  const ways = useRef({ less, more });
  useEffect(() => {
    ways.current = { less, more };
  });
  const timers = useRef({ wait: 0, repeat: 0, held: false });
  const stop = () => {
    window.clearTimeout(timers.current.wait);
    window.clearInterval(timers.current.repeat);
  };
  useEffect(() => stop, []);
  const hold = (side: 'less' | 'more') => {
    if (!holds) return;
    stop();
    timers.current.held = false;
    const step = () => {
      const way = ways.current[side];
      if (!way.can) return stop();
      way.go();
      playSound('tick');
    };
    timers.current.wait = window.setTimeout(() => {
      timers.current.held = true;
      step();
      timers.current.repeat = window.setInterval(step, REPEAT_MS);
    }, HOLD_MS);
  };
  // The click that ends a hold is the hold's own: it does not step once more.
  const press = (way: Way) => {
    if (timers.current.held) { timers.current.held = false; return; }
    if (way.can) way.go();
  };
  return (
    <div className={s.row} role="group" aria-label={label}>
      <p className={s.rowLabel}>{label}{unit && <span>{unit}</span>}</p>
      <p className={s.rowValue} aria-live="off">{value}</p>
      <div className={s.steppers}>
        <button type="button" className={s.stepper} aria-label={less.name} aria-disabled={!less.can} onClick={() => press(less)} onPointerDown={() => hold('less')} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
        </button>
        <button type="button" className={s.stepper} aria-label={more.name} aria-disabled={!more.can} onClick={() => press(more)} onPointerDown={() => hold('more')} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

interface ChangeSheetProps {
  visit: Visit;
  open: boolean;
  onClose: () => void;
  /** Something to announce: a swap, or a stepper's new value. */
  onNotice: (text: string) => void;
  /** Open straight on the list of lifts, with no steppers behind it: Back closes the sheet. */
  swapOnly?: boolean;
}

/**
 * Change: the one door on the set screen. Reps, weight (when there is one) and "Swap this lift" (when there is
 * something to swap to). It is short, so the bar stays in view above it and he watches the plates change as he
 * steps the weight. The swap opens a second view in the same sheet: a list of up to three lifts, each a row with
 * its figure, its name and its numbers. A tap on a row swaps to it at once; "Back" returns here.
 */
export function ChangeSheet({ visit, open, onClose, onNotice, swapOnly }: ChangeSheetProps) {
  const { exercise, draft, can, swapOptions } = visit;
  const [listing, setListing] = useState(swapOnly === true);
  const turnedAt = useRef(0);
  const swapDoor = useRef<HTMLButtonElement>(null);
  const firstRow = useRef<HTMLButtonElement>(null);
  // Everything he could have instead: the plan's own lift (when he has swapped away from it) and its alternatives.
  const options = swapOptions.filter(id => id !== exercise.id).slice(0, 3);

  // Focus follows the view: to the first row when the list opens, back to "Swap this lift" when it closes.
  const wasListing = useRef(false);
  useEffect(() => {
    if (listing) firstRow.current?.focus({ preventScroll: true });
    else if (wasListing.current) swapDoor.current?.focus({ preventScroll: true });
    wasListing.current = listing;
  }, [listing]);

  // A stepper's new value is said aloud. (The sheet shows it; the live region is on the page.)
  const said = useRef(`${draft.reps}/${draft.weight}`);
  useEffect(() => {
    const now = `${draft.reps}/${draft.weight}`;
    if (said.current === now || listing) { said.current = now; return; }
    const [reps, weight] = said.current.split('/').map(Number);
    said.current = now;
    if (reps !== draft.reps) onNotice(`${repsCount(exercise, draft.reps)}.`);
    else if (weight !== draft.weight) onNotice(`${draft.weight} ${weightUnit(exercise)}.`);
  }, [draft.reps, draft.weight, exercise, listing, onNotice]);

  // One tap, one turn: the second half of a double tap does not land on a row, or straight back out.
  // (Times are the taps' own timestamps, so both halves are measured on one clock.)
  const turn = (next: boolean, at: number) => {
    if (at - turnedAt.current < SHEET_GUARD_MS) return;
    turnedAt.current = at;
    if (swapOnly && !next) return onClose();
    setListing(next);
  };

  // A tap on a row swaps at once and closes the sheet.
  const take = (to: ExerciseId, at: number) => {
    if (at - turnedAt.current < SHEET_GUARD_MS) return;
    visit.swap(to);
    onNotice(`Swapped to ${EXERCISES[to].name.toLowerCase()}.`);
    onClose();
  };

  if (listing && options.length > 0) {
    return (
      <Sheet label={`Swap the ${exercise.name.toLowerCase()} for`} open={open} onClose={onClose} bare view="swap" over={NUMBERS}>
        <ul className={s.swapList}>
          {options.map((id, place) => {
            const lift = EXERCISES[id];
            return (
              <li key={id}>
                <button ref={place === 0 ? firstRow : undefined} type="button" className={s.swapRow} onClick={event => take(id, event.timeStamp)}>
                  <FigureDisc move={lift.figure} turned />
                  <span><span className={s.blockName}>{lift.name}</span><span className={s.blockLine}>{numbersLine(lift, visit.plan.lifts[id])}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className={`${s.foot} ${s.sheetFoot}`}>
          <span />
          <button type="button" className={`${s.word} ${s.wordRight}`} onClick={event => turn(false, event.timeStamp)}>Back</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet label="Change this set" open={open} onClose={onClose} bare view="change" over={NUMBERS}>
      <StepperRow
        label="Reps" unit={exercise.perSide ? 'each side' : undefined} value={draft.reps}
        less={{ name: 'One fewer rep', can: can.repsDown, go: () => visit.adjustReps(-1) }}
        more={{ name: 'One more rep', can: can.repsUp, go: () => visit.adjustReps(1) }}
      />
      {can.weight && (
        <StepperRow
          label="Weight" unit={weightUnit(exercise)} value={draft.weight} holds
          less={{ name: `${exercise.weightStep} lb lighter`, can: can.weightDown, go: () => visit.adjustWeight(-1) }}
          more={{ name: `${exercise.weightStep} lb heavier`, can: can.weightUp, go: () => visit.adjustWeight(1) }}
        />
      )}
      {/* One row for the two words, like the foot of the set screen: it keeps the sheet short, so the bar stays in view. */}
      <div className={`${s.foot} ${s.sheetFoot}`}>
        <button type="button" className={s.word} onClick={onClose}>Close</button>
        {options.length > 0 && (
          <button ref={swapDoor} type="button" className={`${s.word} ${s.wordRight}`} onClick={event => turn(true, event.timeStamp)}>Swap this lift</button>
        )}
      </div>
    </Sheet>
  );
}

/**
 * Fix: the last thing he logged. One row for its reps, and a way to take it back. It opens over the finish as
 * well, for the last set. On a first visit the last thing may be a try; it is fixed the same way. A try that was
 * too heavy has no count to fix, only the way back.
 */
export function FixSheet({ visit, open, onClose, edged }: { visit: Visit; open: boolean; onClose: () => void; edged?: boolean }) {
  const trial = visit.lastDone === 'trial' ? visit.lastTrial : null;
  const set = visit.lastLogged;
  if (!trial && !set) return null;
  const name = trial ? trialName(trial) : setName(visit.steps[set!.stepIndex]);
  const exercise = EXERCISES[trial ? trial.exerciseId : visit.steps[set!.stepIndex].exerciseId];
  const reps = trial ? trial.reps : set!.reps;
  const undoable = trial ? visit.canUndoTrial : true;
  const counted = !trial || trial.answer !== 'tooHeavy';
  return (
    <Sheet label={`Fix ${name}`} open={open} onClose={onClose} edged={edged}>
      <h2 className={s.sheetTitle}>{name}</h2>
      {counted && !(set?.skipped && !trial) && (
        <StepperRow
          label="Reps" unit={exercise.perSide ? 'each side' : undefined} value={reps}
          less={{ name: 'One fewer rep', can: reps > REPS_MIN, go: () => visit.adjustLastLogged(-1) }}
          more={{ name: 'One more rep', can: reps < REPS_MAX, go: () => visit.adjustLastLogged(1) }}
        />
      )}
      {undoable && (
        <button type="button" className={`${s.word} ${s.undoWord}`} onClick={() => { visit.undo(); onClose(); }}>
          {trial ? 'Undo this try' : set?.skipped ? 'Undo this skip' : 'Undo this set'}
        </button>
      )}
    </Sheet>
  );
}

/**
 * The count, after a home check set: "How many did you get?", a minus and a plus starting at the low end of the
 * range (so a Save by reflex records the least, not the most), and Save.
 */
export function CountSheet({ visit, open, onClose, onNotice }: { visit: Visit; open: boolean; onClose: () => void; onNotice: (text: string) => void }) {
  const { exercise } = visit;
  const [count, setCount] = useState(exercise.range[0]);
  // Save sits where Done was: the second half of a double tap on Done saves nothing.
  const armed = useArmed(SHEET_GUARD_MS);
  const step = (next: number) => {
    const value = Math.min(REPS_MAX, Math.max(REPS_MIN, next));
    setCount(value);
    onNotice(`${repsCount(exercise, value)}.`);
  };
  return (
    <Sheet label="How many did you get?" open={open} onClose={onClose}>
      <h2 className={s.sheetTitle}>How many did you get?</h2>
      <StepperRow
        label="Reps" unit={exercise.perSide ? 'each side' : undefined} value={count}
        less={{ name: 'One fewer rep', can: count > REPS_MIN, go: () => step(count - 1) }}
        more={{ name: 'One more rep', can: count < REPS_MAX, go: () => step(count + 1) }}
      />
      <div className={s.sheetSlot}>
        <Slab onClick={() => { if (armed) visit.saveCheck(count); }}>Save</Slab>
      </div>
    </Sheet>
  );
}

interface OutSheetProps {
  visit: Visit;
  open: boolean;
  onClose: () => void;
  /** Close this sheet and open another in its place: the list of lifts, or the weight. */
  onSwitch: (kind: 'swap' | 'change') => void;
  onNotice: (text: string) => void;
}

/**
 * The way out, one door for four things: something hurts, skip this set, this weight isn't here, end the workout.
 * Hurting opens a second view with what to do about it; ending asks once. Nothing here is a failure: each one
 * is logged as what it was and the coach reads it kindly.
 */
export function OutSheet({ visit, open, onClose, onSwitch, onNotice }: OutSheetProps) {
  const { exercise, setup } = visit;
  const [view, setView] = useState<'menu' | 'hurt' | 'end'>('menu');
  const [which, setWhich] = useState<ExerciseId | null>(null);
  const turnedAt = useRef(0);
  // One tap, one turn: the second half of a double tap does not land on the row that arrives under it.
  const once = (event: { timeStamp: number }, act: () => void) => {
    if (event.timeStamp - turnedAt.current < SHEET_GUARD_MS) return;
    turnedAt.current = event.timeStamp;
    act();
  };
  const canSwap = visit.swapOptions.filter(id => id !== exercise.id).length > 0;
  const done = visit.logged.filter(set => !set.skipped).length;
  const skip = () => { visit.skip(); onNotice('Set skipped.'); onClose(); };
  const back = (
    <div className={`${s.foot} ${s.sheetFoot}`}>
      <span />
      <button type="button" className={`${s.word} ${s.wordRight}`} onClick={event => once(event, () => { setWhich(null); setView('menu'); })}>Back</button>
    </div>
  );

  if (view === 'hurt') {
    // He may mean the lift he has just put down, not the one the screen has moved on to.
    const just = [...visit.logged].reverse().find(set => !set.skipped)?.exerciseId ?? null;
    const two = just !== null && just !== exercise.id;
    if (two && which === null) {
      return (
        <Sheet label="Something hurts" open={open} onClose={onClose} bare view="which">
          <h2 className={s.sheetTitle}>Which lift hurt?</h2>
          <ul className={s.outList}>
            <li><button type="button" className={s.outRow} onClick={event => once(event, () => setWhich(just))}>{EXERCISES[just].name}</button></li>
            <li><button type="button" className={s.outRow} onClick={event => once(event, () => setWhich(exercise.id))}>{exercise.name}</button></li>
          </ul>
          {back}
        </Sheet>
      );
    }
    const sore = which ?? exercise.id;
    if (sore !== exercise.id) {
      const more = visit.steps.slice(visit.logged.length).some(step => step.exerciseId === sore);
      return (
        <Sheet label="Something hurts" open={open} onClose={onClose} bare view="hurt-before">
          <h2 className={s.sheetTitle}>Noted: {EXERCISES[sore].shortName.toLowerCase()}.</h2>
          <p className={s.sheetText}>Pain is a reason to stop, not a thing to push through. It will not go up next time.</p>
          <ul className={s.outList}>
            {more && (
              <li><button type="button" className={s.outRow} onClick={event => once(event, () => { visit.hurts(true, sore); onNotice(`${EXERCISES[sore].shortName} is lighter for the rest of today.`); onClose(); })}>
                Go lighter on it today
              </button></li>
            )}
            <li><button type="button" className={s.outRow} onClick={event => once(event, () => { visit.hurts(false, sore); onNotice('Noted.'); onClose(); })}>Carry on</button></li>
            <li><button type="button" className={s.outRow} onClick={event => once(event, () => { visit.hurts(false, sore); visit.endEarly(); onClose(); })}>Done for today</button></li>
          </ul>
          {back}
        </Sheet>
      );
    }
    return (
      <Sheet label="Something hurts" open={open} onClose={onClose} bare view="hurt">
        <h2 className={s.sheetTitle}>Stop the set.</h2>
        <p className={s.sheetText}>Pain is a reason to stop, not a thing to push through.</p>
        <ul className={s.outList}>
          {!setup && (
            <li><button type="button" className={s.outRow} onClick={event => once(event, () => { visit.hurts(true); onNotice('Rest, then go lighter.'); onClose(); })}>
              Rest, then go lighter
            </button></li>
          )}
          {canSwap && (
            <li><button type="button" className={s.outRow} onClick={event => once(event, () => { visit.hurts(false); onSwitch('swap'); })}>Switch to another lift</button></li>
          )}
          <li><button type="button" className={s.outRow} onClick={event => once(event, () => { visit.hurts(false); skip(); })}>Skip this set</button></li>
          <li><button type="button" className={s.outRow} onClick={event => once(event, () => { visit.hurts(false); visit.endEarly(); onClose(); })}>Done for today</button></li>
        </ul>
        {back}
      </Sheet>
    );
  }

  if (view === 'end') {
    return (
      <Sheet label="End the workout" open={open} onClose={onClose} bare view="end">
        <h2 className={s.sheetTitle}>End it here?</h2>
        <p className={s.sheetText}>{done > 0 ? `${done} ${done === 1 ? 'set is' : 'sets are'} logged and will be kept.` : 'Nothing is logged yet, so nothing is kept.'}</p>
        <div className={s.sheetSlot}>
          <Slab onClick={() => { visit.endEarly(); onClose(); }}>End the workout</Slab>
        </div>
        {back}
      </Sheet>
    );
  }

  return (
    <Sheet label="More" open={open} onClose={onClose} view="menu">
      <ul className={s.outList}>
        <li><button type="button" className={s.outRow} onClick={event => once(event, () => setView('hurt'))}>Something hurts</button></li>
        <li><button type="button" className={s.outRow} onClick={event => once(event, skip)}>Skip this set</button></li>
        {exercise.weightStep > 0 && !setup && (
          <li><button type="button" className={s.outRow} onClick={event => once(event, () => onSwitch('change'))}>This weight isn&rsquo;t available</button></li>
        )}
        {setup && canSwap && (
          <li><button type="button" className={s.outRow} onClick={event => once(event, () => onSwitch('swap'))}>Do a different lift</button></li>
        )}
        <li><button type="button" className={s.outRow} onClick={event => once(event, () => setView('end'))}>End the workout</button></li>
      </ul>
    </Sheet>
  );
}
