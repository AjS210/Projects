import { identify } from './puzzle.js';

// A digital board has observed cell labels or flat fills. Identify the shapes, not
// the user's color names. No color (including white or black) means 'background'
// inside an observed rectangle. Never complete a region by solving the puzzle.
export function decodeGroups(keys) {
  if (keys.length !== 60) return null;
  const byKey = new Map();
  for (let i = 0; i < 60; i++) {
    const key = keys[i];
    if (key == null || key === '') return null;
    const group = byKey.get(key);
    if (group) group.push(i);
    else byKey.set(key, [i]);
    if (byKey.size > 12) return null;
  }
  if ([...byKey.values()].some((g) => g.length % 5)) return null;
  const cells = Array(60),
    seen = new Set();
  function assign(group) {
    const letter = identify(group);
    if (!letter || seen.has(letter)) return false;
    seen.add(letter);
    for (const i of group) cells[i] = letter;
    return true;
  }
  for (const group of byKey.values()) {
    if (group.length === 5) {
      if (!assign(group)) return null;
      continue;
    }
    // Reused fills are unambiguous only when their pieces are disconnected.
    const remaining = new Set(group);
    while (remaining.size) {
      const component = [remaining.values().next().value];
      remaining.delete(component[0]);
      for (let n = 0; n < component.length; n++) {
        const i = component[n];
        for (const j of [i % 10 ? i - 1 : -1, i % 10 < 9 ? i + 1 : -1, i - 10, i + 10])
          if (remaining.delete(j)) component.push(j);
      }
      if (!assign(component)) return null;
    }
  }
  return seen.size === 12 ? cells.join('') : null;
}

export function landscapeKeys(keys, width) {
  if (width === 10) return keys;
  return Array.from({ length: 60 }, (_, i) => keys[(9 - (i % 10)) * 6 + Math.floor(i / 10)]);
}

// Median samples on JPEGs vary slightly even within a solid fill.
export function decodeColors(colors, width = 10, tolerance = 20) {
  const palette = [],
    keys = [];
  for (const rgb of colors) {
    let k = palette.findIndex(
      (c) =>
        Math.max(Math.abs(c[0] - rgb[0]), Math.abs(c[1] - rgb[1]), Math.abs(c[2] - rgb[2])) <=
        tolerance,
    );
    if (k < 0) {
      k = palette.length;
      if (k === 12) return null;
      palette.push(rgb);
    }
    keys.push(k);
  }
  return decodeGroups(landscapeKeys(keys, width));
}
