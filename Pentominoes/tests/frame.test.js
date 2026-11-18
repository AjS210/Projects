import test from 'node:test';
import assert from 'node:assert/strict';
import { goodFrame, moveLinkedCorner, straightenFrame } from '../src/core/recognition.js';
import { translateFrame, boardAtFrame, rememberReview } from '../src/core/photoFrames.js';

// TL, TR, BR, BL in normalized photo coordinates. Use exact binary fractions
// so an unchanged row/column really must stay unchanged.
const box = [
  [0.125, 0.25],
  [0.75, 0.25],
  [0.75, 0.875],
  [0.125, 0.875],
];
const angled = [
  [0.125, 0.25],
  [0.75, 0.125],
  [0.875, 0.75],
  [0.25, 0.875],
];

for (const [corner, xPartner, yPartner, name] of [
  [0, 3, 1, 'top left'],
  [1, 2, 0, 'top right'],
  [2, 1, 3, 'bottom right'],
  [3, 0, 2, 'bottom left'],
]) {
  test(`${name} links only its column for X and only its row for Y`, () => {
    for (const [dx, dy] of [
      [0.0625, 0],
      [0, -0.03125],
      [0.0625, -0.03125],
    ]) {
      const frame = structuredClone(box);
      const next = moveLinkedCorner(frame, corner, dx, dy);
      for (let i = 0; i < 4; i++) {
        assert.deepEqual(next[i], [
          box[i][0] + (i === corner || i === xPartner ? dx : 0),
          box[i][1] + (i === corner || i === yPartner ? dy : 0),
        ]);
      }
      assert.deepEqual(frame, box, 'reset frame was not mutated');
      assert.ok(goodFrame(next));
    }
  });
}

test('an angled detection keeps its offsets on a nudge and can be straightened explicitly', () => {
  assert.equal(moveLinkedCorner(angled, 0, 0, 0), angled);
  assert.deepEqual(moveLinkedCorner(angled, 2, -0.125, -0.0625), [
    angled[0],
    [0.625, 0.125],
    [0.75, 0.6875],
    [0.25, 0.8125],
  ]);
  const straight = straightenFrame(angled);
  assert.deepEqual(straight, [
    [0.125, 0.125],
    [0.875, 0.125],
    [0.875, 0.875],
    [0.125, 0.875],
  ]);
  assert.deepEqual(moveLinkedCorner(straight, 1, -0.125, 0.125), [
    [0.125, 0.25],
    [0.75, 0.25],
    [0.75, 0.875],
    [0.125, 0.875],
  ]);
});

test('the first linked point to hit a photo boundary stops both on that axis', () => {
  assert.deepEqual(moveLinkedCorner(angled, 3, -10, 10), [
    [0, 0.25],
    angled[1],
    [0.875, 0.875],
    [0.125, 1],
  ]);
  assert.deepEqual(moveLinkedCorner(angled, 0, 0, -10), [
    [0.125, 0.125],
    [0.75, 0],
    angled[2],
    angled[3],
  ]);
});

test('even a single large diagonal drag cannot cross or flip the opposite edges', () => {
  for (const source of [box, angled])
    for (let c = 0; c < 4; c++) {
      const next = moveLinkedCorner(source, c, [5, -5, -5, 5][c], [5, 5, -5, -5][c]);
      assert.ok(goodFrame(next));
      assert.deepEqual(next[(c + 2) % 4], source[(c + 2) % 4]);
      assert.ok(next.flat().every((n) => n >= 0 && n <= 1));
      assert.ok(next[0][0] < next[1][0] && next[3][0] < next[2][0]);
      assert.ok(next[0][1] < next[3][1] && next[1][1] < next[2][1]);
    }
});

test('a small detected rectangle can be enlarged even if it starts below scan size', () => {
  const small = [
    [0.4, 0.4],
    [0.44, 0.4],
    [0.44, 0.44],
    [0.4, 0.44],
  ];
  assert.equal(goodFrame(small), false);
  const grown = moveLinkedCorner(moveLinkedCorner(small, 2, 0.01, 0.01), 2, 0.02, 0.02);
  assert.ok(goodFrame(grown));
});

test('dragging inside moves all four corners without changing their shape or tilt', () => {
  for (const original of [box, angled])
    for (const [dx, dy] of [
      [0, 0.0625],
      [-0.125, 0],
      [0.0625, -0.0625],
    ]) {
      const input = structuredClone(original),
        result = translateFrame(input, dx, dy);
      assert.deepEqual(
        result,
        original.map(([x, y]) => [x + dx, y + dy]),
      );
      assert.deepEqual(input, original);
      assert.ok(goodFrame(result));
    }
});

test('the whole frame stops at the image boundary; the other axis can keep moving', () => {
  assert.equal(translateFrame(angled, 0, 0), angled);
  const topRight = translateFrame(angled, 5, -10);
  assert.deepEqual(
    topRight,
    angled.map(([x, y]) => [x + 0.125, y - 0.125]),
  );
  assert.equal(translateFrame(topRight, 1, -1), topRight);
  assert.deepEqual(
    translateFrame(topRight, 2, 0.25),
    topRight.map(([x, y]) => [x, y + 0.25]),
  );
  assert.deepEqual(
    translateFrame(angled, -2, 8),
    angled.map(([x, y]) => [x - 0.125, y + 0.125]),
  );
});

test('a moved reading belongs to the destination, not board one; custom areas keep the catalogue intact', () => {
  const a = [
    [0, 0],
    [0.5, 0],
    [0.5, 0.25],
    [0, 0.25],
  ];
  const b = translateFrame(a, 0.5, 0.625);
  const detected = [
    { corners: a, cells: 'first detection' },
    { corners: b, cells: 'second detection' },
  ];
  const toSecond = translateFrame(a, 0.5, 0.625);
  const resized = moveLinkedCorner(toSecond, 2, -0.015625, 0);
  assert.equal(boardAtFrame(detected, resized), 1);
  const review = { corners: resized, cells: 'revised reading' };
  const updated = rememberReview(detected, review);
  assert.equal(updated[0], detected[0]);
  assert.deepEqual(updated[1].review, review);
  assert.equal(updated[1].cells, 'second detection');
  assert.deepEqual(updated[1].corners, b);
  assert.equal(detected[1].review, undefined);
  const gap = translateFrame(a, 0, 0.375);
  assert.equal(boardAtFrame(updated, gap), -1);
  assert.equal(rememberReview(updated, { corners: gap, cells: 'unverified' }), updated);
  assert.equal(boardAtFrame([], a), -1);
});
