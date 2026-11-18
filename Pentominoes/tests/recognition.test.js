import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jpeg from 'jpeg-js';
import {
  BLANK,
  canonicalKey,
  LETTERS,
  PIECES,
  SAMPLE,
  SAMPLE_FRAME,
  SAMPLE_PHOTO,
  validateBoard,
  variants,
} from '../src/core/puzzle.js';
import { FULL_FRAME, goodFrame, projector, readFrame, scanImage } from '../src/core/recognition.js';

const sampleFile = new URL(SAMPLE_PHOTO.url, new URL('../public/', import.meta.url));
const loadSample = () => jpeg.decode(readFileSync(sampleFile));
const OTHER = 'IVVVTTTPPPIVUUUTWWPPIVUZUTFWWLIZZZFFFXWLIZYNNFXXXLYYYYNNNXLL';
// A different layout, arbitrary colors, subtle lighting variation, and physical seams.
function renderBoard(cells, monochrome = false) {
  const u = 26,
    width = u * 10,
    height = u * 6;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        c = Math.floor(y / u) * 10 + Math.floor(x / u),
        k = LETTERS.indexOf(cells[c]);
      const seam =
        (x % u < 2 && x >= u && cells[c - 1] !== cells[c]) ||
        (y % u < 2 && y >= u && cells[c - 10] !== cells[c]);
      const color = monochrome
        ? [175, 153, 123]
        : [55 + ((k * 149) % 180), 60 + ((k * 83) % 180), 60 + ((k * 41) % 175)];
      const light = 1 - (0.12 * x) / width + 0.03 * Math.sin(y * 0.13);
      data.set([...color.map((n) => (seam ? 40 : n * light)), 255], i * 4);
    }
  return { data, width, height };
}
function rotate(image) {
  const { width: h, height: w, data: original } = image,
    data = new Uint8ClampedArray(original.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const src = ((w - 1 - x) * h + y) * 4;
      data.set(original.subarray(src, src + 4), 4 * (y * w + x));
    }
  return { width: w, height: h, data };
}
test('projective mapping respects all four perspective corners; crossing them is invalid', () => {
  const frame = [
    [0.12, 0.25],
    [0.88, 0.08],
    [0.95, 0.74],
    [0.18, 0.93],
  ];
  const project = projector(frame);
  FULL_FRAME.forEach(([u, v], i) =>
    project(u, v).forEach((n, axis) => assert.ok(Math.abs(n - frame[i][axis]) < 1e-8)),
  );
  assert.equal(goodFrame(frame), true);
  assert.equal(goodFrame([frame[0], frame[2], frame[1], frame[3]]), false);
});
test('automatically finds and reads the bundled perspective photograph from its pixels', () => {
  const image = loadSample();
  const result = scanImage(image);
  assert.equal(result.found, 12);
  assert.equal(result.cells, SAMPLE);
});
test('the sample frame and display swatches match the pack-away solution on the lid', () => {
  const image = loadSample();
  assert.deepEqual([image.width, image.height], [SAMPLE_PHOTO.width, SAMPLE_PHOTO.height]);
  const rows = ['UUXTTTFFWW', 'UXXXTFFWWN', 'UUXLTZFWNN', 'LLLLYZZZNV', 'PPPYYYYZNV', 'PPIIIIIVVV'];
  assert.equal(SAMPLE, rows.join('')); // The guide must not be mirrored or turned.
  assert.equal(readFrame(image, SAMPLE_FRAME).cells, SAMPLE);

  // The reader checks shapes, so a photo with two piece colors swapped could still
  // pass recognition. Compare each cell face to its UI swatch, allowing for grain and light.
  const project = projector(SAMPLE_FRAME);
  for (const [i, letter] of [...SAMPLE].entries()) {
    const [x, y] = project(((i % 10) + 0.5) / 10, (Math.floor(i / 10) + 0.5) / 6);
    const pixel =
      4 * (Math.round(y * (image.height - 1)) * image.width + Math.round(x * (image.width - 1)));
    const rgb = Buffer.from(PIECES[letter].color.slice(1), 'hex');
    assert.ok(
      rgb.every((v, c) => Math.abs(v - image.data[pixel + c]) <= 20),
      `Cell ${i}: ${letter}`,
    );
  }
});
test('a different board, color palette and mirror produce the actual new grid, not the demo', () => {
  for (const expected of [OTHER, variants(OTHER)[1]]) {
    const result = scanImage(renderBoard(expected));
    assert.equal(result.cells, expected);
    assert.equal(result.found, 12);
  }
});
test('normalizes a portrait photograph to the same landscape solution', () => {
  const result = scanImage(rotate(renderBoard(OTHER)));
  assert.equal(result.found, 12);
  assert.equal(canonicalKey(result.cells), canonicalKey(OTHER));
});
test('visible seams can distinguish adjacent pieces even when colors are identical', () => {
  const result = readFrame(renderBoard(OTHER, true), FULL_FRAME);
  assert.equal(result.cells, OTHER);
});
test('blank photos and obscured pieces never get a fabricated completion', () => {
  const blank = { width: 200, height: 130, data: new Uint8ClampedArray(200 * 130 * 4).fill(200) };
  assert.equal(scanImage(blank).cells, BLANK);
  const partial = renderBoard(OTHER);
  partial.data.fill(185, 0, partial.width * 26 * 2 * 4);
  const result = readFrame(partial, FULL_FRAME);
  assert.ok(result.found > 0 && result.found < 12);
  assert.equal(validateBoard(result.cells).valid, false);
});

test('recovers a recompressed photograph after resizing and turning the camera', () => {
  const src = loadSample();
  const width = 740,
    height = Math.round((src.height / src.width) * width),
    data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p =
        4 *
        (Math.floor((y * src.height) / height) * src.width + Math.floor((x * src.width) / width));
      data.set(src.data.subarray(p, p + 4), 4 * (y * width + x));
    }
  const photo = jpeg.decode(jpeg.encode(rotate({ width, height, data }), 82).data);
  assert.equal(canonicalKey(scanImage(photo).cells), canonicalKey(SAMPLE));
});

test('locates another tiling photographed at an angle on a larger background', () => {
  const board = renderBoard(OTHER),
    width = 570,
    height = 375;
  const data = new Uint8ClampedArray(width * height * 4);
  const ax = 365,
    ay = -65,
    bx = 43,
    by = 219,
    det = ax * by - ay * bx;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const dx = x - 73,
        dy = y - 103,
        u = (dx * by - dy * bx) / det,
        v = (ax * dy - ay * dx) / det;
      const i = 4 * (y * width + x);
      if (u >= 0 && u < 1 && v >= 0 && v < 1) {
        const p = 4 * (Math.floor(v * board.height) * board.width + Math.floor(u * board.width));
        data.set(board.data.subarray(p, p + 4), i);
      } else {
        data.set([193 + Math.round(3 * Math.sin(x / 30)), 178, 159, 255], i);
      }
    }
  assert.equal(scanImage({ width, height, data }).cells, OTHER);
});
