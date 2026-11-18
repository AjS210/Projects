import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../game.css';
import {
  Check,
  FlipHorizontal2,
  FlipVertical2,
  Gamepad2,
  Hand,
  RotateCcw,
  RotateCw,
  Undo2,
} from 'lucide-react';
import { LETTERS, PIECES, pointsFor } from '../core/puzzle.js';
import { BOARDS, DEFAULT_BOARD, getBoard } from '../core/boards.js';
import {
  bringForward,
  gameCells,
  handleSquare,
  newGame,
  pickPiece,
  placePiece,
  sizeOf,
  turnPiece,
} from '../core/game.js';
import { Blocks } from './Artwork.jsx';
import { Dialog } from './Dialog.jsx';
import { SolutionResult } from './SolutionResult.jsx';
import { usePieceDrag } from './usePieceDrag.js';

const UNIT = 8; // artwork units per cell
const transforms = [
  {
    action: 'horizontal',
    label: 'Flip horizontal',
    compact: 'Flip H',
    Icon: FlipVertical2,
    result: 'flipped left to right',
  },
  {
    action: 'vertical',
    label: 'Flip vertical',
    compact: 'Flip V',
    Icon: FlipHorizontal2,
    result: 'flipped top to bottom',
  },
  {
    action: 'rotateCCW',
    label: '90° left',
    compact: 'Left',
    name: 'Rotate 90° left (counterclockwise)',
    Icon: RotateCcw,
    result: 'rotated counterclockwise',
  },
  {
    action: 'rotate',
    label: '90° right',
    compact: 'Right',
    name: 'Rotate 90° right (clockwise)',
    Icon: RotateCw,
    result: 'rotated clockwise',
  },
];
const rowLabel = (y) => String.fromCharCode(65 + y);
const locationName = (x, y) => `${rowLabel(y)}${x + 1}`;
function MarkedPiece({ letter, points, mini = false }) {
  const [x, y] = handleSquare(points);
  return (
    <>
      <Blocks letter={letter} points={points} unit={UNIT} />
      {mini ? (
        <circle cx={(x + 0.5) * UNIT} cy={(y + 0.5) * UNIT} r="1.1" fill={PIECES[letter].ink} />
      ) : (
        <text
          x={(x + 0.5) * UNIT}
          y={(y + 0.5) * UNIT}
          className="piece-monogram"
          fill={PIECES[letter].ink}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {letter}
        </text>
      )}
    </>
  );
}

function DragGhost({ points, preview }) {
  const [w, h] = sizeOf(points);
  return createPortal(
    <div className="game-drag-layer" aria-hidden="true">
      <svg
        className="drag-ghost"
        style={{
          left: preview.left,
          top: preview.top,
          width: w * preview.unit,
          height: h * preview.unit,
        }}
        viewBox={`0 0 ${w * UNIT} ${h * UNIT}`}
      >
        <MarkedPiece letter={preview.letter} points={points} />
      </svg>
    </div>,
    document.body,
  );
}

