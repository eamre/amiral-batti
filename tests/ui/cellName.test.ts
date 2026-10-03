import { describe, expect, it } from "vitest";
import { cellName } from "../../src/ui/cellName";

describe("cellName", () => {
  it.each([
    [0, 0, "A1"],
    [3, 2, "C4"],
    [9, 9, "J10"],
  ])("calls row %i, column %i %s", (row, column, name) => {
    expect(cellName({ row, column })).toBe(name);
  });
});
