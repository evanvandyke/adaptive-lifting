'use client';

/**
 * The last resort: something on this phone could not be read or shown. Finished workouts are kept; only the
 * workout in progress is let go, which is what gets the app open again.
 */
export default function LiftError({ reset }: { error: Error; reset: () => void }) {
  const startOver = () => {
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith('lift:active:')) window.localStorage.removeItem(key);
      }
    } catch { /* nothing to clear */ }
    reset();
  };
  return (
    <main style={{ position: 'fixed', inset: 0, background: '#1c1a14', color: '#ffc800', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Something broke.</h1>
      <p style={{ fontSize: 18, lineHeight: 1.4, opacity: 0.8 }}>Your finished workouts are safe. This clears the workout in progress and opens the app again.</p>
      <button type="button" onClick={startOver} style={{ marginTop: 24, width: '100%', minHeight: 64, borderRadius: 14, border: 0, background: '#ffc800', color: '#1c1a14', fontSize: 22, fontWeight: 800 }}>
        Start again
      </button>
    </main>
  );
}
