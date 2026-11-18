import test from 'node:test';
import assert from 'node:assert/strict';
import { BLANK, COLS, LETTERS, identify, pointsFor, validateBoard } from '../src/core/puzzle.js';
import {
  bringForward,
  pickPiece,
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
  assert.deepEqual(Object.keys(game.pieces), LETTERS);
  assert.equal(gameCells(game), BLANK);
  for (const l of LETTERS) {
    const { at, points } = game.pieces[l];
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
  assert.deepEqual(indices(transformed(game.pieces.F.points, 'horizontal')), [0, 1, 11, 12, 21]);
  assert.deepEqual(indices(transformed(game.pieces.F.points, 'vertical')), [1, 10, 11, 21, 22]);
  assert.deepEqual(indices(transformed(game.pieces.F.points, 'rotate')), [1, 10, 11, 12, 22]);
});

test('temporary overlaps retain whole pieces; moves, turns and selections bring one to the front', () => {
  const empty = newGame();
  let game = placePiece(placePiece(empty, 'X', [0, 0]), 'I', [0, 1]);
  assert.equal(gameCells(empty), BLANK);
  assert.deepEqual(game.stack, ['X', 'I']);
  assert.equal(gameCells(game).slice(10, 15), 'IIIII');
  game = bringForward(game, 'X');
  assert.equal(gameCells(game).slice(10, 15), 'XXXII');
  const under = game.pieces.X;
  game = turnPiece(game, 'I', 'rotate');
  assert.equal(game.pieces.X, under);
  assert.deepEqual(game.stack, ['X', 'I']);
  assert.deepEqual(game.pieces.I.points, transformed(pointsFor('I'), 'rotate'));
  game = placePiece(game, 'I', null);
  assert.deepEqual(game.pieces.I, { points: pointsFor('I'), at: null });
  assert.equal([...gameCells(game)].filter((l) => l === 'X').length, 5);
  assert.equal(turnPiece(game, 'I', 'rotate'), game, 'never manipulate the tray');
  game = pickPiece(game, 'I');
  assert.ok(game.pieces.I.at, 'choosing a tray piece puts it on the field immediately');
  assert.equal(pickPiece(game, 'I'), game, 'choosing an on-board piece does not relocate it');
});

test('rim turns and drops slide inside, even on occupied squares', () => {
  let game = placePiece(newGame(), 'I', [9, 5]);
  assert.deepEqual(game.pieces.I.at, [5, 5]);
  game = placePiece(game, 'X', [6, 3]);
  game = turnPiece(game, 'I', 'rotate');
  assert.deepEqual(game.pieces.I.at, [7, 1]);
  assert.equal(gameCells(game)[47], 'I');
  for (const turn of ['horizontal', 'vertical', 'rotate']) {
    game = turnPiece(game, 'I', turn);
    for (const [x, y] of game.pieces.I.points) {
      assert.ok(game.pieces.I.at[0] + x < 10 && game.pieces.I.at[1] + y < 6);
    }
  }
  for (const at of [[0.5, 0], [0, NaN], [0]]) assert.equal(placePiece(game, 'I', at), game);
});

test('putting all twelve pieces on the board is not by itself a solution', () => {
  let game = newGame();
  for (const l of LETTERS) game = pickPiece(game, l);
  assert.equal(game.stack.length, 12);
  assert.ok(gameCells(game).includes('.'));
  assert.equal(lookupSolution(gameCells(game)), null);
  for (const l of LETTERS) {
    game = pickPiece(game, l);
    assert.equal(
      [...gameCells(game)].filter((c) => c === l).length,
      5,
      'even a buried piece is recoverable',
    );
  }
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
    game = pickPiece(game, l);
    for (const op of sequence) game = turnPiece(game, l, actions[op]);
    game = placePiece(game, l, [x, y]);
  }
  const cells = gameCells(game);
  assert.equal(cells, 'FFIIIIILZZVFFYLLLLZNVFYYYYXZZNVVVTWXXXNNPPPTWWXUNUPPTTTWWUUU');
  assert.ok(validateBoard(cells).valid);
  assert.deepEqual(lookupSolution(cells), { number: 1, group: 'C4', name: 'Solution #1' });
});

test('tab drafts round-trip overlapping layers, accept old placements and reject corrupt geometry/order', () => {
  let text;
  const storage = {
    getItem: () => text,
    setItem: (_, v) => {
      text = v;
    },
  };
  let game = placePiece(placePiece(newGame(), 'X', [1, 0]), 'I', [0, 1]);
  game = turnPiece(game, 'X', 'rotate');
  writeGameDraft(game, storage);
  assert.deepEqual(readGameDraft(storage), game);
  const legacy = {
    ...newGame().pieces,
    F: { points: transformed(pointsFor('F'), 'rotate'), at: [1, 1] },
    T: { points: transformed(pointsFor('T'), 'vertical'), at: null },
  };
  text = JSON.stringify(legacy);
  const migrated = readGameDraft(storage);
  assert.deepEqual(migrated.stack, ['F']);
  assert.deepEqual(migrated.pieces.F, legacy.F);
  assert.deepEqual(migrated.pieces.T.points, pointsFor('T'));
  const badPiece = (changes) => ({ ...game, pieces: { ...game.pieces, ...changes } });
  for (const bad of [
    null,
    '{',
    '{}',
    ...[
      { ...game, stack: ['I', 'I'] },
      { ...game, stack: ['X'] },
      { ...game, stack: ['I', 'T'] },
      badPiece({ T: { points: pointsFor('I'), at: null } }),
      badPiece({ X: { ...game.pieces.X, at: [9, 5] } }),
    ].map((v) => JSON.stringify(v)),
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
