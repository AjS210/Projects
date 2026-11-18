export const BOARDS = [
  { id: '6x10', name: '6×10 Frame', width: 10, height: 6, blocked: [] },
  { id: '5x12', name: '5×12 Frame', width: 12, height: 5, blocked: [] },
  { id: '4x15', name: '4×15 Frame', width: 15, height: 4, blocked: [] },
  { id: '3x20', name: '3×20 Frame', width: 20, height: 3, blocked: [] },
  { id: '8x8-center', name: '8×8 · Center', width: 8, height: 8, blocked: [[3, 3], [4, 3], [3, 4], [4, 4]] },
  { id: '8x8-inner', name: '8×8 · Inner corners', width: 8, height: 8, blocked: [[2, 2], [5, 2], [2, 5], [5, 5]] },
  { id: '8x8-mid', name: '8×8 · Outer corners', width: 8, height: 8, blocked: [[1, 1], [6, 1], [1, 6], [6, 6]] },
  { id: '8x8-corners', name: '8×8 · Four corners', width: 8, height: 8, blocked: [[0, 0], [7, 0], [0, 7], [7, 7]] },
  { id: '8x8-diagonal', name: '8×8 · Diagonal', width: 8, height: 8, blocked: [[2, 2], [3, 3], [4, 4], [5, 5]] },
];
export const DEFAULT_BOARD = '6x10';
export const getBoard = (id = DEFAULT_BOARD) => BOARDS.find((b) => b.id === id) ?? BOARDS[0];
