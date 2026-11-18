import React, { useState } from 'react';
import { ArrowUpRight, Import } from 'lucide-react';
import { Dialog, Notice } from './Dialog.jsx';

export function PhotoBoardsDialog({ boards, photo, active, onChoose, onImport, onClose }) {
  const [error, setError] = useState('');
  return (
    <Dialog
      title={`${boards.length} boards found`}
      eyebrow="SCREENSHOT READER"
      description="Tap a board to review it in the scanner, or import them together. Only fully visible, verified boards are shown."
      onClose={onClose}
    >
      <div className="found-boards">
        {boards.map((b, i) => {
          const [left, top] = b.corners[0],
            [right, bottom] = b.corners[2];
          return (
            <button
              key={i}
              className={`found-board ${active === i ? 'current' : ''}`}
              aria-label={`Review board ${i + 1}`}
              onClick={() => onChoose(i)}
            >
              <svg
                viewBox={`${left * photo.width} ${top * photo.height} ${(right - left) * photo.width} ${(bottom - top) * photo.height}`}
                aria-hidden="true"
              >
                <image href={photo.url} width={photo.width} height={photo.height} />
              </svg>
              <span>
                Board {i + 1}
                <ArrowUpRight size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="found-hint">
        Bulk import uses the original verified boards. Mirrored or already saved solutions are
        skipped.
      </p>
      {error && <Notice error>{error}</Notice>}
      <div className="dialog-actions">
        <button className="btn btn-light" onClick={onClose}>
          Close
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            try {
              onImport();
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <Import size={15} />
          Import all {boards.length}
        </button>
      </div>
    </Dialog>
  );
}
