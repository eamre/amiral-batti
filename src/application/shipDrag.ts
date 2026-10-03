import type { Position } from "../domain/Position";
import { Position as PositionClass } from "../domain/Position";
import type { Ship } from "../domain/Ship";

/** A place on the board in cells, measured from its top-left corner: (0.5, 0.5) is the middle of cell (0, 0). */
export interface BoardPoint {
  readonly row: number;
  readonly column: number;
}

/** How far outside the board a pointer may be before the drag no longer counts as "on the board". */
const MARGIN_IN_CELLS = 0.5;

/**
 * Where the top-left corner of a dragged ship goes, so that the cell that was grabbed
 * stays under the pointer. The result can still stick out of the board: the editor pulls it in.
 * Undefined when the pointer has left the board, which means "let go, nothing happens".
 */
export function dragOrigin(
  ship: Ship,
  grabbedAt: Position,
  pointer: BoardPoint,
  boardSize: number,
): Position | undefined {
  const isOutside =
    pointer.row < -MARGIN_IN_CELLS ||
    pointer.row > boardSize + MARGIN_IN_CELLS ||
    pointer.column < -MARGIN_IN_CELLS ||
    pointer.column > boardSize + MARGIN_IN_CELLS;

  if (isOutside) {
    return undefined;
  }

  const grabRow = grabbedAt.row - ship.origin.row;
  const grabColumn = grabbedAt.column - ship.origin.column;

  return new PositionClass(
    nearestCell(pointer.row - grabRow - 0.5),
    nearestCell(pointer.column - grabColumn - 0.5),
  );
}

function nearestCell(value: number): number {
  // "|| 0" turns the -0 that Math.round gives for -0.4 into a plain 0.
  return Math.round(value) || 0;
}
