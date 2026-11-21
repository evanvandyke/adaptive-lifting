import type { Setting } from './visit/visit-data.ts';

const key = (userId: string) => `lift:setting:${userId}`;

/** Missing is different from a saved Home choice. Existing JSON values keep their meaning. */
export function readStoredSetting(userId: string): Setting | null {
  try {
    const raw = window.localStorage.getItem(key(userId));
    const value: unknown = raw === null ? null : JSON.parse(raw);
    return value === 'home' || value === 'gym' ? value : null;
  } catch {
    return null;
  }
}

/** Keep the existing fallback for callers that need a plan before a setting is chosen. */
export function readSetting(userId: string): Setting {
  return readStoredSetting(userId) ?? 'home';
}

export function writeStoredSetting(userId: string, setting: Setting): void {
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(setting));
  } catch { /* storage full or private mode: the choice in memory carries on */ }
}
