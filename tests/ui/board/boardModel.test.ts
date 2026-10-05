import { describe, expect, it } from "vitest";
import { enemyFleetModel, enemyWatersModel, ownWatersModel, type BoardModel } from "../../../src/ui/board/boardModel";
import { gameView } from "../fixtures";

function cellAt(board: BoardModel, row: number, column: number) {
  const cell = board.cells[row * board.size + column];

  if (cell === undefined) {
    throw new Error(`No cell at ${row},${column}`);
  }
  return cell;
}

describe("ownWatersModel", () => {
  it("has a cell for every place on the board, row by row", () => {
    const board = ownWatersModel(gameView());

    expect(board.size).toBe(10);
    expect(board.cells).toHaveLength(100);
    expect(board.cells[0]).toMatchObject({ row: 0, column: 0 });
    expect(board.cells[1]).toMatchObject({ row: 0, column: 1 });
    expect(board.cells[10]).toMatchObject({ row: 1, column: 0 });
    expect(board.cells[99]).toMatchObject({ row: 9, column: 9 });
  });

  it("has no marks before anything has happened", () => {
    const board = ownWatersModel(gameView());

    expect(board.cells.every((cell) => cell.mark === "none" && !cell.sunk)).toBe(true);
  });

  it("lists the viewer's ships, none of them sunk", () => {
    const board = ownWatersModel(gameView());

    expect(board.ships).toHaveLength(2);
    expect(board.ships.every((ship) => !ship.sunk)).toBe(true);
  });

  it("keeps the way each ship faces", () => {
    const board = ownWatersModel(gameView());

    expect(board.ships.map((ship) => ship.quarterTurns)).toEqual([0, 3]);
  });

  it("marks a shot at a ship as a hit and a shot at water as water", () => {
    const board = ownWatersModel(
      gameView({ shotsAtYou: [{ row: 0, column: 1 }, { row: 3, column: 3 }] }),
    );

    expect(cellAt(board, 0, 1).mark).toBe("hit");
    expect(cellAt(board, 3, 3).mark).toBe("water");
    expect(cellAt(board, 0, 0).mark).toBe("none");
  });

  it("does not call a ship sunk while one of its cells is still whole", () => {
    const board = ownWatersModel(
      gameView({ shotsAtYou: [{ row: 5, column: 5 }] }),
    );

    expect(board.ships.some((ship) => ship.sunk)).toBe(false);
    expect(cellAt(board, 5, 5).sunk).toBe(false);
  });

  it("calls a ship sunk when every cell is hit, and flags exactly its cells", () => {
    const board = ownWatersModel(
      gameView({ shotsAtYou: [{ row: 5, column: 5 }, { row: 6, column: 5 }, { row: 0, column: 0 }] }),
    );

    expect(board.ships.map((ship) => ship.sunk)).toEqual([false, true]);
    expect(cellAt(board, 5, 5).sunk).toBe(true);
    expect(cellAt(board, 6, 5).sunk).toBe(true);
    expect(cellAt(board, 0, 0).sunk).toBe(false);
  });

  it("marks the cells that are known to be empty the same way as a shot at water", () => {
    const board = ownWatersModel(
      gameView({ knownEmptyOwnCells: [{ row: 4, column: 4 }] }),
    );

    expect(cellAt(board, 4, 4).mark).toBe("water");
  });

  it("never lets the viewer fire at his own waters", () => {
    expect(ownWatersModel(gameView()).cells.some((cell) => cell.canFire)).toBe(false);
  });
});

