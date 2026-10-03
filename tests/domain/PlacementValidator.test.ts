import { describe, expect, it } from "vitest";
import { Board } from "../../src/domain/Board";
import { PlacementValidator } from "../../src/domain/PlacementValidator";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";

describe("PlacementValidator", () => {
  const board = new Board(5);
  const existing = new Ship(ShipShape.straight(3), new Position(1, 1));

  it("accepts a ship that is inside and has a free cell around it", () => {
    const validator = new PlacementValidator(board, false);
    const ship = new Ship(ShipShape.straight(2), new Position(3, 1));

    expect(validator.check(ship, [existing])).toBe("valid");
  });

  it("rejects a ship that sticks out of the board", () => {
    const validator = new PlacementValidator(board, false);
    const ship = new Ship(ShipShape.straight(3), new Position(0, 3));

    expect(validator.check(ship, [])).toBe("outside");
  });

  it("rejects a ship that shares a cell with another ship", () => {
    const validator = new PlacementValidator(board, false);
    const ship = new Ship(ShipShape.straight(2), new Position(1, 2));

    expect(validator.check(ship, [existing])).toBe("overlaps");
  });

  it("rejects a ship that touches another ship when touching is not allowed", () => {
    const validator = new PlacementValidator(board, false);
    const ship = new Ship(ShipShape.straight(2), new Position(2, 1));

    expect(validator.check(ship, [existing])).toBe("touches");
  });

  it("accepts a ship that touches another ship when touching is allowed", () => {
    const validator = new PlacementValidator(board, true);
    const ship = new Ship(ShipShape.straight(2), new Position(2, 1));

    expect(validator.check(ship, [existing])).toBe("valid");
  });

  it("still rejects overlapping ships when touching is allowed", () => {
    const validator = new PlacementValidator(board, true);
    const ship = new Ship(ShipShape.straight(2), new Position(1, 2));

    expect(validator.check(ship, [existing])).toBe("overlaps");
  });
});