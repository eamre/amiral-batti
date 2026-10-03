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

  isAdjacentTo(other: Position): boolean {
    const rowDistance = Math.abs(this.row - other.row);
    const columnDistance = Math.abs(this.column - other.column);

    return rowDistance <= 1 && columnDistance <= 1 && !this.equals(other);
  }
}
