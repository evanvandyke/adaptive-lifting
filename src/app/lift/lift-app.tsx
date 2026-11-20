'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { planVisit, type VisitRecord } from './coach/coach';
import Signal, { Shell } from './signal/app';
import { BugButton } from './signal/bug';
import { Slab } from './signal/parts';
import { clearActive, makeRecord, readActive, readHistory, readSetting, saveRecord, syncHistory, writeSetting } from './store';
import type { VisitState } from './visit/use-visit';
import { EXERCISES, type Setting } from './visit/visit-data';
import s from './signal/signal.module.css';

/** A visit left alone this long is over: it is kept as it stood, and today starts fresh. */
const STALE_MS = 6 * 3_600_000;
/** Back within this long, he carries straight on. Longer, and he is asked. */
const QUIET_MS = 10 * 60_000;
/** How long a phone with no history waits on the database before starting anyway. */
const SYNC_WAIT_MS = 3000;

interface Boot { history: VisitRecord[]; setting: Setting; saved: VisitState | null; ask: boolean; savedAt: number }

/** What the phone holds when the page opens. A visit that finished, or was left for hours, is settled here. */
function boot(userId: string): Boot {
  try {
    return read(userId);
  } catch {
    // A visit in progress this version cannot read: it is let go so the app opens.
    clearActive(userId);
    return { history: readHistory(userId), setting: readSetting(userId), saved: null, ask: false, savedAt: 0 };
  }
}

const isState = (state: VisitState | undefined): state is VisitState => (
  !!state && Array.isArray(state.logged) && Array.isArray(state.trials) && Array.isArray(state.hurt) && !!state.draft
  && typeof state.found === 'object' && typeof state.swaps === 'object'
  && Array.isArray(state.plan?.steps) && state.plan.steps.length > 0 && !!state.plan.lifts && Array.isArray(state.plan.blocks)
  && state.stepIndex >= 0 && state.stepIndex < state.plan.steps.length
  && state.plan.steps.every(step => step.exerciseId in EXERCISES) && state.logged.every(set => set.exerciseId in EXERCISES)
);

function read(userId: string): Boot {
  const active = readActive(userId);
  let saved: VisitState | null = null;
  let ask = false;
  if (active && isState(active.state) && active.state.phase !== 'start') {
    const { state, savedAt } = active;
    const idle = Date.now() - savedAt;
    if (state.phase === 'finish' || idle > STALE_MS) {
      const record = makeRecord(userId, state, state.finishedAt ?? savedAt, state.phase === 'finish' ? state.endedEarly : true);
      if (record) saveRecord(userId, record);
      clearActive(userId);
    } else {
      saved = state;
      ask = idle > QUIET_MS;
    }
  } else if (active) clearActive(userId);
  return { history: readHistory(userId), setting: readSetting(userId), saved, ask, savedAt: active?.savedAt ?? 0 };
}

/** Coming back to a visit left half done: where he was, and the choice to carry on or stop there. */
function Resume({ state, onCarryOn, onEnd }: { state: VisitState; onCarryOn: () => void; onEnd: () => void }) {
  const done = state.logged.length;
  const total = state.plan.steps.length;
  return (
    <div className={s.root}>
      <main className={s.app}>
        <div className={s.screen} data-screen="start">
          <h1 className={s.big}>Welcome back.</h1>
          <p className={s.resumeFact}>{state.plan.name}: {done} of {total} sets done.</p>
          <div className={s.spacer} />
          <div className={s.slot}>
            <Slab onClick={onCarryOn}>Carry on</Slab>
          </div>
          <div className={s.foot}>
            <button type="button" className={s.word} onClick={onEnd}>End it here</button>
          </div>
        </div>
      </main>
    </div>
  );
}

/** The app: reads what the phone holds, asks the coach for today's plan, and runs the visit. Browser only. */
export default function LiftApp({ userId }: { userId: string }) {
  const [first] = useState(() => boot(userId));
  const [history, setHistory] = useState(first.history);
  const [setting, setSetting] = useState(first.setting);
  const [saved, setSaved] = useState(first.saved);
  const [asking, setAsking] = useState(first.ask);
  // The day the plan is for. Looked at again whenever the app comes back to the front.
  const [clock, setClock] = useState(() => Date.now());

  // A phone that holds nothing may be a new phone: the database is asked first (briefly), so a visit he has
  // already done elsewhere is not planned as a first one.
  const [checked, setChecked] = useState(first.history.length > 0 || first.saved !== null);

  useEffect(() => {
    let over = false;
    const giveUp = window.setTimeout(() => { if (!over) setChecked(true); }, SYNC_WAIT_MS);
    void syncHistory(userId).then(merged => {
      if (over) return;
      if (merged) setHistory(merged);
      setChecked(true);
    });
    const onShow = () => { if (document.visibilityState === 'visible') setClock(Date.now()); };
    document.addEventListener('visibilitychange', onShow);
    return () => {
      over = true;
      window.clearTimeout(giveUp);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [userId]);

  const plan = useMemo(() => planVisit(history, setting, clock), [history, setting, clock]);

  const chooseSetting = useCallback((next: Setting) => {
    setSetting(next);
    writeSetting(userId, next);
  }, [userId]);
  const closed = useCallback(() => {
    setHistory(readHistory(userId));
    setClock(Date.now());
  }, [userId]);
  const signOut = useCallback(async () => {
    // This phone only: his other devices stay signed in. With no signal the session is still cleared here, so
    // the next person at this phone starts at the login page and not in his account.
    let out = false;
    try {
      out = !(await createClient().auth.signOut({ scope: 'local' })).error;
    } catch { /* cleared by hand below */ }
    if (!out) {
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0].trim();
        if (name.startsWith('sb-') && name.includes('-auth-token')) document.cookie = `${name}=; Max-Age=0; path=/`;
      }
    }
    window.location.assign('/login');
  }, []);

  if (asking && saved) {
    const endHere = () => {
      const record = makeRecord(userId, saved, first.savedAt, true);
      if (record) saveRecord(userId, record);
      clearActive(userId);
      setSaved(null);
      setAsking(false);
      closed();
    };
    return (
      <Shell>
        <Resume state={saved} onCarryOn={() => setAsking(false)} onEnd={endHere} />
        <BugButton userId={userId} context={() => ({ phase: 'resume', visit: { ...saved, plan: saved.plan.name } })} />
      </Shell>
    );
  }
  if (!checked) return <Shell><div className={s.root} /></Shell>;
  // Keyed on whether it carries on from a saved visit, so "End it here" starts from a clean one.
  return <Signal key={saved ? 'saved' : 'fresh'} userId={userId} plan={plan} saved={saved} setting={setting} onSetting={chooseSetting} onClosed={closed} onSignOut={signOut} />;
}
