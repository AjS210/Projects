import test from 'node:test';
import assert from 'node:assert/strict';
import { openPhone, uploadBoardPhoto } from './site.js';
import { STORE } from '../../src/core/collection.js';
import { DRAFT_KEY } from '../../src/core/gameDraft.js';
import { BLANK, SAMPLE, asTable, variants } from '../../src/core/puzzle.js';
import { boards, sheetJpg } from '../fixtures/sheetPhoto.js';

const turnLeft = 'Rotate 90° left (counterclockwise)';
const turnRight = 'Rotate 90° right (clockwise)';

const center = async (loc) => {
  const { x, y, width, height } = await loc.boundingBox();
  return { x: x + width / 2, y: y + height / 2 };
};
const tools = (page) => {
  const game = page.getByRole('region', { name: 'Game board', exact: true });
  const upload = page.getByRole('region', { name: 'Collection Upload', exact: true });
  const review = page.getByRole('dialog', { name: 'Review upload' });
  return {
    game,
    upload,
    review,
    tile: (l) => game.getByRole('button', { name: new RegExp(`^${l} piece,`) }),
    cell: (i) => game.locator(`[data-square="${i}"]`),
    read: () =>
      game
        .locator('[data-square]')
        .evaluateAll((els) => els.map((el) => el.dataset.piece).join('')),
    saved: () => page.evaluate((key) => localStorage.getItem(key), STORE),
    scan: async () => (await review.locator('.cell-letter').allTextContents()).join(''),
    action: (name) => game.getByRole('button', { name, exact: true }),
  };
};

test('finger and mouse drags keep the grabbed square, allow overlaps and turn at the rim', async (t) => {
  const page = await openPhone(t);
  page.setDefaultTimeout(6000);
  const { game, tile, cell, read, saved, action } = tools(page);
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
  assert.ok(await action(turnLeft).isDisabled());
  assert.equal(await game.getByRole('button', { name: 'Save solution' }).count(), 0);
  await drag(tile('X'), cell(12), async () => {
    await page.getByText('Release to place X.').waitFor();
    assert.equal(await read(), BLANK, 'a preview does not commit');
  });
  assert.deepEqual(indices(await read(), 'X'), [2, 11, 12, 13, 22]);
  await drag(cell(2), cell(5)); // move the north arm, not the center
  assert.deepEqual(indices(await read(), 'X'), [5, 14, 15, 16, 25]);
  // The I goes across the X, without losing any of its five squares underneath.
  await drag(tile('I'), cell(15), () => page.getByText('Release to place I.').waitFor());
  assert.deepEqual(indices(await read(), 'I'), [13, 14, 15, 16, 17]);
  assert.deepEqual(indices(await read(), 'X'), [5, 25]);
  await cell(5).tap();
  assert.deepEqual(indices(await read(), 'X'), [5, 14, 15, 16, 25]);
  assert.equal(await game.locator('.field-piece').last().getAttribute('data-letter'), 'X');
  const original = await read();
  await drag(cell(14), cell(31), () => page.getByText(/Release to place X/).waitFor(), true);
  assert.equal(await read(), original, 'cancelling does not move the piece');
  await drag(cell(15), tile('X'));
  assert.deepEqual(
    indices(await read(), 'I'),
    [13, 14, 15, 16, 17],
    'removing the top restores what it covered',
  );
  await tile('I').tap();
  await action('Return to tray').tap();
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
  await action(turnRight).click();
  assert.deepEqual(
    indices(await read(), 'I'),
    [12, 22, 32, 42, 52],
    'turns at the rim slide into the board',
  );
  await action('Return to tray').click();
  assert.equal(await read(), BLANK);
  const art = () => tile('F').locator('svg:not(.tray-check)').innerHTML();
  const thumbnail = await art();
  await tile('F').click();
  assert.equal(indices(await read(), 'F').length, 5, 'tap adds it to the board immediately');
  await cell(22).click();
  assert.deepEqual(indices(await read(), 'F'), [12, 13, 21, 22, 32]);
  await action('Flip horizontal').click();
  assert.deepEqual(indices(await read(), 'F'), [11, 12, 22, 23, 32]);
  await action('Flip vertical').click();
  assert.deepEqual(indices(await read(), 'F'), [12, 22, 23, 31, 32]);
  await action(turnRight).click();
  assert.deepEqual(indices(await read(), 'F'), [11, 21, 22, 23, 32]);
  await action(turnLeft).tap();
  assert.deepEqual(indices(await read(), 'F'), [12, 22, 23, 31, 32]);
  await game.getByText('F rotated counterclockwise.', { exact: true }).waitFor();
  assert.equal(await art(), thumbnail, 'transform buttons never rotate the option card');
  assert.equal(await saved(), null);
});

