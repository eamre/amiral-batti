import { describe, expect, it } from "vitest";
import { cellName } from "../../../src/ui/board/cellName";

describe("cellName", () => {
  it.each([
    [0, 0, "A1"],
    [3, 2, "D3"],
    [9, 9, "J10"],
    [0, 9, "A10"],
  ])("calls row %i, column %i %s", (row, column, name) => {
    expect(cellName({ row, column })).toBe(name);
  });
});