describe("enemyWatersModel", () => {
  it("shows no ships before one has sunk", () => {
    expect(enemyWatersModel(gameView(), true).ships).toEqual([]);
  });

  it("marks the viewer's shots as hits and misses", () => {
    const board = enemyWatersModel(
      gameView({
        yourShots: [
          { cell: { row: 2, column: 2 }, hit: true },
          { cell: { row: 7, column: 1 }, hit: false },
        ],
      }),
      true,
    );

    expect(cellAt(board, 2, 2).mark).toBe("hit");
    expect(cellAt(board, 7, 1).mark).toBe("water");
  });

  it("reveals a sunk ship of the opponent and flags its cells", () => {
    const sunk = [{ row: 8, column: 5 }, { row: 8, column: 6 }];

    const board = enemyWatersModel(
      gameView({
        sunkEnemyShips: [{ cells: sunk, quarterTurns: 0 }],
        yourShots: sunk.map((cell) => ({ cell, hit: true })),
      }),
      true,
    );

    expect(board.ships).toEqual([{ cells: sunk, quarterTurns: 0, sunk: true }]);
    expect(cellAt(board, 8, 5).sunk).toBe(true);
    expect(cellAt(board, 8, 6).sunk).toBe(true);
    expect(cellAt(board, 8, 7).sunk).toBe(false);
  });

  it("turns a sunk ship of the opponent the way it stood", () => {
    const sunk = [{ row: 8, column: 5 }, { row: 8, column: 6 }];

    const board = enemyWatersModel(gameView({ sunkEnemyShips: [{ cells: sunk, quarterTurns: 2 }] }), true);

    expect(board.ships.map((ship) => ship.quarterTurns)).toEqual([2]);
  });

  it("marks the cells around a sunk ship the same way as a shot at water", () => {
    const board = enemyWatersModel(
      gameView({ knownEmptyEnemyCells: [{ row: 7, column: 4 }] }),
      true,
    );

    expect(cellAt(board, 7, 4).mark).toBe("water");
  });

  it("lets the viewer fire only at cells that are still open, when he may fire", () => {
    const board = enemyWatersModel(
      gameView({
        yourShots: [{ cell: { row: 2, column: 2 }, hit: false }],
        knownEmptyEnemyCells: [{ row: 7, column: 4 }],
      }),
      true,
    );

    expect(cellAt(board, 0, 0).canFire).toBe(true);
    expect(cellAt(board, 2, 2).canFire).toBe(false);
    expect(cellAt(board, 7, 4).canFire).toBe(false);
  });

  it("lets the viewer fire nowhere when he may not fire", () => {
    const board = enemyWatersModel(gameView(), false);

    expect(board.cells.some((cell) => cell.canFire)).toBe(false);
  });
});

describe("enemyFleetModel", () => {
  const sunkBoat = [{ row: 1, column: 1 }, { row: 1, column: 2 }];
  const afloatBoat = [{ row: 6, column: 3 }, { row: 7, column: 3 }];
  const over = (changes = {}) =>
    gameView({
      phase: "finished",
      revealedEnemyShips: [
        { cells: sunkBoat, quarterTurns: 0 },
        { cells: afloatBoat, quarterTurns: 3 },
      ],
      sunkEnemyShips: [{ cells: sunkBoat, quarterTurns: 0 }],
      yourShots: [
        ...sunkBoat.map((cell) => ({ cell, hit: true })),
        { cell: afloatBoat[0] as { row: number; column: number }, hit: true },
        { cell: { row: 9, column: 9 }, hit: false },
      ],
      ...changes,
    });

  it("shows every ship of the opponent, turned the way it stood", () => {
    const board = enemyFleetModel(over());

    expect(board.ships.map((ship) => ship.quarterTurns)).toEqual([0, 3]);
    expect(board.ships.map((ship) => ship.cells)).toEqual([sunkBoat, afloatBoat]);
  });

  it("calls a ship sunk only when every cell of it was hit", () => {
    expect(enemyFleetModel(over()).ships.map((ship) => ship.sunk)).toEqual([true, false]);
  });

  it("keeps the shots of the viewer on the board", () => {
    const board = enemyFleetModel(over());

    expect(cellAt(board, 6, 3).mark).toBe("hit");
    expect(cellAt(board, 9, 9).mark).toBe("water");
    expect(cellAt(board, 7, 3).mark).toBe("none");
  });

  it("lets nobody fire", () => {
    expect(enemyFleetModel(over()).cells.some((cell) => cell.canFire)).toBe(false);
  });

  it("falls back to the ships found so far when nothing was revealed", () => {
    const board = enemyFleetModel(over({ revealedEnemyShips: [] }));

    expect(board.ships).toEqual([{ cells: sunkBoat, quarterTurns: 0, sunk: true }]);
  });
});
