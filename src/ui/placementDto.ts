import type { ShipPlacement } from "../application/buildFleet";
import { Position } from "../domain/Position";
import type { ShipPlacementDto } from "../shared/protocol";

/** The application speaks of a ship's `origin`; the wire and the browser's memory speak of `row` and `column`. */
export function toPlacementDto({ kind, origin, quarterTurns }: ShipPlacement): ShipPlacementDto {
  return { kind, row: origin.row, column: origin.column, quarterTurns };
}

export function fromPlacementDto({ kind, row, column, quarterTurns }: ShipPlacementDto): ShipPlacement {
  return { kind, origin: new Position(row, column), quarterTurns };
}
