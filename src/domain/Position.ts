/** Tahtadaki bir karenin yeri. Satır ve sütun 0'dan başlar: sol üst kare (0, 0). */
export class Position {
  constructor(
    readonly row: number,
    readonly column: number,
  ) {}

  /** Aynı kareyi gösteriyorlar mı? */
  equals(other: Position): boolean {
    return this.row === other.row && this.column === other.column;
  }

  /** Bu karenin, verilen kadar kaydırılmış halini döndürür. Kendisi değişmez. */
  offsetBy(rowDelta: number, columnDelta: number): Position {
    return new Position(this.row + rowDelta, this.column + columnDelta);
  }
}