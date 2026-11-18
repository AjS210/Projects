import React from 'react';
import { ChevronDown, Layers, LayoutGrid } from 'lucide-react';
import { CATALOGUE_SIZE, SOURCE_INDEX, X_GROUPS } from '../core/catalogue.js';
import { PIECES } from '../core/puzzle.js';

export function XPosition({ group }) {
  const x = Number(group.slice(1)) - 1,
    y = group.charCodeAt(0) - 65;
  return (
    <svg className="x-position" viewBox="0 0 10 6" aria-hidden="true">
      <rect
        x=".05"
        y=".05"
        width="9.9"
        height="5.9"
        rx=".3"
        fill="var(--well)"
        stroke="var(--line-strong)"
        strokeWidth=".1"
      />
      <path
        d="M1 0v6 M2 0v6 M3 0v6 M4 0v6 M5 0v6 M6 0v6 M7 0v6 M8 0v6 M9 0v6 M0 1h10 M0 2h10 M0 3h10 M0 4h10 M0 5h10"
        stroke="var(--line)"
        strokeWidth=".08"
      />
      <path
        transform={`translate(${x} ${y})`}
        d="M0 -1h1v1h1v1H1v1H0V1h-1V0h1z"
        fill={PIECES.X.color}
      />
      <circle cx={x + 0.5} cy={y + 0.5} r=".2" fill={PIECES.X.ink} />
    </svg>
  );
}
export function XGroupFilter({ group, counts, total, onChange }) {
  return (
    <details className="x-groups">
      <summary>
        <span>
          <Layers size={15} />
          X-piece groups
        </span>
        <span className="x-group-current">
          {group
            ? `${group} · ${counts[group] || 0} / ${X_GROUPS[group]}`
            : `${total} / ${CATALOGUE_SIZE.toLocaleString()}`}
          <ChevronDown size={14} />
        </span>
      </summary>
      <div className="x-group-body">
        <p>
          Each diagram shows X reflected toward the upper left. B3 means its center is in row B,
          column 3. Choose a group to see your finds out of the possible solutions.
        </p>
        <div className="x-group-options" role="group" aria-label="Filter by X-piece position">
          <button type="button" aria-pressed={!group} onClick={() => onChange('')}>
            <LayoutGrid size={25} aria-hidden="true" />
            <strong>All groups</strong>
            <small>
              {total} / {CATALOGUE_SIZE.toLocaleString()}
            </small>
          </button>
          {Object.entries(X_GROUPS).map(([id, possible]) => (
            <button
              type="button"
              key={id}
              aria-pressed={group === id}
              onClick={() => onChange(id)}
            >
              <XPosition group={id} />
              <strong>{id}</strong>
              <small>
                {counts[id] || 0} / {possible}
              </small>
            </button>
          ))}
        </div>
        <p>
          Numbering and group totals:{' '}
          <a href={SOURCE_INDEX} target="_blank" rel="noreferrer">
            Isomer Design’s 6 × 10 catalogue
          </a>
          .
        </p>
      </div>
    </details>
  );
}