export function GameBoard({ game, onChange, collection, onSave, onView }) {
  const plane = useRef(null),
    tray = useRef(null);
  const [selected, setSelected] = useState(null),
    [aim, setAim] = useState(false),
    [focus, setFocus] = useState(0),
    [message, report] = useState(''),
    [reset, setReset] = useState(false),
    [boardPicker, setBoardPicker] = useState(false),
    [boardChoice, setBoardChoice] = useState(game.boardId ?? DEFAULT_BOARD);
  const board = getBoard(game.boardId);
  const COLS = board.width, ROWS = board.height;
  const { pieces, stack: placed } = game;
  const cells = gameCells(game);
  const blocked = new Set(board.blocked.map(([x, y]) => y * COLS + x));
  const covered = [...cells].filter((c, i) => !blocked.has(i) && c !== '.').length;
  const complete = placed.length === 12 && covered === 60;
  const overlap = !complete && covered < placed.length * 5;
  function select(l) {
    const next = bringForward(game, l);
    if (next !== game) onChange(next);
    setSelected(l);
    setAim(false);
    report('');
  }
  function choose(l, keyboard) {
    const next = pickPiece(game, l);
    if (next !== game) onChange(next);
    setSelected(l);
    setAim(true);
    report(`${l} on top. Turn it, drag it, or tap any square to move it there.`);
    if (keyboard) {
      const { at, points } = next.pieces[l];
      const [x, y] = handleSquare(points);
      focusCell(Math.min(ROWS - 1, at[1] + y) * COLS + Math.min(COLS - 1, at[0] + x));
    }
  }
  function drop(l, at) {
    const next = placePiece(game, l, at);
    onChange(next);
    setSelected(at ? l : null);
    setAim(false);
    if (!at) report(`${l} returned to the tray.`);
    else {
      const piece = next.pieces[l];
      const [x, y] = handleSquare(piece.points);
      report(
        next.stack.length === 12 && [...gameCells(next)].filter((c, i) => !blocked.has(i) && c !== '.').length === 60
          ? 'All twelve pieces fit! Your solution is ready below.'
          : `${l} placed at ${locationName(piece.at[0] + x, piece.at[1] + y)}.`,
      );
    }
  }
  function turn({ action, result }) {
    if (!pieces[selected]?.at) return;
    onChange(turnPiece(game, selected, action));
    report(`${selected} ${result}.`);
  }
  const { start, preview, events } = usePieceDrag({ game, plane, tray, select, drop, report });
  function activateCell(i) {
    if (!aim && cells[i] !== '.' && cells[i] !== '#') select(cells[i]);
    else if (selected) {
      const [gx, gy] = handleSquare(pieces[selected].points);
      drop(selected, [(i % COLS) - gx, Math.floor(i / COLS) - gy]);
    } else report('Choose a piece from the tray first.');
  }
  function focusCell(i) {
    plane.current?.querySelector(`[data-square="${i}"]`)?.focus();
  }
  function boardKey(e, i) {
    const x = i % COLS,
      y = Math.floor(i / COLS);
    const next = {
      ArrowLeft: x > 0 ? i - 1 : i,
      ArrowRight: x < COLS - 1 ? i + 1 : i,
      ArrowUp: y > 0 ? i - COLS : i,
      ArrowDown: y < ROWS - 1 ? i + COLS : i,
    }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      focusCell(next);
    }
  }
  const activeLetter = preview?.letter ?? selected;
  const feedback = preview
    ? preview.onBoard
      ? `Release to place ${preview.letter}.`
      : preview.onTray && pieces[preview.letter].at
        ? 'Release to return this piece to the tray.'
        : 'Drag into the frame to place this piece.'
    : message ||
      (selected
        ? `${selected} on top. Drag or turn the piece on the board.`
        : 'Drag a piece onto the board, or tap its card to add it in the middle.');
  return (
    <section className="panel game-panel" aria-label="Game board" style={{ '--board-cols': COLS, '--board-rows': ROWS }} {...events}>
      <div className="panel-heading">
        <div className="section-title">
          <span className="heading-icon">
            <Gamepad2 size={18} />
          </span>
          <h2 id="game-title">{board.name}</h2>
        </div>
        <div className="game-meta">
          <button className="btn btn-light board-select" type="button" onClick={() => { setBoardChoice(board.id); setBoardPicker(true); }}>Change Frame</button>
          <span className={complete ? 'complete' : ''}>{placed.length} / 12 placed</span>
        </div>
      </div>
      <div className="game-content">
        <div className="game-field">
          <div className="game-frame-scroll"><div className="game-frame" style={{ minWidth: COLS > 12 ? COLS * 20 + 30 : undefined }}>
            <span className="ruler-cross" aria-hidden="true">
              +
            </span>
            <div className="col-ruler" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {Array.from({ length: COLS }, (_, x) => (
                <span key={x}>{x + 1}</span>
              ))}
            </div>
            <div className="row-ruler" aria-hidden="true" style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
              {Array.from({ length: ROWS }, (_, y) => (
                <span key={y}>{rowLabel(y)}</span>
              ))}
            </div>
            <div
              ref={plane}
              className="game-plane"
              style={{ aspectRatio: `${COLS} / ${ROWS}` }}
              role="group"
              aria-label={`Playing field: ${ROWS} rows, ${COLS} columns`}
              aria-describedby="play-hint"
            >
              <svg
                aria-hidden="true"
                className="field-art"
                viewBox={`0 0 ${COLS * UNIT} ${ROWS * UNIT}`}
              >
                <defs>
                  <pattern
                    id="field-squares"
                    width={UNIT}
                    height={UNIT}
                    patternUnits="userSpaceOnUse"
                  >
                    <path d="M8 0H0V8" fill="none" stroke="var(--line-strong)" strokeWidth=".28" />
                    <circle cx="4" cy="4" r=".17" fill="var(--line-strong)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#field-squares)" />
                {board.blocked.map(([x, y]) => <rect key={`${x}-${y}`} x={x * UNIT} y={y * UNIT} width={UNIT} height={UNIT} className="blocked-square" />)}
                {placed.map((l) => (
                  <g
                    key={l}
                    data-letter={l}
                    className={`field-piece ${l === activeLetter ? 'selected' : ''}`}
                    opacity={preview?.letter === l ? 0.3 : 1}
                    transform={`translate(${pieces[l].at[0] * UNIT} ${pieces[l].at[1] * UNIT})`}
                  >
                    <MarkedPiece letter={l} points={pieces[l].points} />
                  </g>
                ))}
              </svg>
              {!placed.length && !activeLetter && ROWS > 2 && (
                <div className="field-prompt" aria-hidden="true">
                  <span>
                    <Hand size={16} />
                    Drag a piece here or tap its card
                  </span>
                </div>
              )}
              <div className="field-targets" style={{ gridTemplate: `repeat(${ROWS}, minmax(0, 1fr)) / repeat(${COLS}, minmax(0, 1fr))` }}>
                {Array.from(cells, (l, i) => {
                  const x = i % COLS,
                    y = Math.floor(i / COLS);
                  return (
                    <button
                      key={i}
                      type="button"
                      data-square={i}
                      data-piece={l}
                      aria-label={`${locationName(x, y)}: ${l === '.' ? 'empty' : l === '#' ? 'blocked' : l + ' piece'}${blocked.has(i) && l !== '#' ? ', over blocked square' : ''}`}
                      tabIndex={focus === i ? 0 : -1}
                      onFocus={() => setFocus(i)}
                      onKeyDown={(e) => boardKey(e, i)}
                      onPointerDown={
                        (l === '.' || l === '#')
                          ? undefined
                          : (e) =>
                              start(e, l, [x - pieces[l].at[0], y - pieces[l].at[1]], () =>
                                activateCell(i),
                              )
                      }
                      onClick={() => activateCell(i)}
                    />
                  );
                })}
              </div>
            </div>
          </div></div>
        </div>
        <div className="game-kit">
          <div className="turn-caption">
            Board controls{' '}
            <span>
              {preview
                ? `${preview.letter} moving`
                : selected
                  ? `${selected} selected`
                  : 'Choose a piece'}
            </span>
          </div>
          <div className="game-transforms" role="group" aria-label="Turn selected board piece">
            {transforms.map((control) => {
              const { action, label, compact, name = label, Icon } = control;
              return (
                <button
                  key={action}
                  className="btn btn-light"
                  aria-label={name}
                  title={name}
                  disabled={!pieces[selected]?.at || Boolean(preview)}
                  onClick={() => turn(control)}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="turn-label-full">{label}</span>
                  <span className="turn-label-compact">{compact}</span>
                </button>
              );
            })}
          </div>
          <div className="tray-heading">
            <h3>Piece tray</h3>
            <button
              className="text-btn"
              disabled={!pieces[selected]?.at || Boolean(preview)}
              onClick={() => drop(selected, null)}
            >
              <Undo2 size={14} />
              Return to tray
            </button>
          </div>
          <div
            className={`game-tray ${preview?.onTray ? 'over-tray' : ''}`}
            ref={tray}
            role="group"
            aria-label="Pentomino pieces"
          >
            {LETTERS.map((l) => {
              const { at } = pieces[l],
                points = pointsFor(l),
                [w, h] = sizeOf(points);
              return (
                <button
                  key={l}
                  aria-label={`${l} piece, ${at ? 'on board' : 'in tray'}`}
                  aria-pressed={activeLetter === l}
                  className={`tray-piece ${at ? 'on-board' : ''}`}
                  onPointerDown={(e) =>
                    start(e, l, handleSquare(pieces[l].points), () => choose(l, false))
                  }
                  onClick={(e) => choose(l, e.detail === 0)}
                >
                  {at && <Check size={12} className="tray-check" />}
                  <svg aria-hidden="true" viewBox="0 0 44 44">
                    <g transform={`translate(${(44 - w * UNIT) / 2} ${(44 - h * UNIT) / 2})`}>
                      <MarkedPiece letter={l} points={points} mini />
                    </g>
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
        <div className="game-foot">
          <p id="play-hint" role="status">
            {feedback} {overlap && `Overlap · ${covered}/60 squares covered.`}
          </p>
          <button
            className="text-btn"
            disabled={!selected && !placed.length}
            onClick={() => setReset(true)}
          >
            <RotateCcw size={14} />
            Start over
          </button>
        </div>
      </div>
      {complete && board.id !== DEFAULT_BOARD && (
        <p className="board-solved" role="status">All twelve pieces fit! Collection saving is available for the 6×10 frame only.</p>
      )}
      {complete && board.id === DEFAULT_BOARD && (
        <SolutionResult cells={cells} collection={collection} onSave={onSave} onView={onView} />
      )}
      {preview && <DragGhost points={pieces[preview.letter].points} preview={preview} />}
      {boardPicker && (
        <Dialog title="Choose a gameboard" eyebrow="GAME BOARD" description={placed.length ? 'Changing boards returns all pieces to the tray. Your collection will not change.' : 'Choose a classic frame or an 8×8 layout with four blocked squares. Collection saving is currently available for 6×10 solutions only.'} onClose={() => setBoardPicker(false)} wide>
          <div className="board-options" role="radiogroup" aria-label="Board layouts">
            {BOARDS.map((option) => (
              <label className="board-option" key={option.id}>
                <input type="radio" name="game-board" value={option.id} checked={boardChoice === option.id} onChange={() => setBoardChoice(option.id)} />
                <svg aria-hidden="true" viewBox={`0 0 ${option.width} ${option.height}`} preserveAspectRatio="xMidYMid meet">
                  {Array.from({ length: option.width * option.height }, (_, i) => (
                    <rect key={i} x={i % option.width} y={Math.floor(i / option.width)} width="1" height="1" fill="var(--well)" stroke="var(--line-strong)" strokeWidth=".06" />
                  ))}
                  {option.blocked.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="blocked-square" />)}
                </svg>
                <span>{option.name}</span>
              </label>
            ))}
          </div>
          <div className="dialog-actions">
            <button className="btn btn-light" onClick={() => setBoardPicker(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              if (boardChoice !== board.id) {
                onChange(newGame(boardChoice));
                setSelected(null); setAim(false); setFocus(0); report('');
              }
              setBoardPicker(false);
            }}>Use board</button>
          </div>
        </Dialog>
      )}
      {reset && (
        <Dialog
          title="Start a new game?"
          eyebrow="GAME BOARD"
          description="Return all twelve pieces to the tray. Your uploads and saved solutions won’t change."
          onClose={() => setReset(false)}
        >
          <div className="dialog-actions">
            <button className="btn btn-light" onClick={() => setReset(false)}>
              Keep playing
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onChange(newGame(board.id));
                setSelected(null);
                setAim(false);
                report('');
                setReset(false);
              }}
            >
              Start new game
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
