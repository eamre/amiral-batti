import { describe, expect, it } from "vitest";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";

/** Konumları "satır,sütun" yazısına çevirip sıralar; sıraya bakmadan karşılaştırabilmek için. */
const toCoordinates = (positions: readonly Position[]) =>
  positions.map((p) => `${p.row},${p.column}`).sort();

describe("Ship", () => {
  const horizontalShip = () => new Ship(ShipShape.straight(3), new Position(2, 4));

  describe("cells", () => {
    it("shifts the shape's cells to the origin", () => {
      expect(toCoordinates(horizontalShip().cells)).toEqual(["2,4", "2,5", "2,6"]);
    });

    it("a ship turned a quarter turn stands vertical and keeps its top-left corner", () => {
      const vertical = new Ship(ShipShape.straight(3), new Position(2, 4), 1);

      expect(toCoordinates(vertical.cells)).toEqual(["2,4", "3,4", "4,4"]);
    });

    it("a rotated T ship places the cells of the new shape relative to its origin", () => {
      const t = new ShipShape([new Position(0, 0), new Position(1, 0), new Position(2, 0), new Position(1, 1)]);
      const turned = new Ship(t, new Position(5, 5), 1);

      expect(toCoordinates(turned.cells)).toEqual(["5,5", "5,6", "5,7", "6,6"]);
    });
  });

  describe("occupies", () => {
    it("returns true on a ship cell and false outside it", () => {
      const ship = horizontalShip();

      expect(ship.occupies(new Position(2, 5))).toBe(true);
      expect(ship.occupies(new Position(3, 5))).toBe(false);
    });
  });

  describe("movedTo", () => {
    it("moves the ship, preserving the number of quarter turns", () => {
      const moved = new Ship(ShipShape.straight(2), new Position(0, 0), 1).movedTo(new Position(4, 4));

      expect(moved.quarterTurns).toBe(1);
      expect(toCoordinates(moved.cells)).toEqual(["4,4", "5,4"]);
    });

    it("does not modify the original ship", () => {
      const ship = horizontalShip();

      ship.movedTo(new Position(9, 9));

      expect(ship.origin.equals(new Position(2, 4))).toBe(true);
    });
  });

  describe("rotated", () => {
    it("increases the number of quarter turns by one, keeping the top-left corner in place", () => {
      const turned = horizontalShip().rotated();

      expect(turned.quarterTurns).toBe(1);
      expect(turned.origin.equals(new Position(2, 4))).toBe(true);
    });

    it("four turns bring it back to the original shape", () => {
      const ship = horizontalShip().rotated().rotated().rotated().rotated();

      expect(ship.quarterTurns).toBe(0);
      expect(toCoordinates(ship.cells)).toEqual(["2,4", "2,5", "2,6"]);
    });

    it("two rotated straight ships occupy the same cells but face different directions", () => {
      const ship = horizontalShip().rotated().rotated();

      expect(ship.quarterTurns).toBe(2);
      expect(toCoordinates(ship.cells)).toEqual(["2,4", "2,5", "2,6"]);
    });
  });
});