'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clearActive, dropRecord, makeRecord, saveRecord, writeActive } from '../store';
import { installAudioUnlock, useVisitSounds } from '../visit/feedback';
import { GUARD_MS, TRIES_MAX, useVisit, type VisitState } from '../visit/use-visit';
import { EXERCISES, type Plan, type Setting } from '../visit/visit-data';
import { BugButton } from './bug';
import { HOLD_MS, useArmed, useCover } from './hooks';
import { BlockDone, Finish, Found } from './moments';
import { SetScreen, type LoggedLine, type SetView, type SheetKind } from './set-screen';
import { ChangeSheet, CountSheet, FixSheet, HowSheet, OutSheet, SignOutSheet } from './sheets';
import { Start } from './start';
import type { Pop } from './parts';
import { announcement, beatWords, loggedWords, trialWords, type Notice } from './words';
import s from './signal.module.css';

/**
 * A closed sheet slides away (180 ms) and is then removed. Until it is, the screen behind stays dead, so the
 * second half of a double tap on "Use this" or "Close" cannot land on Done or Change underneath.
 */
const SHEET_OUT_MS = 350;

interface OpenSheet {
  kind: SheetKind | 'signOut';
  open: boolean;
  /** Goes up with every opening, so each one is a fresh sheet. */
  n: number;
  /** The visit and set screen it was opened on, and how much had been logged then (sets and tries): a sheet does not outlive any of them. */
  startedAt: number | null;
  stepIndex: number;
  mark: string;
}

/** The working screens, armed a moment after they arrive: a double tap on Start or "Run it again" opens nothing. */
function Working(props: Omit<Parameters<typeof SetScreen>[0], 'armed'>) {
  const armed = useArmed(GUARD_MS);
  return <SetScreen {...props} armed={armed} />;
}

export interface SignalProps {
  userId: string;
  /** Today's plan, from the coach. */
  plan: Plan;
  /** A visit to carry on from, read back from the phone. */
  saved: VisitState | null;
  setting: Setting;
  settingHint?: boolean;
  onSetting: (setting: Setting) => void;
  /** The visit is over and its record is kept: the page reads the history again. */
  onClosed: () => void;
  onSignOut: () => void;
}

/**
 * The frame the app stands in: the whole window, black, with the screen in the middle at a phone's width. It also
 * does the two things a phone needs from the page: sound is unlocked on the first touch, and the screen stays on
 * while a visit is under way.
 */
export function Shell({ children, awake, marks }: { children: React.ReactNode; awake?: boolean; marks?: Record<string, string | number> }) {
  const phone = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // iOS Safari applies `:active` to a tapped element reliably only when a touchstart listener sits on it or an ancestor.
    const element = phone.current;
    const noop = () => {};
    element?.addEventListener('touchstart', noop, { passive: true });
    const removeAudio = installAudioUnlock();
    return () => {
      element?.removeEventListener('touchstart', noop);
      removeAudio();
    };
  }, []);

  // The screen stays on between sets. The lock is lost when the page is hidden, so it is asked for again on return.
  useEffect(() => {
    if (!awake || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let over = false;
    const ask = async () => {
      if (over || document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (over) void lock.release();
      } catch { /* low battery, or not allowed: the phone dims as usual */ }
    };
    void ask();
    document.addEventListener('visibilitychange', ask);
    return () => {
      over = true;
      document.removeEventListener('visibilitychange', ask);
      void lock?.release().catch(() => {});
    };
  }, [awake]);

  return (
    <div className={s.shell}>
      <div ref={phone} className={`${s.phone} ${s.theme}`} data-phone-screen="" {...marks}>{children}</div>
    </div>
  );
}

/**
 * Signal: a black sign with a yellow pictogram. One screen per set, one tap per set, three loud things:
 * the lift's name, the weight and reps, and the one action.
 */
