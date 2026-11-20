'use client';
import { useState, type CSSProperties, type Ref } from 'react';
import { clock } from '../visit/copy';
import type { Visit } from '../visit/use-visit';
import { EXERCISES, type Exercise, type ExerciseId, type Step } from '../visit/visit-data';
import { Drawing } from './drawings';
import { Check, Choices, FigureDisc, Markers, Slab, Track, type MarkerState, type Pop } from './parts';
import { howLabel, lastWords, nextWords, rehearseWords, repsUnit, setupLine, setupWord, setWord, title, TRIAL_ANSWERS, weightUnit } from './words';
import s from './signal.module.css';

/** `swap` is the Change sheet opened straight on its list of lifts. `out` is the way out: hurts, skip, end. */
export type SheetKind = 'how' | 'change' | 'fix' | 'count' | 'swap' | 'out';

/** What a first visit puts in front of the set: a rehearsal, a try at a weight, or a check set. */
export interface ViewSetup {
  kind: 'rehearse' | 'trial' | 'check';
  tryNumber: number;
  triesMax: number;
  easierThan: ExerciseId | null;
  /** A try with no heavier one after it: it has two answers. */
  lastTry: boolean;
}

/** What the set screen is showing. In rest mode this is already the next set, so he can load the bar while he rests. */
export interface SetView {
  step: Step;
  weight: number;
  reps: number;
  mode: 'live' | 'rest';
  /** The screen he just tapped, held still while a moment rises over it. Nothing on it works or moves. */
  frozen?: boolean;
  /** First visit: this is not a working set yet. null on every ordinary screen. */
  setup: ViewSetup | null;
}

/** The last set logged, for the quiet line under the track. It stays until the next Done. */
export interface LoggedLine {
  key: number | string;
  words: string;
  beat: string | null;
  /** False for a try that was too heavy: it is a record of what he said, with no check beside it. */
  check: boolean;
  /** The word that opens the Fix sheet: "Fix", or after a lift's last set "Add reps". */
  fixWord: string;
}

interface SetScreenProps {
  visit: Visit;
  view: SetView;
  logged: LoggedLine | null;
  /** False for a moment after the screen arrives, so a double tap that brought him here opens nothing. */
  armed: boolean;
  /** A moment is over this screen: the figure waits to show a new lift until it can be seen. */
  covered: boolean;
  /** The marker that answers the set just logged. */
  pop: Pop | null;
  onOpen: (kind: SheetKind, opener: HTMLElement) => void;
  /** Rest was added: the words to announce. */
  onNotice: (text: string) => void;
  /** The action slot, so the page can put focus on its one control. */
  slotRef: Ref<HTMLDivElement>;
}

/** The rest line: it fills along the bottom of the slab as the rest passes. Keyed on the rest's end, so added rest redraws it. */
function RestLine({ elapsedMs, totalMs, fraction }: { elapsedMs: number; totalMs: number; fraction: number }) {
  // Fixed at mount: the animation then runs on its own clock, and a re-render each second does not disturb it.
  const [timing] = useState(() => ({ animationDuration: `${totalMs}ms`, animationDelay: `${-Math.min(elapsedMs, totalMs)}ms` }));
  return <span className={s.restTrack}><span className={s.restLine} style={{ ...timing, '--f': fraction } as CSSProperties} /></span>;
}

const marks = (count: number, at: number): MarkerState[] => (
  Array.from({ length: count }, (_, index) => (index + 1 < at ? 'logged' : index + 1 === at ? 'current' : 'ahead'))
);

/** Roughly how wide the numbers row will set, in px at the full size: enough to tell when it cannot fit the column. */
function numbersWidth(exercise: Exercise, weight: number, reps: number): number {
  const group = (digits: number, unit: string) => digits * 41 + 6 + unit.length * 10.5;
  const repsGroup = group(String(reps).length, repsUnit(exercise, reps));
  return exercise.weightStep > 0 ? group(String(weight).length, weightUnit(exercise)) + 28 + repsGroup : repsGroup;
}

