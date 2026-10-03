import type { CellDto } from "../../shared/protocol";
import type { BoardModel, CellModel } from "./boardModel";
import { cellName } from "./cellName";
import { svg } from "../dom/svg";
import { boardLabels, viewBoxOf } from "./boardLabels";
import { shipGraphic } from "./shipGraphic";

export interface BoardOptions {
  /** Read out by screen readers, since the board itself is only a picture. */
  readonly label: string;
  readonly onFire: (cell: CellDto) => void;
}

const MARK_INSET = 0.37;
const WATER_RADIUS = 0.12;
/** How round the corners of the sea are, in cells. */
const SEA_CORNER = 0.3;

/**
 * Draws a board as one SVG whose grid is `size` units wide, so a cell is one unit, with its labels around it.
 * It is drawn again from scratch on every change: a hundred cells cost nothing.
 *
 * From bottom to top: labels, sea, grid, ships, marks, targets.
 */
export function renderBoard(model: BoardModel, options: BoardOptions): SVGSVGElement {
  return svg(
    "svg",
    {
      class: "board",
      attrs: { viewBox: viewBoxOf(model.size), role: "group", "aria-label": options.label },
    },
    ...seaAndGrid(model.size),
    ...model.ships.map((ship) => shipGraphic(ship.cells, ship.sunk ? "sunk" : "afloat", ship.quarterTurns)),
    ...model.cells.filter((cell) => cell.mark !== "none").map(markOf),
    ...model.cells.filter((cell) => cell.canFire).map((cell) => target(cell, options.onFire)),
  );
}

/** The bottom layers, which every board has: the labels around the sea, and the grid on it. */
export function seaAndGrid(size: number): SVGElement[] {
  return [
    boardLabels(size),
    svg("rect", { class: "board__sea", attrs: { width: size, height: size, rx: SEA_CORNER } }),
    grid(size),
  ];
}

function grid(size: number): SVGPathElement {
  const lines = Array.from({ length: size - 1 }, (_, index) => {
    const at = index + 1;
    return `M${at} 0V${size}M0 ${at}H${size}`;
  });

  return svg("path", { class: "board__grid", attrs: { d: lines.join("") } });
}

function markOf(cell: CellModel): SVGElement {
  const place = { "data-row": cell.row, "data-column": cell.column };
  const middle = { cx: cell.column + 0.5, cy: cell.row + 0.5 };

  switch (cell.mark) {
    case "hit":
      return cross(cell, place);
    case "water":
      return svg("circle", { class: "mark mark--water", attrs: { ...place, ...middle, r: WATER_RADIUS } });
    case "none":
      throw new Error("A cell without a mark is not drawn.");
  }
}

function cross(cell: CellModel, place: Record<string, number>): SVGGElement {
  const left = cell.column + MARK_INSET;
  const right = cell.column + 1 - MARK_INSET;
  const top = cell.row + MARK_INSET;
  const bottom = cell.row + 1 - MARK_INSET;

  return svg(
    "g",
    { class: cell.sunk ? "mark mark--hit mark--sunk" : "mark mark--hit", attrs: place },
    svg("line", { attrs: { x1: left, y1: top, x2: right, y2: bottom } }),
    svg("line", { attrs: { x1: right, y1: top, x2: left, y2: bottom } }),
  );
}

/** An invisible square over a cell that can be fired at: it takes the finger, the mouse or the keyboard. */
function target(cell: CellModel, onFire: (cell: CellDto) => void): SVGRectElement {
  const fire = () => onFire({ row: cell.row, column: cell.column });

  return svg("rect", {
    class: "target",
    attrs: {
      x: cell.column,
      y: cell.row,
      width: 1,
      height: 1,
      role: "button",
      tabindex: 0,
      "aria-label": cellName(cell),
      "data-row": cell.row,
      "data-column": cell.column,
    },
    on: {
      click: fire,
      keydown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          fire();
        }
      },
    },
  });
}
