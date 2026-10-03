import { describe, expect, it } from "vitest";
import { Position } from "../../src/domain/Position";
import { ShipShape } from "../../src/domain/ShipShape";

/** Konumları "satır,sütun" yazısına çevirip sıralar; sıraya bakmadan karşılaştırabilmek için. */
const toCoordinates = (positions: readonly Position[]) =>
  positions.map((p) => `${p.row},${p.column}`).sort();

describe("ShipShape", () => {
  it("a straight ship is a horizontal bar of the given length", () => {
    const shape = ShipShape.straight(3);
    expect(toCoordinates(shape.cells)).toEqual(["0,0", "0,1", "0,2"]);
  });

  it("length equals the number of cells", () => {
    expect(ShipShape.straight(4).length).toBe(4);
  });

  it("cells are always aligned to the top-left corner", () => {
    const shape = new ShipShape([new Position(3, 4), new Position(3, 5)]);
    expect(toCoordinates(shape.cells)).toEqual(["0,0", "0,1"]);
  });

  it("the arm of a T shape is also aligned to the top-left", () => {
    const shape = new ShipShape([
      new Position(5, 2),
      new Position(6, 2),
      new Position(7, 2),
      new Position(6, 3),
    ]);

    expect(toCoordinates(shape.cells)).toEqual(["0,0", "1,0", "1,1", "2,0"]);
  });

  it("a ship without cells is not allowed", () => {
    expect(() => new ShipShape([])).toThrow();
  });

  describe("rotatedClockwise", () => {
    const tShape = () =>
      new ShipShape([
        new Position(0, 0),
        new Position(1, 0),
        new Position(2, 0),
        new Position(1, 1),
      ]);

    it("a horizontal straight ship becomes vertical", () => {
      const rotated = ShipShape.straight(3).rotatedClockwise();

      expect(toCoordinates(rotated.cells)).toEqual(["0,0", "1,0", "2,0"]);
    });

    it("a straight ship is horizontal again after two turns", () => {
      const rotated = ShipShape.straight(3)
        .rotatedClockwise()
        .rotatedClockwise();

      expect(toCoordinates(rotated.cells)).toEqual(["0,0", "0,1", "0,2"]);
    });

    it("Ta T shape points its arm downward after a clockwise turn", () => {
      const rotated = tShape().rotatedClockwise();

      expect(toCoordinates(rotated.cells)).toEqual([
        "0,0",
        "0,1",
        "0,2",
        "1,1",
      ]);
    });

    it("four turns bring it back to the original shape", () => {
      const rotated = tShape()
        .rotatedClockwise()
        .rotatedClockwise()
        .rotatedClockwise()
        .rotatedClockwise();

      expect(toCoordinates(rotated.cells)).toEqual(
        toCoordinates(tShape().cells),
      );
    });

    it("rotating does not change the original shape", () => {
      const original = ShipShape.straight(3);

      original.rotatedClockwise();

      expect(toCoordinates(original.cells)).toEqual(["0,0", "0,1", "0,2"]);
    });
  });

  describe("height and width", () => {
    it("is one row high and as wide as its length for a straight ship", () => {
      const shape = ShipShape.straight(3);

      expect(shape.height).toBe(1);
      expect(shape.width).toBe(3);
    });

    it("swaps height and width after a quarter turn", () => {
      const shape = ShipShape.straight(3).rotatedClockwise();

      expect(shape.height).toBe(3);
      expect(shape.width).toBe(1);
    });
  });

  describe("tShaped", () => {
    it("is a bar of three with one extra cell next to its middle", () => {
      const shape = ShipShape.tShaped();

      expect(shape.cells).toEqual([
        new Position(0, 0),
        new Position(1, 0),
        new Position(2, 0),
        new Position(1, 1),
      ]);
    });

    it("is three rows high and two columns wide", () => {
      const shape = ShipShape.tShaped();

      expect(shape.height).toBe(3);
      expect(shape.width).toBe(2);
    });
  });

  describe("staggeredPair", () => {
    it("is two bars of three side by side, the right one shifted one row up", () => {
      const shape = ShipShape.staggeredPair();

      expect(shape.cells).toEqual([
        new Position(1, 0),
        new Position(2, 0),
        new Position(3, 0),
        new Position(0, 1),
        new Position(1, 1),
        new Position(2, 1),
      ]);
    });

    it("is four rows high and two columns wide", () => {
      const shape = ShipShape.staggeredPair();

      expect(shape.height).toBe(4);
      expect(shape.width).toBe(2);
    });
  });
});