/**
 * The one layout. Top to bottom, left-aligned, one column: the track, the logged line, the lift's name, the set
 * markers, the drawing, the numbers, last time, the action slot, and two small words. The two modes differ only
 * in the action slot, the word before the markers, and the bottom-right word.
 *
 * A barbell lift draws the whole bar and keeps the figure in a disc beside its name. Every other lift draws the
 * figure itself, large, and has no disc: one picture, one door to the How sheet.
 *
 * A first visit uses the same layout for three more screens, and adds nothing to it:
 * the rehearsal (the name, the figure doing the lift empty-handed for as long as the screen is up, one sentence
 * where the numbers go, and "I've tried it"); the try (the markers count tries, the quiet line asks the question,
 * "Do 6, then say how it felt.", and the action slot holds the answers, three slabs in the footprint of one, or
 * two on the last try); and at home the check set ("up to 12 reps", and Done opens the count). On these the track
 * still shows working sets only, and Change is not offered.
 */
export function SetScreen({ visit, view, logged, armed, covered, pop, onOpen, onNotice, slotRef }: SetScreenProps) {
  const { step, weight, reps, mode, frozen, setup } = view;
  const exercise: Exercise = EXERCISES[step.exerciseId];
  const rehearse = setup?.kind === 'rehearse';
  const at = setup ? setup.tryNumber : step.partnerId ? step.round : step.setNumber;
  const states = setup ? marks(setup.triesMax, at) : marks(step.partnerId ? step.roundsInBlock : step.setsInExercise, at);
  const live = armed && !frozen;
  const open = (kind: SheetKind) => (event: { currentTarget: HTMLElement }) => { if (live) onOpen(kind, event.currentTarget); };
  const hasWeight = exercise.weightStep > 0 && setup?.kind !== 'check';
  const bar = exercise.mode === 'barbell' && !rehearse;
  // A row too wide for the column steps down to the floor size ("150 lb each" beside "12 reps").
  const tight = numbersWidth(exercise, weight, reps) > 325;
  // He shows a lift when it first comes up: before any set of it is logged, and once the screen can be seen.
  const firstTime = !frozen && !covered && visit.progress.exercises[exercise.id].done === 0;
  // "First try" is said once: on the first set of a lift that is new today.
  const last = setup ? setupLine(setup, mode, reps) : lastWords(step, weight, visit.progress.exercises[exercise.id].done === 0);
  // The last try cannot be followed by a heavier one, so "Go heavier" is not offered on it.
  const answers = setup?.lastTry ? TRIAL_ANSWERS.filter(item => item.answer !== 'heavier') : TRIAL_ANSWERS;
  const more = () => {
    visit.addRest(30);
    onNotice(`30 seconds added. ${clock(visit.restRemaining + 30)} of rest left.`);
  };
  // On a try or a check the numbers are what to do, not a door: the Change sheet is closed until the lift has its start.
  const Num = setup ? 'span' : 'button';
  const numProps = (label: string) => (setup ? {} : { type: 'button' as const, 'aria-label': label, onClick: open('change') });

  return (
    <div
      className={s.screen} data-screen="set" data-mode={mode} data-lift={exercise.id} data-frozen={frozen || undefined}
      data-setup={setup?.kind} data-try={setup?.kind === 'trial' ? setup.tryNumber : undefined}
    >
      <Track steps={visit.progress.steps} blocks={visit.plan.blocks} />

      <div className={s.loggedSlot}>
        {logged && (
          <div key={logged.key} className={s.logged}>
            {logged.check && <span className={s.loggedCheck}><Check size={16} /></span>}
            <p className={s.loggedWords}>
              {logged.words}{logged.beat && <>, <strong>{logged.beat}</strong></>}
            </p>
            <button type="button" className={`${s.word} ${s.wordRight}`} aria-label={`${logged.fixWord} ${logged.words}`} onClick={open('fix')}>{logged.fixWord}</button>
          </div>
        )}
      </div>

      <div className={s.lift}>
        <div className={s.titleRow}>
          <h1 className={s.name}>{title(exercise)}</h1>
          {bar && (
            <button type="button" className={s.figureBtn} aria-label={howLabel(exercise)} onClick={open('how')}>
              <FigureDisc move={exercise.figure} />
            </button>
          )}
        </div>

        {/* The row keeps its place on a rehearsal, where there is nothing to count, so the figure below does not move. */}
        <p className={s.sets} data-mode={mode} aria-hidden={rehearse || undefined}>
          {!rehearse && setup && (
            <>
              <span className={s.setWord}>{setupWord(setup, mode)}</span>
              {/* The markers alone count the tries. A check set is one set, with nothing to count. */}
              {setup.kind === 'trial' && <Markers key={`t${at}`} states={states} pop={mode === 'rest' ? { index: at - 2, twice: false } : null} />}
            </>
          )}
          {!setup && (
            <>
              <span className={s.setWord}>{setWord(step, mode)}</span>
              <Markers key={step.index} states={states} pop={pop} />
              <span>{at} of {states.length}</span>
            </>
          )}
        </p>

        <Drawing
          key={exercise.id} exercise={exercise} weight={weight} still={frozen} play={firstTime} rehearse={rehearse}
          onHow={opener => { if (live) onOpen('how', opener); }}
        />

        {rehearse ? (
          <p className={s.rehearse}>{rehearseWords(exercise, setup.easierThan)}</p>
        ) : (
          <>
            <div className={s.numbers} data-numbers data-tight={tight || undefined}>
              {hasWeight && (
                <Num className={s.num} {...numProps(`${weight} ${weightUnit(exercise)}. Change the weight`)}>
                  <span className={s.numeral}>{weight}</span><span className={s.unit}>{weightUnit(exercise)}</span>
                </Num>
              )}
              <Num className={s.num} {...numProps(`${reps} ${repsUnit(exercise, reps)}. Change the reps`)}>
                {setup?.kind === 'check' && <span className={s.unit}>up to</span>}
                <span className={s.numeral}>{reps}</span><span className={s.unit}>{repsUnit(exercise, reps)}</span>
              </Num>
            </div>
            {/* Its place is kept when there is nothing to say, so the numbers do not move. */}
            <p className={s.last}>{last}</p>
          </>
        )}
      </div>

      <div ref={slotRef} className={s.slot}>
        {mode === 'rest' ? (
          <span className={s.slabWrap}>
            <span className={`${s.ledge} ${s.ledgeOpen}`} aria-hidden="true" />
            <button
              type="button" className={s.rest} onClick={visit.startNext}
              aria-label={`Rest, ${clock(visit.restRemaining)} left. Tap to start early`}
            >
              <span className={s.restTime}>{clock(visit.restRemaining)}</span>
              <span className={s.restWord}>Rest. Tap to start early.</span>
              {visit.rest && (
                <RestLine
                  key={visit.rest.endsAt} fraction={visit.restFraction}
                  elapsedMs={Math.max(0, visit.now - visit.rest.startedAt)} totalMs={visit.rest.endsAt - visit.rest.startedAt}
                />
              )}
            </button>
          </span>
        ) : rehearse ? (
          <Slab key={`rehearse:${exercise.id}`} fill={!frozen} onClick={visit.rehearsed}>I&rsquo;ve tried it</Slab>
        ) : setup?.kind === 'trial' ? (
          // Three slabs in the place of one: the one action of this screen is to say how the try went.
          <Choices
            key={`try:${exercise.id}:${at}`} fill={!frozen}
            options={answers.map(item => ({ key: item.answer, lines: item.lines, onClick: () => { if (!frozen) visit.answerTrial(item.answer); } }))}
          />
        ) : setup?.kind === 'check' ? (
          <Slab key={`check:${exercise.id}`} fill={!frozen} onClick={open('count')}>Done</Slab>
        ) : (
          // A new slab for each set and each lift: it leaves and fills back up, so a tap in a superset visibly lands.
          <Slab key={`${step.index}:${exercise.id}`} haptic fill={!frozen} onClick={visit.confirm}>Done</Slab>
        )}
      </div>

      <div className={s.foot}>
        <span className={s.footWords}>
          {!setup && <button type="button" className={s.word} onClick={open('change')}>Change</button>}
          {/* The way out: something hurts, skip this set, end the workout. Quiet, and always here. */}
          <button type="button" className={s.word} onClick={open('out')}>More</button>
        </span>
        {mode === 'rest'
          ? <button type="button" className={`${s.word} ${s.wordRight}`} aria-label="Add 30 seconds of rest" onClick={more}>+30 sec</button>
          : !setup && <p className={s.next}>{nextWords(step, visit.steps, visit)}</p>}
      </div>
    </div>
  );
}
