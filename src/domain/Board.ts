import { BOARD_SIZE } from "./constants";
import { Position } from "./Position";

/** Kare şeklindeki oyun tahtası. Hangi konumların tahtanın içinde olduğunu bilir. */
export class Board {
  constructor(readonly size: number = BOARD_SIZE) {}

  /** Bu konum tahtanın içinde mi? */
  contains(position: Position): boolean {
    return (
      position.row >= 0 &&
      position.row < this.size &&
      position.column >= 0 &&
      position.column < this.size
    );
  }

  /** Bu konumun tahta içindeki komşuları (çaprazlar dahil, en fazla 8 tane). */
  neighborsOf(position: Position): Position[] {
    const neighbors: Position[] = [];

    for (let rowDelta = -1; rowDelta <= 1; rowDelta++) {
      for (let columnDelta = -1; columnDelta <= 1; columnDelta++) {
        const isPositionItself = rowDelta === 0 && columnDelta === 0;
        if (isPositionItself) continue;

        const neighbor = position.offsetBy(rowDelta, columnDelta);

        if (this.contains(neighbor)) {
          neighbors.push(neighbor);
        }
      }
    }

    return neighbors;
  }
}
