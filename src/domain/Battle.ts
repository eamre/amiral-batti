import type { Board } from "./Board";
import type { Fleet, ShotOutcome } from "./Fleet";
import { opponentOf, type Player } from "./Player";
import type { Position } from "./Position";
import { randomInt, type RandomSource } from "./random";
import type { Ship } from "./Ship";

export interface BattleRules {
  readonly board: Board;
  readonly allowTouching: boolean;
}

export interface FireResult {
  readonly battle: Battle;
  readonly position: Position;
  readonly outcome: ShotOutcome;
  readonly sunkShip?: Ship;
}

export class Battle {
  constructor(
    private readonly fleets: Readonly<Record<Player, Fleet>>,
    readonly turn: Player,
    private readonly rules: BattleRules,
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

  knownEmptyCellsOf(player: Player): Position[] {
    if (this.rules.allowTouching) {
      return [];
    }

    return this.fleets[player].sunkShips.flatMap((ship) =>
      this.rules.board.surroundingsOf(ship),
    );
  }

  canFire(position: Position): boolean {
    if (this.winner !== undefined || !this.rules.board.contains(position)) {
      return false;
    }

    const target = opponentOf(this.turn);
    const isKnownEmpty = this.knownEmptyCellsOf(target).some((cell) => cell.equals(position));

    return !isKnownEmpty && !this.fleets[target].hasReceivedShotAt(position);
  }

  fireablePositions(): Position[] {
    return this.rules.board.positions().filter((position) => this.canFire(position));
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
      battle: new Battle(fleets, nextTurn, this.rules),
      position,
      outcome: result.outcome,
      sunkShip: result.sunkShip,
    };
  }

  fireAtRandom(random: RandomSource): FireResult {
    const choices = this.fireablePositions();
    const choice = choices[randomInt(random, choices.length)];

    if (choice === undefined) {
      throw new Error("There is no cell left to fire at.");
    }

    return this.fire(choice);
  }
}