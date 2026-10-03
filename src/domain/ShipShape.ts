import { Position } from "./Position";

/**
 * Bir geminin tahtadan bağımsız şekli: hangi karelerden oluştuğu.
 * Kareler her zaman sol üst köşeye yaslıdır, yani en küçük satır ve sütun 0'dır.
 */
export class ShipShape {
  readonly cells: readonly Position[];

  constructor(cells: readonly Position[]) {
    if (cells.length === 0) {
      throw new Error("Bir geminin en az bir karesi olmalı.");
    }
    this.cells = alignToTopLeft(cells);
  }

  /** Verilen uzunlukta, yatay düz bir gemi. */
  static straight(length: number): ShipShape {
    const cells = Array.from(
      { length },
      (_, column) => new Position(0, column),
    );
    return new ShipShape(cells);
  }

  /** Geminin kare sayısı. */
  get length(): number {
    return this.cells.length;
  }

  get height(): number {
    return Math.max(...this.cells.map((cell) => cell.row)) + 1;
  }

  get width(): number {
    return Math.max(...this.cells.map((cell) => cell.column)) + 1;
  }

  /** Şeklin saat yönünde 90 derece döndürülmüş hali. Kendisi değişmez. */
  rotatedClockwise(): ShipShape {
    return new ShipShape(
      this.cells.map((cell) => new Position(cell.column, -cell.row)),
    );
  }
}

/** Kareleri, en küçük satır ve sütun 0 olacak şekilde kaydırır. */
function alignToTopLeft(cells: readonly Position[]): Position[] {
  const topRow = Math.min(...cells.map((cell) => cell.row));
  const leftColumn = Math.min(...cells.map((cell) => cell.column));

  return cells.map((cell) => cell.offsetBy(-topRow, -leftColumn));
}
