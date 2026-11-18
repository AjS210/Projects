import { COLS, LETTERS, identify } from './puzzle.js';
import { fits, newGame } from './game.js';

// A phone may reload a backgrounded tab. This draft belongs to that tab, not
// localStorage/the collection, and it is never exported as a discovery.
export const DRAFT_KEY = 'pentolog.play.v1';
const pair = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger);

export function readGameDraft(storage) {
  try {
    const draft = JSON.parse((storage ?? sessionStorage).getItem(DRAFT_KEY));
    if (!draft) return newGame();
    const game = newGame();
    for (const l of LETTERS) {
      const { points, at } = draft[l];
      if (
        !Array.isArray(points) ||
        points.length !== 5 ||
        !points.every((p) => pair(p) && p.every((n) => n >= 0 && n < 5)) ||
        !points.some(([x]) => x === 0) ||
        !points.some(([, y]) => y === 0) ||
        identify(points.map(([x, y]) => y * COLS + x)) !== l ||
        (at !== null && (!pair(at) || !fits(game, l, at, points)))
      )
        return newGame();
      game[l] = { points, at };
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
