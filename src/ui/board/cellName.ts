import type { CellDto } from "../../shared/protocol";

const FIRST_LETTER_CODE = "A".charCodeAt(0);

/** What a player calls a cell, as on a paper board: column letter, then row number. (3, 2) is "C4". */
export function cellName({ row, column }: CellDto): string {
  return `${String.fromCharCode(FIRST_LETTER_CODE + column)}${row + 1}`;
}
