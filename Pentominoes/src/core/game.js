import { BLANK, COLS, LETTERS, ROWS, pointsFor } from './puzzle.js';

// A piece always has its five local squares, even in the tray. Only its board
// origin is nullable. Previewing a drag never removes it from this model.
export function newGame() {
  return Object.fromEntries(LETTERS.map((l) => [l, { points: pointsFor(l), at: null }]));
}

export function gameCells(game, except) {
  const cells = [...BLANK];
  for (const l of LETTERS) {
    const { points, at } = game[l];
    if (at && l !== except) {
      for (const [x, y] of points) cells[(at[1] + y) * COLS + at[0] + x] = l;
    }
  }
  return cells.join('');
}

// A stable, occupied square to use as the handle when selecting by tap/key.
// It is marked with the piece letter; some pentominoes have an empty center.
export function handleSquare(points) {
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const distance = ([x, y]) => (x - cx) ** 2 + (y - cy) ** 2;
  return points.reduce((best, p) => (distance(p) < distance(best) ? p : best));
}

export function transformed(points, turn) {
  const next = points.map(([x, y]) => {
    if (turn === 'rotate') return [-y, x]; // clockwise in screen coordinates
    if (turn === 'horizontal') return [-x, y];
    if (turn === 'vertical') return [x, -y];
    throw new Error('Unknown piece transform');
  });
  const left = Math.min(...next.map(([x]) => x)),
    top = Math.min(...next.map(([, y]) => y));
  return next.map(([x, y]) => [x - left, y - top]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export function fits(game, letter, at, points = game[letter].points) {
  const [col, row] = at;
  if (!Number.isInteger(col) || !Number.isInteger(row)) return false;
  const occupied = gameCells(game, letter);
  return points.every(([dx, dy]) => {
    const x = col + dx,
      y = row + dy;
    return x >= 0 && x < COLS && y >= 0 && y < ROWS && occupied[y * COLS + x] === '.';
  });
}

// Invalid moves/turns return the original game, never a partial placement.
export function placePiece(game, letter, at) {
  if (at && !fits(game, letter, at)) return game;
  return { ...game, [letter]: { ...game[letter], at } };
}

export function turnPiece(game, letter, turn) {
  const { points, at } = game[letter];
  const next = transformed(points, turn);
  if (at && !fits(game, letter, at, next)) return game;
  return { ...game, [letter]: { points: next, at } };
}
