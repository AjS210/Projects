import React, { useRef, useState } from 'react';
import {
  Aperture,
  Camera,
  ChevronDown,
  CircleCheck,
  Grid2X2,
  Grid3X3,
  Layers,
  LoaderCircle,
  Maximize2,
  Pencil,
  Scan,
  Shapes,
  UploadCloud,
} from 'lucide-react';
import { Board } from './Board.jsx';
import { PieceIcon } from './Artwork.jsx';
import { LETTERS, validateBoard } from '../core/puzzle.js';
import { PHOTO_TYPES } from '../core/photo.js';
import { Notice } from './Dialog.jsx';
import { SolutionResult } from './SolutionResult.jsx';

export function Scanner({
  photo,
  photoBoards,
  corners,
  boardIndex,
  onChooseBoard,
  cells,
  collection,
  busy,
  error,
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
  const check = validateBoard(cells);
  const photoLabel =
    photoBoards.length > 1
      ? boardIndex < 0
        ? 'Custom frame'
        : `Board ${boardIndex + 1} of ${photoBoards.length}`
      : photo?.name;
  return (
    <section
      className={`panel grid-panel ${dragging ? 'is-dragging' : ''}`}
      aria-busy={busy}
      aria-labelledby="grid-title"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDragLeave={() => {
        if (dragDepth.current > 0 && --dragDepth.current === 0) setDragging(false);
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
            <Grid2X2 size={17} />
          </span>
          <h2 id="grid-title">Solution grid</h2>
        </div>
        <span className="stage-label">
          02 <span>/</span> SCAN
        </span>
      </div>
      <div className="grid-content">
        {photo && (
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
              <strong>{photoLabel}</strong>
            </span>
            <button className="text-btn" disabled={busy} onClick={onExpand}>
              <Maximize2 size={14} />
              View photo
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
          <button className="text-btn edit-button" onClick={onEdit} disabled={busy}>
            <Pencil size={13} />
            Edit grid
          </button>
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
            <strong>{dragging ? 'Drop your photo here' : 'Upload a photo or screenshot'}</strong>
            <span>
              Drag & drop or <em>browse files</em>
            </span>
          </span>
          <span className="filetypes">JPG, PNG, WEBP</span>
        </button>
        {photoBoards.length > 1 && (
          <button className="board-switch btn btn-light" onClick={onChooseBoard} disabled={busy}>
            <Layers size={15} />
            Choose from {photoBoards.length} boards
          </button>
        )}
        <div className="photo-actions">
          <button className="btn btn-light" onClick={onCamera}>
            <Camera size={15} />
            Use camera
          </button>
          <button
            className="btn btn-light"
            disabled={busy || !photo}
            title={photo ? undefined : 'Upload or take a photo to adjust its frame'}
            onClick={onAlign}
          >
            <Scan size={15} />
            Adjust frame
          </button>
        </div>
        {error && <Notice error>{error}</Notice>}
      </div>
      <SolutionResult
        cells={cells}
        busy={busy}
        hasPhoto={Boolean(photo)}
        collection={collection}
        onSave={onSave}
        onView={onView}
      />
    </section>
  );
}
