import { LETTERS, pointsFor } from './puzzle.js';
import { DEFAULT_BOARD, getBoard } from './boards.js';

// The stack lists board pieces from back to front. Squares underneath another
// piece still belong to it; the flattened view is for drawing/hit testing only.
export function newGame(boardId = DEFAULT_BOARD) {
  return {
    boardId: getBoard(boardId).id,
    pieces: Object.fromEntries(LETTERS.map((l) => [l, { points: pointsFor(l), at: null }])),
    stack: [],
  };
}
export function gameCells({ pieces, stack, boardId }) {
  const { width, height, blocked } = getBoard(boardId);
  const cells = Array(width * height).fill('.');
  for (const [x, y] of blocked) cells[y * width + x] = '#';
  for (const l of stack) {
    const { at, points } = pieces[l];
    for (const [x, y] of points) {
      const px = at[0] + x, py = at[1] + y;
      if (px >= 0 && px < width && py >= 0 && py < height) cells[py * width + px] = l;
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
    if (turn === 'rotateCCW') return [y, -x];
    if (turn === 'horizontal') return [-x, y];
    if (turn === 'vertical') return [x, -y];
    throw new Error('Unknown piece transform');
  });
  const left = Math.min(...next.map(([x]) => x)),
    top = Math.min(...next.map(([, y]) => y));
  return next.map(([x, y]) => [x - left, y - top]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export function sizeOf(points) {
  return [1 + Math.max(...points.map(([x]) => x)), 1 + Math.max(...points.map(([, y]) => y))];
}
// Turning at the rim slides the whole piece just far enough to stay in reach.
// The same projection drives the drag ghost, release and tap placement.
export function boardOrigin(points, [x, y], boardId) {
  const { width, height } = getBoard(boardId);
  const [w, h] = sizeOf(points);
  return [Math.max(0, Math.min(width - w, x)), Math.max(0, Math.min(height - h, y))];
}
export function bringForward(game, letter) {
  if (!game.pieces[letter].at || game.stack.at(-1) === letter) return game;
  return { ...game, stack: [...game.stack.filter((l) => l !== letter), letter] };
}
function updatePiece(game, letter, piece) {
  const stack = game.stack.filter((l) => l !== letter);
  if (piece.at) stack.push(letter);
  return { ...game, pieces: { ...game.pieces, [letter]: piece }, stack };
}
export function placePiece(game, letter, at) {
  if (at === null) return updatePiece(game, letter, { points: pointsFor(letter), at: null });
  if (!Array.isArray(at) || at.length !== 2 || !at.every(Number.isInteger)) return game;
  const { points } = game.pieces[letter];
  return updatePiece(game, letter, { points, at: boardOrigin(points, at, game.boardId) });
}
export function pickPiece(game, letter) {
  const { at, points } = game.pieces[letter];
  if (at) return bringForward(game, letter);
  const [w, h] = sizeOf(points);
  const { width, height } = getBoard(game.boardId);
  return placePiece(game, letter, [Math.floor((width - w) / 2), Math.floor((height - h) / 2)]);
}
export function turnPiece(game, letter, turn) {
  const { points, at } = game.pieces[letter];
  if (!at) return game; // the tray is a fixed set of piece choices, not a second playing surface
  const next = transformed(points, turn);
  const [gx, gy] = handleSquare(points),
    [nx, ny] = handleSquare(next);
  return updatePiece(game, letter, {
    points: next,
    at: boardOrigin(next, [at[0] + gx - nx, at[1] + gy - ny], game.boardId),
  });
}
