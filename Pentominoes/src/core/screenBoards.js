import { decodeColors } from './digitalGrid.js';

// Sheet screenshots have aligned edges at a repeating cell pitch. Look for
// evidence on both axes, without assuming a particular phone, palette, toolbar,
// row height, or gutter. An axis hypothesis alone is never a recognized board.
function edgeLines(image, vertical) {
  const { data, width, height } = image;
  const length = vertical ? width : height,
    across = vertical ? height : width;
  const step = vertical ? 4 : width * 4,
    other = vertical ? width * 4 : 4;
  const stride = Math.max(1, Math.ceil(across / 320));
  const votes = new Uint16Array(length);
  for (let p = 0; p < across; p += stride) {
    let i = p * other + step;
    for (let j = 1; j < length - 1; j++, i += step) {
      if (
        Math.abs(data[i] - data[i - step]) > 25 ||
        Math.abs(data[i + 1] - data[i - step + 1]) > 25 ||
        Math.abs(data[i + 2] - data[i - step + 2]) > 25 ||
        Math.abs(data[i] - data[i + step]) > 25 ||
        Math.abs(data[i + 1] - data[i + step + 1]) > 25 ||
        Math.abs(data[i + 2] - data[i + step + 2]) > 25
      )
        votes[j]++;
    }
  }
  const cut = Math.max(3, (across / stride) * 0.026),
    lines = [0];
  for (let i = 1; i < length - 1; i++) {
    if (votes[i] < cut) continue;
    const first = i;
    let weight = 0,
      sum = 0,
      peak = i;
    while (i < length && votes[i] >= cut) {
      weight += votes[i];
      sum += votes[i] * i;
      if (votes[i] > votes[peak]) peak = i;
      i++;
    }
    // Broad texture bands aren't grid lines. At a gutter, keep its two edges.
    if (i - first <= 5) lines.push(Math.round(sum / weight));
    else if (i - first <= 18) lines.push(first + 1, peak, i - 2);
  }
  lines.push(length - 1);
  return [...new Set(lines)].sort((a, b) => a - b);
}
function axisWindows(lines, length, count) {
  const distance = new Uint16Array(length);
  let nearest = 0;
  for (let i = 0; i < length; i++) {
    while (
      nearest + 1 < lines.length &&
      Math.abs(lines[nearest + 1] - i) < Math.abs(lines[nearest] - i)
    )
      nearest++;
    distance[i] = Math.abs(lines[nearest] - i);
  }
  const out = [];
  for (let a = 0; a < lines.length; a++)
    for (let b = a + 1; b < lines.length; b++) {
      const start = lines[a],
        end = lines[b],
        pitch = (end - start) / count;
      if (pitch < 5) continue;
      const tol = Math.max(1.5, Math.min(4, pitch * 0.085));
      let hits = 0,
        error = 0;
      for (let n = 1; n < count; n++) {
        const e = distance[Math.round(start + n * pitch)];
        if (e <= tol) hits++;
        error += Math.min(1, e / tol);
      }
      if (hits >= Math.ceil((count - 1) * 0.75))
        out.push({ start, end, pitch, score: hits / (count - 1) - (error / (count - 1)) * 0.45 });
    }
  out.sort((a, b) => b.score - a.score || b.pitch - a.pitch);
  const unique = [];
  for (const v of out) {
    if (
      !unique.some(
        (u) =>
          Math.abs(u.start - v.start) < v.pitch * 0.13 && Math.abs(u.end - v.end) < v.pitch * 0.13,
      )
    )
      unique.push(v);
    if (unique.length === 128) break;
  }
  return unique;
}
function sample(image, left, top, dx, dy, cols, rows, fx, fy) {
  const colors = [];
  const d = image.data;
  const ox = Math.max(1, Math.round(dx * 0.05)),
    oy = Math.max(1, Math.round(dy * 0.05)) * image.width;
  const median3 = (a, b, c) => a + b + c - Math.min(a, b, c) - Math.max(a, b, c);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i =
        4 * (Math.round(top + (y + fy) * dy) * image.width + Math.round(left + (x + fx) * dx));
      colors.push(
        [0, 1, 2].map((k) => median3(d[i + k], d[i + 4 * (oy - ox) + k], d[i + 4 * (ox - oy) + k])),
      );
    }
  return colors;
}
export function findScreenBoards(image) {
  const { width, height } = image,
    xs = edgeLines(image, true),
    ys = edgeLines(image, false),
    hits = [];
  for (const [cols, rows] of [
    [10, 6],
    [6, 10],
  ]) {
    const X = axisWindows(xs, width, cols),
      Y = axisWindows(ys, height, rows);
    for (const y of Y)
      for (const x of X) {
        if (x.pitch < y.pitch * 0.66 || x.pitch > y.pitch * 1.55) continue;
        // Ignore alternate samplings of a verified region, but not repeated solves
        // in different places. Mirror deduplication happens only at collection import.
        if (
          hits.some(
            (h) =>
              Math.min(h.right, x.end) - Math.max(h.left, x.start) > (x.end - x.start) * 0.7 &&
              Math.min(h.bottom, y.end) - Math.max(h.top, y.start) > (y.end - y.start) * 0.7,
          )
        )
          continue;
        const read = (fx, fy) =>
          decodeColors(sample(image, x.start, y.start, x.pitch, y.pitch, cols, rows, fx, fy), cols);
        let cells = read(0.36, 0.4);
        const second = read(0.67, 0.6);
        // Two independent samples must agree. A third can avoid a printed letter.
        if (!cells || cells !== second) {
          if (!cells && !second) continue;
          const third = read(0.49, 0.49);
          if (!third || (third !== cells && third !== second)) continue;
          cells = third;
        }
        const l = x.start / (width - 1),
          r = x.end / (width - 1),
          t = y.start / (height - 1),
          b = y.end / (height - 1);
        hits.push({
          left: x.start,
          top: y.start,
          right: x.end,
          bottom: y.end,
          cells,
          corners: [
            [l, t],
            [r, t],
            [r, b],
            [l, b],
          ],
        });
      }
  }
  return hits
    .sort((a, b) =>
      Math.abs(a.top - b.top) < Math.min(a.bottom - a.top, b.bottom - b.top) * 0.15
        ? a.left - b.left
        : a.top - b.top,
    )
    .map(({ cells, corners }) => ({ cells, corners, found: 12, confidence: 720 }));
}
