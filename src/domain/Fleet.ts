import type { Position } from "./Position";
import type { Ship } from "./Ship";

export type ShotOutcome = "miss" | "hit";

export interface ShotResult {
  readonly fleet: Fleet;
  readonly outcome: ShotOutcome;
}

export class Fleet {
  constructor(
    readonly ships: readonly Ship[],
    readonly shotsReceived: readonly Position[] = [],
  ) {}

  receiveShot(position: Position): ShotResult {
    const alreadyShot = this.shotsReceived.some((shot) => shot.equals(position));
    const fleet = alreadyShot
      ? this
      : new Fleet(this.ships, [...this.shotsReceived, position]);

    const outcome = this.ships.some((ship) => ship.occupies(position)) ? "hit" : "miss";

    return { fleet, outcome };
  }
}