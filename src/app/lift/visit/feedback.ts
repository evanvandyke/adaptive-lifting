'use client';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { Visit, VisitEvent } from './use-visit';

/**
 * Short synthesized sounds, drawn with the Web Audio API: no audio files and no `<audio>` element, so on an iPhone
 * they mix with his music instead of pausing it, and go quiet with the ringer switch. A bonus, never the message:
 * every state must read with the sound off. Everything here fails silent.
 */
export type SoundName = 'tick' | 'beat' | 'block' | 'finish' | 'restOver';

/** How long each sound lasts, in seconds. */
export const SOUND_SECONDS: Record<SoundName, number> = { tick: 0.09, beat: 0.36, block: 0.38, restOver: 0.38, finish: 1.9 };

const STORAGE_KEY = 'adaptive-lifting:sound';
/** Every sound passes through one gain at this level on its way out. */
export const MASTER_GAIN = 0.6;

let context: AudioContext | null = null;
let master: GainNode | null = null;
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/* ---------- the preference ---------- */

const listeners = new Set<() => void>();
/** Used when `localStorage` is unavailable, so the toggle still works for the session. */
let remembered: boolean | null = null;

/** Sound is on unless he turned it off. */
export function isSoundOn(): boolean {
  if (remembered !== null) return remembered;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  remembered = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch { /* private mode: the session still remembers */ }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    remembered = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** The sound preference as state, for a toggle: `const [soundOn, setSoundOn] = useSoundPreference()`. */
export function useSoundPreference(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, isSoundOn, () => true);
  return [on, setSoundOn];
}

/* ---------- the context ---------- */

/**
 * Create the one shared `AudioContext` and resume it. Must run inside a tap or key press the first time;
 * `PhoneStage` already does this for every tap inside it, so a direction rarely calls it.
 */
export function unlockAudio(): void {
  try {
    if (typeof window === 'undefined') return;
    if (!context) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      // "ambient" mixes with other apps' audio and obeys the ringer switch. Safari only; set before the context exists.
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) {
        try { session.type = 'ambient'; } catch { /* keep the default */ }
      }
      context = new Context({ latencyHint: 'interactive' });
      master = context.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(context.destination);
    }
    if (context.state !== 'running') void context.resume().catch(() => {});
  } catch { /* no audio on this device: carry on without */ }
}

/**
 * Keep the context alive: unlock on every tap and key press, and resume when the page becomes visible again.
 * Returns the cleanup. `PhoneStage` calls this.
 */
