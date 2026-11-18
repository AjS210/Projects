import React, { useState } from 'react';
import {
  Archive,
  ArrowUpRight,
  BookmarkPlus,
  Check,
  ClipboardCopy,
  Download,
  Grid2X2,
  Import,
  Layers,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Board } from './Board.jsx';
import { Dialog, Notice } from './Dialog.jsx';
import { asTable } from '../core/puzzle.js';
import { defaultName, formatDate, packRecords } from '../core/collection.js';

export function Collection({ records, onImport, onOpen, onScan }) {
  const [search, setSearch] = useState(''),
    [limit, setLimit] = useState(12);
  const filtered = records.filter((r) =>
    r.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  function download() {
    const url = URL.createObjectURL(new Blob([packRecords(records)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pentolog-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="panel collection-panel" aria-labelledby="saved-title">
      <div className="collection-heading">
        <div className="section-title">
          <span className="heading-icon">
            <Layers size={18} />
          </span>
          <h2 id="saved-title">Saved solutions</h2>
          <span className="number-pill">{records.length}</span>
        </div>
        <div className="collection-tools">
          <button
            className="btn btn-light"
            onClick={download}
            disabled={!records.length}
            title="Download a collection backup"
          >
            <Download size={15} />
            Export
          </button>
          <button className="btn btn-primary" onClick={onImport}>
            <Import size={15} />
            Import grids
          </button>
        </div>
      </div>
      {records.length > 0 && (
        <div className="search-box">
          <Search size={16} />
          <input
            aria-label="Search solutions"
            placeholder="Search solutions by name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(12);
            }}
          />
          {search && (
            <button className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {!records.length ? (
        <div className="empty-collection">
          <div className="empty-symbol">
            <Archive size={30} />
          </div>
          <h3>A place for your unique solves.</h3>
          <p>
            Save your first board from the scanner, or bring over the grids you already have in
            Google Sheets.
          </p>
          <button className="btn btn-primary" onClick={onScan}>
            Open scanner
            <ArrowUpRight size={15} />
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="empty-collection small">
          <Search size={26} />
          <h3>No solutions found</h3>
          <p>Try a different name, or clear your search.</p>
          <button className="btn btn-light" onClick={() => setSearch('')}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="collection-list">
          {filtered.slice(0, limit).map((r) => (
            <button
              type="button"
              className="entry-card"
              key={r.id}
              aria-label={`Open solution: ${r.name}`}
              title={r.name}
              onClick={() => onOpen(r)}
            >
              <span className="entry-board" aria-hidden="true">
                <Board cells={r.cells} labels={false} letters={false} />
              </span>
            </button>
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <div className="more-entries">
          <button className="btn btn-light" onClick={() => setLimit(limit + 12)}>
            Show more solutions
          </button>
          <span>
            {limit} of {filtered.length} shown
          </span>
        </div>
      )}
      <div className="collection-foot">
        <ShieldCheck size={14} />
        Identical boards, reflections, and half-turns count as one solution.
      </div>
    </section>
  );
}
export function SaveDialog({ cells, next, onClose, onSave }) {
  const [name, setName] = useState(defaultName(next)),
    [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give this solution a name.');
      return;
    }
    try {
      onSave(name.trim());
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Dialog
      title="Save your solution"
      eyebrow="COLLECTION"
      description="Give this verified grid a name so you can find it again."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="save-preview">
          <div>
            <Board cells={cells} labels={false} letters={false} />
          </div>
          <span>
            <span className="small-label">VERIFIED BOARD</span>
            <strong>6 × 10 pentominoes</strong>
            <small>
              <ShieldCheck size={13} />
              All 12 pieces verified
            </small>
          </span>
        </div>
        <label className="field-label" htmlFor="solution-name">
          Solution name
        </label>
        <input
          id="solution-name"
          className="text-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          autoFocus
          onFocus={(e) => e.target.select()}
        />
        {error && <Notice error>{error}</Notice>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit">
            <BookmarkPlus size={15} />
            Save to collection
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function EntryDialog({ record, onClose, onRemove }) {
  const [confirm, setConfirm] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState(''),
    [fallback, setFallback] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(asTable(record.cells));
      setCopied(true);
    } catch {
      setFallback(true);
    }
  }
  return (
    <Dialog
      title={record.name}
      eyebrow="SAVED SOLUTION"
      wide
      description={`Saved ${formatDate(record.createdAt)} on this device.`}
      onClose={onClose}
    >
      <div className="board-stage detail-stage">
        <Board cells={record.cells} />
      </div>
      <div className="detail-meta">
        <span>
          <Grid2X2 size={14} />6 × 10 board
        </span>
        <span>
          <ShieldCheck size={14} />
          12 verified pieces
        </span>
      </div>
      {fallback && (
        <>
          <label className="field-label" htmlFor="copy-data">
            Select and copy this grid into Sheets
          </label>
          <textarea
            id="copy-data"
            className="grid-paste"
            value={asTable(record.cells)}
            readOnly
            onFocus={(e) => e.target.select()}
            autoFocus
          />
        </>
      )}
      {error && <Notice error>{error}</Notice>}
      {confirm ? (
        <div className="delete-confirm">
          <p>Remove this solution from your collection?</p>
          <div>
            <button className="btn btn-light" onClick={() => setConfirm(false)}>
              Keep it
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                try {
                  onRemove(record.id);
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Remove solution
            </button>
          </div>
        </div>
      ) : (
        <div className="dialog-actions">
          <button className="text-btn danger-text" onClick={() => setConfirm(true)}>
            <Trash2 size={14} />
            Remove
          </button>
          <button className="btn btn-light" onClick={copy}>
            {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}{' '}
            {copied ? 'Copied for Sheets' : 'Copy grid for Sheets'}
          </button>
        </div>
      )}
    </Dialog>
  );
}
