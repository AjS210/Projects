import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { scanImage, readFrame } from '../src/core/recognition.js';
import { translateFrame } from '../src/core/photoFrames.js';
import { findScreenBoards } from '../src/core/screenBoards.js';
import { boards, sheetJpg } from './fixtures/sheetPhoto.js';
import { validateBoard } from '../src/core/puzzle.js';

const screen = (options) => jpeg.decode(sheetJpg(options));

test('detects complete flat-color boards in a compressed sheet screenshot without including cut-off boards', () => {
  const image = screen(),
    result = scanImage(image);
  assert.deepEqual(
    result.boards.map((b) => b.cells),
    [boards[0], boards[2]],
  );
  for (const b of result.boards) {
    assert.equal(validateBoard(b.cells).valid, true);
    assert.equal(readFrame(image, b.corners).cells, b.cells);
  }
});
test('keeps fully visible side-by-side boards in reading order, before collection deduplication', () => {
  const found = findScreenBoards(screen({ right: true }));
  assert.deepEqual(
    found.map((b) => b.cells),
    boards,
  );
});

test('Read grid uses the translated frame on a multi-board photo, not the first automatic detection', () => {
  const image = screen({ right: true });
  const { boards: hits } = scanImage(image);
  assert.equal(hits.length, 4);
  for (const target of hits.slice(1)) {
    const first = hits[0].corners;
    const frame = translateFrame(
      first,
      target.corners[0][0] - first[0][0],
      target.corners[0][1] - first[0][1],
    );
    const read = scanImage(image, frame);
    assert.equal(read.cells, target.cells);
    assert.notEqual(read.cells, hits[0].cells);
    assert.equal(read.corners, frame);
  }
});
