import type { CellDto } from "../../shared/protocol";

// Everything here is measured in cells: a ship that covers three cells is three units long.

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type Polygon = readonly Point[];

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ShipArt {
  readonly hull: readonly Polygon[];
  readonly cabins: readonly Rect[];
}

/** Space left between a ship and the edge of its cells, so ships do not touch the grid lines. */
const MARGIN = 0.14;
/** How far the stern is from the end of its last cell. */
const STERN_GAP = 0.08;
/** How long the pointed bow is. */
const BOW_LENGTH = 0.4;
/** How far the tip of the bow is from the end of its last cell. */
const BOW_GAP = 0.06;
/** How far a block reaches over a shared edge, hiding the seam between two blocks. */
const OVERLAP = 0.02;

const CABIN_LENGTH = 0.34;
const CABIN_WIDTH = 0.28;
/** Where the only cabin of a two-cell ship stands. */
const SHORT_SHIP_CABIN_AT = 0.7;

/**
 * Draws a ship from the cells it covers.
 * A straight ship gets a pointed bow and cabins; any other shape is drawn as joined blocks.
 *
 * `quarterTurns` says how far the ship was turned from lying flat with its bow to the right:
 * 0 bow right, 1 bow down, 2 bow left, 3 bow up. Only a straight ship has a bow to turn; the
 * cells of any other shape already show how it stands.
 */
export function shipArt(cells: readonly CellDto[], quarterTurns = 0): ShipArt {
  if (isStraight(cells)) {
    return straightShip(cells, quarterTurns % 4);
  }
  return { hull: cells.map((cell) => block(cell, cells)), cabins: [] };
}

function isStraight(cells: readonly CellDto[]): boolean {
  const rows = new Set(cells.map((cell) => cell.row));
  const columns = new Set(cells.map((cell) => cell.column));

  return rows.size === 1 || columns.size === 1;
}

function straightShip(cells: readonly CellDto[], quarterTurns: number): ShipArt {
  const length = cells.length;
  const top = Math.min(...cells.map((cell) => cell.row));
  const left = Math.min(...cells.map((cell) => cell.column));
  const isFlat = liesFlat(cells, quarterTurns);
  const bowIsFirst = isFlat ? quarterTurns === 2 : quarterTurns === 3;

  /**
   * A point `along` the ship (0 at the stern end) and `across` it (0..1 within the cell).
   * Along runs from the stern to the bow, so a ship whose bow is at the first cell counts backwards.
   */
  const at = (along: number, across: number): Point => {
    const position = bowIsFirst ? length - along : along;

    return isFlat ? { x: left + position, y: top + across } : { x: left + across, y: top + position };
  };

  const hull = [
    at(STERN_GAP, MARGIN),
    at(length - BOW_LENGTH, MARGIN),
    at(length - BOW_GAP, 0.5),
    at(length - BOW_LENGTH, 1 - MARGIN),
    at(STERN_GAP, 1 - MARGIN),
  ];

  const cabins = cabinPositions(length).map((center) =>
    rectBetween(at(center - CABIN_LENGTH / 2, 0.5 - CABIN_WIDTH / 2), at(center + CABIN_LENGTH / 2, 0.5 + CABIN_WIDTH / 2)),
  );

  return { hull: [hull], cabins };
}

/** A one-cell ship lies either way, so how it was turned decides; a longer one lies the way its cells do. */
function liesFlat(cells: readonly CellDto[], quarterTurns: number): boolean {
  if (cells.length === 1) {
    return quarterTurns % 2 === 0;
  }
  return new Set(cells.map((cell) => cell.row)).size === 1;
}

/** One cabin in the middle of each cell between the ends; a two-cell ship has just one, toward the stern. */
function cabinPositions(length: number): number[] {
  if (length === 2) {
    return [SHORT_SHIP_CABIN_AT];
  }
  return Array.from({ length: Math.max(0, length - 2) }, (_, index) => index + 1.5);
}

function rectBetween(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** One cell of a ship. It stretches to the edge it shares with a neighbouring cell and keeps its margin elsewhere. */
function block(cell: CellDto, ship: readonly CellDto[]): Polygon {
  const hasNeighbour = (rowStep: number, columnStep: number): boolean =>
    ship.some((other) => other.row === cell.row + rowStep && other.column === cell.column + columnStep);

  const left = cell.column + (hasNeighbour(0, -1) ? -OVERLAP : MARGIN);
  const right = cell.column + 1 + (hasNeighbour(0, 1) ? OVERLAP : -MARGIN);
  const top = cell.row + (hasNeighbour(-1, 0) ? -OVERLAP : MARGIN);
  const bottom = cell.row + 1 + (hasNeighbour(1, 0) ? OVERLAP : -MARGIN);

  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}
