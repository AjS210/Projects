import test from 'node:test';
import assert from 'node:assert/strict';
import { BLANK, COLS, LETTERS, identify, pointsFor, validateBoard } from '../src/core/puzzle.js';
import {
  fits,
  gameCells,
  handleSquare,
  newGame,
  placePiece,
  transformed,
  turnPiece,
} from '../src/core/game.js';
import { readGameDraft, writeGameDraft } from '../src/core/gameDraft.js';
import { lookupSolution } from './fixtures/catalogue.js';

const indices = (p) => p.map(([x, y]) => x + COLS * y);

test('the tray contains one of each real piece, with occupied handles in every orientation', () => {
  const game = newGame();
  assert.deepEqual(Object.keys(game), LETTERS);
  assert.equal(gameCells(game), BLANK);
  for (const l of LETTERS) {
    const { at, points } = game[l];
    assert.equal(at, null);
    let p = points;
    for (let i = 0; i < 4; i++) {
      for (const q of [p, transformed(p, 'horizontal'), transformed(p, 'vertical')]) {
        assert.equal(identify(indices(q)), l);
        assert.ok(indices(q).includes(indices([handleSquare(q)])[0]));
        assert.deepEqual(transformed(transformed(q, 'horizontal'), 'horizontal'), q);
        assert.deepEqual(transformed(transformed(q, 'vertical'), 'vertical'), q);
      }
      p = transformed(p, 'rotate');
    }
    assert.deepEqual(p, points, 'four clockwise turns');
    assert.deepEqual(points, pointsFor(l), 'no mutation of starting shapes');
  }
  // Asymmetric F distinguishes the two mirrors and the direction of rotation.
  assert.deepEqual(indices(transformed(game.F.points, 'horizontal')), [0, 1, 11, 12, 21]);
  assert.deepEqual(indices(transformed(game.F.points, 'vertical')), [1, 10, 11, 21, 22]);
  assert.deepEqual(indices(transformed(game.F.points, 'rotate')), [1, 10, 11, 12, 22]);
});

test('placements and turns are atomic, in bounds, and never overlap another piece', () => {
  const empty = newGame();
  let game = placePiece(empty, 'I', [5, 5]);
  assert.equal(gameCells(game), '.'.repeat(55) + 'IIIII');
  assert.equal(gameCells(empty), BLANK);
  for (const at of [
    [6, 5],
    [5, 6],
    [-1, 0],
    [0, -1],
    [0.5, 0],
    [0, NaN],
  ]) {
    assert.equal(placePiece(game, 'I', at), game);
  }
  assert.equal(turnPiece(game, 'I', 'rotate'), game, 'no turn through the bottom edge');
  game = placePiece(game, 'I', [0, 0]);
  assert.ok(fits(game, 'I', [1, 0]), 'ignore only the moving piece');
  assert.ok(!fits(game, 'X', [0, 0]));
  game = placePiece(game, 'X', [0, 1]);
  assert.equal(turnPiece(game, 'I', 'rotate'), game, 'no turn into an occupied square');
  game = placePiece(game, 'X', null);
  game = turnPiece(game, 'I', 'rotate');
  assert.deepEqual(
    Array.from(gameCells(game)).flatMap((l, i) => (l === 'I' ? [i] : [])),
    [0, 10, 20, 30, 40],
  );
  const returned = placePiece(game, 'I', null);
  assert.equal(gameCells(returned), BLANK);
  assert.deepEqual(returned.I.points, game.I.points, 'returning does not unrotate the piece');
});

test('placing twelve whole pieces reconstructs official #1 without solving or renumbering it', () => {
  const actions = { H: 'horizontal', V: 'vertical', R: 'rotate' };
  let game = newGame();
  const plan = [
    ['F', 'H', 0, 0],
    ['I', '', 2, 0],
    ['L', 'HVR', 4, 0],
    ['N', 'HVR', 8, 1],
    ['P', 'VR', 0, 4],
    ['T', 'V', 2, 3],
    ['U', '', 7, 4],
    ['V', '', 0, 1],
    ['W', '', 4, 3],
    ['X', '', 5, 2],
    ['Y', '', 2, 1],
    ['Z', 'H', 7, 0],
  ];
  for (const [l, sequence, x, y] of plan) {
    assert.equal(lookupSolution(gameCells(game)), null, 'partial games never identify as solves');
    for (const op of sequence) game = turnPiece(game, l, actions[op]);
    assert.ok(fits(game, l, [x, y]));
    game = placePiece(game, l, [x, y]);
  }
  const cells = gameCells(game);
  assert.equal(cells, 'FFIIIIILZZVFFYLLLLZNVFYYYYXZZNVVVTWXXXNNPPPTWWXUNUPPTTTWWUUU');
  assert.ok(validateBoard(cells).valid);
  assert.deepEqual(lookupSolution(cells), { number: 1, group: 'C4', name: 'Solution #1' });
});

test('tab drafts keep tray orientations and restore only legal nonoverlapping positions', () => {
  let text = null;
  const storage = {
    getItem: () => text,
    setItem: (_key, val) => {
      text = val;
    },
  };
  const game = turnPiece(placePiece(newGame(), 'X', [1, 0]), 'F', 'vertical');
  writeGameDraft(game, storage);
  assert.deepEqual(readGameDraft(storage), game);
  const overlap = { ...game, I: { ...game.I, at: [0, 1] } };
  const badShape = { ...game, T: { points: pointsFor('I'), at: null } };
  const offBoard = { ...game, X: { ...game.X, at: [9, 5] } };
  for (const bad of [
    null,
    '{',
    '{}',
    ...[overlap, badShape, offBoard].map((v) => JSON.stringify(v)),
  ]) {
    text = bad;
    assert.deepEqual(readGameDraft(storage), newGame());
  }
  const fail = () => {
    throw new Error('storage unavailable');
  };
  const blocked = { getItem: fail, setItem: fail };
  assert.doesNotThrow(() => writeGameDraft(game, blocked));
  assert.deepEqual(readGameDraft(blocked), newGame());
});
