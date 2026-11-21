import { useId, type ReactNode } from 'react';
import { bounds, scene, type Move, type P, type Shape } from './rig';

/**
 * One still frame of the lifter: the rig's shapes for `move` at `t`, drawn as SVG. `Lifter` (lifter.tsx) is the
 * public component and adds the playing; the pose sheet uses this directly to show a movement's end and middle.
 */
export interface FigureProps {
  move: Move;
  /** 0 is the start pose, 1 the end pose. */
  t: number;
  size: number;
  tone: 'ink' | 'yellow';
  equipment: boolean;
  /** Draw what he holds or carries (dumbbells, the squat's plate). Default true. Furniture is not affected. */
  weights?: boolean;
  /**
   * Crop the box to what is drawn at these moments of the move, plus a small even margin, instead of the move's
   * square box. `size` is then the height and the width follows. Nothing is clipped if a movement passes outside.
   */
  fit?: number[];
  label?: string;
  className?: string;
}

// The far arm and leg, and the furniture, take the second tone so the figure never merges into a blob.
const TONES = {
  ink: { near: '#1c1a14', far: '#8a6d00' },
  yellow: { near: '#ffc800', far: '#a88400' },
} as const;

const n = (value: number) => Math.round(value * 100) / 100;
const points = (pts: P[]) => pts.map((p) => `${n(p.x)},${n(p.y)}`).join(' ');

/** A shape as SVG. `grow` widens it on every side: the mask uses that to cut the gap around a shape in front. */
function draw(shape: Shape, key: number, colour: string, hair: number, bold: number, grow = 0): ReactNode {
  if (shape.k === 'line') {
    const width = (shape.furn ? Math.max(shape.w, hair) : shape.w * bold) + 2 * grow;
    return <polyline key={key} points={points(shape.pts)} fill="none" stroke={colour} strokeWidth={n(width)} strokeLinecap="round" strokeLinejoin="round" />;
  }
  if (shape.k === 'disc') return <circle key={key} cx={n(shape.c.x)} cy={n(shape.c.y)} r={n(shape.r + grow)} fill={colour} />;
  return (
    <rect
      key={key} x={n(shape.c.x - shape.w / 2 - grow)} y={n(shape.c.y - shape.h / 2 - grow)}
      width={n(shape.w + 2 * grow)} height={n(shape.h + 2 * grow)} rx={n(shape.r + grow)} fill={colour}
      transform={shape.rot ? `rotate(${n(shape.rot)} ${n(shape.c.x)} ${n(shape.c.y)})` : undefined}
    />
  );
}

const FIT_MARGIN = 2;
const SMALL_BOLD = 1.2;

export function Figure({ move, t, size, tone, equipment, weights = true, fit, label, className }: FigureProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const colours = TONES[tone];
  const { box, origin, ground, layers } = scene(move, t);
  // Under 60 px the limbs are drawn a little heavier, as a sign's small sizes are, so they hold up on a phone.
  const bold = size < 60 ? SMALL_BOLD : 1;
  const crop = fit ? bounds(move, fit, equipment, weights, bold) : null;
  const view = crop
    ? { x: crop.x - FIT_MARGIN, y: crop.y - FIT_MARGIN, w: crop.w + 2 * FIT_MARGIN, h: crop.h + 2 * FIT_MARGIN }
    : { x: 0, y: 0, w: box, h: box };
  const hair = view.h / Math.max(1, size); // one screen pixel, in figure units
  const gap = Math.min(4.5, Math.max(2.5, 0.7 * hair)); // the gap around a shape that passes in front
  const wanted = (shape: Shape) => (equipment || !shape.eq) && (weights || !shape.weight);
  const paint = (shapes: Shape[]) => shapes.filter(wanted).map((shape, i) => draw(shape, i, colours[shape.tone], hair, bold));

  const masks: ReactNode[] = [];
  let drawn: ReactNode[] = [];
  layers.forEach((layer, index) => {
    const cutters = layer.filter((shape) => shape.halo && wanted(shape));
    if (index > 0 && cutters.length > 0) {
      const maskId = `${id}-m${index}`;
      masks.push(
        <mask key={maskId} id={maskId} maskUnits="userSpaceOnUse" x={-box} y={-box} width={2 * box} height={2 * box}>
          <rect x={-box} y={-box} width={2 * box} height={2 * box} fill="#fff" />
          {cutters.map((shape, i) => draw(shape, i, '#000', hair, bold, gap))}
        </mask>,
      );
      drawn = [<g key={`under-${index}`} mask={`url(#${maskId})`}>{drawn}</g>];
    }
    drawn.push(<g key={`layer-${index}`}>{paint(layer)}</g>);
  });

  return (
    <svg
      className={className} width={n((size * view.w) / view.h)} height={size} viewBox={`${n(view.x)} ${n(view.y)} ${n(view.w)} ${n(view.h)}`}
      overflow={crop ? 'visible' : undefined}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false" data-lifter={move}
    >
      {masks.length > 0 && <defs>{masks}</defs>}
      {/* The rig works with y up; this turns it over onto the page. */}
      <g transform={`translate(${origin.x} ${origin.y}) scale(1 -1)`}>
        {paint(ground)}
        {drawn}
      </g>
    </svg>
  );
}
