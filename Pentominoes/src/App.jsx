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
  Gamepad2,
  BookmarkPlus,
  HardDrive,
  BookOpen,
} from 'lucide-react';
import { BrandMark } from './components/Artwork.jsx';
import { CollectionUpload } from './components/CollectionUpload.jsx';
import { UploadReviewDialog } from './components/UploadReviewDialog.jsx';
import { Board } from './components/Board.jsx';
import { GameBoard } from './components/GameBoard.jsx';
import { readFrameDrafts, writeFrameDrafts } from './core/gameDraft.js';
import { newGame } from './core/game.js';
import { Dialog, Notice } from './components/Dialog.jsx';
import { AlignDialog, PhotoDialog } from './components/PhotoDialogs.jsx';
import { GridEditor } from './components/GridEditor.jsx';
import { Collection, SaveDialog, EntryDialog } from './components/Collection.jsx';
import { BLANK, SAMPLE } from './core/puzzle.js';
import { writeCollection, STORE } from './core/collection.js';
import { readCollection, mergeRecords } from './catalogue.js';
import { ImportDialog } from './components/ImportDialog.jsx';
import { PhotoBoardsDialog } from './components/PhotoBoardsDialog.jsx';
import { FULL_FRAME } from './core/recognition.js';
import { boardAtFrame, rememberReview } from './core/photoFrames.js';
import { openPhoto, scanPhoto } from './core/photo.js';

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
  const [play, setPlay] = useState(readFrameDrafts),
    [saveDraft, setSaveDraft] = useState(null);
  const game = play.games[play.active];
  // Persist a valid legacy tab draft even before the player makes another move.
  useEffect(() => { writeFrameDrafts(play); }, []);
  const [photo, setPhoto] = useState(null),
    [cells, setCells] = useState(BLANK),
    [corners, setCorners] = useState(FULL_FRAME);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [modal, setModal] = useState(null),
    [opened, setOpened] = useState(null);
  const [photoBoards, setPhotoBoards] = useState([]);
  const boardIndex = useMemo(() => boardAtFrame(photoBoards, corners), [photoBoards, corners]);
  const [toast, setToast] = useState(null);
  const controller = useRef(null);
  function stopReading() {
    if (!controller.current) return;
    controller.current.abort();
    controller.current = null;
    setBusy(false);
    setError('Reading stopped. Use Adjust grid to read the photo again.');
  }
  useEffect(() => {
    const navigate = () => {
      stopReading();
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
    document.title = `PentoLog — ${tab === 'collection' ? 'Solution collection' : 'Puzzle workspace'}`;
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
  const openEntry = (r, back = null) => {
    setOpened({ id: r.id, back });
    setModal('entry');
  };
  const record = local.records.find((r) => r.id === opened?.id);
  function showReading(reading) {
    setCells(reading.cells);
    setCorners(reading.corners);
  }
  function loadDetections(result) {
    setPhotoBoards(result.boards || []);
    showReading(result);
  }
  async function readBoard({ file, frame }) {
    if (!file && !photo) return;
    controller.current?.abort();
    const ctl = new AbortController();
    controller.current = ctl;
    setModal('review');
    if (file) {
      // Never offer the previous board for confirmation while decoding a new file.
      setPhoto(null);
      setPhotoBoards([]);
      setCorners(FULL_FRAME);
      setCells(BLANK);
    }
    setBusy(true);
    setError('');
    try {
      let currentPhoto = photo;
      if (file) {
        currentPhoto = await openPhoto(file);
        ctl.signal.throwIfAborted();
        setPhoto(currentPhoto);
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
      }
    } catch (err) {
      if (!ctl.signal.aborted)
        setError(err.message || 'The image could not be read. Try a different photo.');
    } finally {
      if (controller.current === ctl) controller.current = null;
      if (!ctl.signal.aborted) setBusy(false);
    }
  }
  const upload = (file) => readBoard({ file });
  const review = () => setModal('review');
  const cancelReview = () => {
    stopReading();
    close();
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
  function updateGame(next) {
    const state = { active: next.boardId, games: { ...play.games, [next.boardId]: next } };
    setPlay(state);
    writeFrameDrafts(state);
  }
  function switchGame(id) {
    const state = { active: id, games: { ...play.games, [id]: play.games[id] ?? newGame(id) } };
    setPlay(state);
    writeFrameDrafts(state);
  }
  function requestSave(cells, reference) {
    // Snapshot the chosen board: a photo read and a game need not be the same solve.
    setSaveDraft({ cells, reference });
    setModal('save');
  }
  function saveCells(cells, reference) {
    const { records, added } = mergeRecords(latest(), [{ cells, boardId: reference.boardId }]);
    store(records);
    close();
    notify(
      added
        ? `${reference.name} saved to your collection.`
        : 'This solution is already in your collection.',
    );
  }
  function importRecords(incoming, source) {
    const { records, added, skipped } = mergeRecords(latest(), incoming);
    store(records);
    // A Collection image import can also be reviewed in Workspace this session.
    // Never save photos to storage or reset an existing review of the same image.
    if (source && (busy || photo?.url !== source.photo.url)) {
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
          <span className="nav-divider" aria-hidden="true" />
          <nav className="primary-nav" aria-label="Main navigation">
            <a
              href="#workspace"
              className={tab === 'workspace' ? 'active' : ''}
              aria-current={tab === 'workspace' ? 'page' : undefined}
            >
              <ScanLine size={16} />
              Gameboard
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
        </div>
      </header>
      <main className={`shell main-content ${tab}`} id="main" tabIndex="-1">
        {local.error && <Notice error>{local.error}</Notice>}
        {tab === 'workspace' ? (
          <div className="work-panels">
            <GameBoard
              game={game}
              onChange={updateGame}
              onSwitchFrame={switchGame}
              collection={local}
              onSave={requestSave}
              onView={openEntry}
            />
            <CollectionUpload photo={photo} onUpload={upload} onReview={review} />
          </div>
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
            <BrandMark size={20} />
            PentoLog<span className="footer-slash">/</span>
            <span>Solver workspace</span>
          </span>
          <span>
            <ShieldCheck size={14} />
            Private by design. Photos stay on your device.
          </span>
        </footer>
      </main>
      {modal === 'guide' && (
        <Dialog
          title="A quick guide to PentoLog"
          eyebrow="THE WORKBENCH MANUAL"
          description="Play with digital pieces or scan a physical puzzle. The lid’s pack-away grid is available here when you need it."
          onClose={close}
        >
          <ol className="guide-steps">
            <li>
              <span>
                <Gamepad2 size={18} />
              </span>
              <div>
                <h3>Play the 6 × 10 board</h3>
                <p>
                  Drag a piece onto the board, or tap its card to add it in the middle. The flip and
                  rotate buttons turn the selected board piece. Pieces can overlap while you work;
                  tap a card to bring that piece on top, then drag it or tap its destination. With a
                  keyboard, choose a card, arrow to a square and press Enter. To finish, cover all
                  sixty squares without overlap.
                </p>
              </div>
            </li>
            <li>
              <span>
                <Camera size={18} />
              </span>
              <div>
                <h3>Capture your board</h3>
                <p>
                  In Collection Upload, open the image picker and choose a photo, or take one if
                  your device offers a camera. Include the whole 6 × 10 board in even light.
                  Screenshots with multiple complete boards work too.
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
                  The upload opens for review. Choose Adjust grid to move or resize the frame, then
                  Read grid to check the new reading. Edit cells corrects individual letters. Save
                  to collection when the reading is right, or cancel without saving.
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
                  Each verified grid gets its Isomer Design number and X-piece group. Mirrored
                  boards and half-turns share a number. Only the boards you save or import count
                  toward your collection.
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
            <button className="text-btn" onClick={() => setModal('lid')}>
              <BookOpen size={14} />
              View lid solution
            </button>
            <button className="btn btn-primary" onClick={close}>
              Got it
              <Check size={15} />
            </button>
          </div>
        </Dialog>
      )}
      {modal === 'lid' && (
        <Dialog
          title="Pack-away grid"
          eyebrow="LID REFERENCE"
          description="Solution #2182 · X group B3"
          onClose={close}
        >
          <div className="board-stage detail-stage">
            <Board cells={SAMPLE} />
          </div>
          <div className="dialog-actions">
            <button className="btn btn-light" onClick={() => setModal('guide')}>
              Back to guide
            </button>
            <button className="btn btn-primary" onClick={close}>
              Done
            </button>
          </div>
        </Dialog>
      )}
      {modal === 'review' && (
        <UploadReviewDialog
          photo={photo}
          photoBoards={photoBoards}
          corners={corners}
          boardIndex={boardIndex}
          onChooseBoard={() => setModal('boards')}
          cells={cells}
          collection={local}
          busy={busy}
          error={error}
          onClose={cancelReview}
          onAlign={() => setModal('align')}
          onExpand={() => setModal('photo')}
          onEdit={() => setModal('edit')}
          onSave={saveCells}
          onView={(r) => openEntry(r, 'review')}
        />
      )}
      {modal === 'boards' && photo && photoBoards.length > 1 && (
        <PhotoBoardsDialog
          boards={photoBoards}
          photo={photo}
          active={boardIndex}
          onClose={review}
          onChoose={(i) => {
            showReading(photoBoards[i].review ?? photoBoards[i]);
            review();
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
      {modal === 'align' && photo && (
        <AlignDialog
          photo={photo}
          corners={corners}
          boards={photoBoards}
          onClose={review}
          onRead={(frame) => readBoard({ frame })}
        />
      )}
      {modal === 'photo' && photo && (
        <PhotoDialog photo={photo} onClose={review} onAlign={() => setModal('align')} />
      )}
      {modal === 'edit' && photo && (
        <GridEditor
          cells={cells}
          onClose={review}
          onApply={(draft) => {
            if (draft !== cells)
              setPhotoBoards((boards) => rememberReview(boards, { cells: draft, corners }));
            setCells(draft);
            review();
          }}
        />
      )}
      {modal === 'save' && saveDraft && (
        <SaveDialog
          {...saveDraft}
          onClose={close}
          onSave={() => saveCells(saveDraft.cells, saveDraft.reference)}
        />
      )}
      {modal === 'import' && <ImportDialog onClose={close} onImport={importRecords} />}
      {modal === 'entry' && record && (
        <EntryDialog
          record={record}
          onClose={() => setModal(opened.back)}
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
