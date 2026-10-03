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

export interface Segment {
  readonly from: Point;
  readonly to: Point;
}

export interface ShipArt {
  readonly hull: readonly Polygon[];
  /** The line along the middle of the deck. Only a straight ship has one. */
  readonly deckLines: readonly Segment[];
  readonly cabins: readonly Rect[];
  /** One in the middle of each cabin. */
  readonly windows: readonly Rect[];
}

/** A place on a straight ship, before it is laid on the board: `along` runs from stern to bow, `across` from side to side. */
interface Local {
  readonly along: number;
  readonly across: number;
}

const local = (along: number, across: number): Local => ({ along, across });

/** Space left between the side of a ship and the edge of its cells, so ships do not touch the grid lines. */
const MARGIN = 0.16;
/** How far the stern is from the end of its first cell. */
const STERN_GAP = 0.04;
/** How round the corners of the stern are. */
const STERN_CORNER = 0.08;
/** Where the bow begins to curve in, counted back from the end of the ship. */
const BOW_LENGTH = 0.75;
/** How far the sides keep their full width into the bow: the closer to the tip, the rounder the bow. */
const BOW_CONTROL = 0.18;
/** How far the tip of the bow is from the end of its last cell. */
const BOW_GAP = 0.05;
/** How many short sides draw a curve. More looks smoother and costs a longer list of points. */
const BOW_STEPS = 8;
const CORNER_STEPS = 3;
/** How far a block reaches over a shared edge, hiding the seam between two blocks. */
const OVERLAP = 0.02;

const CABIN_LENGTH = 0.44;
const CABIN_WIDTH = 0.36;
/** How much smaller the window is than its cabin, on every side. */
const WINDOW_INSET = 0.1;
/** Where the only cabin of a one-cell or two-cell ship stands, counted from the stern. */
const ONE_CELL_CABIN_AT = 0.45;
const TWO_CELL_CABIN_AT = 0.7;
/** The deck line starts this far from the stern and ends this far before the bow tip. */
const DECK_LINE_FROM_STERN = 0.22;
const DECK_LINE_BEFORE_BOW = 0.45;

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
  return { hull: cells.map((cell) => block(cell, cells)), deckLines: [], cabins: [], windows: [] };
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
   * Lays a place of the ship on the board.
   * Along runs from the stern to the bow, so a ship whose bow is at the first cell counts backwards.
   */
  const at = ({ along, across }: Local): Point => {
    const position = bowIsFirst ? length - along : along;

    return isFlat ? { x: left + position, y: top + across } : { x: left + across, y: top + position };
  };
  const cabins = cabinPositions(length).map((center) =>
    rectBetween(
      at(local(center - CABIN_LENGTH / 2, 0.5 - CABIN_WIDTH / 2)),
      at(local(center + CABIN_LENGTH / 2, 0.5 + CABIN_WIDTH / 2)),
    ),
  );

  return {
    hull: [hullOutline(length).map(at)],
    deckLines: [{ from: at(local(DECK_LINE_FROM_STERN, 0.5)), to: at(local(length - DECK_LINE_BEFORE_BOW, 0.5)) }],
    cabins,
    windows: cabins.map(windowOf),
  };
}

/**
 * The outline of a ship of this length, clockwise from the top of the stern: rounded stern corners,
 * straight sides, and a bow that curves in to its tip.
 */
function hullOutline(length: number): Local[] {
  const stern = STERN_GAP;
  const bow = length - BOW_LENGTH;
  const tip = local(length - BOW_GAP, 0.5);
  const topStart = local(stern, MARGIN + STERN_CORNER);
  const topBow = local(bow, MARGIN);
  const bottomBow = local(bow, 1 - MARGIN);
  const bottomStart = local(stern + STERN_CORNER, 1 - MARGIN);

  return [
    topStart,
    ...curve(topStart, local(stern, MARGIN), local(stern + STERN_CORNER, MARGIN), CORNER_STEPS),
    topBow,
    ...curve(topBow, local(length - BOW_CONTROL, MARGIN), tip, BOW_STEPS),
    ...curve(tip, local(length - BOW_CONTROL, 1 - MARGIN), bottomBow, BOW_STEPS),
    bottomStart,
    ...curve(bottomStart, local(stern, 1 - MARGIN), local(stern, 1 - MARGIN - STERN_CORNER), CORNER_STEPS),
  ];
}

/**
 * The points of a curve from `start` to `end` that is pulled toward `control` (a quadratic Bézier curve),
 * without `start` itself, which the caller has already drawn.
 */
function curve(start: Local, control: Local, end: Local, steps: number): Local[] {
  return Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps;
    const weight = (from: number, via: number, to: number) =>
      (1 - t) * (1 - t) * from + 2 * t * (1 - t) * via + t * t * to;

    return {
      along: weight(start.along, control.along, end.along),
      across: weight(start.across, control.across, end.across),
    };
  });
}

function windowOf(cabin: Rect): Rect {
  return {
    x: cabin.x + WINDOW_INSET,
    y: cabin.y + WINDOW_INSET,
    width: cabin.width - 2 * WINDOW_INSET,
    height: cabin.height - 2 * WINDOW_INSET,
  };
}

/** A one-cell ship lies either way, so how it was turned decides; a longer one lies the way its cells do. */
function liesFlat(cells: readonly CellDto[], quarterTurns: number): boolean {
  if (cells.length === 1) {
    return quarterTurns % 2 === 0;
  }
  return new Set(cells.map((cell) => cell.row)).size === 1;
}

/** One cabin in the middle of each cell between the ends; a ship of one or two cells has just one. */
function cabinPositions(length: number): number[] {
  if (length === 1) {
    return [ONE_CELL_CABIN_AT];
  }
  if (length === 2) {
    return [TWO_CELL_CABIN_AT];
  }
  return Array.from({ length: length - 2 }, (_, index) => index + 1.5);
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
