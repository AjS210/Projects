import { parseGrids, identifyPoints, LETTERS } from './puzzle.js';
import { BOARDS, DEFAULT_BOARD } from './boards.js';

export const STORE = 'pentolog.collection.v1';
export const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
const label = (s) => (typeof s === 'string' ? s.trim().slice(0, 80) : '');
function personalFields(s, id = s.id) {
  return {
    id: typeof id === 'string' && id ? id : crypto.randomUUID(),
    name: label(s.name),
    ...(label(s.previousName) && { previousName: label(s.previousName) }),
    cells: s.cells,
    ...(s.boardId && s.boardId !== DEFAULT_BOARD && { boardId: s.boardId }),
    createdAt:
      typeof s.createdAt === 'string' && Number.isFinite(Date.parse(s.createdAt))
        ? s.createdAt
        : new Date().toISOString(),
  };
}
function backupEntries(text) {
  const data = JSON.parse(text);
  if (data?.version !== 1 || !Array.isArray(data.solutions))
    throw new Error('This is not a PentoLog collection backup.');
  return data.solutions;
}
export function unpackRecords(text) {
  return backupEntries(text).map((s, i) => {
    const board = BOARDS.find((b) => b.id === (s?.boardId ?? DEFAULT_BOARD));
    const cells = s?.cells;
    const holes = new Set(board?.blocked.map(([x, y]) => y * board.width + x));
    const valid = board && typeof cells === 'string' && cells.length === board.width * board.height &&
      [...cells].every((v, i) => holes.has(i) ? v === '.' || v === '#' : LETTERS.includes(v)) &&
      LETTERS.every((l) => identifyPoints([...cells].flatMap((v, i) => v === l ? [[i % board.width, Math.floor(i / board.width)]] : [])) === l);
    if (!valid)
      throw new Error(`Entry ${i + 1} is not a valid pentomino grid.`);
    return personalFields(s);
  });
}
// Only personal records go into storage/exports. Reference metadata is always
// looked up from the grid, never trusted from an imported name, number or group.
export const packRecords = (records) =>
  JSON.stringify(
    { version: 1, solutions: records.map(({ reference, ...personal }) => personal) },
    null,
    2,
  );
export function writeCollection(records) {
  localStorage.setItem(STORE, packRecords(records));
}
export function parseImport(text) {
  if (text.trimStart().startsWith('{')) return unpackRecords(text);
  return parseGrids(text).map((cells) => ({ cells }));
}

export function createCollectionStore(lookup) {
  function identify(s) {
    if (!BOARDS.some((b) => b.id === (s?.boardId ?? DEFAULT_BOARD))) throw new Error('Unknown frame.');
    const ref = lookup(s?.cells, s?.boardId ?? DEFAULT_BOARD);
    if (!ref)
      throw new Error(
        'Only complete boards with all twelve verified shapes in the selected frame’s reference can be saved.',
      );
    return ref;
  }
  function titled(s, reference, id) {
    const { name, previousName, ...personal } = personalFields(s, id);
    const alias = previousName || name;
    return {
      ...personal,
      name: reference.name,
      ...(alias && alias !== reference.name && { previousName: alias }),
      reference,
    };
  }
  function readCollection() {
    const text = localStorage.getItem(STORE);
    // Reading a legacy archive does not rewrite it. Its ID, date, as-played
    // orientation and former name survive the next save or export.
    return text ? backupEntries(text).map((s) => titled(s, identify(s))) : [];
  }
  function mergeRecords(existing, incoming) {
    const records = [...existing];
    const numbers = new Set(existing.map((s) => `${s.boardId ?? DEFAULT_BOARD}:${identify(s).number}`));
    let added = 0;
    for (const entry of incoming) {
      const ref = identify(entry);
      const key = `${entry.boardId ?? DEFAULT_BOARD}:${ref.number}`;
      if (numbers.has(key)) continue;
      numbers.add(key);
      records.unshift(titled(entry, ref, crypto.randomUUID()));
      added++;
    }
    return { records, added, skipped: incoming.length - added };
  }
  return { readCollection, mergeRecords };
}
