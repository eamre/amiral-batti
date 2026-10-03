import type { Board } from "./Board";
import type { PlacementValidator } from "./PlacementValidator";
import { Position } from "./Position";
import { randomInt, type RandomSource } from "./random";
import { Ship } from "./Ship";
import type { ShipDefinition } from "./ShipDefinition";

const MAX_TRIES_PER_SHIP = 300;
const MAX_FLEET_ATTEMPTS = 500;

export class RandomFleetGenerator {
  constructor(
    private readonly board: Board,
    private readonly validator: PlacementValidator,
    private readonly random: RandomSource,
  ) {}

  generate(definitions: readonly ShipDefinition[]): Ship[] {
    for (let attempt = 0; attempt < MAX_FLEET_ATTEMPTS; attempt++) {
      const fleet = this.tryToPlaceFleet(definitions);

      if (fleet !== undefined) {
        return fleet;
      }
    }

    throw new Error("Could not place the whole fleet.");
  }

  private tryToPlaceFleet(definitions: readonly ShipDefinition[]): Ship[] | undefined {
    const placedShips: Ship[] = [];

    for (const definition of definitions) {
      const ship = this.tryToPlaceShip(definition, placedShips);

      if (ship === undefined) {
        return undefined;
      }

      placedShips.push(ship);
    }

    return placedShips;
  }

  private tryToPlaceShip(
    definition: ShipDefinition,
    placedShips: readonly Ship[],
  ): Ship | undefined {
    for (let attempt = 0; attempt < MAX_TRIES_PER_SHIP; attempt++) {
      const candidate = this.randomShipOf(definition);

      if (this.validator.check(candidate, placedShips) === "valid") {
        return candidate;
      }
    }

    return undefined;
  }

  private randomShipOf(definition: ShipDefinition): Ship {
    const quarterTurns = randomInt(this.random, 4);
    const turned = new Ship(definition.shape, new Position(0, 0), quarterTurns);

    const row = randomInt(this.random, this.board.size - turned.shape.height + 1);
    const column = randomInt(this.random, this.board.size - turned.shape.width + 1);

    return turned.movedTo(new Position(row, column));
  }
}