import test from 'node:test';
import assert from 'node:assert/strict';
import { openPhone } from './site.js';
import { STORE } from '../../src/core/collection.js';
import { DRAFT_KEY } from '../../src/core/gameDraft.js';
import { BLANK, SAMPLE, asTable, variants } from '../../src/core/puzzle.js';
import { boards, sheetJpg } from '../fixtures/sheetPhoto.js';

const center = async (loc) => {
  const { x, y, width, height } = await loc.boundingBox();
  return { x: x + width / 2, y: y + height / 2 };
};
const tools = (page) => {
  const game = page.getByRole('region', { name: 'Game board', exact: true });
  const grid = page.getByRole('region', { name: 'Solution grid', exact: true });
  return {
    game,
    grid,
    tile: (l) => game.getByRole('button', { name: new RegExp(`^${l} piece,`) }),
    cell: (i) => game.locator(`[data-square="${i}"]`),
    read: () =>
      game
        .locator('[data-square]')
        .evaluateAll((els) => els.map((el) => el.dataset.piece).join('')),
    saved: () => page.evaluate((key) => localStorage.getItem(key), STORE),
    scan: async () => (await grid.locator('.cell-letter').allTextContents()).join(''),
    action: (name) => game.getByRole('button', { name, exact: true }),
  };
};

test('finger and mouse drags snap the whole piece, keep the grabbed square, reject collisions and cancel safely', async (t) => {
  const page = await openPhone(t);
  page.setDefaultTimeout(6000);
  const { game, tile, cell, read, scan, saved, action } = tools(page);
  await game.scrollIntoViewIfNeeded();
  const touch = await page.context().newCDPSession(page);
  const send = (type, points = []) =>
    touch.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const drag = async (from, to, check, cancel = false) => {
    await send('touchStart', [await center(from)]);
    await send('touchMove', [await center(to)]);
    if (check) await check();
    await send(cancel ? 'touchCancel' : 'touchEnd');
    await page.locator('.drag-ghost').waitFor({ state: 'detached' });
  };
  const indices = (s, l) => Array.from(s).flatMap((v, i) => (v === l ? [i] : []));
  assert.equal(await read(), BLANK);
  assert.equal(await tile('X').getAttribute('aria-pressed'), 'false');
  assert.ok(await action('Flip horizontal').isDisabled());
  assert.equal(await game.getByRole('button', { name: 'Save solution' }).count(), 0);
  await drag(tile('X'), cell(12), async () => {
    await page.getByText('Release to place X.').waitFor();
    assert.equal(await read(), BLANK, 'a preview does not commit');
  });
  assert.deepEqual(indices(await read(), 'X'), [2, 11, 12, 13, 22]);
  await drag(cell(2), cell(5)); // move the north arm, not the center
  assert.deepEqual(indices(await read(), 'X'), [5, 14, 15, 16, 25]);
  const original = await read();
  for (const to of [cell(15), cell(9)]) {
    // through the cross; through the rim
    await drag(tile('I'), to, () => page.locator('.drag-ghost.blocked').waitFor());
    assert.equal(await read(), original);
  }
  await drag(cell(14), cell(31), () => page.getByText('Release to place X.').waitFor(), true);
  assert.equal(await read(), original, 'system gesture cancellation keeps the old placement');
  await drag(cell(15), tile('X'));
  assert.equal(await read(), BLANK);
  // Mouse and touch use the same geometry even after a viewport change.
  await page.setViewportSize({ width: 1280, height: 920 });
  await game.scrollIntoViewIfNeeded();
  const a = await center(tile('I')),
    b = await center(cell(52));
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  const floor = await read();
  assert.deepEqual(indices(floor, 'I'), [50, 51, 52, 53, 54]);
  await action('Rotate 90°').click();
  await game.getByText(/Not enough room to turn I/).waitFor();
  assert.equal(await read(), floor);
  await action('Return to tray').click();
  assert.equal(await read(), BLANK);
  await tile('F').click();
  await cell(22).click();
  assert.deepEqual(indices(await read(), 'F'), [12, 13, 21, 22, 32]);
  await action('Flip horizontal').click();
  assert.deepEqual(indices(await read(), 'F'), [11, 12, 22, 23, 32]);
  await action('Flip vertical').click();
  assert.deepEqual(indices(await read(), 'F'), [12, 22, 23, 31, 32]);
  await action('Rotate 90°').click();
  assert.deepEqual(indices(await read(), 'F'), [11, 21, 22, 23, 32]);
  assert.equal(await scan(), SAMPLE);
  assert.equal(await saved(), null);
});

