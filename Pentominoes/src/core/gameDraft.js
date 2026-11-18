import { COLS, LETTERS, identify } from './puzzle.js';
import { boardOrigin, newGame } from './game.js';
import { BOARDS, DEFAULT_BOARD } from './boards.js';

// Keep the legacy tab-local draft for migration and the active tab's reloads.
// Per-frame drafts are stored separately from the saved solution collection.
export const DRAFT_KEY = 'pentolog.play.v1';
const pair = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger);

function validateDraft(draft) {
  try {
    if (!draft) return null;
    if (draft.boardId !== undefined && !BOARDS.some((b) => b.id === draft.boardId)) return null;
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
        return null;
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
        return null;
      game.stack = stack;
    }
    return game;
  } catch {
    return null;
  } // malformed draft
}

export function readGameDraft(storage) {
  try {
    return validateDraft(JSON.parse((storage ?? sessionStorage).getItem(DRAFT_KEY))) ?? newGame();
  } catch {
    return newGame();
  }
}

export function writeGameDraft(game, storage) {
  try {
    (storage ?? sessionStorage).setItem(DRAFT_KEY, JSON.stringify(game));
  } catch {
    /* Storage is optional. The current game still works in memory. */
  }
}


export const FRAME_DRAFTS_KEY = 'pentolog.play.frames.v1';

// A malformed frame is discarded independently; other drafts remain usable.
export function readFrameDrafts(persistent, session) {
  const games = {};
  let active = DEFAULT_BOARD;
  try {
    const saved = JSON.parse((persistent ?? localStorage).getItem(FRAME_DRAFTS_KEY));
    if (saved?.version === 1 && saved.games && typeof saved.games === 'object') {
      for (const board of BOARDS) {
        const game = validateDraft(saved.games[board.id]);
        if (game?.boardId === board.id) games[board.id] = game;
      }
      if (BOARDS.some((board) => board.id === saved.active)) active = saved.active;
    }
  } catch { /* Missing or unavailable persistent storage. */ }
  try {
    const legacy = validateDraft(JSON.parse((session ?? sessionStorage).getItem(DRAFT_KEY)));
    if (legacy) {
      games[legacy.boardId] = legacy;
      active = legacy.boardId;
    }
  } catch { /* Missing or unavailable session storage. */ }
  games[active] ??= newGame(active);
  return { active, games };
}

export function writeFrameDrafts(state, persistent, session) {
  try {
    (persistent ?? localStorage).setItem(FRAME_DRAFTS_KEY, JSON.stringify({ version: 1, ...state }));
  } catch { /* The in-memory drafts remain available for this visit. */ }
  writeGameDraft(state.games[state.active], session);
}
