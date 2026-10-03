import type { BoardPoint } from "../../application/shipDrag";

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Turns a place on the screen into a place on the board, measured in cells from its top-left corner. */
export function pointToBoard(point: ScreenPoint, board: ScreenRect, boardSize: number): BoardPoint {
  return {
    row: ((point.y - board.top) / board.height) * boardSize,
    column: ((point.x - board.left) / board.width) * boardSize,
  };
}