test('a phone playthrough saves the played grid, not the default grid, and shares catalogue deduplication', async (t) => {
  const page = await openPhone(t);
  page.setDefaultTimeout(6500);
  const { game, grid, tile, cell, read, scan, saved, action } = tools(page);
  const first = 'FFIIIIILZZVFFYLLLLZNVFYYYYXZZNVVVTWXXXNNPPPTWWXUNUPPTTTWWUUU';
  const labels = { H: 'Flip horizontal', V: 'Flip vertical', R: 'Rotate 90°' };
  // Actions are in screen space; coordinates below are the *marked squares*,
  // not an implementation's bounding-box origins. Every input is public UI.
  const plan = [
    ['F', 'H', 11],
    ['I', '', 4],
    ['L', 'HVR', 16],
    ['N', 'HVR', 39],
    ['P', 'VR', 41],
    ['T', 'V', 43],
    ['U', '', 58],
    ['V', '', 20],
    ['W', '', 45],
    ['X', '', 36],
    ['Y', '', 23],
    ['Z', 'H', 18],
  ];
  for (const [l, moves, i] of plan) {
    await tile(l).tap();
    for (const turn of moves) await action(labels[turn]).tap();
    if (l === 'I') {
      await tile(l).press('Enter'); // keyboard selection sends focus to the board
      assert.ok(await page.locator('[data-square]:focus').count());
      await cell(3).focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(
        await page.locator('[data-square]:focus').getAttribute('data-square'),
        String(i),
      );
      await page.keyboard.press('Enter');
    } else await cell(i).tap();
    assert.equal((await read()).split(l).length - 1, 5);
  }
  await game.getByText('Solution #1', { exact: true }).waitFor();
  await game.getByText('New to you · X group C4').waitFor();
  assert.equal(await read(), first);
  assert.equal(await scan(), SAMPLE);
  assert.equal(await saved(), null, 'finishing is not an automatic save');
  await action('Save solution').tap();
  const save = page.getByRole('dialog', { name: 'Save Solution #1', exact: true });
  await save.getByRole('button', { name: 'Save to collection' }).tap();
  const backup = await saved();
  assert.deepEqual(
    JSON.parse(backup).solutions.map((s) => [s.name, s.cells]),
    [['Solution #1', first]],
  );
  await page.getByRole('link', { name: /^Collection/ }).tap();
  await page.getByRole('button', { name: 'Open solution: Solution #1' }).waitFor();
  await page.getByRole('link', { name: 'Workspace', exact: true }).tap();
  await game.waitFor();
  assert.equal(await read(), first, 'visiting Collection does not reset the game');
  await action('View entry').tap();
  const detail = page.getByRole('dialog', { name: 'Solution #1', exact: true });
  await detail.getByText('X group C4', { exact: true }).waitFor();
  await detail.getByRole('button', { name: 'Close dialog' }).tap();
  // A mirrored copy in the independent photo/letter editor is already saved.
  await grid.getByRole('button', { name: 'Edit grid' }).tap();
  const editor = page.getByRole('dialog', { name: 'Edit solution grid' });
  await editor.getByRole('button', { name: 'Paste a grid from Sheets' }).tap();
  await editor.getByRole('textbox', { name: 'Grid letters' }).fill(asTable(variants(first)[1]));
  await editor.getByRole('button', { name: 'Use pasted grid' }).tap();
  await editor.getByRole('button', { name: 'Apply changes' }).tap();
  await grid.getByText(/Already saved · X group C4 · Left–right mirror/).waitFor();
  assert.equal(await read(), first);
  await action('Start over').tap();
  await page.getByRole('button', { name: 'Keep playing' }).tap();
  assert.equal(await read(), first);
  await action('Start over').tap();
  await page.getByRole('button', { name: 'Start new game' }).tap();
  assert.equal(await read(), BLANK);
  assert.equal(await scan(), variants(first)[1]);
  assert.equal(await saved(), backup, 'reset touches neither the archive nor the photo grid');
});

test('all photo controls live in Solution grid and reading a multi-board photo leaves the game alone', async (t) => {
  const page = await openPhone(t);
  page.setDefaultTimeout(6500);
  const { game, grid, tile, cell, read, scan, saved } = tools(page);
  for (const name of [/Upload a photo or screenshot/, /^Use camera$/]) {
    assert.equal(await game.getByRole('button', { name }).count(), 0);
    assert.ok(await grid.getByRole('button', { name }).isEnabled());
  }
  assert.equal(await game.getByRole('button', { name: 'Adjust frame' }).count(), 0);
  assert.ok(await grid.getByRole('button', { name: 'Adjust frame' }).isDisabled());
  await tile('T').tap();
  await cell(22).tap();
  const before = await read();
  await page.reload();
  await game.waitFor();
  assert.equal(await read(), before, 'same-tab refresh resumes the puzzle but never adds a solve');
  const chooser = page.waitForEvent('filechooser');
  await grid.getByRole('button', { name: /Upload a photo or screenshot/ }).tap();
  await (
    await chooser
  ).setFiles({
    name: 'four-boards.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(sheetJpg({ right: true })),
  });
  const picker = page.getByRole('dialog', { name: '4 boards found' });
  await picker.getByRole('button', { name: 'Review board 3', exact: true }).tap();
  await grid.getByText('Board 3 of 4', { exact: true }).waitFor();
  assert.equal(await scan(), boards[2]);
  await grid.getByRole('button', { name: 'View photo' }).tap();
  await page
    .getByRole('dialog', { name: 'Your board photo' })
    .getByRole('button', { name: 'Adjust frame' })
    .tap();
  await page.getByRole('button', { name: 'Read grid', exact: true }).tap();
  await grid.locator('.result-unique').waitFor();
  assert.equal(await scan(), boards[2]);
  assert.notEqual(boards[2], SAMPLE);
  await page.getByRole('button', { name: 'Quick guide' }).tap();
  await page.getByRole('button', { name: 'Load lid solution' }).tap();
  await grid.locator('.scan-source').waitFor({ state: 'detached' });
  assert.equal(await scan(), SAMPLE);
  assert.equal(await grid.getByRole('button', { name: /Choose from/ }).count(), 0);
  assert.ok(await grid.getByRole('button', { name: 'Adjust frame' }).isDisabled());
  assert.equal(await read(), before);
  assert.equal(await saved(), null);
});

