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
import { COLS, LETTERS, PIECES, ROWS } from '../core/puzzle.js';
import { gameCells, handleSquare, newGame, placePiece, turnPiece } from '../core/game.js';
import { Blocks } from './Artwork.jsx';
import { Dialog } from './Dialog.jsx';
import { SolutionResult } from './SolutionResult.jsx';
import { usePieceDrag } from './usePieceDrag.js';

const UNIT = 8; // artwork units per cell
const transforms = [
  ['horizontal', 'Flip horizontal', FlipVertical2],
  ['vertical', 'Flip vertical', FlipHorizontal2],
  ['rotate', 'Rotate 90°', RotateCw],
];
const rowLabel = (y) => String.fromCharCode(65 + y);
const locationName = (x, y) => `${rowLabel(y)}${x + 1}`;
const sizeOf = (points) => [
  1 + Math.max(...points.map(([x]) => x)),
  1 + Math.max(...points.map(([, y]) => y)),
];

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
        className={`drag-ghost ${preview.onBoard && !preview.fits ? 'blocked' : ''}`}
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
    [focus, setFocus] = useState(0),
    [message, report] = useState(''),
    [reset, setReset] = useState(false);
  const cells = gameCells(game),
    placed = LETTERS.filter((l) => game[l].at);
  function select(l) {
    setSelected(l);
    report('');
  }
  function drop(l, at) {
    const next = placePiece(game, l, at);
    if (next === game) {
      report(`No room for ${l} there. Keep all five squares inside without overlapping.`);
      return;
    }
    onChange(next);
    setSelected(l);
    if (!at) report(`${l} returned to the tray.`);
    else {
      const [x, y] = handleSquare(next[l].points);
      report(
        Object.values(next).every((p) => p.at)
          ? 'All twelve pieces fit! Your solution is ready below.'
          : `${l} placed at ${locationName(at[0] + x, at[1] + y)}.`,
      );
    }
  }
  function turn(action) {
    if (!selected) return;
    const next = turnPiece(game, selected, action);
    if (next === game) {
      report(`Not enough room to turn ${selected} here. Move it or return it to the tray.`);
      return;
    }
    onChange(next);
    report(
      `${selected} ${action === 'rotate' ? 'rotated clockwise' : action === 'horizontal' ? 'flipped left to right' : 'flipped top to bottom'}.`,
    );
  }
  const { start, preview, events } = usePieceDrag({ game, plane, tray, select, drop, report });
  function activateCell(i) {
    if (cells[i] !== '.') select(cells[i]);
    else if (selected) {
      const [gx, gy] = handleSquare(game[selected].points);
      drop(selected, [(i % COLS) - gx, Math.floor(i / COLS) - gy]);
    } else report('Select a piece from the tray first.');
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
  const feedback = preview
    ? preview.onBoard
      ? preview.fits
        ? `Release to place ${preview.letter}.`
        : 'Blocked — the piece must fit in five free squares.'
      : preview.onTray && game[preview.letter].at
        ? 'Release to return this piece to the tray.'
        : 'Drag into the frame to see where the piece fits.'
    : message ||
      (selected
        ? `${selected} selected. Tap an empty square to place its marked cell there.`
        : 'Drag a piece into the frame, or tap a piece and then an empty square.');
  return (
    <section className="panel game-panel" aria-labelledby="game-title" {...events}>
      <div className="panel-heading">
        <div className="section-title">
          <span className="heading-icon">
            <Gamepad2 size={18} />
          </span>
          <h2 id="game-title">Game board</h2>
        </div>
        <span className="stage-label">
          01 <span>/</span> PLAY
        </span>
      </div>
      <div className="game-content">
        <div className="game-field">
          <div className="game-meta">
            <span>
              6 × 10 <i /> PLAYING FIELD
            </span>
            <span className={placed.length === 12 ? 'complete' : ''}>
              {placed.length} / 12 placed
            </span>
          </div>
          <div className="game-frame">
            <span className="ruler-cross" aria-hidden="true">
              +
            </span>
            <div className="col-ruler" aria-hidden="true">
              {Array.from({ length: COLS }, (_, x) => (
                <span key={x}>{x + 1}</span>
              ))}
            </div>
            <div className="row-ruler" aria-hidden="true">
              {Array.from({ length: ROWS }, (_, y) => (
                <span key={y}>{rowLabel(y)}</span>
              ))}
            </div>
            <div
              ref={plane}
              className="game-plane"
              role="group"
              aria-label="Playing field: six rows, ten columns"
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
                {placed.map((l) => (
                  <g
                    key={l}
                    className={`field-piece ${l === selected ? 'selected' : ''}`}
                    opacity={preview?.letter === l ? 0.3 : 1}
                    transform={`translate(${game[l].at[0] * UNIT} ${game[l].at[1] * UNIT})`}
                  >
                    <MarkedPiece letter={l} points={game[l].points} />
                  </g>
                ))}
              </svg>
              {!placed.length && !selected && (
                <div className="field-prompt" aria-hidden="true">
                  <span>
                    <Hand size={16} />
                    Drag your first piece here
                  </span>
                </div>
              )}
              <div className="field-targets">
                {Array.from(cells, (l, i) => {
                  const x = i % COLS,
                    y = Math.floor(i / COLS);
                  return (
                    <button
                      key={i}
                      type="button"
                      data-square={i}
                      data-piece={l}
                      aria-label={`${locationName(x, y)}: ${l === '.' ? 'empty' : l + ' piece'}`}
                      tabIndex={focus === i ? 0 : -1}
                      onFocus={() => setFocus(i)}
                      onKeyDown={(e) => boardKey(e, i)}
                      onPointerDown={
                        l === '.'
                          ? undefined
                          : (e) => start(e, l, [x - game[l].at[0], y - game[l].at[1]])
                      }
                      onClick={() => activateCell(i)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="game-kit">
          <div className="game-transforms" role="group" aria-label="Turn selected piece">
            {transforms.map(([action, label, Icon]) => (
              <button
                key={action}
                className="btn btn-light"
                disabled={!selected || Boolean(preview)}
                onClick={() => turn(action)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          <div className="tray-heading">
            <h3>Piece tray</h3>
            <button
              className="text-btn"
              disabled={!game[selected]?.at || Boolean(preview)}
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
              const { points, at } = game[l],
                [w, h] = sizeOf(points);
              return (
                <button
                  key={l}
                  aria-label={`${l} piece, ${at ? 'on board' : 'in tray'}`}
                  aria-pressed={selected === l}
                  className={`tray-piece ${at ? 'on-board' : ''}`}
                  onPointerDown={(e) => start(e, l, handleSquare(points))}
                  onClick={(e) => {
                    select(l);
                    if (e.detail === 0) focusCell(focus);
                  }}
                >
                  <span className="tray-name">{l}</span>
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
            {feedback}
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
      {placed.length === LETTERS.length && (
        <SolutionResult cells={cells} collection={collection} onSave={onSave} onView={onView} />
      )}
      {preview && <DragGhost points={game[preview.letter].points} preview={preview} />}
      {reset && (
        <Dialog
          title="Start a new game?"
          eyebrow="GAME BOARD"
          description="Return all twelve pieces to the tray. Your solution grid and saved solutions won’t change."
          onClose={() => setReset(false)}
        >
          <div className="dialog-actions">
            <button className="btn btn-light" onClick={() => setReset(false)}>
              Keep playing
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onChange(newGame());
                select(null);
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
