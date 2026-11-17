// Fit each side to a continuous seam near a coarse color/edge hull. Long, supported
// lines beat isolated wood grain, lettering, and shadows at individual corners.
export function fitEdges(image, frame) {
  const { width: w, height: h, data } = image;
  const points = frame.map(([x, y]) => [x * (w - 1), y * (h - 1)]);
  const lengths = points.map(([x, y], i) =>
    Math.hypot(points[(i + 1) % 4][0] - x, points[(i + 1) % 4][1] - y),
  );
  const short = Math.min(...lengths);
  const radius = 36,
    step = Math.max(0.65, (short * 0.15) / radius);
  const times = Array.from({ length: 27 }, (_, i) => (i + 2) / 30);
  const gray = (x, y) => {
    const i =
      4 *
      (Math.max(0, Math.min(h - 1, Math.round(y))) * w +
        Math.max(0, Math.min(w - 1, Math.round(x))));
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  const lines = points.map(([x, y], i) => {
    const end = points[(i + 1) % 4],
      dx = end[0] - x,
      dy = end[1] - y,
      nx = -dy / lengths[i],
      ny = dx / lengths[i];
    const profiles = times.map((t) => {
      const gx = x + dx * t,
        gy = y + dy * t;
      const stripe = Array.from({ length: 2 * radius + 13 }, (_, k) =>
        gray(gx + (k - radius - 6) * step * nx, gy + (k - radius - 6) * step * ny),
      );
      return Array.from({ length: 2 * radius + 1 }, (_, j) => {
        const k = j + 6,
          center = Math.min(
            stripe[k],
            (stripe[k - 1] + stripe[k]) / 2,
            (stripe[k] + stripe[k + 1]) / 2,
          );
        const left = (stripe[k - 3] + stripe[k - 5]) / 2,
          right = (stripe[k + 3] + stripe[k + 5]) / 2;
        return Math.min(
          70,
          Math.max(0, Math.min(left, right) - center) + 0.25 * Math.abs(right - left),
        );
      });
    });
    let best = -Infinity,
      f = 0,
      l = 0;
    function score(a, b) {
      let sum = 0,
        support = 0;
      for (let j = 0; j < times.length; j++) {
        const value = profiles[j][radius + Math.round(a + (b - a) * times[j])];
        sum += value;
        if (value > 9) support++;
      }
      const total =
        (sum / times.length) * (0.6 + (0.4 * support) / times.length) -
        0.065 * (Math.abs(a) + Math.abs(b));
      if (total > best) {
        best = total;
        f = a;
        l = b;
      }
    }
    for (let a = -radius; a <= radius; a += 3)
      for (let b = -radius; b <= radius; b += 3) score(a, b);
    const first = f,
      last = l;
    for (let a = Math.max(-radius, first - 3); a <= Math.min(radius, first + 3); a++)
      for (let b = Math.max(-radius, last - 3); b <= Math.min(radius, last + 3); b++) score(a, b);
    if (best < 4) {
      f = 0;
      l = 0;
    }
    return [
      [x + nx * f * step, y + ny * f * step],
      [end[0] + nx * l * step, end[1] + ny * l * step],
    ];
  });
  const intersect = (line, other) => {
    const [a, b] = line,
      [c, d] = other;
    const ux = b[0] - a[0],
      uy = b[1] - a[1],
      vx = d[0] - c[0],
      vy = d[1] - c[1];
    const t = ((c[0] - a[0]) * vy - (c[1] - a[1]) * vx) / (ux * vy - uy * vx);
    return [
      Math.max(0, Math.min(1, (a[0] + ux * t) / (w - 1))),
      Math.max(0, Math.min(1, (a[1] + uy * t) / (h - 1))),
    ];
  };
  return lines.map((line, i) => intersect(lines[(i + 3) % 4], line));
}
