import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArrowUpRight,
  BookmarkPlus,
  Check,
  ClipboardCopy,
  Download,
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
import { formatDate, packRecords } from '../core/collection.js';
import { XGroupFilter, XPosition } from './XGroups.jsx';
import { DEFAULT_BOARD, getBoard } from '../core/boards.js';
import { FramePicker } from './FramePicker.jsx';

export function Collection({ records, onImport, onOpen, onScan }) {
  const [search, setSearch] = useState(''),
    [limit, setLimit] = useState(12),
    [group, setGroup] = useState(''),
    [boardId, setBoardId] = useState(DEFAULT_BOARD),
    [choosingFrame, setChoosingFrame] = useState(false);
  const frameRecords = useMemo(() => records.filter((r) => (r.boardId ?? DEFAULT_BOARD) === boardId), [records, boardId]);
  const { sorted, counts } = useMemo(() => {
    const counts = {};
    for (const { reference } of frameRecords)
      counts[reference.group] = (counts[reference.group] || 0) + 1;
    return { sorted: [...frameRecords].sort((a, b) => a.reference.number - b.reference.number), counts };
  }, [frameRecords]);
  const query = search.trim().toLowerCase(),
    number = /^(?:solution\s+#|#)?(\d+)$/.exec(query);
  const filtered = sorted.filter(
    (r) =>
      (!group || r.reference.group === group) &&
      (number
        ? r.reference.number === Number(number[1])
        : r.name.toLowerCase().includes(query) ||
          Boolean(r.previousName?.toLowerCase().includes(query))),
  );
  function changeGroup(id) {
    setGroup(id);
    setLimit(12);
  }
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
          <span className="number-pill">{frameRecords.length}</span>
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
      <div className="collection-frame-row">
        <strong>{getBoard(boardId).name}</strong>
        <button className="btn btn-light" type="button" onClick={() => setChoosingFrame(true)}>Change Frame</button>
      </div>
      <XGroupFilter key={boardId} boardId={boardId} group={group} counts={counts} total={frameRecords.length} onChange={changeGroup} />
      {frameRecords.length > 0 && (
        <div className="search-box">
          <Search size={16} />
          <input
            aria-label="Search solutions"
            placeholder="Search by number or earlier name…"
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
      {!frameRecords.length ? (
        <div className="empty-collection">
          <div className="empty-symbol">
            <Archive size={30} />
          </div>
          <h3>A place for your unique solves.</h3>
          <p>
            Play or scan your first board, or import the grids you already have in Google Sheets.
          </p>
          <button className="btn btn-primary" onClick={onScan}>
            Open workspace
            <ArrowUpRight size={15} />
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="empty-collection small">
          <Search size={26} />
          <h3>No solutions found</h3>
          <p>
            {group
              ? `No saved boards match in X group ${group}.`
              : 'Try a different solution number or earlier name.'}
          </p>
          <button
            className="btn btn-light"
            onClick={() => {
              setSearch('');
              changeGroup('');
            }}
          >
            Show all saved solutions
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
                <Board cells={r.cells} boardId={r.boardId} labels={false} letters={false} />
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
        Equivalent orientations within the same frame count as one solution.
      </div>
      {choosingFrame && <FramePicker current={boardId} title="Choose a collection frame" eyebrow="COLLECTION" description="Choose which frame’s saved solutions to view. Your game board will not change." onClose={() => setChoosingFrame(false)} onChoose={(id) => { setBoardId(id); setSearch(''); changeGroup(''); setChoosingFrame(false); }} />}
    </section>
  );
}
export function SaveDialog({ cells, reference, onClose, onSave }) {
  const [error, setError] = useState('');
  return (
    <Dialog
      title={`Save ${reference.name}`}
      eyebrow="COLLECTION"
      description="This number comes from the Isomer Design catalogue. Your board is saved in the orientation you played."
      onClose={onClose}
    >
      <div className="save-preview">
        <div>
          <Board cells={cells} boardId={reference.boardId} labels={false} letters={false} />
        </div>
        <span>
          <span className="small-label">VERIFIED BOARD</span>
          <strong>X group {reference.group}</strong>
          <small>
            <ShieldCheck size={13} />
            All 12 pieces verified
          </small>
        </span>
      </div>
      {error && <Notice error>{error}</Notice>}
      <div className="dialog-actions">
        <button className="btn btn-light" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            try {
              onSave();
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <BookmarkPlus size={15} />
          Save to collection
        </button>
      </div>
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
      await navigator.clipboard.writeText(asTable(record.cells, getBoard(record.boardId).width, getBoard(record.boardId).height));
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
        <Board cells={record.cells} boardId={record.boardId} />
      </div>
      <div className="detail-meta">
        <span>
          <XPosition group={record.reference.group} boardId={record.boardId} />X group {record.reference.group}
        </span>
        <span>
          <ShieldCheck size={14} />
          12 verified pieces
        </span>
      </div>
      {record.previousName && <p className="previous-name">Earlier name: {record.previousName}</p>}
      {fallback && (
        <>
          <label className="field-label" htmlFor="copy-data">
            Select and copy this grid into Sheets
          </label>
          <textarea
            id="copy-data"
            className="grid-paste"
            value={asTable(record.cells, getBoard(record.boardId).width, getBoard(record.boardId).height)}
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
