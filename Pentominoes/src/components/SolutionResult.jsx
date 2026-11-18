import React from 'react';
import {
  ArrowUpRight,
  BookmarkPlus,
  Layers,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { lookupSolution } from '../catalogue.js';
import { frameVariants } from '../core/catalogue.js';
import { variants } from '../core/puzzle.js';
import { getBoard, DEFAULT_BOARD } from '../core/boards.js';

// Scanned grids and finished games take exactly the same catalogue/save path.
export function SolutionResult({
  cells,
  boardId = DEFAULT_BOARD,
  busy = false,
  hasPhoto = false,
  saveLabel = 'Save solution',
  collection,
  onSave,
  onView,
}) {
  const reference = lookupSolution(cells, boardId);
  const match =
    reference && collection.records.find((r) => (r.boardId ?? DEFAULT_BOARD) === boardId && r.reference.number === reference.number);
  const matchType =
    match &&
    (boardId === DEFAULT_BOARD
      ? ['Exact match', 'Left–right mirror', 'Top–bottom mirror', '180° rotation'][variants(match.cells).indexOf(cells)]
      : match.cells === cells.replaceAll('#', '.') ? 'Exact match' : frameVariants(match.cells, getBoard(boardId)).includes(cells.replaceAll('#', '.')) ? 'Equivalent orientation' : 'Exact match');
  const [state, Icon, title, detail] = busy
    ? ['busy', LoaderCircle, 'Reading your photo', 'Looking for the twelve piece shapes.']
    : !reference
      ? [
          'review',
          TriangleAlert,
          'Review needed',
          hasPhoto
            ? 'Adjust the grid to one complete board, or edit the cells.'
            : 'Cover every square without overlapping pieces.',
        ]
      : collection.error
        ? [
            'unavailable',
            TriangleAlert,
            'Check unavailable',
            'Your local collection could not be read.',
          ]
        : match
          ? [
              'match',
              Layers,
              reference.name,
              `Already saved · X group ${reference.group} · ${matchType}`,
            ]
          : ['unique', ShieldCheck, reference.name, `New to you · X group ${reference.group}`];
  return (
    <div className={`result-row result-${state}`} aria-live="polite">
      <span className="result-icon">
        <Icon size={21} className={busy ? 'spin' : undefined} />
      </span>
      <div className="result-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      {state === 'match' ? (
        <button className="btn btn-primary result-cta" onClick={() => onView(match)}>
          View entry <ArrowUpRight size={15} />
        </button>
      ) : (
        <button
          className="btn btn-primary result-cta"
          disabled={state !== 'unique'}
          onClick={() => onSave(cells.replaceAll('#', '.'), { ...reference, boardId })}
        >
          <BookmarkPlus size={15} /> {saveLabel}
        </button>
      )}
    </div>
  );
}
