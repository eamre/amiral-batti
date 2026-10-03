import type { Fleet } from "../domain/Fleet";
import { opponentOf, type Player } from "../domain/Player";
import type { Position } from "../domain/Position";
import type { Ship } from "../domain/Ship";
import type { Game, GamePhase } from "./Game";
import type { GameSettings } from "./GameSettings";

/** A ship the viewer is allowed to see: the cells it covers and how far it was turned (it shows which way the bow points). */
export interface ShipView {
  readonly cells: readonly Position[];
  readonly quarterTurns: number;
}

export interface ShotView {
  readonly position: Position;
  readonly hit: boolean;
}

/**
 * Everything one player is allowed to know about the game.
 * It is safe to send over the network: the opponent's ships are in it
 * only after they have sunk.
 */
export interface GameView {
  readonly you: Player;
  readonly phase: GamePhase;
  readonly settings: GameSettings;
  readonly wins: Readonly<Record<Player, number>>;
  readonly youAreReady: boolean;
  readonly opponentIsReady: boolean;
  readonly yourTurn: boolean;
  readonly secondsLeft?: number;
  readonly winner?: Player;
  readonly yourShips: readonly ShipView[];
  readonly shotsAtYou: readonly Position[];
  readonly yourShots: readonly ShotView[];
  /** The opponent's ships that have sunk. A ship that is still afloat is never in here. */
  readonly sunkEnemyShips: readonly ShipView[];
  /** Cells around sunk enemy ships that cannot hold a ship and were not fired at. */
  readonly knownEmptyEnemyCells: readonly Position[];
  /** The same around the viewer's own sunk ships: the opponent knows they are empty too. */
  readonly knownEmptyOwnCells: readonly Position[];
}

export function viewFor(game: Game, you: Player, now: number): GameView {
  const opponent = opponentOf(you);
  const yourFleet = game.fleetOf(you);
  const enemyFleet = game.fleetOf(opponent);

  return {
    you,
    phase: game.phase,
    settings: game.settings,
    wins: game.wins,
    youAreReady: game.isReady(you),
    opponentIsReady: game.isReady(opponent),
    yourTurn: game.turn === you,
    secondsLeft: game.timeLeft(now),
    winner: game.winner,
    yourShips: yourFleet?.ships.map(shipViewOf) ?? [],
    shotsAtYou: yourFleet?.shotsReceived ?? [],
    yourShots: shotsAt(enemyFleet),
    sunkEnemyShips: enemyFleet?.sunkShips.map(shipViewOf) ?? [],
    knownEmptyEnemyCells: emptyCellsNotFiredAt(game, opponent),
    knownEmptyOwnCells: emptyCellsNotFiredAt(game, you),
  };
}

function shipViewOf(ship: Ship): ShipView {
  return { cells: ship.cells, quarterTurns: ship.quarterTurns };
}

function shotsAt(fleet: Fleet | undefined): ShotView[] {
  if (fleet === undefined) {
    return [];
  }

  return fleet.shotsReceived.map((position) => ({
    position,
    hit: fleet.ships.some((ship) => ship.occupies(position)),
  }));
}

/** The cells around the sunk ships of `owner` that nobody needs to fire at, each listed once. */
function emptyCellsNotFiredAt(game: Game, owner: Player): Position[] {
  const { battle } = game;

  if (battle === undefined) {
    return [];
  }

  const fleet = battle.fleetOf(owner);
  const cells = battle.knownEmptyCellsOf(owner);

  return cells.filter(
    (cell, index) =>
      cells.findIndex((other) => other.equals(cell)) === index &&
      !fleet.hasReceivedShotAt(cell),
  );
}
