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
import { variants } from '../core/puzzle.js';

// Scanned grids and finished games take exactly the same catalogue/save path.
export function SolutionResult({ cells, busy = false, collection, onSave, onView }) {
  const reference = lookupSolution(cells);
  const match =
    reference && collection.records.find((r) => r.reference.number === reference.number);
  const matchType =
    match &&
    ['Exact match', 'Left–right mirror', 'Top–bottom mirror', '180° rotation'][
      variants(match.cells).indexOf(cells)
    ];
  const [state, Icon, title, detail] = busy
    ? ['busy', LoaderCircle, 'Reading your photo', 'Looking for the twelve piece shapes.']
    : !reference
      ? [
          'review',
          TriangleAlert,
          'Review needed',
          'Crop to one full board, adjust the frame, or edit cells.',
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
          onClick={() => onSave(cells, reference)}
        >
          <BookmarkPlus size={15} /> Save solution
        </button>
      )}
    </div>
  );
}
