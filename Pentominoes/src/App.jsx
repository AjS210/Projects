import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanLine,
  Layers,
  CircleHelp,
  ShieldCheck,
  Check,
  X,
  Camera,
  Grid2X2,
  BookmarkPlus,
  HardDrive,
  RotateCcw,
} from 'lucide-react';
import { BrandMark, HeroArt } from './components/Artwork.jsx';
import { Scanner } from './components/Scanner.jsx';
import { Dialog, Notice } from './components/Dialog.jsx';
import { AlignDialog, CameraDialog, PhotoDialog } from './components/PhotoDialogs.jsx';
import { GridEditor } from './components/GridEditor.jsx';
import { Collection, SaveDialog, EntryDialog } from './components/Collection.jsx';
import {
  BLANK,
  SAMPLE,
  SAMPLE_FRAME,
  SAMPLE_PHOTO,
  canonicalKey,
  validateBoard,
} from './core/puzzle.js';
import { readCollection, writeCollection, mergeRecords, STORE } from './core/collection.js';
import { ImportDialog } from './components/ImportDialog.jsx';
import { PhotoBoardsDialog } from './components/PhotoBoardsDialog.jsx';
import { FULL_FRAME } from './core/recognition.js';
import { boardAtFrame, rememberReview } from './core/photoFrames.js';
import { openPhoto, scanPhoto, PHOTO_TYPES } from './core/photo.js';

