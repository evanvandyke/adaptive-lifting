'use client';
import { useEffect, useRef, useState } from 'react';
import { sendReport, waitingReports } from '../store';
import s from './signal.module.css';

/**
 * The report button, for testing: a small tab on the right edge of every screen. A tap opens a short panel at the
 * top (clear of the keyboard); he types what went wrong and sends it. Where he was and what the visit held go
 * with it, so he describes nothing. A report that cannot be sent waits on the phone and goes with the next one.
 */
export function BugButton({ userId, context }: { userId: string; context: () => Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'kept'>('idle');
  // What the screen held when the tab was pressed: the panel must not change what is reported.
  const taken = useRef<Record<string, unknown>>({});
  const text = useRef<HTMLTextAreaElement>(null);

  // Anything left from a time with no signal goes now.
  useEffect(() => {
    if (waitingReports(userId) > 0) void sendReport(userId, null);
  }, [userId]);

  useEffect(() => {
    if (open) text.current?.focus({ preventScroll: true });
  }, [open]);

  const begin = () => {
    taken.current = {
      ...context(),
      page: window.location.pathname + window.location.search,
      screen: { width: window.innerWidth, height: window.innerHeight, standalone: window.matchMedia('(display-mode: standalone)').matches },
      agent: window.navigator.userAgent, online: window.navigator.onLine,
    };
    setStatus('idle');
    setOpen(true);
  };

  const send = async () => {
    const words = note.trim();
    if (!words || status === 'sending') return;
    setStatus('sending');
    const ok = await sendReport(userId, { note: words, context: taken.current, at: Date.now() });
    setStatus(ok ? 'sent' : 'kept');
    setNote('');
    window.setTimeout(() => setOpen(false), 1100);
  };

  if (!open) {
    return <button type="button" className={s.bugTab} aria-label="Report a problem" onClick={begin}>!</button>;
  }
  return (
    <div className={s.bugPanel} role="dialog" aria-label="Report a problem">
      {status === 'sent' || status === 'kept' ? (
        <h2>{status === 'sent' ? 'Sent. Thank you.' : 'Saved. It will send when there is signal.'}</h2>
      ) : (
        <>
          <h2>What went wrong?</h2>
          <textarea ref={text} className={s.bugText} value={note} onChange={event => setNote(event.target.value)} placeholder="Type or dictate. The screen you are on is saved with it." />
          <div className={s.bugRow}>
            <button type="button" className={s.word} onClick={() => setOpen(false)}>Close</button>
            <button type="button" className={s.bugSend} aria-disabled={!note.trim() || status === 'sending'} onClick={send}>{status === 'sending' ? 'Sending' : 'Send'}</button>
          </div>
        </>
      )}
    </div>
  );
}
