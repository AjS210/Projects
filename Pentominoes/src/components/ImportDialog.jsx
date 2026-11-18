import React, { useEffect, useRef, useState } from 'react';
import {
  FileUp,
  ClipboardPaste,
  FileSpreadsheet,
  Image as ImageIcon,
  LoaderCircle,
  Import,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { Dialog, Notice } from './Dialog.jsx';
import { Board } from './Board.jsx';
import { lookupSolution } from '../catalogue.js';
import {
  EXPORT_HELP,
  IMPORT_TYPES,
  exportLink,
  readGridText,
  readImportFile,
} from '../core/importFiles.js';

function ShortcutHelp({ link }) {
  return (
    <div className="shortcut-help">
      <strong>This is a link to a Google Sheet, not the cells.</strong>
      <p>
        Download an Excel copy, then choose the .xlsx file here. You can keep the sheet private.
      </p>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-light">
          <Download size={15} />
          Download .xlsx from Google
        </a>
      ) : (
        <p>{EXPORT_HELP}</p>
      )}
    </div>
  );
}
export function ImportDialog({ onClose, onImport }) {
  const [tab, setTab] = useState('file'),
    [text, setText] = useState(''),
    [error, setError] = useState(''),
    [filename, setFilename] = useState('');
  const [stage, setStage] = useState(null),
    [busy, setBusy] = useState(false),
    [drag, setDrag] = useState(false);
  const input = useRef(null),
    request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  async function read(file) {
    if (!file) return;
    request.current?.abort();
    const ctl = new AbortController();
    request.current = ctl;
    setTab('file');
    setStage(null);
    setError('');
    setFilename(file.name);
    setBusy(true);
    try {
      const result = await readImportFile(file, ctl.signal);
      if (!ctl.signal.aborted) setStage(result);
    } catch (err) {
      if (!ctl.signal.aborted)
        setError(
          err instanceof SyntaxError
            ? 'The file is not a valid PentoLog backup, workbook or grid.'
            : err.message,
        );
    } finally {
      if (!ctl.signal.aborted) setBusy(false);
    }
  }
  function changeTab(t) {
    request.current?.abort();
    setBusy(false);
    setError('');
    setTab(t);
  }
  const shortcut = tab === 'paste' ? exportLink(text) : null;
  const submit = (e) => {
    e.preventDefault();
    try {
      const records = tab === 'file' ? stage?.records : readGridText(text);
      if (!records?.length) throw new Error('Choose a workbook or image, or paste a grid first.');
      onImport(records, tab === 'file' ? stage?.source : undefined);
    } catch (err) {
      setError(err instanceof SyntaxError ? 'The backup is not valid JSON.' : err.message);
    }
  };
  const records = stage?.records;
  return (
    <Dialog
      title="Import solution grids"
      eyebrow="BRING YOUR COLLECTION"
      description="Bring over whole sheets or board screenshots. Only complete, verified 6 × 10 boards are imported."
      onClose={onClose}
    >
      <div className="import-switch" aria-label="Import method">
        <button aria-pressed={tab === 'file'} onClick={() => changeTab('file')}>
          <FileUp size={15} />
          File or photo
        </button>
        <button aria-pressed={tab === 'paste'} onClick={() => changeTab('paste')}>
          <ClipboardPaste size={15} />
          Paste or link
        </button>
      </div>
      <form onSubmit={submit}>
        {tab === 'file' ? (
          <>
            <input
              ref={input}
              type="file"
              accept={IMPORT_TYPES}
              className="visually-hidden"
              tabIndex="-1"
              aria-label="Choose grid or backup file"
              onChange={(e) => {
                const f = e.target.files[0];
                e.target.value = '';
                read(f);
              }}
            />
            <button
              type="button"
              className={`import-drop ${drag ? 'drag-over' : ''}`}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                read(e.dataTransfer.files[0]);
              }}
            >
              <span className="upload-icon">
                {busy ? <LoaderCircle size={21} className="spin" /> : <FileUp size={21} />}
              </span>
              <span>
                <strong>
                  {busy
                    ? 'Reading file…'
                    : filename
                      ? 'Choose a different file'
                      : 'Choose a workbook or image'}
                </strong>
                <small>{filename || 'XLSX, ODS, JPG, PNG, CSV or PentoLog backup'}</small>
              </span>
            </button>
            {stage?.kind === 'shortcut' && <ShortcutHelp link={stage.link} />}
            {records && (
              <div className="import-review">
                <div className="import-count" role="status">
                  {stage.kind === 'image' ? <ImageIcon size={17} /> : <FileSpreadsheet size={17} />}
                  <strong>
                    {records.length} verified board{records.length === 1 ? '' : 's'} found
                  </strong>
                </div>
                <div className="import-samples">
                  {records.slice(0, 4).map((r, i) => (
                    <div key={i}>
                      <Board cells={r.cells} labels={false} letters={false} />
                      <small title={r.name}>{lookupSolution(r.cells)?.name}</small>
                    </div>
                  ))}
                </div>
                <p>
                  {records.length > 4 ? `Showing the first 4 of ${records.length}. ` : ''}Nothing is
                  saved until you import.
                  {stage.kind === 'image' &&
                    ' To revisit the photo, use Collection Upload → Review last upload in Workspace.'}
                </p>
              </div>
            )}
            <details className="sheet-help">
              <summary>How do I import my Google Sheet?</summary>
              <p>
                {EXPORT_HELP} On a computer use <b>File → Download → Microsoft Excel (.xlsx)</b>.
              </p>
              <p>
                Side-by-side and stacked boards are supported. Cell labels or solid fill colors
                identify the pieces. You can also choose a .gsheet shortcut to get its export link.
              </p>
            </details>
          </>
        ) : (
          <>
            <label htmlFor="import-data" className="field-label">
              Grid data or Google Sheets link
            </label>
            <textarea
              id="import-data"
              className="grid-paste"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError('');
              }}
              placeholder="Paste a Sheets range, a table of boards, a backup, or your sheet link…"
            />
            {shortcut && (
              <>
                <ShortcutHelp link={shortcut} />
                <button type="button" className="text-btn" onClick={() => changeTab('file')}>
                  Choose the exported file
                </button>
              </>
            )}
          </>
        )}
        <div className="import-note">
          <ShieldCheck size={16} />
          Incomplete boards are left out. Exact and mirrored duplicates are skipped when saving.
        </div>
        {error && <Notice error>{error}</Notice>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || (tab === 'file' ? !records?.length : !text.trim() || !!shortcut)}
          >
            <Import size={15} />
            Import solutions
          </button>
        </div>
      </form>
    </Dialog>
  );
}