test('a numbered playthrough and an independently reviewed upload share catalogue deduplication', async (t) => {
  const page = await openPhone(t);
  page.setDefaultTimeout(6500);
  const { game, upload, tile, cell, read, scan, saved, action } = tools(page);
  const first = 'FFIIIIILZZVFFYLLLLZNVFYYYYXZZNVVVTWXXXNNPPPTWWXUNUPPTTTWWUUU';
  const labels = { H: 'Flip horizontal', V: 'Flip vertical', R: turnRight };
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
  assert.equal(await upload.locator('.puzzle-board').count(), 0);
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
  await page.getByRole('link', { name: 'Gameboard', exact: true }).tap();
  await game.waitFor();
  assert.equal(await read(), first, 'visiting Collection does not reset the game');
  await action('View entry').tap();
  const detail = page.getByRole('dialog', { name: 'Solution #1', exact: true });
  await detail.getByText('X group C4', { exact: true }).waitFor();
  await detail.getByRole('button', { name: 'Close dialog' }).tap();
  // A mirrored copy in the independent photo/letter editor is already saved.
  const review = await uploadBoardPhoto(page);
  await review.getByRole('button', { name: 'Edit cells' }).tap();
  const editor = page.getByRole('dialog', { name: 'Edit solution grid' });
  await editor.getByRole('button', { name: 'Paste a grid from Sheets' }).tap();
  await editor.getByRole('textbox', { name: 'Grid letters' }).fill(asTable(variants(first)[1]));
  await editor.getByRole('button', { name: 'Use pasted grid' }).tap();
  await editor.getByRole('button', { name: 'Apply changes' }).tap();
  await review.getByText(/Already saved · X group C4 · Left–right mirror/).waitFor();
  await review.getByRole('button', { name: 'Cancel' }).tap();
  assert.equal(await read(), first);
  await action('Start over').tap();
  await page.getByRole('button', { name: 'Keep playing' }).tap();
  assert.equal(await read(), first);
  await action('Start over').tap();
  await page.getByRole('button', { name: 'Start new game' }).tap();
  assert.equal(await read(), BLANK);
  await upload.getByRole('button', { name: 'Review last upload' }).tap();
  assert.equal(await scan(), variants(first)[1]);
  assert.equal(await saved(), backup, 'reset touches neither the archive nor the photo grid');
});

test('the upload card opens one chooser; multi-board review, adjustment and cancellation leave play and saves alone', async (t) => {
  const page = await openPhone(t);
  const { game, upload, review, tile, cell, read, scan, saved } = tools(page);
  const button = (name) => page.getByRole('button', { name, exact: true });
  assert.equal(await upload.getByRole('button').count(), 1);
  assert.equal(await upload.locator('.puzzle-board, .cell-letter').count(), 0);
  assert.equal(
    await page.getByRole('button', { name: /Use camera|Adjust (frame|grid)/i }).count(),
    0,
  );
  await tile('T').tap();
  await cell(22).tap();
  const before = await read();
  await page.reload();
  await game.waitFor();
  assert.equal(await read(), before);
  const chooser = page.waitForEvent('filechooser');
  await upload.getByRole('button', { name: /Upload a photo or screenshot/ }).tap();
  const picker = await chooser;
  assert.equal(
    await picker.element().getAttribute('capture'),
    null,
    'does not force only the camera',
  );
  assert.match(await picker.element().getAttribute('accept'), /image\/\*/);
  await picker.setFiles({
    name: 'four-boards.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(sheetJpg({ right: true })),
  });
  await review.getByRole('button', { name: 'Choose from 4 boards' }).tap();
  await button('Review board 3').tap();
  await review.getByText('Board 3 of 4', { exact: true }).waitFor();
  assert.equal(await scan(), boards[2]);
  await review.getByRole('button', { name: 'View photo' }).tap();
  await page
    .getByRole('dialog', { name: 'Your board photo' })
    .getByRole('button', { name: 'Adjust grid' })
    .tap();
  await button('Read grid').tap();
  await review.locator('.result-unique').waitFor();
  assert.equal(await scan(), boards[2]);
  assert.notEqual(boards[2], SAMPLE);
  await button('Cancel').tap();
  await review.waitFor({ state: 'detached' });
  assert.equal(await read(), before);
  assert.equal(await saved(), null);
  assert.equal(
    await upload.locator('.puzzle-board').count(),
    0,
    'closing review never puts a grid back on the card',
  );
  await button('Review last upload').tap();
  await button('Choose from 4 boards').tap();
  await button('Import all 4').tap();
  await page.getByText('1 solution added · 3 duplicates skipped.').waitFor();
  assert.equal(await read(), before);
});

