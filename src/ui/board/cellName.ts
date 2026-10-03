import type { CellDto } from "../../shared/protocol";

const FIRST_LETTER_CODE = "A".charCodeAt(0);

/** The letter that names a row, as on the edge of the board: row 0 is "A". */
export function rowLetter(row: number): string {
  return String.fromCharCode(FIRST_LETTER_CODE + row);
}

/** What a player calls a cell, as on the labels of the board: row letter, then column number. (3, 2) is "D3". */
export function cellName({ row, column }: CellDto): string {
  return `${rowLetter(row)}${column + 1}`;
}
