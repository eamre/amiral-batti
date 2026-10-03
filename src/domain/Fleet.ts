import type { Position } from "./Position";
import type { Ship } from "./Ship";

export type ShotOutcome = "miss" | "hit" | "sunk";

export interface ShotResult {
  readonly fleet: Fleet;
  readonly outcome: ShotOutcome;
  readonly sunkShip?: Ship;
}

export class Fleet {
  constructor(
    readonly ships: readonly Ship[],
    readonly shotsReceived: readonly Position[] = [],
  ) {}

  get isDestroyed(): boolean {
    return this.ships.every((ship) => this.isSunk(ship));
  }

  receiveShot(position: Position): ShotResult {
    const fleet = this.hasReceivedShotAt(position)
      ? this
      : new Fleet(this.ships, [...this.shotsReceived, position]);

    const hitShip = this.ships.find((ship) => ship.occupies(position));

    if (hitShip === undefined) {
      return { fleet, outcome: "miss" };
    }
    if (fleet.isSunk(hitShip)) {
      return { fleet, outcome: "sunk", sunkShip: hitShip };
    }
    return { fleet, outcome: "hit" };
  }

  private isSunk(ship: Ship): boolean {
    return ship.cells.every((cell) => this.hasReceivedShotAt(cell));
  }

  hasReceivedShotAt(position: Position): boolean {
    return this.shotsReceived.some((shot) => shot.equals(position));
  }
}
