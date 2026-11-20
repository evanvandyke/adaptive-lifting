'use client';
import { useRef, useSyncExternalStore, type ChangeEvent, type CSSProperties, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react';

/**
 * Gives the wrapped control a system tick on an iPhone. iOS has no vibration API; the one haptic the web gets is the
 * tick of a native switch (`<input type="checkbox" switch>`), and only when the user's own tap toggles it. So where
 * that can work, a transparent `<label>` lies over the control and is wired to a visually hidden switch: his tap
 * lands on the label, Safari toggles the switch and ticks, and the tap is passed on to the real control as one click.
 *
 * The real `<button>` underneath stays the keyboard and screen-reader control and keeps its own `onClick`:
 * one tap, one click, with the overlay or without it. Nothing here was felt on a phone; the tick needs a device test.
 */
export type HapticOverlay = 'auto' | 'on' | 'off';

export interface HapticTapProps {
  /** Exactly one control: a `<button>` with its own `onClick`. */
  children: ReactNode;
  /** `auto` (default) lays the overlay only where it can work. `on` and `off` force it, for testing. */
  overlay?: HapticOverlay;
  /** For the wrapper, a `<span>` set to `display: block; position: relative`. Size the control to fill it. */
  className?: string;
  style?: CSSProperties;
}

// React passes an attribute it does not know straight through; TypeScript does not know `switch` either.
const SWITCH: Record<string, string> = { switch: '' };

const overlayStyle: CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 1, display: 'block', margin: 0,
  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none',
};
// Kept in the render tree (not `display: none`) in case Safari only ticks for a switch it draws.
const switchStyle: CSSProperties = {
  position: 'absolute', top: 0, left: 0, width: 1, height: 1, margin: 0, opacity: 0, pointerEvents: 'none',
};

/** A coarse pointer, and a browser that has the switch control (or is iOS WebKit, where an old version just gets a plain checkbox). */
function overlayCanWork(): boolean {
  try {
    if (!window.matchMedia('(pointer: coarse)').matches) return false;
    return 'switch' in HTMLInputElement.prototype || CSS.supports('-webkit-touch-callout', 'none');
  } catch {
    return false;
  }
}
const never = () => () => {};

const press = (event: SyntheticEvent<HTMLElement>) => { event.currentTarget.dataset.pressed = 'true'; };
const release = (event: SyntheticEvent<HTMLElement>) => { delete event.currentTarget.dataset.pressed; };
const keyPress = (event: KeyboardEvent<HTMLElement>) => { if (event.key === ' ' || event.key === 'Enter') press(event); };

export function HapticTap({ children, overlay = 'auto', className, style }: HapticTapProps) {
  const wrapper = useRef<HTMLSpanElement>(null);
  const supported = useSyncExternalStore(never, overlayCanWork, () => false);
  const overlaid = overlay === 'on' || (overlay === 'auto' && supported);

  // The switch has toggled under his finger (that is the tick). Hand the tap to the real control as one click.
  const forward = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (document.activeElement === input) input.blur();
    wrapper.current?.querySelector<HTMLElement>('button, a[href], [role="button"]')?.click();
  };

  return (
    <span
      ref={wrapper}
      className={className}
      style={{ position: 'relative', display: 'block', ...style }}
      data-haptic-overlay={overlaid ? 'on' : 'off'}
      onPointerDown={press} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}
      onKeyDown={keyPress} onKeyUp={release} onBlur={release}
    >
      {children}
      {overlaid && (
        // The label's own click and the switch's click stop here, so an ancestor sees only the control's click.
        <label aria-hidden="true" style={overlayStyle} onClick={event => event.stopPropagation()}>
          <input type="checkbox" tabIndex={-1} style={switchStyle} onChange={forward} {...SWITCH} />
        </label>
      )}
    </span>
  );
}
