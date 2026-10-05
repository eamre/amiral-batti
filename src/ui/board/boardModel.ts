import type { CellDto, GameViewDto } from "../../shared/protocol";

/**
 * hit      a shot that found a ship
 * water    a cell that is known to hold no ship: a shot that found water, or a cell next to a
 *          sunk ship that nobody fired at. Both mean the same to the player, so both look the same.
 */
export type CellMark = "none" | "hit" | "water";

export interface CellModel {
  readonly row: number;
  readonly column: number;
  readonly mark: CellMark;
  readonly sunk: boolean;
  readonly canFire: boolean;
}

export interface ShipModel {
  readonly cells: readonly CellDto[];
  /** How far the ship was turned; it decides which way the bow points. */
  readonly quarterTurns: number;
  readonly sunk: boolean;
}

/** What one board shows, with no word about how it is drawn. */
export interface BoardModel {
  readonly size: number;
  /** Row by row, so the cell at (row, column) is `cells[row * size + column]`. */
  readonly cells: readonly CellModel[];
  readonly ships: readonly ShipModel[];
}

/** The viewer's own fleet, with the shots the opponent has fired at it. */
export function ownWatersModel(game: GameViewDto): BoardModel {
  const hitCells = keysOf(game.shotsAtYou, game);
  const ships = game.yourShips.map(({ cells, quarterTurns }) => ({
    cells,
    quarterTurns,
    sunk: cells.every((cell) => hitCells.has(keyOf(cell, game))),
  }));
  const shipCells = keysOf(ships.flatMap((ship) => ship.cells), game);
  const sunkCells = keysOf(ships.filter((ship) => ship.sunk).flatMap((ship) => ship.cells), game);
  const knownEmpty = keysOf(game.knownEmptyOwnCells, game);

  return {
    size: game.settings.boardSize,
    ships,
    cells: allCells(game, (key) => ({
      mark: hitCells.has(key) ? (shipCells.has(key) ? "hit" : "water") : knownEmpty.has(key) ? "water" : "none",
      sunk: sunkCells.has(key),
      canFire: false,
    })),
  };
}

/** The opponent's waters: only what the viewer has found out so far. */
export function enemyWatersModel(game: GameViewDto, canFire: boolean): BoardModel {
  const shots = new Map(game.yourShots.map((shot) => [keyOf(shot.cell, game), shot.hit]));
  const sunkCells = keysOf(game.sunkEnemyShips.flatMap((ship) => ship.cells), game);
  const knownEmpty = keysOf(game.knownEmptyEnemyCells, game);

  return {
    size: game.settings.boardSize,
    // A ship is only shown once it has sunk, and then the server also tells how it stood.
    ships: game.sunkEnemyShips.map(({ cells, quarterTurns }) => ({ cells, quarterTurns, sunk: true })),
    cells: allCells(game, (key) => {
      const shotHit = shots.get(key);
      const mark: CellMark =
        shotHit !== undefined ? (shotHit ? "hit" : "water") : knownEmpty.has(key) ? "water" : "none";

      return { mark, sunk: sunkCells.has(key), canFire: canFire && mark === "none" };
    }),
  };
}

/**
 * The opponent's waters after the game: the shots of the viewer, and the whole fleet of the opponent,
 * the ships that were never found included. Nobody fires any more. Before the server reveals
 * the fleet, it shows what is known, as the waters do.
 */
export function enemyFleetModel(game: GameViewDto): BoardModel {
  const waters = enemyWatersModel(game, false);

  if (game.revealedEnemyShips.length === 0) {
    return waters;
  }
  const hitCells = keysOf(game.yourShots.filter((shot) => shot.hit).map((shot) => shot.cell), game);

  return {
    ...waters,
    ships: game.revealedEnemyShips.map(({ cells, quarterTurns }) => ({
      cells,
      quarterTurns,
      sunk: cells.every((cell) => hitCells.has(keyOf(cell, game))),
    })),
  };
}

function allCells(
  game: GameViewDto,
  describe: (key: number) => Pick<CellModel, "mark" | "sunk" | "canFire">,
): CellModel[] {
  const size = game.settings.boardSize;

  return Array.from({ length: size * size }, (_, key) => ({
    row: Math.floor(key / size),
    column: key % size,
    ...describe(key),
  }));
}

function keyOf(cell: CellDto, game: GameViewDto): number {
  return cell.row * game.settings.boardSize + cell.column;
}

function keysOf(cells: readonly CellDto[], game: GameViewDto): Set<number> {
  return new Set(cells.map((cell) => keyOf(cell, game)));
}
