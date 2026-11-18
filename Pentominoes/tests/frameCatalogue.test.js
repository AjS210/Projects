import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getBoard } from '../src/core/boards.js';
import { frameVariants, indexFrameCatalogue } from '../src/core/catalogue.js';
import { createCollectionStore, packRecords, unpackRecords } from '../src/core/collection.js';
import { identifyPoints, LETTERS } from '../src/core/puzzle.js';

const datasets = [
  ['3x20', '3x20', 2], ['4x15', '4x15', 368], ['5x12', '5x12', 1010],
  ['8x8-center', '8x8a', 65], ['8x8-inner', '8x8b', 21], ['8x8-mid', '8x8c', 188],
  ['8x8-corners', '8x8d', 2170], ['8x8-diagonal', '8x8e', 74],
];
function text(file) { return readFileSync(new URL(`../reference/isomer-design/${file}.txt`, import.meta.url), 'utf8'); }
function cells(line) { return line.trim().split(/\s+/).slice(1).join(''); }

test('all frame references have valid pieces, published numbers and frame-preserving symmetry', () => {
  for (const [id, file, total] of datasets) {
    const board = getBoard(id), lines = text(file).trim().split('\n');
    const index = indexFrameCatalogue(text(file), board, total);
    assert.equal(Object.values(index.groups).reduce((a, b) => a + b, 0), total);
    for (const [i, line] of lines.entries()) {
      const grid = cells(line), ref = index.lookup(grid);
      assert.equal(ref.number, i + 1, `${id} #${i + 1}`);
      for (const letter of LETTERS) {
        const points = [...grid].flatMap((l, p) => l === letter ? [[p % board.width, Math.floor(p / board.width)]] : []);
        assert.equal(identifyPoints(points), letter, `${id} #${i + 1} ${letter}`);
      }
      for (const variant of frameVariants(grid, board)) assert.equal(index.lookup(variant), ref);
    }
  }
  assert.deepEqual(indexFrameCatalogue(text('8x8e'), getBoard('8x8-diagonal'), 74).groups, { B4: 11, B6: 21, C5: 42 });
});

test('separate frames can save the same numbered solution and round trip a backup', () => {
  const indices = Object.fromEntries(datasets.map(([id, file, n]) => [id, indexFrameCatalogue(text(file), getBoard(id), n)]));
  const lookup = (grid, id) => indices[id]?.lookup(grid);
  const { mergeRecords } = createCollectionStore(lookup);
  const first = datasets.map(([boardId, file]) => ({ boardId, cells: cells(text(file).split('\n')[0]) }));
  const { records, added } = mergeRecords([], [...first, first[0]]);
  assert.equal(added, 8);
  assert.equal(unpackRecords(packRecords(records)).length, 8);
  assert.equal(mergeRecords([], unpackRecords(packRecords(records))).added, 8);
});
