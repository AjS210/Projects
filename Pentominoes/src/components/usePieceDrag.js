import { useRef, useState } from 'react';
import { COLS, ROWS } from '../core/puzzle.js';
import { fits } from '../core/game.js';

const inside = (r, x, y) => x >= r.left && x < r.right && y >= r.top && y < r.bottom;

// Native pointer capture works for a finger, pen or mouse, including when the
// pointer leaves the tile. Keep the committed position intact until pointerup.
export function usePieceDrag({ game, plane, tray, select, drop, report }) {
  const active = useRef(null),
    suppressClick = useRef(false);
  const [preview, setPreview] = useState(null);
  function start(e, letter, grip) {
    if (!e.isPrimary || e.button !== 0 || active.current) return;
    select(letter);
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = { id: e.pointerId, letter, grip, x: e.clientX, y: e.clientY, moved: false };
  }
  function target(e, d) {
    const r = plane.current.getBoundingClientRect(),
      unit = r.width / COLS;
    const onBoard = inside(r, e.clientX, e.clientY);
    const at = [
      Math.floor((e.clientX - r.left) / unit) - d.grip[0],
      Math.floor(((e.clientY - r.top) * ROWS) / r.height) - d.grip[1],
    ];
    return {
      letter: d.letter,
      at,
      unit,
      onBoard,
      fits: onBoard && fits(game, d.letter, at),
      onTray: inside(tray.current.getBoundingClientRect(), e.clientX, e.clientY),
      left: onBoard ? r.left + at[0] * unit : e.clientX - (d.grip[0] + 0.5) * unit,
      top: onBoard ? r.top + at[1] * unit : e.clientY - (d.grip[1] + 0.5) * unit,
    };
  }
  function track(e, end) {
    const d = active.current;
    if (!d || d.id !== e.pointerId) return;
    d.moved ||= Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 4;
    if (!end) {
      if (d.moved) setPreview(target(e, d));
      return;
    }
    active.current = null;
    setPreview(null);
    if (!d.moved) return; // a tap selects; the subsequent click still works
    suppressClick.current = true;
    const t = target(e, d); // final release position, not the last move event
    if (t.onBoard) drop(d.letter, t.at);
    else if (t.onTray && game[d.letter].at) drop(d.letter, null);
    else report('Move cancelled. Drop inside the frame or back in the tray.');
  }
  function cancel(e) {
    if (active.current?.id !== e.pointerId) return;
    suppressClick.current = active.current.moved;
    active.current = null;
    setPreview(null);
  }
  return {
    start,
    preview,
    events: {
      onPointerMove: (e) => track(e, false),
      onPointerUp: (e) => track(e, true),
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
      onPointerDownCapture: () => {
        if (!active.current) suppressClick.current = false;
      },
      onClickCapture: (e) => {
        if (e.detail && (suppressClick.current || active.current)) e.stopPropagation();
      },
    },
  };
}
