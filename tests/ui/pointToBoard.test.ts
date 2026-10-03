import { describe, expect, it } from "vitest";
import { pointToBoard } from "../../src/ui/pointToBoard";

const rect = { left: 20, top: 100, width: 200, height: 200 };

describe("pointToBoard", () => {
  it("puts the top left corner of the board at (0, 0)", () => {
    expect(pointToBoard({ x: 20, y: 100 }, rect, 10)).toEqual({ row: 0, column: 0 });
  });

  it("measures in cells, not pixels", () => {
    // The board is 200 pixels wide for 10 cells: a cell is 20 pixels.
    expect(pointToBoard({ x: 20 + 70, y: 100 + 50 }, rect, 10)).toEqual({ row: 2.5, column: 3.5 });
  });

  it("goes below zero left of and above the board", () => {
    expect(pointToBoard({ x: 0, y: 80 }, rect, 10)).toEqual({ row: -1, column: -1 });
  });

  it("reaches the board size at the far corner", () => {
    expect(pointToBoard({ x: 220, y: 300 }, rect, 10)).toEqual({ row: 10, column: 10 });
  });
});
