import type { PlacementValidator } from "../domain/PlacementValidator";
import { Position } from "../domain/Position";
import { Ship } from "../domain/Ship";
import type { ShipDefinition, ShipKind } from "../domain/ShipDefinition";
import { GameRuleError } from "./GameRuleError";

/** What a player sends when he says "my ships are here". */
export interface ShipPlacement {
  readonly kind: ShipKind;
  readonly origin: Position;
  readonly quarterTurns: number;
}

/**
 * Turns the player's placements into real ships.
 * Throws a GameRuleError when the placements do not form a legal fleet.
 */
export function buildFleet(
  definitions: readonly ShipDefinition[],
  placements: readonly ShipPlacement[],
  validator: PlacementValidator,
): Ship[] {
  if (placements.length !== definitions.length) {
    throw new GameRuleError(
      "wrong-fleet",
      `Expected ${definitions.length} ships but got ${placements.length}.`,
    );
  }

  const unused = [...placements];
  const ships: Ship[] = [];

  for (const definition of definitions) {
    const index = unused.findIndex((placement) => placement.kind === definition.kind);
    const placement = unused[index];

    if (placement === undefined) {
      throw new GameRuleError("wrong-fleet", `No "${definition.kind}" was placed.`);
    }
    unused.splice(index, 1);

    const ship = shipFrom(definition, placement);
    const result = validator.check(ship, ships);

    if (result !== "valid") {
      throw new GameRuleError(
        "bad-placement",
        `The "${definition.kind}" is not placed legally: ${result}.`,
      );
    }
    ships.push(ship);
  }

  return ships;
}

function shipFrom(definition: ShipDefinition, placement: ShipPlacement): Ship {
  const { origin, quarterTurns } = placement;

  if (!Number.isInteger(quarterTurns) || quarterTurns < 0 || quarterTurns > 3) {
    throw new GameRuleError(
      "bad-placement",
      `The "${definition.kind}" has an invalid rotation: ${quarterTurns}.`,
    );
  }

  return new Ship(definition.shape, new Position(origin.row, origin.column), quarterTurns);
}
