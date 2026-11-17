import React, { useRef, useState } from 'react';
import {
  Camera,
  Grid2X2,
  Maximize2,
  Aperture,
  UploadCloud,
  Scan,
  Grid3X3,
  Pencil,
  CircleCheck,
  BookmarkPlus,
  Layers,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  ArrowUpRight,
  Shapes,
  X,
} from 'lucide-react';
import { Board } from './Board.jsx';
import { PieceIcon } from './Artwork.jsx';
import { LETTERS, variants } from '../core/puzzle.js';
import { PHOTO_TYPES } from '../core/photo.js';
import { Notice } from './Dialog.jsx';

export function Scanner({
  photo,
  photoBoards,
  boardIndex,
  onChooseBoard,
  cells,
  check,
  match,
  busy,
  error,
  collectionError,
  onUpload,
  onCamera,
  onAlign,
  onExpand,
  onEdit,
  onSave,
  onView,
}) {
  const file = useRef(null),
    dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false),
    [highlight, setHighlight] = useState(null);
  const setPiece = (l) => setHighlight((v) => (v === l ? null : l));
  const state = busy
    ? 'busy'
    : !check.valid
      ? 'review'
      : collectionError
        ? 'unavailable'
        : match
          ? 'match'
          : 'unique';
  const matchType = match
    ? ['Exact match', 'Left–right mirror', 'Top–bottom mirror', '180° rotation'][
        variants(match.cells).indexOf(cells)
      ]
    : '';
  const StatusIcon = {
    busy: LoaderCircle,
    review: TriangleAlert,
    unavailable: TriangleAlert,
    match: Layers,
    unique: ShieldCheck,
  }[state];
  return (
    <>
      {error && <Notice error>{error}</Notice>}
      <div className="work-panels">
        <section
          className={`panel photo-panel ${dragging ? 'is-dragging' : ''}`}
          aria-labelledby="photo-title"
          onDragEnter={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            dragDepth.current++;
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (--dragDepth.current <= 0) {
              dragDepth.current = 0;
              setDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]);
          }}
        >
          <div className="panel-heading">
            <div className="section-title">
              <span className="heading-icon">
                <Camera size={18} />
              </span>
              <h2 id="photo-title">Solution photo</h2>
            </div>
            <span className="stage-label">
              01 <span>/</span> INPUT
            </span>
          </div>
          <div className="photo-content">
            <div className="photo-stage">
              <img
                src={photo.url}
                alt={
                  photo.sample
                    ? 'A finished twelve-piece wooden pentomino puzzle in a maple tray on a tabletop'
                    : 'Your uploaded pentomino board'
                }
                className={`input-photo ${photo.sample ? '' : 'user-photo'}`}
              />
              {photoBoards.length > 1 && (
                <svg
                  className="board-outline"
                  viewBox={`0 0 ${photo.width} ${photo.height}`}
                  aria-hidden="true"
                >
                  <polygon
                    points={photoBoards[boardIndex].corners
                      .map(([x, y]) => `${x * photo.width},${y * photo.height}`)
                      .join(' ')}
                    fill="none"
                    stroke="#f1df87"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}
              <div className="photo-caption">
                <span className="photo-indicator" />
                {photoBoards.length > 1
                  ? `Board ${boardIndex + 1} of ${photoBoards.length}`
                  : photo.sample
                    ? 'Sample photo'
                    : 'Your photo'}
              </div>
              <button
                type="button"
                className="photo-expand"
                aria-label="Expand photo"
                title="Expand photo"
                onClick={onExpand}
              >
                <Maximize2 size={16} />
              </button>
              {busy && (
                <div className="scan-scrim">
                  <span className="scan-light" />
                  <span>
                    <LoaderCircle className="spin" size={16} /> Reading board
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              className="visually-hidden"
              tabIndex="-1"
              aria-label="Upload solution photo"
              ref={file}
              accept={PHOTO_TYPES}
              onChange={(e) => {
                if (e.target.files[0]) onUpload(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <button className="upload-zone" onClick={() => file.current?.click()}>
              <span className="upload-icon">
                <UploadCloud size={22} />
              </span>
              <span className="upload-copy">
                <strong>
                  {dragging ? 'Drop your photo here' : 'Upload a photo or screenshot'}
                </strong>
                <span>
                  Drag & drop or <em>browse files</em>
                </span>
              </span>
              <span className="filetypes">JPG, PNG, WEBP</span>
            </button>
            {photoBoards.length > 1 && (
              <button className="board-switch btn btn-light" onClick={onChooseBoard}>
                <Layers size={15} />
                Choose from {photoBoards.length} boards
              </button>
            )}
            <div className="photo-actions">
              <button className="btn btn-light" onClick={onCamera}>
                <Camera size={15} />
                Use camera
              </button>
              <button className="btn btn-light" disabled={busy} onClick={onAlign}>
                <Scan size={15} />
                Adjust frame
              </button>
            </div>
          </div>
        </section>
        <section className="panel grid-panel" aria-busy={busy} aria-labelledby="grid-title">
          <div className="panel-heading">
            <div className="section-title">
              <span className="heading-icon">
                <Grid2X2 size={17} />
              </span>
              <h2 id="grid-title">Solution grid</h2>
            </div>
            <span className="stage-label">
              02 <span>/</span> OUTPUT
            </span>
          </div>
          <div className="grid-content">
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
              <button className="text-btn edit-button" onClick={onEdit} disabled={busy}>
                <Pencil size={13} />
                Edit grid
              </button>
            </div>
          </div>
          <div className={`result-row result-${state}`} aria-live="polite">
            <span className="result-icon">
              <StatusIcon size={21} className={busy ? 'spin' : undefined} />
            </span>
            <div className="result-copy">
              <strong>
                {
                  {
                    busy: 'Reading your photo',
                    review: 'Review needed',
                    unavailable: 'Check unavailable',
                    match: 'Already in collection',
                    unique: 'Unique solution',
                  }[state]
                }
              </strong>
              <span>
                {
                  {
                    busy: 'Looking for the twelve piece shapes.',
                    review: 'Crop to one full board, adjust the frame, or edit cells.',
                    unavailable: 'Your local collection could not be read.',
                    match: `${matchType}: “${match?.name}”`,
                    unique: 'No matching or mirrored solution found.',
                  }[state]
                }
              </span>
            </div>
            {match && !busy && check.valid ? (
              <button className="btn btn-primary result-cta" onClick={onView}>
                View entry
                <ArrowUpRight size={15} />
              </button>
            ) : (
              <button
                className="btn btn-primary result-cta"
                disabled={busy || !check.valid || Boolean(collectionError)}
                onClick={onSave}
              >
                <BookmarkPlus size={15} />
                Save solution
              </button>
            )}
          </div>
        </section>
      </div>
      <section className="panel palette-panel" aria-labelledby="palette-title">
        <div className="palette-heading">
          <div className="section-title">
            <Shapes className="palette-heading-icon" size={19} />
            <h2 id="palette-title">Piece reference</h2>
            <span className="piece-set-label">12 PIECES</span>
          </div>
          {highlight ? (
            <button className="text-btn" onClick={() => setHighlight(null)}>
              Clear highlight
              <X size={13} />
            </button>
          ) : (
            <span className="palette-hint">Select a piece to highlight it on the grid.</span>
          )}
        </div>
        <div className="palette-list">
          {LETTERS.map((l) => (
            <button
              key={l}
              className={`piece-tile ${highlight === l ? 'is-selected' : ''}`}
              aria-pressed={highlight === l}
              aria-label={`Highlight ${l} piece`}
              title={`Highlight the ${l} pentomino`}
              onClick={() => setPiece(l)}
            >
              <PieceIcon letter={l} />
              <span>{l}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
