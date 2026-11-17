import { BLANK, identify } from './puzzle.js';
import { fitEdges } from './fitEdges.js';
import { decodeColors } from './digitalGrid.js';
import { findScreenBoards } from './screenBoards.js';

// All frame points are normalized image coordinates, clockwise around the board.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const median = (values) => values.sort((a, b) => a - b)[values.length >> 1];
export const FULL_FRAME = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export const goodFrame = (frame) =>
  frame?.length === 4 &&
  frame.every((p, i) => cross(p, frame[(i + 1) % 4], frame[(i + 2) % 4]) > 0.003);

export function landscapeFrame(frame, width, height) {
  const length = (a, b) => Math.hypot((a[0] - b[0]) * width, (a[1] - b[1]) * height);
  return length(frame[0], frame[1]) + length(frame[2], frame[3]) >=
    length(frame[1], frame[2]) + length(frame[3], frame[0])
    ? frame
    : [frame[3], frame[0], frame[1], frame[2]];
}
// Map a unit square to a perspective quadrilateral (not a bilinear approximation).
export function projector(frame) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = frame;
  const dx1 = x1 - x2,
    dx2 = x3 - x2,
    dy1 = y1 - y2,
    dy2 = y3 - y2;
  const dx3 = x0 - x1 + x2 - x3,
    dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det,
    h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1,
    b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1,
    e = y3 - y0 + h * y3;
  return (u, v) => [
    (a * u + b * v + x0) / (g * u + h * v + 1),
    (d * u + e * v + y0) / (g * u + h * v + 1),
  ];
}
const gamma = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
function lab(R, G, B) {
  const r = gamma[R],
    g = gamma[G],
    b = gamma[B];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047),
    y = f(0.2126 * r + 0.7152 * g + 0.0722 * b),
    z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const colorDistance = (a, b) => Math.hypot((a[0] - b[0]) * 0.65, a[1] - b[1], a[2] - b[2]);
const offset = (image, x, y) =>
  4 *
  (clamp(Math.round(y * (image.height - 1)), 0, image.height - 1) * image.width +
    clamp(Math.round(x * (image.width - 1)), 0, image.width - 1));
