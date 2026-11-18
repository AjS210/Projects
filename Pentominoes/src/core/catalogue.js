import { canonicalKey, COLS, ROWS } from './puzzle.js';

// The seven diagrams on Isomer Design's 6×10 index, in reading order. Our board
// uses row letters and 1-based columns, so B3 is their row 2, column 3.
export const X_GROUPS = { B3: 389, B4: 342, B5: 291, C2: 442, C3: 262, C4: 276, C5: 337 };
export const CATALOGUE_SIZE = Object.values(X_GROUPS).reduce((sum, n) => sum + n, 0);
export const SOURCE_INDEX = 'https://isomerdesign.com/Pentomino/6x10/index.html';

function xGroup(cells) {
  // In a verified tiling the first X is the north arm. Fold its center (not
  // its bounding box) into the upper-left quarter, without moving the board.
  const center = cells.indexOf('X') + COLS;
  const row = Math.floor(center / COLS),
    col = center % COLS;
  return (
    String.fromCharCode(65 + Math.min(row, ROWS - 1 - row)) + (1 + Math.min(col, COLS - 1 - col))
  );
}

export function indexCatalogue(text) {
  const byGrid = new Map(),
    numbers = new Set(),
    counts = {};
  for (const line of text.trim().split(/\r?\n/)) {
    const [prefix, ...rows] = line.trim().split(/\s+/);
    if (
      !/^\d+,$/.test(prefix) ||
      rows.length !== ROWS ||
      !rows.every((r) => /^[FILNPTUVWXYZ]{10}$/.test(r))
    )
      throw new Error(`Malformed reference line: ${line}`);
    const number = Number(prefix.slice(0, -1)); // Published ID, never the array/sort index.
    const cells = rows.join(''),
      key = canonicalKey(cells),
      group = xGroup(cells);
    if (
      number < 1 ||
      number > CATALOGUE_SIZE ||
      numbers.has(number) ||
      byGrid.has(key) ||
      !Object.hasOwn(X_GROUPS, group)
    )
      throw new Error(`Invalid or duplicate reference entry #${number}`);
    numbers.add(number);
    counts[group] = (counts[group] || 0) + 1;
    byGrid.set(key, { number, group, name: `Solution #${number}` });
  }
  if (Object.entries(X_GROUPS).some(([id, total]) => counts[id] !== total))
    throw new Error('Reference does not match the published X-position totals.');
  return (cells) =>
    typeof cells === 'string' && cells.length === ROWS * COLS
      ? (byGrid.get(canonicalKey(cells)) ?? null)
      : null;
}
