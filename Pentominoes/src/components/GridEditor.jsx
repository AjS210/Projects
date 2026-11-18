import React, { useState } from 'react';
import {
  Eraser,
  Undo2,
  Check,
  CircleCheck,
  ClipboardPaste,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Dialog, Notice } from './Dialog.jsx';
import { Board } from './Board.jsx';
import { BLANK, LETTERS, PIECES, parseGrids, validateBoard } from '../core/puzzle.js';

export function GridEditor({ cells, onClose, onApply }) {
  const [draft, setDraft] = useState(cells),
    [brush, setBrush] = useState('F'),
    [history, setHistory] = useState([]);
  const [paste, setPaste] = useState(''),
    [error, setError] = useState(''),
    [showPaste, setShowPaste] = useState(false);
  const check = validateBoard(draft);
  const update = (next) => {
    if (next === draft) return;
    setHistory((prev) => [...prev.slice(-99), draft]);
    setDraft(next);
  };
  const paint = (i, l) => update(draft.slice(0, i) + l + draft.slice(i + 1));
  const undo = () => {
    if (history.length) {
      setDraft(history.at(-1));
      setHistory(history.slice(0, -1));
    }
  };
  const load = () => {
    try {
      const grids = parseGrids(paste);
      if (grids.length !== 1)
        throw new Error('Paste one grid here. Use Collection to import several at once.');
      update(grids[0]);
      setShowPaste(false);
      setPaste('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Dialog
      title="Edit solution grid"
      eyebrow="GRID EDITOR"
      wide
      description="Choose a piece, then tap cells to paint. You can also focus a cell and type its letter."
      onClose={onClose}
    >
      <div className="brush-palette" aria-label="Piece brushes">
        {LETTERS.map((l) => (
          <button
            key={l}
            aria-label={`Paint with ${l}`}
            aria-pressed={brush === l}
            className={`brush ${brush === l ? 'selected' : ''}`}
            style={{ '--piece-fill': PIECES[l].color, '--piece-ink': PIECES[l].ink }}
            onClick={() => setBrush(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="editor-tools">
        <button
          className={`text-btn ${brush === '.' ? 'active-tool' : ''}`}
          onClick={() => setBrush('.')}
          aria-pressed={brush === '.'}
        >
          <Eraser size={14} />
          Erase
        </button>
        <button className="text-btn" disabled={!history.length} onClick={undo}>
          <Undo2 size={14} />
          Undo
        </button>
        <button
          className="text-btn editor-clear"
          disabled={draft === BLANK}
          onClick={() => update(BLANK)}
        >
          <Trash2 size={13} />
          Clear grid
        </button>
      </div>
      <div className="board-stage editor-stage">
        <Board cells={draft} onPaint={(i) => paint(i, brush)} onType={paint} />
      </div>
      <div className={`editor-validation ${check.valid ? 'valid' : ''}`} role="status">
        <CircleCheck size={15} />
        {check.found} of 12 piece shapes verified
      </div>
      {!check.valid && (
        <p className="invalid-list">
          Check:{' '}
          {LETTERS.filter((l) => !check.pieces[l].valid)
            .map((l) => `${l} (${check.pieces[l].count}/5)`)
            .join(' · ')}
        </p>
      )}
      <button
        className="text-btn paste-toggle"
        onClick={() => setShowPaste(!showPaste)}
        aria-expanded={showPaste}
      >
        <ClipboardPaste size={14} />
        Paste a grid from Sheets
        <ChevronDown size={13} />
      </button>
      {showPaste && (
        <div className="paste-editor">
          <textarea
            aria-label="Grid letters"
            placeholder="Paste six rows of ten letters…"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          {error && <Notice error>{error}</Notice>}
          <button className="btn btn-light" onClick={load}>
            Use pasted grid
          </button>
        </div>
      )}
      <div className="dialog-actions">
        <button className="btn btn-light" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => onApply(draft)}>
          <Check size={16} />
          Apply changes
        </button>
      </div>
    </Dialog>
  );
}
