import { describe, expect, it } from "vitest";
import { Board } from "../../src/domain/Board";
import { Position } from "../../src/domain/Position";
import { ShipShape } from "../../src/domain/ShipShape";
import { Ship } from "../../src/domain/Ship";

describe("Board.contains", () => {
  const board = new Board(10);

  it("a position in the middle of the board is inside", () => {
    expect(board.contains(new Position(5, 5))).toBe(true);
  });

  it("the four corners are inside", () => {
    expect(board.contains(new Position(0, 0))).toBe(true);
    expect(board.contains(new Position(0, 9))).toBe(true);
    expect(board.contains(new Position(9, 0))).toBe(true);
    expect(board.contains(new Position(9, 9))).toBe(true);
  });

  it("a negative row or column is outside", () => {
    expect(board.contains(new Position(-1, 3))).toBe(false);
    expect(board.contains(new Position(3, -1))).toBe(false);
  });

  it("a row or column equal to or greater than the size is outside", () => {
    expect(board.contains(new Position(10, 3))).toBe(false);
    expect(board.contains(new Position(3, 10))).toBe(false);
  });
});

describe("Board.neighborsOf", () => {
  const board = new Board(3);

  /** Konumları "satır,sütun" yazısına çevirip sıralar; böylece sıraya bakmadan karşılaştırabiliriz. */
  const toCoordinates = (positions: Position[]) =>
    positions.map((p) => `${p.row},${p.column}`).sort();

  it("a cell in the middle has 8 neighbors", () => {
    const neighbors = board.neighborsOf(new Position(1, 1));

    expect(toCoordinates(neighbors)).toEqual([
      "0,0",
      "0,1",
      "0,2",
      "1,0",
      "1,2",
      "2,0",
      "2,1",
      "2,2",
    ]);
  });

  it("a corner cell has 3 neighbors", () => {
    const neighbors = board.neighborsOf(new Position(0, 0));

    expect(toCoordinates(neighbors)).toEqual(["0,1", "1,0", "1,1"]);
  });

  it("an edge cell has 5 neighbors", () => {
    const neighbors = board.neighborsOf(new Position(0, 1));

    expect(toCoordinates(neighbors)).toEqual([
      "0,0",
      "0,2",
      "1,0",
      "1,1",
      "1,2",
    ]);
  });

  it("a cell is not its own neighbor", () => {
    const neighbors = board.neighborsOf(new Position(1, 1));

    expect(neighbors.some((n) => n.equals(new Position(1, 1)))).toBe(false);
  });
});

describe("Board.containsShip", () => {
  it("returns true when every cell of the ship is on the board", () => {
    const board = new Board(3);
    const ship = new Ship(ShipShape.straight(2), new Position(0, 0));

    expect(board.containsShip(ship)).toBe(true);
  });

  it("returns false when part of the ship sticks out of the board", () => {
    const board = new Board(3);
    const ship = new Ship(ShipShape.straight(2), new Position(0, 2));

    expect(board.containsShip(ship)).toBe(false);
  });
});

describe("Board.pulledInside", () => {
  it("keeps a ship that is already inside where it is", () => {
    const board = new Board(5);
    const ship = new Ship(ShipShape.straight(3), new Position(1, 1));

    expect(board.pulledInside(ship).origin).toEqual(new Position(1, 1));
  });

  it("pulls a ship up when it sticks out of the bottom", () => {
    const board = new Board(5);
    const ship = new Ship(ShipShape.straight(3), new Position(3, 2), 1);

    expect(board.pulledInside(ship).origin).toEqual(new Position(2, 2));
  });

  it("pulls a ship left when it sticks out of the right side", () => {
    const board = new Board(5);
    const ship = new Ship(ShipShape.straight(3), new Position(1, 3));

    expect(board.pulledInside(ship).origin).toEqual(new Position(1, 2));
  });
});