test('a fully covered piece can be raised by its card; an overlapping draft resumes but cannot be saved', async (t) => {
  const page = await openPhone(t);
  const { game, tile, read, action, saved } = tools(page);
  for (const l of 'FILNPTUVWXYZ') await tile(l).tap();
  await game.getByText('12 / 12 placed', { exact: true }).waitFor();
  assert.ok((await read()).includes('.'));
  assert.equal(await action('Save solution').count(), 0);
  const gameRead = await read();
  const buried = [...'FILNPTUVWXYZ'].find((l) => !gameRead.includes(l));
  assert.ok(buried);
  await tile(buried).tap();
  await action('Flip horizontal').tap();
  await action('Flip vertical').tap();
  await action(turnRight).tap();
  const front = await read();
  assert.equal([...front].filter((l) => l === buried).length, 5);
  assert.equal(await game.locator('.field-piece').last().getAttribute('data-letter'), buried);
  await page.reload();
  await game.waitFor();
  assert.equal(await read(), front);
  assert.equal(await action('Save solution').count(), 0);
  assert.equal(await saved(), null);
});

test('rotating a phone puts the 3 × 4 tray beside a larger field and the upload card below, without restarting play', async (t) => {
  const page = await openPhone(t);
  page.setDefaultTimeout(6500);
  const { game, tile, cell, read, saved, action } = tools(page);
  const boxes = (view = page) =>
    Promise.all(
      ['.game-panel', '.upload-panel', '.game-plane', '.game-tray'].map((s) =>
        view.locator(s).boundingBox(),
      ),
    );
  const draft = () => page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY);
  await tile('X').tap();
  await cell(12).tap();
  await tile('I').tap();
  await action(turnRight).tap();
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
    const tiles = await game
      .locator('.game-tray button')
      .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().toJSON()));
    assert.equal(
      new Set(tiles.map((t) => t.y)).size,
      3,
      `${width}: three rows, even with short browser chrome`,
    );
    assert.equal(new Set(tiles.map((t) => t.x)).size, 4, `${width}: four columns`);
    if (width === 854) assert.ok(board.width >= 540, 'more room than the previous 456px field');
    if (width === 915 && height === 300)
      assert.ok(
        board.width >= 440,
        'short landscape no longer sacrifices the field to a six-wide tray',
      );
    const targets = await game
      .locator('.tray-piece, .game-transforms button')
      .evaluateAll((nodes) => nodes.map((el) => el.getBoundingClientRect().toJSON()));
    assert.equal(targets.length, 16);
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

