import type { BoardPoint } from "../../application/shipDrag";
import { LABEL_MARGIN } from "../board/boardLabels";

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

/**
 * Turns a place on the screen into a place on the board, measured in cells from the top-left
 * corner of the grid. The picture is wider than the grid by the strip of labels, so the point
 * is first measured in cells from the corner of the picture, and the strip is taken off.
 */
export function pointToBoard(point: ScreenPoint, board: ScreenRect, boardSize: number): BoardPoint {
  const extent = boardSize + LABEL_MARGIN;

  return {
    row: ((point.y - board.top) / board.height) * extent - LABEL_MARGIN,
    column: ((point.x - board.left) / board.width) * extent - LABEL_MARGIN,
  };
}
