// Coordinates describe free pentominoes: turning or flipping a piece keeps its name.
export const ROWS = 6;
export const COLS = 10;
export const LETTERS = [...'FILNPTUVWXYZ'];
export const BLANK = '.'.repeat(ROWS * COLS);
export const PIECES = {
  F: { shape: ['.XX', 'XX.', '.X.'], color: '#9ec6df', ink: '#2a495e' },
  I: { shape: ['XXXXX'], color: '#c0d1a6', ink: '#435235' },
  L: { shape: ['X.', 'X.', 'X.', 'XX'], color: '#edb0a2', ink: '#69413a' },
  N: { shape: ['XX..', '.XXX'], color: '#efd18e', ink: '#614e2e' },
  P: { shape: ['XX', 'XX', 'X.'], color: '#d1b7dd', ink: '#5b4264' },
  T: { shape: ['XXX', '.X.', '.X.'], color: '#8fcac1', ink: '#2d544d' },
  U: { shape: ['X.X', 'XXX'], color: '#b4bfe2', ink: '#404e69' },
  V: { shape: ['X..', 'X..', 'XXX'], color: '#efa878', ink: '#6c432c' },
  W: { shape: ['X..', 'XX.', '.XX'], color: '#b5d3ca', ink: '#3d5b53' },
  X: { shape: ['.X.', 'XXX', '.X.'], color: '#eab0c4', ink: '#693e51' },
  Y: { shape: ['.X..', 'XXXX'], color: '#b0c9a1', ink: '#3e5537' },
  Z: { shape: ['XX.', '.X.', '.XX'], color: '#f1c896', ink: '#684d31' },
};
export const SAMPLE =
  'LLLLNNXUUI' + 'LFNNNXXXUI' + 'FFYYYYXUUI' + 'VFFTYWWZZI' + 'VTTTWWPPZI' + 'VVVTWPPPZZ';
export const SAMPLE_PHOTO = {
  url: './assets/tabletop-sample.jpg',
  name: 'Tabletop sample',
  width: 1264,
  height: 848,
  sample: true,
};
export const SAMPLE_FRAME = [
  [106 / 1264, 217 / 848],
  [1047 / 1264, 92 / 848],
  [1180 / 1264, 613 / 848],
  [198 / 1264, 768 / 848],
];

export function pointsFor(letter) {
  return PIECES[letter].shape.flatMap((row, y) =>
    [...row].flatMap((c, x) => (c === 'X' ? [[x, y]] : [])),
  );
}
function signature(points) {
  const minX = Math.min(...points.map((p) => p[0])),
    minY = Math.min(...points.map((p) => p[1]));
  return points
    .map(([x, y]) => `${x - minX}:${y - minY}`)
    .sort()
    .join(';');
}
const shapeNames = new Map();
for (const letter of LETTERS) {
  for (const flip of [-1, 1]) {
    let points = pointsFor(letter).map(([x, y]) => [flip * x, y]);
    for (let r = 0; r < 4; r++) {
      shapeNames.set(signature(points), letter);
      points = points.map(([x, y]) => [-y, x]);
    }
  }
}
export function identify(indices) {
  if (indices.length !== 5) return null;
  return shapeNames.get(signature(indices.map((i) => [i % COLS, Math.floor(i / COLS)]))) ?? null;
}
export function validateBoard(cells) {
  const pieces = {};
  let found = 0;
  for (const letter of LETTERS) {
    const indices = [];
    for (let i = 0; i < cells.length; i++) if (cells[i] === letter) indices.push(i);
    const valid = identify(indices) === letter;
    pieces[letter] = { count: indices.length, valid };
    if (valid) found++;
  }
  return { valid: cells.length === 60 && found === 12, found, pieces };
}
export function variants(cells) {
  const rows = Array.from({ length: ROWS }, (_, y) => cells.slice(y * COLS, (y + 1) * COLS));
  const mirror = rows.map((row) => [...row].reverse().join(''));
  return [rows.join(''), mirror.join(''), rows.reverse().join(''), mirror.reverse().join('')];
}
// Portrait boards are rotated to landscape at input. Only four symmetries preserve a 6×10 rectangle.
export const canonicalKey = (cells) => variants(cells).sort()[0];
export function asTable(cells) {
  return Array.from({ length: ROWS }, (_, y) =>
    [...cells.slice(y * COLS, (y + 1) * COLS)].join('\t'),
  ).join('\n');
}

export function parseGrids(text) {
  const lines = text
    .trim()
    .toUpperCase()
    .split(/\r?\n/)
    .map((line) => line.replace(/[\s,;|"\uFEFF]/g, ''))
    .filter(Boolean);
  if (!lines.length) throw new Error('Paste a grid from your sheet first.');
  const grids = [];
  for (let i = 0; i < lines.length;) {
    const width = lines[i].length;
    const height = width === 10 ? 6 : width === 6 ? 10 : 0;
    const rows = lines.slice(i, i + height);
    if (!height || rows.length !== height || rows.some((row) => row.length !== width)) {
      throw new Error(
        `Grid ${grids.length + 1} needs six rows of ten letters, or ten rows of six.`,
      );
    }
    if (rows.some((row) => /[^FILNPTUVWXYZ]/.test(row)))
      throw new Error(`Grid ${grids.length + 1} contains an unknown piece letter.`);
    const cells =
      width === 10
        ? rows.join('')
        : Array.from({ length: 6 }, (_, y) =>
            rows
              .map((row) => row[y])
              .reverse()
              .join(''),
          ).join('');
    const check = validateBoard(cells);
    if (!check.valid) {
      const invalid = LETTERS.filter((l) => !check.pieces[l].valid);
      throw new Error(
        `Check ${invalid.join(', ')} in grid ${grids.length + 1}. Each piece must have its five-cell shape.`,
      );
    }
    grids.push(cells);
    i += height;
  }
  return grids;
}
