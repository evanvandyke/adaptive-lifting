import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { readSetting, readStoredSetting, writeStoredSetting } from './store-setting.ts';

const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
let values: Map<string, string>;

beforeEach(() => {
  values = new Map();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    } },
  });
});

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'window', original);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('a fresh phone has no choice, while the existing plan reader still defaults to home', () => {
  assert.equal(readStoredSetting('preview'), null);
  assert.equal(readSetting('preview'), 'home');
  assert.equal(values.size, 0);
});

test('existing home and gym values both count as choices, scoped to their account', () => {
  values.set('lift:setting:home-user', '"home"');
  values.set('lift:setting:gym-user', '"gym"');
  assert.equal(readStoredSetting('home-user'), 'home');
  assert.equal(readStoredSetting('gym-user'), 'gym');
  assert.equal(readSetting('gym-user'), 'gym');
  assert.equal(readStoredSetting('preview'), null);
});

test('choosing either setting uses the same key and JSON values as the existing toggle', () => {
  for (const setting of ['home', 'gym'] as const) {
    writeStoredSetting('preview', setting);
    assert.equal(values.get('lift:setting:preview'), JSON.stringify(setting));
    assert.equal(readStoredSetting('preview'), setting);
    assert.equal(readSetting('preview'), setting);
  }
});

test('invalid stored data is not a choice and keeps the existing home fallback', () => {
  for (const raw of ['null', 'false', '{}', '"elsewhere"', 'home', '']) {
    values.set('lift:setting:preview', raw);
    assert.equal(readStoredSetting('preview'), null);
    assert.equal(readSetting('preview'), 'home');
  }
});

test('unavailable storage does not stop the app opening or choosing', () => {
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('unavailable'); } });
  assert.equal(readStoredSetting('preview'), null);
  assert.equal(readSetting('preview'), 'home');
  assert.doesNotThrow(() => writeStoredSetting('preview', 'gym'));
});