const luminance = (data, i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

function hullToFrame(points, w, h) {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const halfHull = (pts) => {
    const result = [];
    for (const p of pts) {
      while (result.length >= 2 && cross(result.at(-2), result.at(-1), p) <= 0) result.pop();
      result.push(p);
    }
    result.pop();
    return result;
  };
  const hull = halfHull(points).concat(halfHull(points.reverse()));
  // Remove the least significant hull vertices until the four outside corners remain.
  while (hull.length > 4) {
    let smallest = Infinity,
      index = 0;
    for (let i = 0; i < hull.length; i++) {
      const area = Math.abs(cross(hull.at(i - 1), hull[i], hull[(i + 1) % hull.length]));
      if (area < smallest) {
        smallest = area;
        index = i;
      }
    }
    hull.splice(index, 1);
  }
  if (hull.length !== 4) return null;
  const start = hull.reduce((s, p, i) => (p[0] + p[1] < hull[s][0] + hull[s][1] ? i : s), 0);
  const frame = Array.from({ length: 4 }, (_, i) => {
    const [x, y] = hull[(i + start) % 4];
    return [x / (w - 1), y / (h - 1)];
  });
  return goodFrame(frame) ? frame : null;
}
function components(mask, w, h) {
  const seen = mask.slice(),
    queue = new Int32Array(mask.length),
    found = [];
  for (let i = 0; i < mask.length; i++) {
    if (!seen[i]) continue;
    let head = 0,
      tail = 1;
    queue[0] = i;
    seen[i] = 0;
    while (head < tail) {
      const p = queue[head++],
        x = p % w,
        y = Math.floor(p / w);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy,
            j = yy * w + xx;
          if (xx >= 0 && xx < w && yy >= 0 && yy < h && seen[j]) {
            seen[j] = 0;
            queue[tail++] = j;
          }
        }
    }
    if (tail > w * h * 0.025) {
      const points = Array.from(queue.subarray(0, tail), (p) => [p % w, Math.floor(p / w)]);
      found.push({ size: tail, points });
    }
  }
  return found.sort((a, b) => b.size - a.size);
}
function proposeFrames(image) {
  const scale = 190 / Math.max(image.width, image.height),
    w = Math.max(4, Math.round(image.width * scale)),
    h = Math.max(4, Math.round(image.height * scale));
  const colors = [],
    gray = [],
    sides = [[], [], [], []];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = offset(image, x / (w - 1), y / (h - 1)),
        d = image.data;
      const color = lab(d[i], d[i + 1], d[i + 2]);
      colors.push(color);
      gray.push(luminance(d, i));
      if (x === 1) sides[0].push(color);
      if (y === 1) sides[1].push(color);
      if (x === w - 2) sides[2].push(color);
      if (y === h - 2) sides[3].push(color);
    }
  const backgrounds = sides.map((s) => [0, 1, 2].map((c) => median(s.map((p) => p[c]))));
  const difference = colors.map((c) => Math.min(...backgrounds.map((b) => colorDistance(c, b))));
  const frames = [];
  function addMask(mask) {
    const groups = components(mask, w, h);
    if (groups.length) {
      const frame = hullToFrame(groups[0].points, w, h);
      if (frame) frames.push(frame);
      if (groups.length > 1) {
        const all = hullToFrame(
          groups.slice(0, 12).flatMap((g) => g.points),
          w,
          h,
        );
        if (all) frames.push(all);
      }
    }
  }
  for (const cut of [12, 20, 7]) addMask(Uint8Array.from(difference, (d) => d > cut));
  // Continuous tray edges can be a stronger signal than color on an unpainted set.
  for (const cut of [38, 65]) {
    const mask = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + w] - gray[i - w]) > cut) {
          mask[i] = 1;
          mask[i + 1] = 1;
          mask[i + w] = 1;
        }
      }
    addMask(mask);
  }
  frames.push(FULL_FRAME);
  const aspect = image.width / image.height;
  const target = aspect > 1 ? 10 / 6 : 6 / 10;
  const dw = Math.min(1, target / aspect),
    dh = Math.min(1, aspect / target);
  frames.push([
    [0.5 - dw / 2, 0.5 - dh / 2],
    [0.5 + dw / 2, 0.5 - dh / 2],
    [0.5 + dw / 2, 0.5 + dh / 2],
    [0.5 - dw / 2, 0.5 + dh / 2],
  ]);
  return frames;
}

