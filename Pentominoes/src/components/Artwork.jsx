import React from 'react';
import { PIECES, pointsFor } from '../core/puzzle.js';

const markUrl = `${import.meta.env.BASE_URL}brand/mark.svg`;

export function BrandMark({ size = 38 }) {
  return (
    <img
      className="brand-mark"
      src={markUrl}
      alt=""
      width={Math.round((size * 2) / 3)}
      height={size}
    />
  );
}

function Blocks({ letter, unit = 8 }) {
  const points = pointsFor(letter),
    color = PIECES[letter].color;
  const seen = new Set(points.map(([x, y]) => `${x},${y}`));
  let outer = '';
  for (const [x, y] of points) {
    const X = x * unit,
      Y = y * unit,
      u = unit;
    if (!seen.has(`${x},${y - 1}`)) outer += `M${X},${Y}h${u}`;
    if (!seen.has(`${x + 1},${y}`)) outer += `M${X + u},${Y}v${u}`;
    if (!seen.has(`${x},${y + 1}`)) outer += `M${X + u},${Y + u}h${-u}`;
    if (!seen.has(`${x - 1},${y}`)) outer += `M${X},${Y + u}v${-u}`;
  }
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {points.map(([x, y]) => (
        <rect
          key={`${x},${y}`}
          x={x * unit}
          y={y * unit}
          width={unit}
          height={unit}
          fill={color}
          stroke={PIECES[letter].ink}
          strokeOpacity=".34"
          strokeWidth=".55"
        />
      ))}
      <path
        d={outer}
        fill="none"
        stroke={PIECES[letter].ink}
        strokeOpacity=".68"
        strokeWidth=".8"
      />
    </g>
  );
}
export function PieceIcon({ letter, size = 34 }) {
  const shape = PIECES[letter].shape,
    w = shape[0].length * 8,
    h = shape.length * 8;
  return (
    <svg width={size} height={size} viewBox="0 0 44 38" className="piece-icon" aria-hidden="true">
      <g transform={`translate(${(44 - w) / 2} ${(38 - h) / 2})`}>
        <Blocks letter={letter} unit={8} />
      </g>
    </svg>
  );
}
// An enlarged proof of the very same mark used in the header, footer and icons.
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="figure-caption">
        <b>FIG. P</b>
        <span>Nine-piece mark</span>
      </div>
      <svg className="mark-study" viewBox="0 0 124 106" fill="none">
        <defs>
          <pattern id="study-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r=".8" fill="var(--line-strong)" />
          </pattern>
        </defs>
        <rect x="1" y="1" width="122" height="104" rx="3" fill="url(#study-dots)" />
        <path d="M2 11V2h9m102 0h9v9m0 84v9h-9m-102 0H2v-9" stroke="var(--line-strong)" />
        <image href={markUrl} x="34" y="11" width="56" height="84" />
      </svg>
    </div>
  );
}
