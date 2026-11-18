import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asTable,
  BLANK,
  canonicalKey,
  identify,
  LETTERS,
  parseGrids,
  PIECES,
  pointsFor,
  SAMPLE,
  validateBoard,
  variants,
} from '../src/core/puzzle.js';
import { packRecords, parseImport, unpackRecords } from '../src/core/collection.js';
import { mergeRecords } from './fixtures/catalogue.js';

const OTHER = 'IVVVTTTPPPIVUUUTWWPPIVUZUTFWWLIZZZFFFXWLIZYNNFXXXLYYYYNNNXLL';

test('identifies all 12 free pentominoes in every orientation', () => {
  for (const l of LETTERS)
    for (const flip of [1, -1]) {
      let points = pointsFor(l).map(([x, y]) => [flip * x, y]);
      for (let r = 0; r < 4; r++) {
        const minX = Math.min(...points.map((p) => p[0])),
          minY = Math.min(...points.map((p) => p[1]));
        assert.equal(identify(points.map(([x, y]) => (y - minY + 1) * 10 + x - minX + 2)), l);
        points = points.map(([x, y]) => [-y, x]);
      }
    }
});
test('validates shapes, not just the counts of their letters', () => {
  assert.equal(validateBoard(SAMPLE).valid, true);
  assert.equal(validateBoard(OTHER).found, 12);
  const groupedOnlyByLetter = [...LETTERS].map((l) => l.repeat(5)).join('');
  assert.equal(validateBoard(groupedOnlyByLetter).valid, false);
  assert.equal(validateBoard(BLANK).found, 0);
  assert.equal(validateBoard(SAMPLE + '.').valid, false);
  assert.equal(validateBoard('F' + SAMPLE.slice(1)).valid, false);
});
test('letters remain readable on all twelve lid colors, including the neutral pieces', () => {
  function luminance(hex) {
    const [r, g, b] = Array.from(Buffer.from(hex.slice(1), 'hex'), (byte) => {
      const c = byte / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  for (const [letter, { color, ink }] of Object.entries(PIECES)) {
    const [dark, light] = [luminance(ink), luminance(color)].sort((a, b) => a - b);
    assert.ok((light + 0.05) / (dark + 0.05) >= 4.5, `Letter ${letter} needs more contrast`);
  }
});
test('rectangular symmetry treats both reflections and the half turn as one, not unrelated boards', () => {
  assert.equal(new Set(variants(SAMPLE)).size, 4);
  for (const cells of variants(SAMPLE)) {
    assert.equal(validateBoard(cells).valid, true);
    assert.equal(canonicalKey(cells), canonicalKey(SAMPLE));
  }
  assert.notEqual(canonicalKey(SAMPLE), canonicalKey(OTHER));
});
test('accepts tab-separated Sheets ranges, CSV, stacked blocks, and portrait grids', () => {
  const tsv = asTable(SAMPLE),
    csv = asTable(OTHER).replaceAll('\t', ',').toLowerCase();
  assert.deepEqual(parseGrids('\ufeff' + tsv + '\r\n\r\n' + csv), [SAMPLE, OTHER]);
  const portrait = Array.from({ length: 10 }, (_, x) =>
    Array.from({ length: 6 }, (_, y) => SAMPLE[y * 10 + x]).join('\t'),
  ).join('\n');
  assert.equal(canonicalKey(parseGrids(portrait)[0]), canonicalKey(SAMPLE));
});
test('refuses incomplete, incorrectly shaped, or unrecognized imported grids', () => {
  for (const invalid of [
    '',
    'FIL',
    asTable(BLANK),
    asTable('I'.repeat(60)),
    asTable(SAMPLE).split('\n').slice(0, 5).join('\n'),
  ])
    assert.throws(() => parseGrids(invalid));
  assert.throws(() => parseGrids(asTable(SAMPLE) + '\n' + asTable(BLANK)), /Grid 2/);
});
test('import merges without replacing stored grids or duplicating a reflected entry', () => {
  const original = mergeRecords([], [{ name: 'Sunday puzzle', cells: SAMPLE }]);
  const next = mergeRecords(
    original.records,
    variants(SAMPLE)
      .concat([OTHER, OTHER])
      .map((cells) => ({ cells })),
  );
  assert.equal(original.records.length, 1);
  assert.equal(next.records.length, 2);
  assert.equal(next.added, 1);
  assert.equal(next.skipped, 5);
  assert.equal(next.records[1].name, 'Solution #2182');
  assert.equal(next.records[1].previousName, 'Sunday puzzle');
});
test('backups round-trip names and grids; malformed backups cannot be merged', () => {
  const { records } = mergeRecords([], [{ cells: SAMPLE, name: 'First solve' }]);
  const [{ reference, ...personal }] = records;
  assert.deepEqual(unpackRecords(packRecords(records)), [personal]);
  assert.deepEqual(parseImport(packRecords(records)), [personal]);
  assert.equal(reference.name, personal.name);
  assert.equal(personal.previousName, 'First solve');
  assert.throws(() => parseImport('{"version":1,"solutions":[{"cells":"no"}]}'), /not a valid/);
  assert.throws(() => parseImport('{"version":2}'), /not a PentoLog/);
});
