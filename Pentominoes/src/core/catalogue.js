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

// Only symmetries that preserve the frame's holes are equivalent. In
// particular, the diagonal-hole frame cannot be mirrored independently.
export function frameTransforms(board) {
  const { width: w, height: h, blocked } = board;
  const transforms = [
    (x, y) => [x, y], (x, y) => [w - 1 - x, y],
    (x, y) => [x, h - 1 - y], (x, y) => [w - 1 - x, h - 1 - y],
  ];
  if (w === h) transforms.push(
    (x, y) => [y, x], (x, y) => [w - 1 - y, x],
    (x, y) => [y, h - 1 - x], (x, y) => [w - 1 - y, h - 1 - x],
  );
  const holes = blocked.map(([x, y]) => y * w + x).sort((a, b) => a - b).join(',');
  return transforms.filter((transform) => blocked.map(([x, y]) => {
    const [a, b] = transform(x, y); return b * w + a;
  }).sort((a, b) => a - b).join(',') === holes);
}
export function frameVariants(cells, board) {
  if (cells.length !== board.width * board.height) return [];
  const w = board.width;
  return frameTransforms(board).map((transform) => {
    const result = Array(cells.length);
    [...cells].forEach((value, i) => {
      const [x, y] = transform(i % w, Math.floor(i / w));
      result[y * w + x] = value === '#' ? '.' : value;
    });
    return result.join('');
  });
}
export const frameKey = (cells, board) => frameVariants(cells, board).sort()[0];
export function frameXGroup(cells, board) {
  const i = cells.indexOf('X');
  const x = i % board.width, y = Math.floor(i / board.width) + 1;
  const centers = frameTransforms(board).map((transform) => transform(x, y));
  centers.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return `${String.fromCharCode(65 + centers[0][1])}${centers[0][0] + 1}`;
}
export function indexFrameCatalogue(text, board, expectedSize) {
  const byGrid = new Map(), numbers = new Set(), groups = {};
  for (const line of text.trim().split(/\r?\n/)) {
    const [prefix, ...rows] = line.trim().split(/\s+/);
    if (!/^\d+,$/.test(prefix) || rows.length !== board.height ||
        rows.some((r) => r.length !== board.width || /[^FILNPTUVWXYZ.]/.test(r)))
      throw new Error(`Malformed ${board.id} reference line: ${line}`);
    const number = Number(prefix.slice(0, -1)), cells = rows.join('');
    const holes = new Set(board.blocked.map(([x, y]) => y * board.width + x));
    if ([...cells].some((v, i) => (v === '.') !== holes.has(i)))
      throw new Error(`Invalid holes in ${board.id} reference #${number}`);
    const key = frameKey(cells, board), group = frameXGroup(cells, board);
    if (number < 1 || number > expectedSize || numbers.has(number) || byGrid.has(key))
      throw new Error(`Duplicate or invalid ${board.id} reference #${number}`);
    numbers.add(number);
    groups[group] = (groups[group] || 0) + 1;
    byGrid.set(key, { number, group, name: `Solution #${number}`, boardId: board.id });
  }
  if (numbers.size !== expectedSize) throw new Error(`Incomplete ${board.id} reference`);
  return { groups: Object.fromEntries(Object.entries(groups).sort()), total: expectedSize,
    lookup: (cells) => typeof cells === 'string' && cells.length === board.width * board.height
      ? byGrid.get(frameKey(cells, board)) ?? null : null };
}
