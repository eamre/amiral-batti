import { FLEET_PRESETS } from "../domain/fleetPresets";
import { Position } from "../domain/Position";
import type { ShipKind } from "../domain/ShipDefinition";
import { ShipShape } from "../domain/ShipShape";
import type { CellDto, GameViewDto } from "../shared/protocol";

/** One ship of the enemy fleet, and whether the viewer has sunk it. */
export interface FleetStatusEntry {
  readonly kind: ShipKind;
  readonly shape: ShipShape;
  readonly sunk: boolean;
}

/**
 * Every ship the enemy started with, in the order of the fleet preset.
 *
 * The viewer only ever sees the cells of a sunk ship, never its kind. So each sunk ship is
 * matched to a ship of the fleet by shape. Position and turn do not matter: a vertical
 * ship in the corner is the same ship as a horizontal one in the middle.
 */
export function enemyFleetStatus(game: GameViewDto): readonly FleetStatusEntry[] {
  const unmatched = game.sunkEnemyShips.map(shapeOf);

  return FLEET_PRESETS[game.settings.fleetPreset].map(({ kind, shape }) => {
    const index = unmatched.findIndex((sunkShape) => hasSameShape(sunkShape, shape));
    const sunk = index !== -1;

    if (sunk) {
      unmatched.splice(index, 1);
    }
    return { kind, shape, sunk };
  });
}

export function shipsLeft(status: readonly FleetStatusEntry[]): number {
  return status.filter((entry) => !entry.sunk).length;
}

function shapeOf(cells: readonly CellDto[]): ShipShape {
  return new ShipShape(cells.map((cell) => new Position(cell.row, cell.column)));
}

/** Equal when one can be turned into the other. Ships can be turned, never mirrored. */
function hasSameShape(a: ShipShape, b: ShipShape): boolean {
  let turned = b;

  for (let quarterTurns = 0; quarterTurns < 4; quarterTurns++) {
    if (keyOf(a) === keyOf(turned)) {
      return true;
    }
    turned = turned.rotatedClockwise();
  }
  return false;
}

function keyOf(shape: ShipShape): string {
  return shape.cells
    .map((cell) => `${cell.row},${cell.column}`)
    .sort()
    .join(";");
}