test('board picker updates dimensions, blocked squares and the persisted draft', async (t) => {
  const page = await openPhone(t);
  const { game, tile, cell, action } = tools(page);
  const choose = async (name) => {
    await action('Change Frame').click();
    const dialog = page.getByRole('dialog', { name: 'Choose a gameboard' });
    await dialog.getByRole('button', { name, exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
  };
  for (const [name, count, blocked] of [
    ['3×20 Frame', 60, []], ['4×15 Frame', 60, []], ['5×12 Frame', 60, []],
    ['8×8 · Center', 64, [27, 28, 35, 36]],
    ['8×8 · Inner corners', 64, [18, 21, 42, 45]],
    ['8×8 · Outer corners', 64, [9, 14, 49, 54]],
    ['8×8 · Four corners', 64, [0, 7, 56, 63]],
    ['8×8 · Diagonal', 64, [18, 27, 36, 45]],
    ['6×10 Frame', 60, []],
  ]) {
    await choose(name);
    assert.equal(await game.locator('h2').innerText(), name);
    assert.equal(await game.locator('[data-square]').count(), count);
    assert.deepEqual(await game.locator('[data-piece="#"]').evaluateAll((els) => els.map((el) => Number(el.dataset.square))), blocked);
  }
  await choose('8×8 · Center');
  await tile('X').click();
  await action(turnRight).click();
  await cell(0).click();
  await page.reload();
  await game.waitFor();
  assert.equal(await game.locator('h2').innerText(), '8×8 · Center');
  assert.equal(await game.locator('[data-piece="#"]').count(), 4);
  await action('Change Frame').click();
  const dialog = page.getByRole('dialog', { name: 'Choose a gameboard' });
  assert.match(await dialog.innerText(), /returns all pieces/);
  await dialog.getByRole('button', { name: '3×20 Frame' }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await game.locator('.field-piece').count(), 0);
  await tile('X').click();
  await action(turnRight).click();
  assert.equal(await game.locator('.field-piece').count(), 1);
});

test('frame control appears beneath its name without redundant card labels', async (t) => {
  const page = await openPhone(t);
  const { game, upload, action } = tools(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    const heading = await game.locator('h2').boundingBox();
    const button = await action('Change Frame').boundingBox();
    assert.ok(button.y >= heading.y + heading.height - 1, 'button sits below the frame name');
    assert.equal(await game.getByText(/PLAYING FIELD|01\s*\/\s*PLAY/i).count(), 0);
    assert.equal(await upload.getByText(/02\s*\/\s*IMPORT/i).count(), 0);
    const count = await game.getByText('0 / 12 placed').boundingBox();
    assert.ok(Math.abs((button.y + button.height / 2) - (count.y + count.height / 2)) < 2, 'count and button share a row');
    assert.ok(count.x >= button.x + button.width, 'count appears beside the button');
    assert.ok(await action('Change Frame').evaluate((el) => getComputedStyle(el).borderStyle !== 'none'), 'frame control has a visible border');
    await action('Change Frame').click();
    await page.getByRole('dialog', { name: 'Choose a gameboard' }).getByRole('button', { name: 'Cancel' }).click();
  }
});

test('selecting the current frame or pressing Escape closes the picker without resetting the game', async (t) => {
  const page = await openPhone(t);
  const { game, tile, action } = tools(page);
  await tile('X').click();
  await action('Change Frame').click();
  let dialog = page.getByRole('dialog', { name: 'Choose a gameboard' });
  assert.match(await dialog.innerText(), /immediately returns all pieces/);
  assert.equal(await dialog.getByRole('button', { name: 'Use board' }).count(), 0);
  const current = dialog.getByRole('button', { name: '6×10 Frame', exact: true });
  assert.equal(await current.getAttribute('aria-pressed'), 'true');
  await current.focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await game.locator('.field-piece').count(), 1);
  await action('Change Frame').click();
  dialog = page.getByRole('dialog', { name: 'Choose a gameboard' });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await game.locator('.field-piece').count(), 1);
});

test('3×20 frame fits portrait width and uses a single tray row below it in landscape', async (t) => {
  const page = await openPhone(t);
  const { game, tile, cell, action, read } = tools(page);
  await action('Change Frame').click();
  await page.getByRole('dialog', { name: 'Choose a gameboard' }).getByRole('button', { name: '3×20 Frame' }).click();
  for (const [width, height] of [[320, 700], [390, 844], [480, 320], [568, 320], [844, 390], [1024, 510], [1360, 850]]) {
    await page.setViewportSize({ width, height });
    const plane = game.locator('.game-plane');
    const frame = game.locator('.game-frame-scroll');
    const boardBox = await plane.boundingBox();
    const frameBox = await frame.boundingBox();
    assert.ok(boardBox.x >= 0 && boardBox.x + boardBox.width <= width + 1, `${width}: entire board is visible`);
    assert.ok(Math.abs(boardBox.width / 20 - boardBox.height / 3) < 0.1, 'cells remain square');
    assert.equal(await frame.evaluate((el) => el.scrollWidth <= el.clientWidth), true, `${width}: frame does not scroll`);
    assert.ok(frameBox.width <= width);
    if (width > height) {
      const tiles = await game.locator('.tray-piece').evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().toJSON()));
      assert.equal(new Set(tiles.map((b) => b.y)).size, 1, `${width}: one tray row`);
      assert.equal(new Set(tiles.map((b) => b.x)).size, 12, `${width}: twelve tray columns`);
      assert.ok(tiles[0].y >= boardBox.y + boardBox.height, `${width}: tray is below board`);
      assert.ok(tiles.at(-1).right <= width, `${width}: tray fits viewport`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await tile('X').click();
  await cell(10).click();
  assert.equal([...await read()].filter((c) => c === 'X').length, 5, 'tap placement works on the scaled board');
  await page.setViewportSize({ width: 844, height: 390 });
  const before = await read();
  await action(turnRight).click();
  assert.equal([...await read()].filter((c) => c === 'X').length, 5);
  assert.equal(before, await read(), 'symmetric X retains its placement through rotation');
  await tile('I').scrollIntoViewIfNeeded();
  const from = await center(tile('I')), to = await center(cell(35));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  assert.deepEqual([...await read()].flatMap((v, i) => v === 'I' ? [i] : []), [33, 34, 35, 36, 37], 'drag maps to the scaled 3×20 cells');
});
