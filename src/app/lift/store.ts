/**
 * What the phone keeps, and what it sends to the database. The phone is the source of truth while he lifts: every
 * write lands in `localStorage` first, so a visit never waits on the network, and the database is caught up
 * afterwards (and again on the next load, for anything that did not get through). Browser only.
 */
import { createClient } from '@/utils/supabase/client';
import type { RecordedSet, VisitRecord } from './coach/coach';
import { stepsOf, type VisitState } from './visit/use-visit';
import { EXERCISES, type ExerciseId, type Setting } from './visit/visit-data';

const key = (name: string, userId: string) => `lift:${name}:${userId}`;

function read<T>(name: string, userId: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key(name, userId));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(name: string, userId: string, value: unknown): void {
  try {
    window.localStorage.setItem(key(name, userId), JSON.stringify(value));
  } catch { /* storage full or private mode: the visit in memory carries on */ }
}

function remove(name: string, userId: string): void {
  try {
    window.localStorage.removeItem(key(name, userId));
  } catch { /* nothing to do */ }
}

/* ---------- finished visits ---------- */

const byTime = (a: VisitRecord, b: VisitRecord) => a.finishedAt - b.finishedAt;
/** A record this version can read. Anything else (an older shape, a lift no longer in the catalogue) is left out. */
const isRecord = (value: unknown): value is VisitRecord => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as VisitRecord;
  return typeof record.id === 'string' && typeof record.finishedAt === 'number' && Array.isArray(record.sets)
    && record.sets.every(set => set && typeof set.reps === 'number' && typeof set.weight === 'number' && set.exerciseId in EXERCISES)
    && Array.isArray(record.hurt) && typeof record.swaps === 'object' && record.swaps !== null
    && typeof record.targets === 'object' && record.targets !== null;
};

export function readHistory(userId: string): VisitRecord[] {
  const stored = read<unknown>('history', userId, []);
  return Array.isArray(stored) ? stored.filter(isRecord).sort(byTime) : [];
}

const readUnsent = (userId: string) => read<string[]>('unsent', userId, []);

/** Keep a finished visit: on the phone now, in the database as soon as it will take it. */
export function saveRecord(userId: string, record: VisitRecord): void {
  const history = readHistory(userId).filter(item => item.id !== record.id);
  write('history', userId, [...history, record].sort(byTime));
  write('unsent', userId, [...new Set([...readUnsent(userId), record.id])]);
  void push(userId);
}

/** A set taken back from the finish: the visit is under way again, so its record goes. */
export function dropRecord(userId: string, id: string): void {
  const history = readHistory(userId);
  if (!history.some(item => item.id === id)) return;
  write('history', userId, history.filter(item => item.id !== id));
  write('unsent', userId, readUnsent(userId).filter(item => item !== id));
  void (async () => {
    try {
      await createClient().from('lifting_signal_visits').delete().eq('id', id);
    } catch { /* offline: the next save of this visit overwrites it */ }
  })();
}

async function push(userId: string): Promise<void> {
  const unsent = readUnsent(userId);
  if (unsent.length === 0) return;
  const rows = readHistory(userId).filter(record => unsent.includes(record.id))
    .map(record => ({ id: record.id, user_id: userId, finished_at: new Date(record.finishedAt).toISOString(), record }));
  try {
    const { error } = rows.length > 0 ? await createClient().from('lifting_signal_visits').upsert(rows) : { error: null };
    if (error) return;
    // Cleared only if what was sent is still what the phone holds: a fix made meanwhile goes on the next push.
    const sent = new Map(rows.map(row => [row.id, JSON.stringify(row.record)]));
    const now = new Map(readHistory(userId).map(record => [record.id, JSON.stringify(record)]));
    write('unsent', userId, readUnsent(userId).filter(id => !(sent.has(id) && sent.get(id) === now.get(id))));
  } catch { /* offline: it stays in the list */ }
}

/**
 * Catch up with the database: send what it has not got, and take in visits made on another phone.
 * Returns the merged history when the database had something new, else null.
 */
