import React from 'react';
import { PIECES, pointsFor } from '../core/puzzle.js';

export function BrandMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path d="M2 4.8A2.8 2.8 0 0 1 4.8 2H21v10H12v10H2Z" fill="#7761D0" />
      <path d="M22.5 2H29a2.8 2.8 0 0 1 2.8 2.8v6.1h-9.3Z" fill="#BEADEE" />
      <path d="M13.5 13.5h18.3V20a2.8 2.8 0 0 1-2.8 2.8H13.5Z" fill="#8F7DD8" />
      <path d="M2 23.5h10v8.3H4.8A2.8 2.8 0 0 1 2 29Z" fill="#5543A8" />
    </svg>
  );
}

function Blocks({ letter, unit = 10, raised = false }) {
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
      {raised && (
        <g transform="translate(0.9 2.8)">
          {points.map(([x, y]) => (
            <rect
              key={`${x},${y}`}
              x={x * unit}
              y={y * unit}
              width={unit}
              height={unit}
              fill={color}
              stroke="#626174"
              strokeWidth="1.2"
            />
          ))}
        </g>
      )}
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
          strokeWidth={raised ? 1 : 0.55}
        />
      ))}
      <path
        d={outer}
        fill="none"
        stroke={raised ? '#555365' : PIECES[letter].ink}
        strokeOpacity={raised ? 0.85 : 0.68}
        strokeWidth={raised ? 1.25 : 0.8}
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
export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 293 115" fill="none" aria-hidden="true">
      <defs>
        <pattern id="artDots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r=".9" fill="#a3a4b6" />
        </pattern>
        <radialGradient id="artFade">
          <stop offset=".2" stopColor="white" />
          <stop offset="1" stopColor="black" />
        </radialGradient>
        <mask id="artMask">
          <ellipse cx="151" cy="59" rx="158" ry="68" fill="url(#artFade)" />
        </mask>
      </defs>
      <rect width="293" height="115" fill="url(#artDots)" mask="url(#artMask)" opacity=".62" />
      <g transform="translate(42 41) rotate(-14 22 22)">
        <Blocks letter="T" unit={15.5} raised />
      </g>
      <g transform="translate(126 21) rotate(13 20 26)">
        <Blocks letter="F" unit={15.5} raised />
      </g>
      <g transform="translate(205 46) rotate(-9 21 21)">
        <Blocks letter="W" unit={15.5} raised />
      </g>
      <g stroke="#9d9aa9" strokeWidth="1.1">
        <path d="M23 31v6m-3-3h6m80 50v6m-3-3h6m91-62v6m-3-3h6m67 46v6m-3-3h6" />
      </g>
    </svg>
  );
}
