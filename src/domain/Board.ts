import { BOARD_SIZE } from "./constants";
import { Position } from "./Position";
import { Ship } from "./Ship";

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

  containsShip(ship: Ship): boolean {
    return ship.cells.every((cell) => this.contains(cell));
  }

  pulledInside(ship: Ship): Ship {
    const maxOriginRow = this.size - ship.shape.height;
    const maxOriginColumn = this.size - ship.shape.width;

    const row = Math.min(ship.origin.row, maxOriginRow);
    const column = Math.min(ship.origin.column, maxOriginColumn);

    return ship.movedTo(new Position(row, column));
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
