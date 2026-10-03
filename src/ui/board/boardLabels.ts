import { svg } from "../dom/svg";
import { rowLetter } from "./cellName";

/** How much room the labels take above and left of the grid, in cells. */
export const LABEL_MARGIN = 0.7;

/**
 * What an SVG board looks at: the grid, which runs from (0, 0) to (size, size), and the strip of
 * labels above and left of it. Everything is still drawn in cell units; only the window moves.
 */
export function viewBoxOf(size: number): string {
  const extent = size + LABEL_MARGIN;

  return `${-LABEL_MARGIN} ${-LABEL_MARGIN} ${extent} ${extent}`;
}

/** Letters down the left edge, one per row, and numbers along the top, one per column. */
export function boardLabels(size: number): SVGGElement {
  const indices = Array.from({ length: size }, (_, index) => index);
  const middle = -LABEL_MARGIN / 2;

  return svg(
    "g",
    { class: "board__labels", attrs: { "aria-hidden": "true" } },
    ...indices.map((row) => label(rowLetter(row), middle, row + 0.5)),
    ...indices.map((column) => label(String(column + 1), column + 0.5, middle)),
  );
}

function label(text: string, x: number, y: number): SVGTextElement {
  const element = svg("text", { class: "board__label", attrs: { x, y } });

  element.textContent = text;
  return element;
}
