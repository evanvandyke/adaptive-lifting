'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** How long the black takes to rise over the screen, and to drop away again. */
export const RISE_MS = 250;
/** How long "Squat done." holds once the moment has landed. */
export const HOLD_MS = 800;

/**
 * False for the first `ms` after the component mounts, then true. A control that appears where another one just
 * was stays dead until its screen has been seen, so the second tap of a double tap lands on nothing.
 */
export function useArmed(ms: number): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return armed;
}

/** The height of a box, in whole CSS px, kept current. 0 until it has been measured. */
export function useBoxHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setHeight(Math.round(entries[0].contentRect.height)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

export type CoverStage = 'none' | 'rise' | 'hold' | 'drop';

/**
 * The life of a black moment, keyed on the visit event that caused it. `rise` while the black comes up over the
 * screen it was tapped on, `hold` once it has landed, then (when `holdMs` is a number) `drop` as it falls away,
 * and `none` after. With `holdMs` null it holds for good: the finish. `skip` ends a hold early.
 */
export function useCover(eventId: number | null, holdMs: number | null): { stage: CoverStage; skip: () => void } {
  const [state, setState] = useState<{ id: number; stage: CoverStage }>({ id: -1, stage: 'none' });
  const stage: CoverStage = eventId === null ? 'none' : state.id === eventId ? state.stage : 'rise';

  useEffect(() => {
    if (eventId === null) return;
    const next: [CoverStage, number] | null =
      stage === 'rise' ? ['hold', RISE_MS]
        : stage === 'hold' && holdMs !== null ? ['drop', holdMs]
          : stage === 'drop' ? ['none', RISE_MS]
            : null;
    if (!next) return;
    const timer = window.setTimeout(() => setState({ id: eventId, stage: next[0] }), next[1]);
    return () => window.clearTimeout(timer);
  }, [eventId, stage, holdMs]);

  const skip = useCallback(() => {
    if (eventId !== null && holdMs !== null) setState(now => (now.id === eventId && now.stage === 'hold' ? { id: eventId, stage: 'drop' } : now));
  }, [eventId, holdMs]);

  return { stage, skip };
}
