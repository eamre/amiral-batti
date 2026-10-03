import type { CellDto, GameViewDto } from "../shared/protocol";

/**
 * hit      a shot that found a ship
 * miss     a shot that found water
 * ruledOut a cell that is known to be empty (next to a sunk ship), though nobody fired at it
 */
export type CellMark = "none" | "hit" | "miss" | "ruledOut";

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
  const ruledOut = keysOf(game.knownEmptyOwnCells, game);

  return {
    size: game.settings.boardSize,
    ships,
    cells: allCells(game, (key) => ({
      mark: hitCells.has(key) ? (shipCells.has(key) ? "hit" : "miss") : ruledOut.has(key) ? "ruledOut" : "none",
      sunk: sunkCells.has(key),
      canFire: false,
    })),
  };
}

/** The opponent's waters: only what the viewer has found out so far. */
export function enemyWatersModel(game: GameViewDto, canFire: boolean): BoardModel {
  const shots = new Map(game.yourShots.map((shot) => [keyOf(shot.cell, game), shot.hit]));
  const sunkCells = keysOf(game.sunkEnemyShips.flat(), game);
  const ruledOut = keysOf(game.knownEmptyEnemyCells, game);

  return {
    size: game.settings.boardSize,
    // The server does not tell how an enemy ship was turned, so its bow takes the default direction.
    ships: game.sunkEnemyShips.map((cells) => ({ cells, quarterTurns: 0, sunk: true })),
    cells: allCells(game, (key) => {
      const shotHit = shots.get(key);
      const mark: CellMark =
        shotHit !== undefined ? (shotHit ? "hit" : "miss") : ruledOut.has(key) ? "ruledOut" : "none";

      return { mark, sunk: sunkCells.has(key), canFire: canFire && mark === "none" };
    }),
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