export default function Signal({ userId, plan, saved, setting, settingHint = false, onSetting, onClosed, onSignOut }: SignalProps) {
  const visit = useVisit({ plan, saved });
  useVisitSounds(visit);
  const { phase, stepIndex, steps, lastEvent, lastLogged, lastTrial, restOver, startNext } = visit;
  const working = phase === 'set' || phase === 'rest';
  // Things the engine has no event for (a swap, added rest, a stepper's new value): the page keeps the words for them.
  const [notice, setNotice] = useState<Notice | null>(null);
  const notify = useCallback((text: string) => setNotice({ at: Date.now(), startedAt: visit.startedAt, text }), [visit.startedAt]);
  const said = announcement(visit, notice);

  // The phone keeps the visit as it goes, so a reload (or the phone dropping the page) loses nothing. A finished
  // visit is kept as a record the moment it finishes, and again if its last set is fixed from the finish.
  const { snapshot } = visit;
  const kept = useRef<string | null>(null);
  const wasFinish = useRef(saved?.phase === 'finish');
  const stamp = `${phase}:${stepIndex}:${visit.logged.length}:${visit.trials.length}:${visit.rest?.endsAt ?? 0}:${visit.draft.weight}:${visit.draft.reps}:${visit.setup?.kind ?? ''}${visit.setup?.tryNumber ?? ''}:${visit.exercise.id}:${visit.hurt.length}:${lastEvent?.id ?? 0}`;
  useEffect(() => {
    if (snapshot.phase === 'start') {
      clearActive(userId);
      // Back at the start, the last visit's record is settled: nothing later may take it back.
      kept.current = null;
      if (wasFinish.current) onClosed();
      wasFinish.current = false;
      return;
    }
    writeActive(userId, snapshot);
    if (snapshot.phase === 'finish') {
      wasFinish.current = true;
      const record = makeRecord(userId, snapshot, snapshot.finishedAt ?? Date.now(), snapshot.endedEarly);
      if (record) {
        kept.current = record.id;
        saveRecord(userId, record);
      }
    } else {
      wasFinish.current = false;
      // A set taken back from the finish: the visit is under way again.
      if (kept.current) dropRecord(userId, kept.current);
      kept.current = null;
    }
    // `stamp` changes with everything worth keeping, and not with the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, userId]);

  // For the report button: where he is and what the visit holds.
  const latest = useRef(snapshot);
  useEffect(() => {
    latest.current = snapshot;
  });
  const context = useCallback(() => {
    const now = latest.current;
    const { plan: running, ...rest } = now;
    return {
      phase: now.phase, step: now.stepIndex, lift: now.plan.steps[now.stepIndex]?.exerciseId, setting: running.setting,
      plan: { id: running.id, name: running.name, template: running.template, week: running.week, steps: running.steps.length },
      visit: rest,
    };
  }, []);

  // The moments, each played once for the engine event that caused it, and keyed on that event's id: a block
  // done, and on a first visit a starting point found. The finish is keyed on the time the visit finished, which
  // a fix made from the finish does not change (a fix is an event of its own, and must not play the finish again).
  const momentEvent = working && lastEvent && (lastEvent.kind === 'block' || lastEvent.kind === 'found') ? lastEvent : null;
  const coverId = phase === 'finish' ? (visit.finishedAt ?? 0) : (momentEvent?.id ?? null);
  const cover = useCover(coverId, phase === 'finish' ? null : HOLD_MS);
  const covered = cover.stage !== 'none';

  // The rest clock ending turns the slot into Done: nothing is ever overdue. (`useVisitSounds` plays `restOver`.)
  // Never while a moment is up: ending the rest there would take the moment down with it. It waits for the drop.
  useEffect(() => {
    if (restOver && !covered) startNext();
  }, [restOver, covered, startNext]);

  // While a moment rises, the screen he tapped stays as it was underneath: the set he logged, or the try he answered.
  const rising = cover.stage === 'rise' && momentEvent !== null;
  const frozenSet = rising && momentEvent.kind === 'block' && lastLogged && !lastLogged.skipped ? lastLogged : null;
  const frozenTry = rising && momentEvent.kind === 'found' && lastTrial ? lastTrial : null;
  const view: SetView | null = frozenSet
    ? { step: steps[frozenSet.stepIndex], weight: frozenSet.weight, reps: frozenSet.reps, mode: 'live', frozen: true, setup: null }
    : frozenTry
      ? {
        // A try he called right was logged as set one, so the step on deck has moved on: the try's own step is shown.
        step: (momentEvent ? steps[momentEvent.stepIndex] : undefined) ?? visit.step, weight: frozenTry.weight, mode: 'live', frozen: true,
        reps: frozenTry.kind === 'check' ? EXERCISES[frozenTry.exerciseId].range[1] : frozenTry.reps,
        setup: {
          kind: frozenTry.kind, tryNumber: frozenTry.tryNumber, triesMax: frozenTry.kind === 'check' ? 1 : TRIES_MAX, easierThan: null,
          lastTry: frozenTry.tryNumber >= TRIES_MAX || frozenTry.weight + (EXERCISES[frozenTry.exerciseId].first?.step ?? 0) > (EXERCISES[frozenTry.exerciseId].first?.ceiling ?? 0),
        },
      }
      : working
        ? { step: visit.step, weight: visit.draft.weight, reps: visit.draft.reps, mode: phase === 'rest' ? 'rest' : 'live', setup: visit.setup }
        : null;

  // The logged line: the last thing he did (a set, or on a first visit a try), until the next Done. No timers.
  // When a new lift's rehearsal begins the line is cleared, and stays clear until something is logged for that
  // lift: the last lift's record does not sit on the new lift's first screens.
  const mark = `${visit.logged.length}:${visit.trials.length}`;
  const lineKey = `${visit.startedAt}:${mark}`;
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const rehearsing = visit.setup?.kind === 'rehearse';
  if (rehearsing && clearedAt !== lineKey) setClearedAt(lineKey);
  let logged: LoggedLine | null = null;
  let pop: Pop | null = null;
  if (working && !view?.frozen && !rehearsing && clearedAt !== lineKey) {
    if (visit.lastDone === 'trial' && lastTrial) {
      // A try is not a set, and its line does not look like one. One that was too heavy has no check beside it.
      logged = { key: `try${visit.trials.length}`, words: trialWords(lastTrial), beat: null, check: lastTrial.answer !== 'tooHeavy', fixWord: 'Fix' };
    } else if (lastLogged && visit.canUndo && lastLogged.stepIndex === stepIndex - 1) {
      const done = steps[lastLogged.stepIndex];
      logged = {
        key: done.index, words: loggedWords(done, lastLogged), beat: beatWords(done, lastLogged), check: !lastLogged.skipped,
        // A lift's last set is where extra reps go: the same sheet, named for it.
        fixWord: done.endsExercise && !lastLogged.skipped ? 'Add reps' : 'Fix',
      };
      // The marker answers the set: one stamp when it finished its set or round, two when it beat last time.
      if (!visit.setup && !lastLogged.skipped && lastEvent && lastEvent.kind === 'set' && lastEvent.stepIndex === done.index && done.blockIndex === visit.step.blockIndex) {
        const beat = lastEvent.comparison === 'beat';
        if (done.endsRound || beat) pop = { index: (done.partnerId ? done.round : done.setNumber) - 1, twice: beat };
      }
    }
  }

  // The sheets. Each belongs to the screen it was opened on. Fix also opens over the finish, for the last set.
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const slot = useRef<HTMLDivElement>(null);
  const fixable = sheet !== null && sheet.mark === mark && (visit.lastDone === 'trial' || visit.canUndo);
  const shown = sheet && sheet.startedAt === visit.startedAt && sheet.stepIndex === stepIndex && (
    phase === 'start' ? sheet.kind === 'signOut'
      : phase === 'finish' ? sheet.kind === 'fix' && fixable && cover.stage === 'hold'
      : working && !covered && sheet.kind !== 'signOut' && (
        sheet.kind === 'fix' ? fixable
          : sheet.kind === 'count' ? visit.setup?.kind === 'check'
            : sheet.kind === 'change' ? !visit.setup
              : sheet.kind === 'swap' ? visit.swapOptions.length > 1
                : true
      )
  ) ? sheet : null;
  // A sheet whose screen has moved on is gone for good: it must not come back when a later screen happens to fit
  // it (the count sheet, when the easier lift's own check set comes up on the same step).
  if (sheet !== null && shown === null) setSheet(null);
  /** Open, or closed and still sliding away. */
  const sheetUp = shown !== null;

  const openSheet = useCallback((kind: OpenSheet['kind'], from: HTMLElement) => {
    opener.current = from;
    setSheet(now => ({ kind, open: true, n: (now?.n ?? 0) + 1, startedAt: visit.startedAt, stepIndex, mark }));
  }, [stepIndex, visit.startedAt, mark]);
  const closeSheet = useCallback(() => setSheet(now => (now ? { ...now, open: false } : now)), []);
  /** One sheet gives way to another, opened for the same screen. */
  const switchSheet = useCallback((kind: SheetKind) => {
    setSheet(now => (now ? { ...now, kind, open: true, n: now.n + 1 } : now));
  }, []);

  // A closed sheet slides away, then goes.
  const closing = sheet !== null && !sheet.open;
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setSheet(now => (now && !now.open ? null : now)), SHEET_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  // Focus is never left on nothing. On a set screen it goes to the one action (Done, the rest clock, the first of
  // the three answers): after a set or a try is logged, when a rest ends, and when a sheet closes. On the finish
  // it goes back to the word that opened Fix.
  const wasUp = useRef(false);
  const liftId = visit.exercise.id;
  const setupKey = visit.setup ? `${visit.setup.kind}${visit.setup.tryNumber}` : '';
  useEffect(() => {
    const closed = wasUp.current && !sheetUp;
    wasUp.current = sheetUp;
    if (sheetUp) return;
    if (phase === 'finish' || phase === 'start') {
      if (closed && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      return;
    }
    if (!working || covered) return;
    const active = document.activeElement;
    if (closed || !active || active === document.body || !active.isConnected) {
      slot.current?.querySelector('button')?.focus({ preventScroll: true });
    }
  }, [sheetUp, covered, working, phase, stepIndex, liftId, setupKey]);

  return (
    <Shell awake={working} marks={{ 'data-phase': phase, 'data-step': stepIndex, 'data-logged': visit.logged.length }}>
      <div className={s.root} data-plan={visit.plan.template}>
        <main className={s.app} inert={sheetUp || covered}>
          {phase === 'start' && <Start visit={visit} setting={setting} settingHint={settingHint} onSetting={onSetting} onSignOut={from => openSheet('signOut', from)} />}
          {view && <Working visit={visit} view={view} logged={logged} covered={covered} pop={pop} onOpen={openSheet} onNotice={notify} slotRef={slot} />}
        </main>

        {momentEvent && covered && (momentEvent.kind === 'block'
          ? <BlockDone key={momentEvent.id} visit={visit} event={momentEvent} stage={cover.stage} onSkip={cover.skip} />
          : lastTrial && <Found key={momentEvent.id} visit={visit} event={momentEvent} lift={lastTrial.exerciseId} stage={cover.stage} onSkip={cover.skip} />)}
        {/* Keyed on the finish, so every finish plays once and starts with its controls dead. */}
        {phase === 'finish' && <Finish key={coverId ?? 'finish'} visit={visit} stage={cover.stage} blocked={sheetUp} onFix={from => openSheet('fix', from)} />}

        {shown?.kind === 'how' && <HowSheet key={shown.n} exercise={visit.exercise} open={shown.open} onClose={closeSheet} />}
        {shown?.kind === 'change' && <ChangeSheet key={shown.n} visit={visit} open={shown.open} onClose={closeSheet} onNotice={notify} />}
        {shown?.kind === 'swap' && <ChangeSheet key={shown.n} visit={visit} open={shown.open} onClose={closeSheet} onNotice={notify} swapOnly />}
        {shown?.kind === 'fix' && <FixSheet key={shown.n} visit={visit} open={shown.open} onClose={closeSheet} edged={phase === 'finish'} />}
        {shown?.kind === 'count' && <CountSheet key={shown.n} visit={visit} open={shown.open} onClose={closeSheet} onNotice={notify} />}
        {shown?.kind === 'out' && <OutSheet key={shown.n} visit={visit} open={shown.open} onClose={closeSheet} onSwitch={switchSheet} onNotice={notify} />}
        {shown?.kind === 'signOut' && <SignOutSheet key={shown.n} open={shown.open} onClose={closeSheet} onSignOut={onSignOut} />}

        <BugButton userId={userId} context={context} />
        <p className={s.vh} aria-live="polite"><span key={said.id}>{said.text}</span></p>
      </div>
    </Shell>
  );
}