function readLocal() {
  try {
    return { records: readCollection(), error: '' };
  } catch {
    return {
      records: [],
      error:
        'Your local collection could not be opened. Check that this browser allows site storage before saving.',
    };
  }
}
const tabFromUrl = () => (location.hash === '#collection' ? 'collection' : 'workspace');
export default function App() {
  const [tab, setTab] = useState(tabFromUrl),
    [local, setLocal] = useState(readLocal);
  const [photo, setPhoto] = useState(SAMPLE_PHOTO),
    [cells, setCells] = useState(SAMPLE),
    [corners, setCorners] = useState(SAMPLE_FRAME);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [modal, setModal] = useState(null),
    [opened, setOpened] = useState(null);
  const [photoBoards, setPhotoBoards] = useState([]);
  const boardIndex = useMemo(() => boardAtFrame(photoBoards, corners), [photoBoards, corners]);
  const [toast, setToast] = useState(null);
  const controller = useRef(null),
    nativeCamera = useRef(null),
    cameraFile = useRef(null);
  const check = useMemo(() => validateBoard(cells), [cells]);
  const match = useMemo(() => {
    if (!check.valid) return null;
    const key = canonicalKey(cells);
    return local.records.find((r) => canonicalKey(r.cells) === key);
  }, [local.records, cells, check.valid]);
  useEffect(() => {
    const navigate = () => {
      setTab(tabFromUrl());
      setModal(null);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    const storage = (e) => {
      if (e.key === STORE || e.key === null) setLocal(readLocal());
    };
    window.addEventListener('hashchange', navigate);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('storage', storage);
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    document.title = `PentoLog — ${tab === 'collection' ? 'Solution collection' : 'Solution scanner'}`;
  }, [tab]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = (text) => setToast({ text });
  const close = () => setModal(null);
  const go = (target) => {
    location.hash = target;
  };
  const openEntry = (r) => {
    setOpened(r.id);
    setModal('entry');
  };
  const record = local.records.find((r) => r.id === opened);
  function showReading(reading) {
    setCells(reading.cells);
    setCorners(reading.corners);
  }
  function loadDetections(result) {
    setPhotoBoards(result.boards || []);
    showReading(result);
  }
  async function readBoard({ file, frame }) {
    controller.current?.abort();
    const ctl = new AbortController();
    controller.current = ctl;
    close();
    setBusy(true);
    setError('');
    try {
      let currentPhoto = photo;
      if (file) {
        currentPhoto = await openPhoto(file);
        ctl.signal.throwIfAborted();
        setPhotoBoards([]);
        setPhoto(currentPhoto);
        setCells(BLANK);
        setCorners(FULL_FRAME);
      } else if (frame) {
        // Show the submitted region immediately. If the worker fails, retry from
        // this location instead of showing the old board's letters or frame.
        setCorners(frame);
        setCells(BLANK);
      }
      const result = await scanPhoto(currentPhoto, frame, ctl.signal);
      ctl.signal.throwIfAborted();
      if (frame) {
        // A requested-region scan returns one reading, not a new catalogue.
        // Keep all jump targets and apply these pixels at their actual location.
        setPhotoBoards((boards) => rememberReview(boards, result));
        showReading(result);
      } else {
        loadDetections(result);
        if (result.boards?.length > 1) {
          setModal('boards');
          return;
        }
      }
      notify(
        result.found === 12
          ? 'All 12 piece shapes recognized.'
          : `${result.found} of 12 pieces recognized. Review the frame and grid.`,
      );
    } catch (err) {
      if (!ctl.signal.aborted)
        setError(err.message || 'The image could not be read. Try a different photo.');
    } finally {
      if (!ctl.signal.aborted) setBusy(false);
    }
  }
  const upload = (file) => readBoard({ file });
  const takePhoto = () => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) nativeCamera.current?.click();
    else setModal('camera');
  };
  function store(records) {
    try {
      writeCollection(records);
    } catch {
      throw new Error(
        'Could not save on this device. Storage may be full or disabled. Export a backup before clearing anything.',
      );
    }
    setLocal({ records, error: '' });
  }
  function latest() {
    try {
      return readCollection();
    } catch {
      throw new Error('Your collection could not be read. No saved data has been changed.');
    }
  }
  function save(name) {
    if (!check.valid || busy) throw new Error('Verify all twelve pieces before saving.');
    const { records, added } = mergeRecords(latest(), [{ name, cells }]);
    store(records);
    close();
    notify(
      added
        ? `“${name}” saved to your collection.`
        : 'This solution is already in your collection.',
    );
  }
  function importRecords(incoming, source) {
    const { records, added, skipped } = mergeRecords(latest(), incoming);
    store(records);
    // A Collection image import can also be reviewed in Workspace this session.
    // Never save photos to storage or reset an existing review of the same image.
    if (source && (busy || photo.url !== source.photo.url)) {
      controller.current?.abort();
      setBusy(false);
      setError('');
      setPhoto(source.photo);
      loadDetections(source.result);
    }
    close();
    notify(
      `${added} solution${added === 1 ? '' : 's'} added${skipped ? ` · ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}.`,
    );
  }
  function resetSample() {
    controller.current?.abort();
    setBusy(false);
    setPhotoBoards([]);
    setPhoto(SAMPLE_PHOTO);
    setCorners(SAMPLE_FRAME);
    setCells(SAMPLE);
    setError('');
    close();
    go('workspace');
    notify('Lid solution loaded.');
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="brand" href="#workspace" aria-label="PentoLog workspace">
            <BrandMark />
            <span>PentoLog</span>
          </a>
          <span className="nav-divider" />
          <nav className="primary-nav" aria-label="Main navigation">
            <a
              href="#workspace"
              className={tab === 'workspace' ? 'active' : ''}
              aria-current={tab === 'workspace' ? 'page' : undefined}
            >
              <ScanLine size={16} />
              Workspace
            </a>
            <a
              href="#collection"
              className={tab === 'collection' ? 'active' : ''}
              aria-current={tab === 'collection' ? 'page' : undefined}
            >
              <Layers size={16} />
              Collection
              {local.records.length > 0 && (
                <span className="nav-count">{local.records.length}</span>
              )}
            </a>
          </nav>
          <div className="header-end">
            <span className="local-status">
              <i />
              Local workspace
            </span>
            <button className="guide-button" onClick={() => setModal('guide')}>
              <CircleHelp size={16} />
              <span>Quick guide</span>
            </button>
          </div>
        </div>
      </header>
      <main className="shell main-content" id="main" tabIndex="-1">
        <div className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              {tab === 'collection' ? 'PERSONAL ARCHIVE' : 'PENTOMINO TOOLKIT'}
            </div>
            <h1>{tab === 'collection' ? 'Solution collection' : 'Solution scanner'}</h1>
            <p>
              {tab === 'collection'
                ? 'Every original solve, in one place. Mirrored boards count as one.'
                : 'Capture your board, check for duplicates, and collect your unique solutions.'}
            </p>
          </div>
          <HeroArt />
        </div>
        {local.error && <Notice error>{local.error}</Notice>}
        {tab === 'workspace' ? (
          <Scanner
            photo={photo}
            photoBoards={photoBoards}
            corners={corners}
            boardIndex={boardIndex}
            onChooseBoard={() => setModal('boards')}
            cells={cells}
            check={check}
            match={match}
            busy={busy}
            error={error}
            collectionError={local.error}
            onUpload={upload}
            onCamera={takePhoto}
            onAlign={() => setModal('align')}
            onExpand={() => setModal('photo')}
            onEdit={() => setModal('edit')}
            onSave={() => setModal('save')}
            onView={() => openEntry(match)}
          />
        ) : (
          <Collection
            records={local.records}
            onOpen={openEntry}
            onImport={() => setModal('import')}
            onScan={() => go('workspace')}
          />
        )}
        <footer className="site-footer">
          <span className="footer-brand">
            <BrandMark size={15} />
            PentoLog<span className="footer-slash">/</span>
            <span>Solver workspace</span>
          </span>
          <span>
            <ShieldCheck size={14} />
            Private by design. Photos stay on your device.
          </span>
        </footer>
      </main>
      <input
        type="file"
        accept="image/*"
        ref={nativeCamera}
        capture="environment"
        className="visually-hidden"
        tabIndex="-1"
        aria-label="Take a board photo"
        onChange={(e) => {
          if (e.target.files[0]) upload(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        accept={PHOTO_TYPES}
        ref={cameraFile}
        className="visually-hidden"
        tabIndex="-1"
        aria-label="Choose an existing photo"
        onChange={(e) => {
          if (e.target.files[0]) upload(e.target.files[0]);
          e.target.value = '';
        }}
      />
      {modal === 'guide' && (
        <Dialog
          title="A quick guide to PentoLog"
          eyebrow="THE WORKBENCH MANUAL"
          description="PentoLog identifies pieces by shape, not color. To put the puzzle away, load the lid solution below."
          onClose={close}
        >
          <ol className="guide-steps">
            <li>
              <span>
                <Camera size={18} />
              </span>
              <div>
                <h3>Capture your board</h3>
                <p>
                  Photograph a complete 6 × 10 rectangle in even light. You can also upload a JPG of
                  a sheet and choose among its complete boards. Keep all four corners visible.
                  Distinct piece colors or clear seams work best.
                </p>
              </div>
            </li>
            <li>
              <span>
                <Grid2X2 size={18} />
              </span>
              <div>
                <h3>Check the grid</h3>
                <p>
                  In Adjust frame, drag inside the grid to move it, or drag its linked corners to
                  resize it. On a screenshot you can jump to another detected board. Tap Read grid,
                  then use Edit grid to correct any cells.
                </p>
              </div>
            </li>
            <li>
              <span>
                <BookmarkPlus size={18} />
              </span>
              <div>
                <h3>Keep only the originals</h3>
                <p>
                  Save a verified solution to your collection. Left–right mirrors, top–bottom
                  mirrors, and 180° turns all match the same entry.
                </p>
              </div>
            </li>
          </ol>
          <div className="privacy-note">
            <HardDrive size={18} />
            <p>
              <strong>Your collection is local.</strong> Use Export in Collection to back it up.
              Import grids accepts Sheets exports (.xlsx or .ods), screenshots, pasted ranges, and
              PentoLog backups.
            </p>
          </div>
          <div className="dialog-actions">
            <button className="text-btn" onClick={resetSample}>
              <RotateCcw size={14} />
              Load lid solution
            </button>
            <button className="btn btn-primary" onClick={close}>
              Got it
              <Check size={15} />
            </button>
          </div>
        </Dialog>
      )}
      {modal === 'boards' && photoBoards.length > 1 && (
        <PhotoBoardsDialog
          boards={photoBoards}
          photo={photo}
          active={boardIndex}
          onClose={close}
          onChoose={(i) => {
            showReading(photoBoards[i].review ?? photoBoards[i]);
            close();
          }}
          onImport={() =>
            importRecords(
              photoBoards.map((b, i) => ({
                cells: b.cells,
                name: `${photo.name.replace(/\.[^.]+$/, '').slice(0, 55)} · Board ${i + 1}`,
              })),
            )
          }
        />
      )}
      {modal === 'align' && (
        <AlignDialog
          photo={photo}
          corners={corners}
          boards={photoBoards}
          onClose={close}
          onRead={(frame) => readBoard({ frame })}
        />
      )}
      {modal === 'photo' && (
        <PhotoDialog photo={photo} onClose={close} onAlign={() => setModal('align')} />
      )}
      {modal === 'camera' && (
        <CameraDialog
          onClose={close}
          onFile={upload}
          onBrowse={() => {
            close();
            cameraFile.current?.click();
          }}
        />
      )}
      {modal === 'edit' && (
        <GridEditor
          cells={cells}
          onClose={close}
          onApply={(draft) => {
            if (draft !== cells)
              setPhotoBoards((boards) => rememberReview(boards, { cells: draft, corners }));
            setCells(draft);
            close();
            notify('Grid changes applied.');
          }}
        />
      )}
      {modal === 'save' && (
        <SaveDialog cells={cells} next={local.records.length + 1} onClose={close} onSave={save} />
      )}
      {modal === 'import' && <ImportDialog onClose={close} onImport={importRecords} />}
      {modal === 'entry' && record && (
        <EntryDialog
          record={record}
          onClose={close}
          onRemove={(id) => {
            store(latest().filter((r) => r.id !== id));
            close();
            notify('Solution removed from your collection.');
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Check size={14} />
          </span>
          {toast.text}
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