export function readFrame(image, corners) {
  const project = projector(landscapeFrame(corners, image.width, image.height));
  const pixel = (x, y) => offset(image, ...project(x / 10, y / 6));
  const d = image.data,
    colors = [],
    rawColors = [];
  for (let i = 0; i < 60; i++) {
    const r = [],
      g = [],
      b = [],
      x = i % 10,
      y = Math.floor(i / 10);
    for (const dy of [0.22, 0.36, 0.5, 0.64, 0.78])
      for (const dx of [0.22, 0.36, 0.5, 0.64, 0.78]) {
        const p = pixel(x + dx, y + dy);
        r.push(d[p]);
        g.push(d[p + 1]);
        b.push(d[p + 2]);
      }
    const rgb = [median(r), median(g), median(b)];
    rawColors.push(rgb);
    colors.push(lab(...rgb));
  }
  const digital = decodeColors(rawColors);
  if (digital) return { cells: digital, found: 12, confidence: 720, corners };
  const edges = [];
  for (let a = 0; a < 60; a++)
    for (const horizontal of [true, false]) {
      if ((horizontal && a % 10 === 9) || (!horizontal && a >= 50)) continue;
      const b = a + (horizontal ? 1 : 10),
        troughs = [];
      for (const tangent of [0.23, 0.38, 0.57, 0.73]) {
        const levels = [];
        for (let k = -8; k <= 8; k++) {
          const normal = 1 + k * 0.03;
          levels.push(
            luminance(
              d,
              pixel(
                (a % 10) + (horizontal ? normal : tangent),
                Math.floor(a / 10) + (horizontal ? tangent : normal),
              ),
            ),
          );
        }
        troughs.push(
          Math.max(
            0,
            Math.min((levels[0] + levels[1]) / 2, (levels[15] + levels[16]) / 2) -
              Math.min(...levels),
          ),
        );
      }
      edges.push({ a, b, color: colorDistance(colors[a], colors[b]), seam: median(troughs) });
    }
  const seamFloor = edges.map((e) => e.seam).sort((a, b) => a - b)[20];
  for (const edge of edges)
    edge.cost = edge.color + 0.48 * Math.max(0, Math.min(100, edge.seam - seamFloor));
  edges.sort((a, b) => a.cost - b.cost);
  // Merge neighboring cells by visual agreement. Never solve/fill a missing piece by guesswork.
  const groups = Array.from({ length: 60 }, (_, i) => ({ indices: [i], cost: 0 }));
  for (const e of edges) {
    const l = groups[e.a],
      r = groups[e.b];
    if (l === r || l.indices.length + r.indices.length > 5) continue;
    const group = { indices: [...l.indices, ...r.indices], cost: e.cost };
    for (const i of group.indices) groups[i] = group;
  }
  const detected = new Map();
  for (const group of new Set(groups)) {
    const letter = identify(group.indices);
    if (!letter) continue;
    const boundary = edges
      .filter((e) => (groups[e.a] === group) !== (groups[e.b] === group))
      .map((e) => e.cost);
    const separation = boundary[Math.floor(boundary.length * 0.25)] - group.cost;
    if (separation < 4.5 || group.cost > 29 || boundary[0] + 4 < group.cost) continue;
    const previous = detected.get(letter);
    if (!previous || separation > previous.separation)
      detected.set(letter, { indices: group.indices, separation });
  }
  const cells = [...BLANK];
  let confidence = 0;
  for (const [letter, match] of detected) {
    for (const i of match.indices) cells[i] = letter;
    confidence += Math.min(70, match.separation);
  }
  return { cells: cells.join(''), found: detected.size, confidence, corners };
}
export function scanImage(image, requestedFrame = null) {
  if (requestedFrame) {
    if (!goodFrame(requestedFrame))
      throw new Error('Keep the four corners around the board without crossing them.');
    return readFrame(image, requestedFrame);
  }
  const boards = findScreenBoards(image);
  if (boards.length) return { ...boards[0], boards };
  const frames = proposeFrames(image),
    seen = new Set();
  let best = null;
  function evaluate(corners) {
    if (!goodFrame(corners)) return false;
    const id = corners
      .flat()
      .map((n) => Math.round(n * 150))
      .join(',');
    if (seen.has(id)) return false;
    seen.add(id);
    const result = readFrame(image, corners);
    if (
      !best ||
      result.found > best.found ||
      (result.found === best.found && result.confidence > best.confidence)
    )
      best = result;
    return result.found === 12;
  }
  const refined = [];
  for (const frame of frames) {
    if (evaluate(frame)) return best;
    const fitted = fitEdges(image, frame);
    if (evaluate(fitted)) return best;
    if (goodFrame(fitted)) refined.push(fitted);
  }
  // A thick tray can put the strongest visible border just outside the pieces.
  for (const scale of [0.96, 0.92, 1.035, 0.86])
    for (const frame of [...refined, ...frames]) {
      const center = [0, 1].map((axis) => frame.reduce((n, p) => n + p[axis], 0) / 4);
      if (
        evaluate(
          frame.map((p) => p.map((v, j) => clamp(center[j] + (v - center[j]) * scale, 0, 1))),
        )
      )
        return best;
    }
  return best;
}
