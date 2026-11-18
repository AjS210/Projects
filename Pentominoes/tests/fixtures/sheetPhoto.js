import jpeg from 'jpeg-js';
import { LETTERS, SAMPLE, variants } from '../../src/core/puzzle.js';

// Generate a new example, rather than distributing anyone's personal screenshot.
const palette = [
  '18A1AB',
  'F7B19C',
  'FFFFFF',
  'FFF300',
  '0B59DD',
  '9700FF',
  'EC394C',
  '252525',
  '9A9A9A',
  'F7C177',
  'FF00E5',
  '00EF12',
];
export const boards = [SAMPLE, variants(SAMPLE)[1], variants(SAMPLE)[2], variants(SAMPLE)[3]];
export function sheetJpg({ right = false } = {}) {
  const w = right ? 420 : 294,
    h = 438,
    dx = 18,
    dy = 17,
    ox = 26,
    gap = 9,
    oy = 55,
    pitch = 142;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const col = Math.floor((x - ox) / (dx * 10 + gap)),
        row = Math.floor((y - oy) / pitch);
      const lx = x - ox - col * (dx * 10 + gap),
        ly = y - oy - row * pitch;
      let color = y < 24 || y > h - 34 || x < 16 ? '343337' : 'FFFFFF';
      if (row >= 0 && row < 3 && col >= 0 && col < 2 && lx >= 0 && lx < dx * 10 && ly < dy * 6) {
        const letter = boards[(row * 2 + col) % 4][Math.floor(ly / dy) * 10 + Math.floor(lx / dx)];
        color = lx % dx === 0 || ly % dy === 0 ? '939393' : palette[LETTERS.indexOf(letter)];
        if (y > h - 34) color = '343337';
      } else if (row >= 0 && ly > dy * 6 + 8 && ly < dy * 6 + 22 && col >= 0 && lx < dx * 10)
        color = '090909';
      const rgb = Number.parseInt(color, 16);
      data.set([rgb >> 16, (rgb >> 8) & 255, rgb & 255, 255], 4 * (y * w + x));
    }
  return jpeg.encode({ width: w, height: h, data }, 83).data;
}
