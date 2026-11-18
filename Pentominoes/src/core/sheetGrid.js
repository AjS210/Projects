import { decodeGroups, landscapeKeys } from './digitalGrid.js';

const MAX_COLS = 16384,
  MAX_ROWS = 1048576;
export const MAX_CELLS = 300000;
export function columnName(col) {
  let s = '';
  for (let i = col + 1; i; i = Math.floor((i - 1) / 26))
    s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}
export class SheetGrid {
  constructor(name) {
    this.name = name;
    this.rows = new Map();
    this.maxCol = -1;
    this.maxRow = -1;
    this.size = 0;
  }
  set(row, col, value = '', fill = '') {
    const text = String(value ?? '')
      .trim()
      .toUpperCase();
    // Unpainted cells and explicitly white cells look the same in a sheet.
    // Keep them implicit so formatting entire blank rows doesn't expand the grid.
    if (fill === '#FFFFFF') fill = '';
    if ((!text && !fill) || row < 0 || col < 0 || col >= MAX_COLS || row >= MAX_ROWS) return;
    if (++this.size > MAX_CELLS)
      throw new Error('This sheet is too large. Export just the tab containing your solutions.');
    let r = this.rows.get(row);
    if (!r) this.rows.set(row, (r = new Map()));
    r.set(col, { value: /^[A-Z0-9]{1,3}$/.test(text) ? text : '', fill });
    this.maxRow = Math.max(row, this.maxRow);
    this.maxCol = Math.max(col, this.maxCol);
  }
}

// Search sparse rows, not the sheet's declared used range (which often extends
// through thousands of formatted but empty rows). Headers are not puzzle data.
export function extractSheetBoards(sheet) {
  const boards = [],
    occupied = new Set(),
    ordered = [...sheet.rows.keys()].sort((a, b) => a - b);
  for (const top of ordered) {
    const row = sheet.rows.get(top),
      starts = new Set();
    for (const col of row.keys()) {
      starts.add(col);
      // The first few cells may belong to an unformatted white pentomino.
      for (let i = 1; i <= 5 && col >= i && !row.has(col - i); i++) starts.add(col - i);
    }
    for (const left of [...starts].sort((a, b) => a - b)) {
      if (occupied.has(top * MAX_COLS + left)) continue;
      for (const [w, h] of [
        [10, 6],
        [6, 10],
      ]) {
        if (top + h - 1 > sheet.maxRow || left + w - 1 > sheet.maxCol) continue;
        const values = [],
          fills = [];
        let missing = 0,
          colored = 0,
          overlap = false;
        for (let j = 0; j < h && missing <= 5 && !overlap; j++) {
          const r = sheet.rows.get(top + j);
          if (!r) break;
          for (let i = 0; i < w; i++) {
            if (occupied.has((top + j) * MAX_COLS + left + i)) {
              overlap = true;
              break;
            }
            const cell = r.get(left + i);
            if (!cell && ++missing > 5) break;
            values.push(cell?.value || '');
            fills.push(cell?.fill || '#FFFFFF');
            if (cell?.fill) colored++;
          }
        }
        if (overlap || values.length !== 60) continue;
        const cells =
          (values.every(Boolean) && decodeGroups(landscapeKeys(values, w))) ||
          (colored > 0 && decodeGroups(landscapeKeys(fills, w)));
        if (!cells) continue;
        const range = `${columnName(left)}${top + 1}:${columnName(left + w - 1)}${top + h}`;
        boards.push({ name: `${sheet.name.slice(0, 55)} · ${range}`, cells });
        for (let j = 0; j < h; j++)
          for (let i = 0; i < w; i++) occupied.add((top + j) * MAX_COLS + left + i);
        break;
      }
    }
  }
  return boards;
}

export function delimitedBoards(text, name = 'Sheet') {
  const separator = text.includes('\t')
    ? '\t'
    : text.includes(',')
      ? ','
      : text.includes(';')
        ? ';'
        : null;
  if (!separator) return [];
  const grid = new SheetGrid(name);
  let r = 0,
    c = 0,
    field = '',
    quoted = false;
  const commit = () => {
    grid.set(r, c++, field);
    field = '';
  };
  const data = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < data.length; i++) {
    const ch = data[i];
    if (ch === '"') {
      if (quoted && data[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && ch === separator) commit();
    else if (!quoted && (ch === '\n' || ch === '\r')) {
      commit();
      r++;
      c = 0;
      if (ch === '\r' && data[i + 1] === '\n') i++;
    } else field += ch;
  }
  if (quoted) throw new Error('A quoted cell in the CSV is incomplete. Export the sheet again.');
  commit();
  return extractSheetBoards(grid);
}
