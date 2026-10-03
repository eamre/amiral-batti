import { describe, expect, it } from "vitest";
import { Board } from "../../src/domain/Board";
import { PlacementValidator } from "../../src/domain/PlacementValidator";
import { Position } from "../../src/domain/Position";
import type { RandomSource } from "../../src/domain/random";
import { RandomFleetGenerator } from "../../src/domain/RandomFleetGenerator";
import type { ShipDefinition } from "../../src/domain/ShipDefinition";
import { ShipShape } from "../../src/domain/ShipShape";
import { FLEETS } from "../../src/domain/fleets";

function scriptedRandom(values: number[]): RandomSource {
  let next = 0;
  return () => {
    const value = values[next % values.length] ?? 0;
    next++;
    return value;
  };
}

function generatorFor(
  board: Board,
  random: RandomSource,
): RandomFleetGenerator {
  return new RandomFleetGenerator(
    board,
    new PlacementValidator(board, false),
    random,
  );
}

describe("RandomFleetGenerator", () => {
  const board = new Board(5);
  const cruiser: ShipDefinition = {
    kind: "cruiser",
    shape: ShipShape.straight(3),
  };

  it("creates one ship per definition", () => {
    const generator = generatorFor(new Board(10), Math.random);

    const ships = generator.generate([cruiser, cruiser]);

    expect(ships).toHaveLength(2);
  });

  it("places the ship in the top-left corner when the random source always returns 0", () => {
    const generator = generatorFor(board, () => 0);

    const [ship] = generator.generate([cruiser]);

    expect(ship?.quarterTurns).toBe(0);
    expect(ship?.origin).toEqual(new Position(0, 0));
  });

  it("turns the ship and pushes it to the far corner when the random source always returns almost 1", () => {
    const generator = generatorFor(board, () => 0.999999);

    const [ship] = generator.generate([cruiser]);

    expect(ship?.quarterTurns).toBe(3);
    expect(ship?.origin).toEqual(new Position(2, 4));
  });

  it("tries again when the first random spot is already taken", () => {
    const random = scriptedRandom([0, 0, 0, 0, 0, 0, 0, 0.8, 0]);
    const generator = generatorFor(board, random);

    const [first, second] = generator.generate([cruiser, cruiser]);

    expect(first?.origin).toEqual(new Position(0, 0));
    expect(second?.origin).toEqual(new Position(4, 0));
  });

  it("throws when the ship cannot fit on the board", () => {
    const generator = generatorFor(new Board(2), () => 0);

    expect(() => generator.generate([cruiser])).toThrow();
  });

  it("starts over with the whole fleet when a ship finds no free place", () => {
    const firstShip = [0, 0, 0];
    const secondShipBlockedEveryTime = new Array(300 * 3).fill(0);
    const secondShipFreeSpot = [0, 0.8, 0];
    const random = scriptedRandom([
      ...firstShip,
      ...secondShipBlockedEveryTime,
      ...firstShip,
      ...secondShipFreeSpot,
    ]);
    const generator = generatorFor(board, random);

    const [first, second] = generator.generate([cruiser, cruiser]);

    expect(first?.origin).toEqual(new Position(0, 0));
    expect(second?.origin).toEqual(new Position(4, 0));
  });

  it("places every predefined fleet without overlaps, touching or leaving the board", () => {
    const bigBoard = new Board(10);
    const validator = new PlacementValidator(bigBoard, false);
    const generator = new RandomFleetGenerator(
      bigBoard,
      validator,
      Math.random,
    );

    for (const definitions of Object.values(FLEETS)) {
      for (let run = 0; run < 50; run++) {
        const ships = generator.generate(definitions);

        expect(ships).toHaveLength(definitions.length);
        ships.forEach((ship, index) => {
          const others = ships.filter((_, otherIndex) => otherIndex !== index);
          expect(validator.check(ship, others)).toBe("valid");
        });
      }
    }
  });
});
