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
}