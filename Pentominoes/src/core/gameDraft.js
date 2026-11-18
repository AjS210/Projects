import { COLS, LETTERS, identify } from './puzzle.js';
import { boardOrigin, newGame } from './game.js';
import { BOARDS } from './boards.js';

// A phone may reload a backgrounded tab. This draft belongs to that tab, not
// localStorage/the collection, and it is never exported as a discovery.
export const DRAFT_KEY = 'pentolog.play.v1';
const pair = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger);

export function readGameDraft(storage) {
  try {
    const draft = JSON.parse((storage ?? sessionStorage).getItem(DRAFT_KEY));
    if (!draft) return newGame();
    if (draft.boardId !== undefined && !BOARDS.some((b) => b.id === draft.boardId)) return newGame();
    const game = newGame(draft.boardId);
    // Older drafts only had the letter map; their pieces never overlapped.
    const pieces = draft.pieces ?? draft;
    for (const l of LETTERS) {
      const { points, at } = pieces[l];
      if (
        !Array.isArray(points) ||
        points.length !== 5 ||
        !points.every((p) => pair(p) && p.every((n) => n >= 0 && n < 5)) ||
        !points.some(([x]) => x === 0) ||
        !points.some(([, y]) => y === 0) ||
        identify(points.map(([x, y]) => y * COLS + x)) !== l ||
        (at !== null && (!pair(at) || !boardOrigin(points, at, game.boardId).every((n, i) => n === at[i])))
      )
        return newGame();
      if (at) {
        game.pieces[l] = { points, at };
        game.stack.push(l);
      }
    }
    if (draft.pieces) {
      const stack = draft.stack;
      if (
        !Array.isArray(stack) ||
        stack.length !== game.stack.length ||
        new Set(stack).size !== stack.length ||
        !stack.every((l) => game.stack.includes(l))
      )
        return newGame();
      game.stack = stack;
    }
    return game;
  } catch {
    return newGame();
  } // storage unavailable, or a partial/old draft
}

export function writeGameDraft(game, storage) {
  try {
    (storage ?? sessionStorage).setItem(DRAFT_KEY, JSON.stringify(game));
  } catch {
    /* Storage is optional. The current game still works in memory. */
  }
}