test('rotating a phone puts the tray beside the field and the scanner below, without restarting play', async (t) => {
  const page = await openPhone(t);
  page.setDefaultTimeout(6500);
  const { game, tile, cell, read, saved, action } = tools(page);
  const boxes = (view = page) =>
    Promise.all(
      ['.game-panel', '.grid-panel', '.game-plane', '.game-tray'].map((s) =>
        view.locator(s).boundingBox(),
      ),
    );
  const draft = () => page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY);
  await tile('X').tap();
  await cell(12).tap();
  await tile('I').tap();
  await action('Rotate 90°').tap();
  const started = await draft();
  const [, , uprightBoard, uprightRack] = await boxes();
  assert.ok(
    uprightRack.y >= uprightBoard.y + uprightBoard.height,
    'portrait tray stays underneath',
  );

  // Include both sides of the old 760px breakpoint, several Galaxy screen zoom
  // sizes and a short viewport with browser chrome. No reload between sizes.
  for (const [width, height] of [
    [480, 320],
    [568, 320],
    [667, 375],
    [740, 360],
    [844, 390],
    [915, 300],
    [915, 412],
    [1024, 510],
    [1280, 560],
    [854, 384],
  ]) {
    await page.setViewportSize({ width, height });
    await game.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const [card, scanner, board, tray] = await boxes();
    assert.ok(
      card.width >= width - 24 && card.x >= 0 && card.x + card.width <= width,
      `${width}: full-width game`,
    );
    assert.ok(
      scanner.y >= card.y + card.height && Math.abs(scanner.width - card.width) < 1,
      `${width}: separate rows`,
    );
    assert.ok(
      tray.x > board.x + board.width &&
        tray.y < board.y + board.height &&
        tray.y + tray.height > board.y,
      `${width}: tray on right, alongside board`,
    );
    assert.ok(Math.abs(board.width / 10 - board.height / 6) < 0.1, 'the 60 targets stay square');
    assert.ok(
      board.y >= 0 && board.y + board.height <= height + 1,
      'whole board visible together with controls',
    );
    const targets = await game
      .locator('.tray-piece, .game-transforms button')
      .evaluateAll((nodes) => nodes.map((el) => el.getBoundingClientRect().toJSON()));
    assert.equal(targets.length, 15);
    for (const b of targets)
      assert.ok(
        b.left >= tray.x - 0.5 &&
          b.right <= card.x + card.width &&
          b.top >= 0 &&
          b.bottom <= height + 1 &&
          b.width >= 44 &&
          b.height >= 44,
        `${width}: visible tappable sidebar`,
      );
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= width);
  }
  assert.equal(await draft(), started, 'reflow alone does not rewrite the game');
  assert.equal(await tile('I').getAttribute('aria-pressed'), 'true');
  // Drag the still-vertical I from the right-hand tray onto D9 on a rotated phone.
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [await center(tile('I'))],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [await center(cell(38))],
  });
  await game.getByText('Release to place I.').waitFor();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await game.getByText('I placed at D9.').waitFor();
  const played = await read();
  const occupied = (l) => [...played].flatMap((v, i) => (v === l ? [i] : []));
  assert.deepEqual(occupied('I'), [18, 28, 38, 48, 58]);
  assert.deepEqual(occupied('X'), [2, 11, 12, 13, 22]);
  await page.setViewportSize({ width: 384, height: 854 });
  const [, , backBoard, backRack] = await boxes();
  assert.ok(backRack.y >= backBoard.y + backBoard.height);
  assert.equal(await read(), played);
  assert.equal(await saved(), null, 'orientation and play never add personal solves');

  const desktopPage = await page
    .context()
    .browser()
    .newPage({ viewport: { width: 1360, height: 850 } });
  await desktopPage.goto(page.url());
  const [desktop, scanner, deskBoard, deskRack] = await boxes(desktopPage);
  assert.ok(
    scanner.x >= desktop.x + desktop.width && deskRack.y >= deskBoard.y + deskBoard.height,
    'regular desktop layout unchanged',
  );
});