export async function syncHistory(userId: string): Promise<VisitRecord[] | null> {
  await push(userId);
  try {
    const { data, error } = await createClient().from('lifting_signal_visits').select('record').eq('user_id', userId);
    if (error || !data) return null;
    const local = readHistory(userId);
    const known = new Set(local.map(record => record.id));
    const fresh = data.map(row => row.record as unknown).filter(isRecord).filter(record => !known.has(record.id));
    if (fresh.length === 0) return null;
    const merged = [...local, ...fresh].sort(byTime);
    write('history', userId, merged);
    return merged;
  } catch {
    return null;
  }
}

/** The record of a visit as it stands, or null when no set was done. */
export function makeRecord(userId: string, state: VisitState, finishedAt: number, endedEarly: boolean): VisitRecord | null {
  if (state.startedAt === null) return null;
  const sets: RecordedSet[] = state.logged.map(set => ({
    exerciseId: set.exerciseId, weight: set.weight, reps: set.reps, at: set.at, ...(set.skipped ? { skipped: true } : {}),
  }));
  if (!sets.some(set => !set.skipped && set.reps > 0)) return null;
  const targets: VisitRecord['targets'] = {};
  const steps = stepsOf(state);
  for (const step of steps) {
    const target = targets[step.exerciseId];
    if (target) target.sets += 1;
    else targets[step.exerciseId] = { sets: 1, reps: step.target.reps, weight: step.target.weight };
  }
  // Swaps are kept against the workout's own lift, so one that carried over from last time carries on. The last
  // set of a slot decides: swapped back by the end, it is not a swap.
  const swaps: VisitRecord['swaps'] = {};
  for (const step of steps) {
    const planned = step.swappedFrom ?? step.exerciseId;
    const own = state.plan.swapped?.[planned] ?? planned;
    if (step.exerciseId === own) delete swaps[own];
    else swaps[own] = step.exerciseId;
  }
  return {
    id: `${userId.slice(0, 8)}-${state.startedAt}`, startedAt: state.startedAt, finishedAt,
    setting: state.plan.setting, template: state.plan.template, planName: state.plan.name, endedEarly,
    sets, hurt: [...state.hurt] as ExerciseId[], swaps, targets,
  };
}

/* ---------- the visit under way ---------- */

export interface ActiveVisit { savedAt: number; state: VisitState }

export const readActive = (userId: string) => read<ActiveVisit | null>('active', userId, null);
export const writeActive = (userId: string, state: VisitState) => write('active', userId, { savedAt: Date.now(), state } satisfies ActiveVisit);
export const clearActive = (userId: string) => remove('active', userId);

/* ---------- where he lifts ---------- */

export function readSetting(userId: string): Setting {
  return read<string>('setting', userId, 'home') === 'gym' ? 'gym' : 'home';
}

export function writeSetting(userId: string, setting: Setting): void {
  write('setting', userId, setting);
  void (async () => {
    try {
      await createClient().from('lifting_signal_state').upsert({ user_id: userId, state: { setting }, updated_at: new Date().toISOString() });
    } catch { /* the phone remembers */ }
  })();
}

/* ---------- reports from the bug button ---------- */

interface Report { note: string; context: Record<string, unknown>; at: number }

/** Send a report, with whatever was waiting from before. True when everything got through. */
export async function sendReport(userId: string, report: Report | null): Promise<boolean> {
  const queue = [...read<Report[]>('reports', userId, []), ...(report ? [report] : [])];
  if (queue.length === 0) return true;
  write('reports', userId, queue);
  try {
    const { error } = await createClient().from('lifting_feedback').insert(
      queue.map(item => ({ user_id: userId, note: item.note, context: item.context, created_at: new Date(item.at).toISOString() })),
    );
    if (error) return false;
    write('reports', userId, read<Report[]>('reports', userId, []).filter(item => !queue.some(sent => sent.at === item.at)));
    return true;
  } catch {
    return false;
  }
}

export const waitingReports = (userId: string) => read<Report[]>('reports', userId, []).length;
