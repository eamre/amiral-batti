import { describe, expect, it } from "vitest";
import { Board } from "../../src/domain/Board";
import { Position } from "../../src/domain/Position";
import { ShipShape } from "../../src/domain/ShipShape";
import { Ship } from "../../src/domain/Ship";

describe("Board.contains", () => {
  const board = new Board(10);

  it("tahtanın ortasındaki konum içeridedir", () => {
    expect(board.contains(new Position(5, 5))).toBe(true);
  });

  it("dört köşe de içeridedir", () => {
    expect(board.contains(new Position(0, 0))).toBe(true);
    expect(board.contains(new Position(0, 9))).toBe(true);
    expect(board.contains(new Position(9, 0))).toBe(true);
    expect(board.contains(new Position(9, 9))).toBe(true);
  });

  it("negatif satır ya da sütun dışarıdadır", () => {
    expect(board.contains(new Position(-1, 3))).toBe(false);
    expect(board.contains(new Position(3, -1))).toBe(false);
  });

  it("boyuta eşit ya da büyük satır ya da sütun dışarıdadır", () => {
    expect(board.contains(new Position(10, 3))).toBe(false);
    expect(board.contains(new Position(3, 10))).toBe(false);
  });
});

describe("Board.neighborsOf", () => {
  const board = new Board(3);

  /** Konumları "satır,sütun" yazısına çevirip sıralar; böylece sıraya bakmadan karşılaştırabiliriz. */
  const toCoordinates = (positions: Position[]) =>
    positions.map((p) => `${p.row},${p.column}`).sort();

  it("ortadaki karenin 8 komşusu vardır", () => {
    const neighbors = board.neighborsOf(new Position(1, 1));

    expect(toCoordinates(neighbors)).toEqual([
      "0,0", "0,1", "0,2",
      "1,0",        "1,2",
      "2,0", "2,1", "2,2",
    ]);
  });

  it("köşedeki karenin 3 komşusu vardır", () => {
    const neighbors = board.neighborsOf(new Position(0, 0));

    expect(toCoordinates(neighbors)).toEqual(["0,1", "1,0", "1,1"]);
  });

  it("kenardaki karenin 5 komşusu vardır", () => {
    const neighbors = board.neighborsOf(new Position(0, 1));

    expect(toCoordinates(neighbors)).toEqual(["0,0", "0,2", "1,0", "1,1", "1,2"]);
  });

  it("karenin kendisi komşuları arasında değildir", () => {
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