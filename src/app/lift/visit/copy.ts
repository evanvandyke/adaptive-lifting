/**
 * Small shared words: counts, clocks and plates. Pure functions.
 */
import type { PlateLoad } from './visit-data';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** "rep" or "reps". */
export const repsWord = (reps: number) => (reps === 1 ? 'rep' : 'reps');

/** The per-side load in words: "25 on each side", "45, 10 and 5 on each side", "two 45s on each side", "Bar only". */
export function plateLine(load: PlateLoad): string {
  if (load.plates.length === 0) return 'Bar only';
  // Repeated plates are counted in words: "two 45s", never "45 and 45".
  const counts = new Map<number, number>();
  for (const plate of load.plates) counts.set(plate, (counts.get(plate) ?? 0) + 1);
  const names = [...counts].map(([plate, count]) => (count === 1 ? String(plate) : `${word(count)} ${plate}s`));
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${list} on each side`;
}

/** A rest clock: 95 gives "1:35", 8 gives "0:08". */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The time for the finish screen: "28 minutes", "1 minute", and under a minute "40 seconds". */
export function duration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  if (whole < 60) return `${whole} ${whole === 1 ? 'second' : 'seconds'}`;
  const minutes = Math.round(whole / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
