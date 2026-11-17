import { canonicalKey, validateBoard, parseGrids } from './puzzle.js';

export const STORE = 'pentolog.collection.v1';
export const defaultName = (n) => `Solution ${String(n).padStart(3, '0')}`;
export const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
export function unpackRecords(text) {
  const data = JSON.parse(text);
  if (data.version !== 1 || !Array.isArray(data.solutions))
    throw new Error('This is not a PentoLog collection backup.');
  return data.solutions.map((s, i) => {
    if (typeof s?.cells !== 'string' || s.cells.length !== 60 || !validateBoard(s.cells).valid)
      throw new Error(`Entry ${i + 1} is not a valid pentomino grid.`);
    return {
      id: typeof s.id === 'string' && s.id ? s.id : crypto.randomUUID(),
      name:
        typeof s.name === 'string' && s.name.trim()
          ? s.name.trim().slice(0, 80)
          : defaultName(i + 1),
      cells: s.cells,
      createdAt:
        typeof s.createdAt === 'string' && Number.isFinite(Date.parse(s.createdAt))
          ? s.createdAt
          : new Date().toISOString(),
    };
  });
}
export function readCollection() {
  const text = localStorage.getItem(STORE);
  return text ? unpackRecords(text) : [];
}
export const packRecords = (records) => JSON.stringify({ version: 1, solutions: records }, null, 2);
export function writeCollection(records) {
  localStorage.setItem(STORE, packRecords(records));
}
export function parseImport(text) {
  if (text.trimStart().startsWith('{')) return unpackRecords(text);
  return parseGrids(text).map((cells) => ({ cells }));
}
export function mergeRecords(existing, incoming) {
  const keys = new Set(existing.map((s) => canonicalKey(s.cells)));
  const records = [...existing];
  let added = 0;
  for (const entry of incoming) {
    const key = canonicalKey(entry.cells);
    if (keys.has(key)) continue;
    keys.add(key);
    records.unshift({
      ...entry,
      id: crypto.randomUUID(),
      name: entry.name || defaultName(records.length + 1),
      createdAt: entry.createdAt || new Date().toISOString(),
    });
    added++;
  }
  return { records, added, skipped: incoming.length - added };
}
