import { describe, expect, it } from "vitest";
import { Position } from "../../src/domain/Position";

describe("Position", () => {
  it("stores row and column", () => {
    const position = new Position(2, 5);

    expect(position.row).toBe(2);
    expect(position.column).toBe(5);
  });

  it("positions with the same row and column are equal", () => {
    expect(new Position(3, 4).equals(new Position(3, 4))).toBe(true);
  });

  it("positions with a different row or column are not equal", () => {
    expect(new Position(3, 4).equals(new Position(4, 3))).toBe(false);
  });

  it("positions in the same row but different columns are not equal", () => {
    expect(new Position(3, 4).equals(new Position(3, 5))).toBe(false);
  });

  it("spositions in the same column but different rows are not equal", () => {
    expect(new Position(3, 4).equals(new Position(2, 4))).toBe(false);
  });

  it("offsetBy returns a new position and leaves the original unchanged", () => {
    const original = new Position(1, 1);

    const moved = original.offsetBy(2, -1);

    expect(moved.equals(new Position(3, 0))).toBe(true);
    expect(original.equals(new Position(1, 1))).toBe(true);
  });

  describe("isAdjacentTo", () => {
    it("is true for positions next to each other in a row or column", () => {
      const position = new Position(2, 2);

      expect(position.isAdjacentTo(new Position(2, 3))).toBe(true);
      expect(position.isAdjacentTo(new Position(1, 2))).toBe(true);
    });

    it("is true for diagonal positions", () => {
      const position = new Position(2, 2);

      expect(position.isAdjacentTo(new Position(3, 3))).toBe(true);
      expect(position.isAdjacentTo(new Position(1, 1))).toBe(true);
    });

    it("is false for the same position", () => {
      const position = new Position(2, 2);

      expect(position.isAdjacentTo(new Position(2, 2))).toBe(false);
    });

    it("is false for positions two or more cells apart", () => {
      const position = new Position(2, 2);

      expect(position.isAdjacentTo(new Position(2, 4))).toBe(false);
      expect(position.isAdjacentTo(new Position(4, 2))).toBe(false);
      expect(position.isAdjacentTo(new Position(4, 4))).toBe(false);
    });
  });
});
