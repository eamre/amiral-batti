import type { PlacementSession } from "../application/PlacementSession";
import type { CellDto } from "../shared/protocol";
import type { ShipLook } from "./shipGraphic";

export interface PlacedShipModel {
  readonly cells: readonly CellDto[];
  readonly quarterTurns: number;
  readonly look: ShipLook;
}

/** What the board shows while the player arranges the fleet. */
export interface PlacementModel {
  readonly size: number;
  readonly ships: readonly PlacedShipModel[];
}

/**
 * A ship that cannot stand where it is shows as misplaced, whether the player is holding it or not.
 * A ship that is being held in a good place is lifted, to tell it apart from the ones that rest.
 */
export function placementModel(session: PlacementSession): PlacementModel {
  const fleet = session.shown;

  return {
    size: fleet.settings.boardSize,
    ships: fleet.ships.map(({ ship }, index) => ({
      cells: ship.cells.map((cell) => ({ row: cell.row, column: cell.column })),
      quarterTurns: ship.quarterTurns,
      look: lookOf(fleet.statusOf(index) === "valid", index === session.draggingIndex),
    })),
  };
}

function lookOf(isPlacedWell: boolean, isHeld: boolean): ShipLook {
  if (!isPlacedWell) {
    return "misplaced";
  }
  return isHeld ? "lifted" : "afloat";
}
