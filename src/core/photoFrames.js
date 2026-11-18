// Frames use normalized photo coordinates, independent of the displayed image size.
export function frameBounds(frame) {
  const xs = frame.map(([x]) => x),
    ys = frame.map(([, y]) => y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

export function translateFrame(frame, dx, dy) {
  const { left, right, top, bottom } = frameBounds(frame);
  // Clamp the displacement, not the vertices: moving an angled frame against
  // an image edge must not flatten it or change the size of the grid.
  dx = Math.max(-left, Math.min(1 - right, dx));
  dy = Math.max(-top, Math.min(1 - bottom, dy));
  return dx || dy ? frame.map(([x, y]) => [x + dx, y + dy]) : frame;
}

// Identify the detected board under a working frame for navigation/labels only.
// Never snap a user's coordinates, and don't treat empty space as board zero.
export function boardAtFrame(boards, frame) {
  if (!boards.length) return -1;
  const box = frameBounds(frame);
  const area = (b) => (b.right - b.left) * (b.bottom - b.top);
  let best = -1,
    bestOverlap = 0.5;
  boards.forEach((board, i) => {
    const other = frameBounds(board.corners);
    const intersection =
      Math.max(0, Math.min(box.right, other.right) - Math.max(box.left, other.left)) *
      Math.max(0, Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top));
    const overlap = intersection / (area(box) + area(other) - intersection);
    if (overlap > bestOverlap) {
      best = i;
      bestOverlap = overlap;
    }
  });
  return best;
}

// Keep the original verified detections for bulk import. A manual read/edit
// belongs to the region actually reviewed, which needn't be any detected board.
export function rememberReview(boards, { cells, corners }) {
  const target = boardAtFrame(boards, corners);
  return target < 0
    ? boards
    : boards.map((b, i) => (i === target ? { ...b, review: { cells, corners } } : b));
}
