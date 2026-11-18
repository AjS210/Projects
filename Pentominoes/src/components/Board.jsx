import React, { useId, useRef, useState } from 'react';
import { PIECES, LETTERS } from '../core/puzzle.js';

// A single SVG keeps the cell edges and coordinates aligned at every screen size.
export function Board({
  cells,
  highlight = null,
  labels = true,
  letters = true,
  onPaint,
  onType,
  className = '',
}) {
  const desc = useId(),
    svg = useRef(null);
  const [focused, setFocused] = useState(0);
  const u = 40,
    x0 = labels ? 23 : 1,
    y0 = labels ? 21 : 1;
  const view = labels ? '0 0 430 270' : '0 0 402 242';
  const handleKey = (e, i) => {
    if (!onPaint) return;
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: 10, ArrowUp: -10 }[e.key];
    if (delta !== undefined) {
      e.preventDefault();
      svg.current?.querySelector(`[data-cell="${Math.max(0, Math.min(59, i + delta))}"]`)?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPaint(i);
    } else if (
      LETTERS.includes(e.key.toUpperCase()) ||
      e.key === 'Backspace' ||
      e.key === 'Delete'
    ) {
      e.preventDefault();
      onType?.(i, LETTERS.includes(e.key.toUpperCase()) ? e.key.toUpperCase() : '.');
    }
  };
  return (
    <svg
      ref={svg}
      className={`puzzle-board ${className}`}
      viewBox={view}
      role={onPaint ? 'group' : 'img'}
      aria-labelledby={desc}
      aria-describedby={onPaint ? undefined : `${desc}-rows`}
    >
      <title id={desc}>
        {onPaint
          ? 'Editable solution grid. Choose a piece and click a cell, or focus a cell and type its letter.'
          : 'Six-row, ten-column pentomino solution grid'}
      </title>
      {!onPaint && (
        <desc id={`${desc}-rows`}>
          {Array.from(
            { length: 6 },
            (_, y) =>
              `Row ${String.fromCharCode(65 + y)}: ${[...cells.slice(y * 10, y * 10 + 10)].map((l) => (l === '.' ? 'empty' : l)).join(' ')}.`,
          ).join(' ')}
        </desc>
      )}
      {labels && (
        <g className="axis-labels" textAnchor="middle" dominantBaseline="central">
          {Array.from({ length: 10 }, (_, x) => (
            <text key={x} x={x0 + (x + 0.5) * u} y="8">
              {x + 1}
            </text>
          ))}
          {Array.from({ length: 6 }, (_, y) => (
            <text key={y} x="8" y={y0 + (y + 0.5) * u}>
              {String.fromCharCode(65 + y)}
            </text>
          ))}
        </g>
      )}
      {Array.from(cells, (l, i) => {
        const x = x0 + (i % 10) * u,
          y = y0 + Math.floor(i / 10) * u,
          piece = PIECES[l];
        return (
          <g
            key={i}
            className={onPaint ? 'paint-cell' : ''}
            data-cell={i}
            opacity={highlight && highlight !== l ? 0.25 : 1}
            role={onPaint ? 'button' : undefined}
            tabIndex={onPaint ? (focused === i ? 0 : -1) : undefined}
            onFocus={onPaint ? () => setFocused(i) : undefined}
            aria-label={
              onPaint
                ? `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}: ${piece ? l : 'empty'}`
                : undefined
            }
            onClick={onPaint ? () => onPaint(i) : undefined}
            onKeyDown={onPaint ? (e) => handleKey(e, i) : undefined}
          >
            <rect
              className="cell-square"
              x={x}
              y={y}
              width={u}
              height={u}
              fill={piece?.color || 'var(--well)'}
              stroke={piece?.ink || 'var(--line-strong)'}
              strokeWidth=".7"
              strokeOpacity=".42"
            />
            {letters && (
              <text
                className="cell-letter"
                x={x + u / 2}
                y={y + u / 2 + 0.4}
                textAnchor="middle"
                dominantBaseline="central"
                fill={piece?.ink || 'var(--quiet)'}
              >
                {piece ? l : '·'}
              </text>
            )}
          </g>
        );
      })}
      <g
        fill="none"
        stroke="var(--canvas)"
        strokeWidth="1.8"
        strokeOpacity=".57"
        strokeLinejoin="round"
        pointerEvents="none"
      >
        {[...cells].map((l, i) => {
          const col = i % 10,
            row = Math.floor(i / 10),
            x = x0 + col * u,
            y = y0 + row * u;
          let path = '';
          if (col && cells[i - 1] !== l) path += `M${x} ${y}v40`;
          if (row && cells[i - 10] !== l) path += `M${x} ${y}h40`;
          return path ? <path key={i} d={path} /> : null;
        })}
        <rect x={x0} y={y0} width="400" height="240" rx="1.5" />
      </g>
    </svg>
  );
}
