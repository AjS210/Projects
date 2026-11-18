// Coordinates describe free pentominoes: turning or flipping a piece keeps its name.
export const ROWS = 6;
export const COLS = 10;
export const LETTERS = [...'FILNPTUVWXYZ'];
export const BLANK = '.'.repeat(ROWS * COLS);
// Display swatches sampled from the product lid. Recognition uses shapes, not this palette.
export const PIECES = {
  F: { shape: ['.XX', 'XX.', '.X.'], color: '#64a57d', ink: '#122719' },
  I: { shape: ['XXXXX'], color: '#fefefc', ink: '#474540' },
  L: { shape: ['X.', 'X.', 'X.', 'XX'], color: '#c7c8ca', ink: '#32343a' },
  N: { shape: ['XX..', '.XXX'], color: '#8073a2', ink: '#0c0715' },
  P: { shape: ['XX', 'XX', 'X.'], color: '#606060', ink: '#ffffff' },
  T: { shape: ['XXX', '.X.', '.X.'], color: '#fde164', ink: '#473609' },
  U: { shape: ['X.X', 'XXX'], color: '#d06261', ink: '#2c1012' },
  V: { shape: ['X..', 'X..', 'XXX'], color: '#efdeb2', ink: '#4c4027' },
  W: { shape: ['X..', 'XX.', '.XX'], color: '#6684cc', ink: '#0d1830' },
  X: { shape: ['.X.', 'XXX', '.X.'], color: '#fc9860', ink: '#492715' },
  Y: { shape: ['.X..', 'XXXX'], color: '#8d8e90', ink: '#1a1c23' },
  Z: { shape: ['XX.', '.X.', '.XX'], color: '#8e7169', ink: '#080504' },
};
// Pack-away solution, in the lid's orientation: far edge first, front edge last.
export const SAMPLE =
  'UUXTTTFFWW' + 'UXXXTFFWWN' + 'UUXLTZFWNN' + 'LLLLYZZZNV' + 'PPPYYYYZNV' + 'PPIIIIIVVV';

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
export const identifyPoints = (points) => points.length === 5 ? (shapeNames.get(signature(points)) ?? null) : null;
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
export function asTable(cells, width = COLS, height = ROWS) {
  return Array.from({ length: height }, (_, y) =>
    [...cells.slice(y * width, (y + 1) * width)].join('\t'),
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
