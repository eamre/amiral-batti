import type { Fleet, ShotOutcome } from "./Fleet";
import { opponentOf, type Player } from "./Player";
import type { Position } from "./Position";
import type { Ship } from "./Ship";

export interface FireResult {
  readonly battle: Battle;
  readonly outcome: ShotOutcome;
  readonly sunkShip?: Ship;
}

export class Battle {
  constructor(
    private readonly fleets: Readonly<Record<Player, Fleet>>,
    readonly turn: Player,
  ) {}

  get winner(): Player | undefined {
    if (this.fleets.second.isDestroyed) {
      return "first";
    }
    if (this.fleets.first.isDestroyed) {
      return "second";
    }
    return undefined;
  }

  fleetOf(player: Player): Fleet {
    return this.fleets[player];
  }

  canFire(position: Position): boolean {
    const target = opponentOf(this.turn);

    return (
      this.winner === undefined &&
      !this.fleets[target].hasReceivedShotAt(position)
    );
  }

  fire(position: Position): FireResult {
    if (!this.canFire(position)) {
      throw new Error("This shot is not allowed.");
    }

    const target = opponentOf(this.turn);
    const result = this.fleets[target].receiveShot(position);

    const fleets = { ...this.fleets, [target]: result.fleet };
    const nextTurn = result.outcome === "miss" ? target : this.turn;

    return {
      battle: new Battle(fleets, nextTurn),
      outcome: result.outcome,
      sunkShip: result.sunkShip,
    };
  }
}
