import type { CellDto } from "../shared/protocol";
import { svg } from "./dom/svg";
import { shipArt, type Polygon, type Rect } from "./shipArt";

/**
 * afloat     a ship at rest
 * sunk       a ship that has been sunk
 * misplaced  a ship that cannot stand where it is (while the fleet is arranged)
 * lifted     a ship held by a finger over a place where it could stand
 */
export type ShipLook = "afloat" | "sunk" | "misplaced" | "lifted";

/**
 * The picture of one ship, in cell units. The hull is drawn twice: first the outline (a thick
 * stroke), then the body on top. Cells of a bent ship then merge into one shape, with no
 * line left between them.
 */
export function shipGraphic(cells: readonly CellDto[], look: ShipLook): SVGGElement {
  const { hull, cabins } = shipArt(cells);

  return svg(
    "g",
    { class: look === "afloat" ? "ship" : `ship ship--${look}` },
    svg("g", { class: "ship__outline" }, ...hull.map(polygon)),
    svg("g", { class: "ship__body" }, ...hull.map(polygon)),
    ...cabins.map(cabin),
  );
}

function polygon(points: Polygon): SVGPolygonElement {
  const text = points.map(({ x, y }) => `${round(x)},${round(y)}`).join(" ");
  return svg("polygon", { attrs: { points: text } });
}

function cabin({ x, y, width, height }: Rect): SVGRectElement {
  return svg("rect", {
    class: "ship__cabin",
    attrs: { x: round(x), y: round(y), width: round(width), height: round(height), rx: 0.05 },
  });
}

/** Keeps the markup short: 0.14000000000000001 becomes 0.14. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
