// Reference snapshots are bundled locally; lookup never sends user data off-device.
import defaultSource from '../reference/isomer-design/solutions.txt?raw';
import three from '../reference/isomer-design/3x20.txt?raw';
import four from '../reference/isomer-design/4x15.txt?raw';
import five from '../reference/isomer-design/5x12.txt?raw';
import a from '../reference/isomer-design/8x8a.txt?raw';
import b from '../reference/isomer-design/8x8b.txt?raw';
import c from '../reference/isomer-design/8x8c.txt?raw';
import d from '../reference/isomer-design/8x8d.txt?raw';
import e from '../reference/isomer-design/8x8e.txt?raw';
import { indexCatalogue, indexFrameCatalogue, X_GROUPS, CATALOGUE_SIZE } from './core/catalogue.js';
import { getBoard, DEFAULT_BOARD } from './core/boards.js';
import { createCollectionStore } from './core/collection.js';
const refs = {
  '6x10': { lookup: indexCatalogue(defaultSource), groups: X_GROUPS, total: CATALOGUE_SIZE, source: '6x10' },
};
for (const [id, source, count, path] of [
  ['3x20', three, 2, '3x20'], ['4x15', four, 368, '4x15'], ['5x12', five, 1010, '5x12'],
  ['8x8-center', a, 65, '8x8a'], ['8x8-inner', b, 21, '8x8b'],
  ['8x8-mid', c, 188, '8x8c'], ['8x8-corners', d, 2170, '8x8d'],
  ['8x8-diagonal', e, 74, '8x8e'],
]) refs[id] = { ...indexFrameCatalogue(source, getBoard(id), count), source: path };
export const catalogueFor = (id = DEFAULT_BOARD) => refs[id] ?? refs[DEFAULT_BOARD];
export const lookupSolution = (cells, boardId = DEFAULT_BOARD) => catalogueFor(boardId).lookup(cells);
export const { readCollection, mergeRecords } = createCollectionStore(lookupSolution);
