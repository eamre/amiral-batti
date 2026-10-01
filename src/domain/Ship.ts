import { Position } from "./Position";
import { ShipShape } from "./ShipShape";

/**
 * Tahtaya yerleşmiş bir gemi: şekli, sol üst köşesinin tahtadaki yeri
 * ve şeklin kaç çeyrek tur (90 derece) döndürüldüğü.
 */
export class Ship {
  constructor(
    readonly baseShape: ShipShape,
    readonly origin: Position,
    readonly quarterTurns: number = 0,
  ) {}

  /** Şeklin şu anki (döndürülmüş) hali. */
  get shape(): ShipShape {
    let shape = this.baseShape;
    for (let turn = 0; turn < this.quarterTurns; turn++) {
      shape = shape.rotatedClockwise();
    }
    return shape;
  }

  /** Geminin tahtada kapladığı kareler. */
  get cells(): Position[] {
    return this.shape.cells.map((cell) => this.origin.offsetBy(cell.row, cell.column));
  }

  /** Bu gemi o karede duruyor mu? */
  occupies(position: Position): boolean {
    return this.cells.some((cell) => cell.equals(position));
  }

  /** Aynı gemi, sol üst köşesi başka bir yerde. */
  movedTo(origin: Position): Ship {
    return new Ship(this.baseShape, origin, this.quarterTurns);
  }

  /** Aynı gemi, saat yönünde bir çeyrek tur döndürülmüş. Sol üst köşe yerinde kalır. */
  rotated(): Ship {
    return new Ship(this.baseShape, this.origin, (this.quarterTurns + 1) % 4);
  }
}