export function installAudioUnlock(): () => void {
  const gestures = ['pointerup', 'touchend', 'mousedown', 'keydown', 'click'] as const;
  const onGesture = () => unlockAudio();
  const onVisible = () => {
    if (document.visibilityState === 'visible' && context) unlockAudio();
  };
  gestures.forEach(type => document.addEventListener(type, onGesture, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pageshow', onVisible);
  return () => {
    gestures.forEach(type => document.removeEventListener(type, onGesture, { capture: true }));
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pageshow', onVisible);
  };
}

/* ---------- the sounds ---------- */

interface Tone { type: OscillatorType; from: number; to?: number; glide?: number; at: number; decay: number; gain: number }
interface Burst { filter: BiquadFilterType; frequency: number; q?: number; at: number; decay: number; gain: number }

/** An oscillator with a fast attack, an exponential decay and an optional drop in pitch. */
function tone(ctx: BaseAudioContext, out: AudioNode, t0: number, voice: Tone): void {
  const start = t0 + voice.at;
  const end = start + voice.decay;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = voice.type;
  oscillator.frequency.setValueAtTime(voice.from, start);
  if (voice.to) oscillator.frequency.exponentialRampToValueAtTime(voice.to, start + (voice.glide ?? voice.decay));
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(voice.gain, start + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(envelope).connect(out);
  oscillator.start(start);
  oscillator.stop(end + 0.01);
}

function noiseFor(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

/** A filtered burst of noise: the contact in a clack, the air in a thud. */
function burst(ctx: BaseAudioContext, out: AudioNode, t0: number, voice: Burst): void {
  const start = t0 + voice.at;
  const end = start + voice.decay;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const envelope = ctx.createGain();
  source.buffer = noiseFor(ctx);
  filter.type = voice.filter;
  filter.frequency.value = voice.frequency;
  filter.Q.value = voice.q ?? 1;
  envelope.gain.setValueAtTime(voice.gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(filter).connect(envelope).connect(out);
  source.start(start);
  source.stop(end + 0.01);
}

/** Iron on iron, short. */
function clack(ctx: BaseAudioContext, out: AudioNode, t0: number, level = 1): void {
  burst(ctx, out, t0, { filter: 'bandpass', frequency: 2400, q: 1.2, at: 0, decay: 0.035, gain: 0.5 * level });
  tone(ctx, out, t0, { type: 'triangle', from: 190, to: 150, at: 0, decay: 0.07, gain: 0.5 * level });
}

/** A weight seating: a low drop with a dull contact. */
function thud(ctx: BaseAudioContext, out: AudioNode, t0: number): void {
  tone(ctx, out, t0, { type: 'sine', from: 120, to: 48, glide: 0.18, at: 0, decay: 0.32, gain: 0.9 });
  burst(ctx, out, t0, { filter: 'lowpass', frequency: 700, at: 0, decay: 0.09, gain: 0.6 });
}

const RECIPES: Record<SoundName, (ctx: BaseAudioContext, out: AudioNode, t0: number) => void> = {
  // A set: one clack.
  tick: (ctx, out, t0) => clack(ctx, out, t0),
  // Beat last time: the clack, and the plate rings.
  beat: (ctx, out, t0) => {
    clack(ctx, out, t0);
    tone(ctx, out, t0, { type: 'sine', from: 1180, at: 0.01, decay: 0.33, gain: 0.22 });
    tone(ctx, out, t0, { type: 'sine', from: 1903, at: 0.01, decay: 0.2, gain: 0.1 });
  },
  // A block done: the stack seats.
  block: (ctx, out, t0) => {
    thud(ctx, out, t0);
    clack(ctx, out, t0, 0.7);
  },
  // Rest over: two knocks, the same pitch, nothing urgent.
  restOver: (ctx, out, t0) => {
    tone(ctx, out, t0, { type: 'sine', from: 587, at: 0, decay: 0.14, gain: 0.4 });
    tone(ctx, out, t0, { type: 'sine', from: 587, at: 0.17, decay: 0.2, gain: 0.4 });
  },
  // The visit done: the seat, then a low bell left to ring.
  finish: (ctx, out, t0) => {
    thud(ctx, out, t0);
    const partials: [ratio: number, gain: number, decay: number][] = [[1, 0.5, 1.85], [2, 0.3, 1.4], [2.76, 0.22, 1], [4.07, 0.12, 0.6], [5.4, 0.06, 0.4]];
    for (const [ratio, gain, decay] of partials) tone(ctx, out, t0, { type: 'sine', from: 196 * ratio, at: 0.03, decay, gain });
  },
};

/**
 * Schedule a sound on any context at time `t0` (seconds on that context's clock). Exported so the sounds can be
 * rendered and measured in an `OfflineAudioContext`; a direction uses `playSound`.
 */
export function scheduleSound(ctx: BaseAudioContext, out: AudioNode, name: SoundName, t0: number): void {
  RECIPES[name](ctx, out, t0);
}

/**
 * Play a sound now. Does nothing when sound is off, before the first tap has unlocked audio, or if the context
 * cannot run within a moment: a sound is never played late.
 */
export function playSound(name: SoundName): void {
  try {
    if (!isSoundOn()) return;
    const ctx = context;
    const out = master;
    if (!ctx || !out) return;
    if (ctx.state === 'running') {
      scheduleSound(ctx, out, name, ctx.currentTime + 0.005);
      return;
    }
    const asked = performance.now();
    void ctx.resume().then(() => {
      if (performance.now() - asked < 300 && ctx.state === 'running') scheduleSound(ctx, out, name, ctx.currentTime + 0.005);
    }).catch(() => {});
  } catch { /* silent */ }
}

/* ---------- wiring a visit to the sounds ---------- */

/** The sound for an event: `finish`, `block`, `beat` for a set that beat last time, `tick` for any other set, nothing for an undo. */
export function soundFor(event: VisitEvent): SoundName | null {
  if (event.kind === 'finish') return 'finish';
  if (event.kind === 'block') return 'block';
  if (event.kind === 'set') return event.comparison === 'beat' ? 'beat' : 'tick';
  // First visits: a try is a tick like any set; a starting point found is the same small arrival as a block.
  if (event.kind === 'trial') return 'tick';
  if (event.kind === 'found') return 'block';
  return null;
}

/**
 * Plays the right sound once for each visit event, and `restOver` when the rest clock reaches zero while he is
 * looking at it. A rest that ended while the phone was locked stays quiet. Call it once, next to `useVisit`.
 */
export function useVisitSounds(visit: Visit): void {
  const { lastEvent, restOver } = visit;
  const restEndsAt = visit.rest?.endsAt ?? 0;
  const played = useRef(0);

  useEffect(() => {
    if (!lastEvent || lastEvent.id <= played.current) return;
    played.current = lastEvent.id;
    const name = soundFor(lastEvent);
    if (name && Date.now() - lastEvent.at < 1000) playSound(name);
  }, [lastEvent]);

  useEffect(() => {
    if (restOver && Date.now() - restEndsAt < 1500) playSound('restOver');
  }, [restOver, restEndsAt]);
}
