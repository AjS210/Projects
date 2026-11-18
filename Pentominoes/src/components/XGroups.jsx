import React from 'react';
import { ChevronDown, Layers, LayoutGrid } from 'lucide-react';
import { catalogueFor } from '../catalogue.js';
import { getBoard, DEFAULT_BOARD } from '../core/boards.js';
import { PIECES } from '../core/puzzle.js';

export function XPosition({ group, boardId = DEFAULT_BOARD }) {
  const board = getBoard(boardId), x = Number(group.slice(1)) - 1, y = group.charCodeAt(0) - 65;
  return (
    <svg className="x-position" viewBox={`0 0 ${board.width} ${board.height}`} aria-hidden="true">
      {Array.from({ length: board.width * board.height }, (_, i) => <rect key={i} x={i % board.width} y={Math.floor(i / board.width)} width="1" height="1" fill="var(--well)" stroke="var(--line)" strokeWidth=".06" />)}
      {board.blocked.map(([bx, by]) => <rect key={`${bx}-${by}`} x={bx} y={by} width="1" height="1" fill="#747b7d" />)}
      <path transform={`translate(${x} ${y})`} d="M0 -1h1v1h1v1H1v1H0V1h-1V0h1z" fill={PIECES.X.color} />
      <circle cx={x + 0.5} cy={y + 0.5} r=".2" fill={PIECES.X.ink} />
    </svg>
  );
}
export function XGroupFilter({ group, counts, total, onChange, boardId = DEFAULT_BOARD }) {
  const catalogue = catalogueFor(boardId), board = getBoard(boardId);
  return (
    <details className="x-groups">
      <summary>
        <span><Layers size={15} /> X-piece groups</span>
        <span className="x-group-current">
          {group ? `${group} · ${counts[group] || 0} / ${catalogue.groups[group]}` : `${total} / ${catalogue.total.toLocaleString()}`}
          <ChevronDown size={14} />
        </span>
      </summary>
      <div className="x-group-body">
        <p>Each diagram shows X in an equivalent position for this frame. B3 means its center is in row B, column 3. Choose a group to see your finds out of the possible solutions.</p>
        <div className="x-group-options" role="group" aria-label="Filter by X-piece position">
          <button type="button" aria-pressed={!group} onClick={() => onChange('')}>
            <LayoutGrid size={25} aria-hidden="true" /><strong>All groups</strong><small>{total} / {catalogue.total.toLocaleString()}</small>
          </button>
          {Object.entries(catalogue.groups).map(([id, possible]) => (
            <button type="button" key={id} aria-pressed={group === id} onClick={() => onChange(id)}>
              <XPosition group={id} boardId={boardId} /><strong>{id}</strong><small>{counts[id] || 0} / {possible}</small>
            </button>
          ))}
        </div>
        <p>Numbering and group totals: <a href={`https://isomerdesign.com/Pentomino/${catalogue.source}/index.html`} target="_blank" rel="noreferrer">Isomer Design’s {board.name} catalogue</a>.</p>
      </div>
    </details>
  );
}
