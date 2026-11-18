import React, { useState } from 'react';
import {
  Aperture,
  ChevronDown,
  CircleCheck,
  Grid3X3,
  Layers,
  LoaderCircle,
  Maximize2,
  Pencil,
  Scan,
  Shapes,
} from 'lucide-react';
import { Board } from './Board.jsx';
import { PieceIcon } from './Artwork.jsx';
import { LETTERS, validateBoard } from '../core/puzzle.js';
import { Dialog, Notice } from './Dialog.jsx';
import { SolutionResult } from './SolutionResult.jsx';

export function UploadReviewDialog({
  photo,
  photoBoards,
  corners,
  boardIndex,
  onChooseBoard,
  cells,
  collection,
  busy,
  error,
  onClose,
  onAlign,
  onExpand,
  onEdit,
  onSave,
  onView,
}) {
  const [highlight, setHighlight] = useState(null),
    [saveError, setSaveError] = useState('');
  const check = validateBoard(cells);
  const boardLabel =
    boardIndex < 0 ? 'Custom frame' : `Board ${boardIndex + 1} of ${photoBoards.length}`;
  return (
    <Dialog
      title="Review upload"
      eyebrow="COLLECTION UPLOAD"
      wide
      className="upload-review"
      description="Check the reading before you save. Nothing is added to your collection automatically."
      onClose={onClose}
    >
      {error && <Notice error>{error}</Notice>}
      {!photo && busy && (
        <div className="reading-progress" role="status">
          <LoaderCircle className="spin" size={20} /> Opening your image…
        </div>
      )}
      {photo && (
        <div className="review-content" aria-busy={busy}>
          <div className="scan-source">
            <svg aria-hidden="true" viewBox={`0 0 ${photo.width} ${photo.height}`}>
              <image href={photo.url} width={photo.width} height={photo.height} />
              <polygon
                points={corners.map(([x, y]) => `${x * photo.width},${y * photo.height}`).join(' ')}
                fill="none"
                stroke="var(--accent-hover)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span>
              <small>SOURCE PHOTO</small>
              <strong title={photo.name}>{photo.name}</strong>
            </span>
            <button className="text-btn" disabled={busy} onClick={onExpand}>
              <Maximize2 size={14} />
              View photo
            </button>
          </div>
          {photoBoards.length > 1 && (
            <div className="review-boards">
              <strong>{boardLabel}</strong>
              <button className="text-btn" disabled={busy} onClick={onChooseBoard}>
                <Layers size={15} />
                Choose from {photoBoards.length} boards
              </button>
            </div>
          )}
          <div className="board-stage">
            <Board cells={cells} highlight={highlight} />
            {busy && (
              <div className="grid-working">
                <LoaderCircle size={22} className="spin" />
              </div>
            )}
          </div>
          <div className="grid-toolbar">
            <div className="grid-facts">
              <span className="dimensions">
                <Grid3X3 size={13} />6 × 10
              </span>
              <span className="fact-line" />
              <span className={`piece-count ${check.valid ? 'valid' : ''}`}>
                {check.valid ? <CircleCheck size={14} /> : <Aperture size={14} />}
                <span>{busy ? 'Reading…' : `${check.found}/12 pieces`}</span>
              </span>
            </div>
            <div className="review-tools">
              <button className="btn btn-light" onClick={onAlign} disabled={busy}>
                <Scan size={14} />
                Adjust grid
              </button>
              <button className="btn btn-light" onClick={onEdit} disabled={busy}>
                <Pencil size={14} />
                Edit cells
              </button>
            </div>
          </div>
          <details
            className="scan-reference"
            onToggle={(e) => {
              if (!e.currentTarget.open) setHighlight(null);
            }}
          >
            <summary>
              <Shapes size={16} />
              Piece reference
              <ChevronDown size={14} />
            </summary>
            <p>Select a piece to highlight it on the solution grid.</p>
            <div className="palette-list">
              {LETTERS.map((l) => (
                <button
                  key={l}
                  className={`piece-tile ${highlight === l ? 'is-selected' : ''}`}
                  aria-pressed={highlight === l}
                  aria-label={`Highlight ${l} piece`}
                  onClick={() => setHighlight(highlight === l ? null : l)}
                >
                  <PieceIcon letter={l} />
                  <span>{l}</span>
                </button>
              ))}
            </div>
          </details>
          {saveError && <Notice error>{saveError}</Notice>}
          <SolutionResult
            cells={cells}
            busy={busy}
            hasPhoto
            collection={collection}
            saveLabel="Save to collection"
            onSave={(...args) => {
              try {
                onSave(...args);
              } catch (err) {
                setSaveError(err.message);
              }
            }}
            onView={onView}
          />
        </div>
      )}
      <div className="review-dismiss">
        <button className="btn btn-light" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
