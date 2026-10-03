import { describe, expect, it } from "vitest";
import { dragOrigin } from "../../src/application/shipDrag";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";

const BOARD_SIZE = 10;
const horizontalCruiser = new Ship(ShipShape.straight(4), new Position(3, 2));
const verticalCruiser = new Ship(ShipShape.straight(4), new Position(3, 2), 1);

// A pointer position is measured in cells from the top-left corner of the board,
// so (0.5, 0.5) is the middle of the cell (0, 0).
function pointer(row: number, column: number) {
  return { row, column };
}

describe("dragOrigin", () => {
  it("keeps the ship where it is when the pointer has not moved", () => {
    const grabbed = new Position(3, 2);

    expect(dragOrigin(horizontalCruiser, grabbed, pointer(3.5, 2.5), BOARD_SIZE)).toEqual(
      new Position(3, 2),
    );
  });

  it("puts the first cell of the ship under the pointer when it was grabbed there", () => {
    const grabbed = new Position(3, 2);

    expect(dragOrigin(horizontalCruiser, grabbed, pointer(7.5, 5.5), BOARD_SIZE)).toEqual(
      new Position(7, 5),
    );
  });

  it("keeps the grabbed cell under the pointer when the ship was grabbed in the middle", () => {
    const grabbed = new Position(3, 4); // the third cell of a horizontal ship

    expect(dragOrigin(horizontalCruiser, grabbed, pointer(6.5, 6.5), BOARD_SIZE)).toEqual(
      new Position(6, 4),
    );
  });

  it("works for a ship that stands upright", () => {
    const grabbed = new Position(5, 2); // the third cell of a vertical ship

    expect(dragOrigin(verticalCruiser, grabbed, pointer(6.5, 8.5), BOARD_SIZE)).toEqual(
      new Position(4, 8),
    );
  });

  it("rounds to the nearest cell", () => {
    const grabbed = new Position(3, 2);

    expect(dragOrigin(horizontalCruiser, grabbed, pointer(4.9, 4.2), BOARD_SIZE)).toEqual(
      new Position(4, 4),
    );
    expect(dragOrigin(horizontalCruiser, grabbed, pointer(4.1, 4.8), BOARD_SIZE)).toEqual(
      new Position(4, 4),
    );
  });

  it("does not return a negative zero", () => {
    const grabbed = new Position(3, 2);
    const origin = dragOrigin(horizontalCruiser, grabbed, pointer(0.2, 0.3), BOARD_SIZE);

    expect(Object.is(origin?.row, 0)).toBe(true);
    expect(Object.is(origin?.column, 0)).toBe(true);
  });

  it("still gives an origin when the pointer is a little outside the board", () => {
    const grabbed = new Position(3, 2);

    expect(dragOrigin(horizontalCruiser, grabbed, pointer(-0.4, 10.4), BOARD_SIZE)).toBeDefined();
  });

  it.each([
    ["above", pointer(-0.6, 5)],
    ["below", pointer(10.6, 5)],
    ["left of", pointer(5, -0.6)],
    ["right of", pointer(5, 10.6)],
  ])("gives nothing when the pointer is far %s the board", (_side, point) => {
    const grabbed = new Position(3, 2);

    expect(dragOrigin(horizontalCruiser, grabbed, point, BOARD_SIZE)).toBeUndefined();
  });
});
