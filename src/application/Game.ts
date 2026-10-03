import { Battle, type BattleRules, type FireResult } from "../domain/Battle";
import { Board } from "../domain/Board";
import { Fleet, type ShotOutcome } from "../domain/Fleet";
import { FLEET_PRESETS } from "../domain/fleetPresets";
import { PlacementValidator } from "../domain/PlacementValidator";
import { opponentOf, type Player } from "../domain/Player";
import type { Position } from "../domain/Position";
import type { RandomSource } from "../domain/random";
import type { Ship } from "../domain/Ship";
import { hasTurnExpired, secondsLeft } from "../domain/turnTimer";
import { buildFleet, type ShipPlacement } from "./buildFleet";
import { GameRuleError } from "./GameRuleError";
import { DEFAULT_GAME_SETTINGS, type GameSettings } from "./GameSettings";

export type GamePhase = "placing" | "battle" | "finished";

export interface ShotReport {
  readonly game: Game;
  readonly shooter: Player;
  readonly position: Position;
  readonly outcome: ShotOutcome;
  readonly sunkShip?: Ship;
  /** True when the game fired because the shooter ran out of time. */
  readonly wasRandom: boolean;
}

interface GameState {
  readonly settings: GameSettings;
  readonly readyFleets: Readonly<Partial<Record<Player, Fleet>>>;
  readonly battle?: Battle;
  readonly turnStartedAt: number;
  readonly starter: Player;
  readonly wins: Readonly<Record<Player, number>>;
}

/**
 * One match between two players: placing ships, firing, and playing again.
 * Like the domain objects it is immutable: every change returns a new Game.
 * It never reads the clock; callers pass `now` (milliseconds) in.
 */
export class Game {
  static create(settings: GameSettings = DEFAULT_GAME_SETTINGS): Game {
    return new Game({
      settings,
      readyFleets: {},
      turnStartedAt: 0,
      starter: "first",
      wins: { first: 0, second: 0 },
    });
  }

  private constructor(private readonly state: GameState) {}

  get settings(): GameSettings {
    return this.state.settings;
  }

  get wins(): Readonly<Record<Player, number>> {
    return this.state.wins;
  }

  get battle(): Battle | undefined {
    return this.state.battle;
  }

  get phase(): GamePhase {
    const { battle } = this.state;

    if (battle === undefined) {
      return "placing";
    }
    return battle.winner === undefined ? "battle" : "finished";
  }

  get turn(): Player | undefined {
    return this.phase === "battle" ? this.state.battle?.turn : undefined;
  }

  get winner(): Player | undefined {
    return this.state.battle?.winner;
  }

  isReady(player: Player): boolean {
    return this.phase !== "placing" || this.state.readyFleets[player] !== undefined;
  }

  timeLeft(now: number): number | undefined {
    if (this.phase !== "battle") {
      return undefined;
    }
    return secondsLeft(this.state.turnStartedAt, now, this.settings.turnSeconds);
  }

  markReady(player: Player, placements: readonly ShipPlacement[], now: number): Game {
    if (this.phase !== "placing") {
      throw new GameRuleError("wrong-phase", "Ships can only be placed before the battle.");
    }
    if (this.isReady(player)) {
      throw new GameRuleError("already-ready", `The ${player} player is already ready.`);
    }

    const ships = buildFleet(
      FLEET_PRESETS[this.settings.fleetPreset],
      placements,
      new PlacementValidator(this.board, this.settings.allowTouching),
    );
    const readyFleets = { ...this.state.readyFleets, [player]: new Fleet(ships) };
    const { first, second } = readyFleets;

    if (first === undefined || second === undefined) {
      return new Game({ ...this.state, readyFleets });
    }

    return new Game({
      ...this.state,
      readyFleets: {},
      battle: new Battle({ first, second }, this.state.starter, this.rules),
      turnStartedAt: now,
    });
  }

  fire(player: Player, position: Position, now: number): ShotReport {
    const battle = this.activeBattle();

    if (battle.turn !== player) {
      throw new GameRuleError("not-your-turn", `It is not the ${player} player's turn.`);
    }
    if (!battle.canFire(position)) {
      throw new GameRuleError("shot-not-allowed", "This cell cannot be fired at.");
    }

    return this.reportOf(player, battle.fire(position), false, now);
  }

  /** Fires at a random cell for the player on turn, but only if his time is up. */
  fireIfTimeIsUp(now: number, random: RandomSource): ShotReport | undefined {
    if (this.phase !== "battle") {
      return undefined;
    }
    if (!hasTurnExpired(this.state.turnStartedAt, now, this.settings.turnSeconds)) {
      return undefined;
    }

    const battle = this.activeBattle();

    return this.reportOf(battle.turn, battle.fireAtRandom(random), true, now);
  }

  /** Back to placing ships; the score stays and the other player starts. */
  nextRound(): Game {
    if (this.phase !== "finished") {
      throw new GameRuleError("wrong-phase", "The round is not over yet.");
    }

    return new Game({
      settings: this.settings,
      readyFleets: {},
      turnStartedAt: 0,
      starter: opponentOf(this.state.starter),
      wins: this.wins,
    });
  }

  private get board(): Board {
    return new Board(this.settings.boardSize);
  }

  private get rules(): BattleRules {
    return { board: this.board, allowTouching: this.settings.allowTouching };
  }

  private activeBattle(): Battle {
    const { battle } = this.state;

    if (battle === undefined || battle.winner !== undefined) {
      throw new GameRuleError("wrong-phase", `There is no battle in progress (${this.phase}).`);
    }
    return battle;
  }

  private reportOf(
    shooter: Player,
    result: FireResult,
    wasRandom: boolean,
    now: number,
  ): ShotReport {
    const winner = result.battle.winner;
    const wins =
      winner === undefined
        ? this.wins
        : { ...this.wins, [winner]: this.wins[winner] + 1 };

    return {
      game: new Game({ ...this.state, battle: result.battle, turnStartedAt: now, wins }),
      shooter,
      position: result.position,
      outcome: result.outcome,
      sunkShip: result.sunkShip,
      wasRandom,
    };
  }
}
