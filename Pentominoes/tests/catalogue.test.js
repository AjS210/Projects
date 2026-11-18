import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { indexCatalogue } from '../src/core/catalogue.js';
import { BLANK, SAMPLE, validateBoard, variants } from '../src/core/puzzle.js';
import { lookupSolution, source, mergeRecords } from './fixtures/catalogue.js';

const first = 'FFIIIIILZZVFFYLLLLZNVFYYYYXZZNVVVTWXXXNNPPPTWWXUNUPPTTTWWUUU';
const last = 'UUXIIIIIZZUXXXNTTTZYUUXNNFTZZYVVVNFFTWYYVPPNLFFWWYVPPPLLLLWW';

test('complete published snapshot: every ID, shape, rectangular symmetry and X-position total', () => {
  assert.equal(
    createHash('sha256').update(source.replaceAll('\r\n', '\n')).digest('hex'),
    '57872b391218b56d651b64586fb05ac5a32639a4ad55d1904c6e80f3a40c22eb',
  );
  const lines = source.trim().split(/\r?\n/);
  assert.equal(lines.length, 2339);
  const counts = {};
  for (const [i, line] of lines.entries()) {
    const [id, data] = line.split(',');
    const cells = data.replaceAll(' ', '');
    assert.equal(Number(id), i + 1);
    assert.ok(validateBoard(cells).valid, `Published #${id} must contain all twelve shapes`);
    const ref = lookupSolution(cells);
    assert.equal(ref.number, Number(id));
    // Independent of the indexer's north-arm shortcut: average all five centers.
    const cross = [...cells].flatMap((letter, j) => (letter === 'X' ? [j] : []));
    const row = cross.reduce((n, j) => n + Math.floor(j / 10), 0) / 5;
    const col = cross.reduce((n, j) => n + (j % 10), 0) / 5;
    assert.equal(ref.group, 'ABC'[Math.min(row, 5 - row)] + (1 + Math.min(col, 9 - col)));
    counts[ref.group] = (counts[ref.group] || 0) + 1;
    for (const v of variants(cells)) assert.equal(lookupSolution(v), ref);
  }
  assert.deepEqual(counts, { B3: 389, B4: 342, B5: 291, C2: 442, C3: 262, C4: 276, C5: 337 });
});

test('uses explicit published IDs, not source line order, and never numbers an incomplete grid', () => {
  const lookup = indexCatalogue(source.trim().split(/\r?\n/).reverse().join('\n'));
  assert.deepEqual(lookup(first), { number: 1, group: 'C4', name: 'Solution #1' });
  assert.deepEqual(lookup(last), { number: 2339, group: 'B3', name: 'Solution #2339' });
  assert.deepEqual(lookup(SAMPLE), { number: 2182, group: 'B3', name: 'Solution #2182' });
  for (const invalid of [null, BLANK, first.slice(1), first + 'X', 'F'.repeat(60)])
    assert.equal(lookup(invalid), null);
  assert.throws(() => indexCatalogue(source.replace('   1,', '   2,')), /duplicate/);
  assert.throws(() => indexCatalogue(source.trim().split('\n').slice(1).join('\n')), /totals/);
});

test('imported IDs, groups and labels cannot assign a different identity to a board', () => {
  const cells = variants(first)[1];
  const r = mergeRecords(
    [],
    [{ cells, name: 'Solution #2339', reference: { number: 2339, group: 'B3' } }, { cells: first }],
  );
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 1);
  assert.equal(r.records[0].cells, cells);
  assert.equal(r.records[0].name, 'Solution #1');
  assert.equal(r.records[0].previousName, 'Solution #2339');
  assert.equal(r.records[0].reference.group, 'C4');
});
