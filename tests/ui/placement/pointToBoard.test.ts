import { describe, expect, it } from "vitest";
import { LABEL_MARGIN } from "../../../src/ui/board/boardLabels";
import { pointToBoard } from "../../../src/ui/placement/pointToBoard";

// A cell is 20 pixels wide. The picture also holds the labels, so it is wider than the grid.
const CELL = 20;
const MARGIN = LABEL_MARGIN * CELL;
const rect = { left: 20, top: 100, width: 10 * CELL + MARGIN, height: 10 * CELL + MARGIN };
const gridLeft = rect.left + MARGIN;
const gridTop = rect.top + MARGIN;

describe("pointToBoard", () => {
  it("puts the top left corner of the grid, not of the picture, at (0, 0)", () => {
    const point = pointToBoard({ x: gridLeft, y: gridTop }, rect, 10);

    expect(point.row).toBeCloseTo(0);
    expect(point.column).toBeCloseTo(0);
  });

  it("measures in cells, not pixels", () => {
    const point = pointToBoard({ x: gridLeft + 70, y: gridTop + 50 }, rect, 10);

    expect(point.row).toBeCloseTo(2.5);
    expect(point.column).toBeCloseTo(3.5);
  });

  it("goes below zero over the labels, left of and above the grid", () => {
    const point = pointToBoard({ x: rect.left, y: rect.top }, rect, 10);

    expect(point.row).toBeCloseTo(-LABEL_MARGIN);
    expect(point.column).toBeCloseTo(-LABEL_MARGIN);
  });

  it("reaches the board size at the far corner", () => {
    const point = pointToBoard({ x: rect.left + rect.width, y: rect.top + rect.height }, rect, 10);

    expect(point.row).toBeCloseTo(10);
    expect(point.column).toBeCloseTo(10);
  });
});
