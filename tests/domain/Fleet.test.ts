import { describe, expect, it } from "vitest";
import { Fleet } from "../../src/domain/Fleet";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";

describe("Fleet", () => {
  const cruiser = new Ship(ShipShape.straight(3), new Position(1, 1));

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
  });
});