import { describe, expect, it } from "vitest";
import { Fleet } from "../../src/domain/Fleet";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";

function shootAll(fleet: Fleet, positions: Position[]): Fleet {
  return positions.reduce(
    (current, position) => current.receiveShot(position).fleet,
    fleet,
  );
}

describe("Fleet", () => {
  const cruiser = new Ship(ShipShape.straight(3), new Position(1, 1));
  const boat = new Ship(ShipShape.straight(2), new Position(3, 0));

  describe("receiveShot", () => {
    it("reports a miss when no ship is at the position", () => {
      const fleet = new Fleet([cruiser]);

      const result = fleet.receiveShot(new Position(0, 0));

      expect(result.outcome).toBe("miss");
    });

    it("reports a hit when a ship is at the position", () => {
      const fleet = new Fleet([cruiser]);

      const result = fleet.receiveShot(new Position(1, 2));

      expect(result.outcome).toBe("hit");
    });

    it("remembers the shot in the returned fleet", () => {
      const fleet = new Fleet([cruiser]);

      const result = fleet.receiveShot(new Position(0, 0));

      expect(result.fleet.shotsReceived).toEqual([new Position(0, 0)]);
    });

    it("does not change the original fleet", () => {
      const fleet = new Fleet([cruiser]);

      fleet.receiveShot(new Position(0, 0));

      expect(fleet.shotsReceived).toHaveLength(0);
    });

    it("does not record the same shot twice", () => {
      const fleet = new Fleet([cruiser]);

      const first = fleet.receiveShot(new Position(1, 2));
      const second = first.fleet.receiveShot(new Position(1, 2));

      expect(second.fleet.shotsReceived).toHaveLength(1);
      expect(second.outcome).toBe("hit");
    });

    it("keeps reporting a hit until the last cell of the ship is hit", () => {
      const fleet = shootAll(new Fleet([cruiser]), [new Position(1, 1)]);

      const result = fleet.receiveShot(new Position(1, 2));

      expect(result.outcome).toBe("hit");
      expect(result.sunkShip).toBeUndefined();
    });

    it("reports sunk and names the ship when its last cell is hit", () => {
      const fleet = shootAll(new Fleet([cruiser]), [
        new Position(1, 1),
        new Position(1, 2),
      ]);

      const result = fleet.receiveShot(new Position(1, 3));

      expect(result.outcome).toBe("sunk");
      expect(result.sunkShip).toBe(cruiser);
    });
  });

  describe("isDestroyed", () => {
    it("is false at the start", () => {
      expect(new Fleet([cruiser, boat]).isDestroyed).toBe(false);
    });

    it("is false while one ship is still afloat", () => {
      const cruiserSunk = [
        new Position(1, 1),
        new Position(1, 2),
        new Position(1, 3),
      ];

      const fleet = shootAll(new Fleet([cruiser, boat]), cruiserSunk);

      expect(fleet.isDestroyed).toBe(false);
    });

    it("is true when every ship is sunk", () => {
      const allCells = [
        new Position(1, 1),
        new Position(1, 2),
        new Position(1, 3),
        new Position(3, 0),
        new Position(3, 1),
      ];

      const fleet = shootAll(new Fleet([cruiser, boat]), allCells);

      expect(fleet.isDestroyed).toBe(true);
    });
  });

  describe("hasReceivedShotAt", () => {
    it("is false for a position that was never shot", () => {
      expect(new Fleet([cruiser]).hasReceivedShotAt(new Position(0, 0))).toBe(
        false,
      );
    });

    it("is true for a position that was shot", () => {
      const fleet = shootAll(new Fleet([cruiser]), [new Position(0, 0)]);

      expect(fleet.hasReceivedShotAt(new Position(0, 0))).toBe(true);
    });
  });
  describe("sunkShips", () => {
    it("is empty at the start", () => {
      expect(new Fleet([cruiser, boat]).sunkShips).toEqual([]);
    });

    it("lists a ship once all its cells were hit", () => {
      const cruiserSunk = [
        new Position(1, 1),
        new Position(1, 2),
        new Position(1, 3),
      ];

      const fleet = shootAll(new Fleet([cruiser, boat]), cruiserSunk);

      expect(fleet.sunkShips).toEqual([cruiser]);
    });

    it("does not list a ship that is only damaged", () => {
      const fleet = shootAll(new Fleet([cruiser, boat]), [new Position(1, 1)]);

      expect(fleet.sunkShips).toEqual([]);
    });
  });
});
