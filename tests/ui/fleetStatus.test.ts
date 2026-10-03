import { describe, expect, it } from "vitest";
import { enemyFleetStatus, shipsLeft } from "../../src/ui/fleetStatus";
import type { CellDto } from "../../src/shared/protocol";
import { gameView } from "./fixtures";

const horizontal = (row: number, column: number, length: number): CellDto[] =>
  Array.from({ length }, (_, offset) => ({ row, column: column + offset }));

const vertical = (row: number, column: number, length: number): CellDto[] =>
  Array.from({ length }, (_, offset) => ({ row: row + offset, column }));

const kindsSunk = (game: ReturnType<typeof gameView>) =>
  enemyFleetStatus(game)
    .filter((entry) => entry.sunk)
    .map((entry) => entry.kind);

describe("enemyFleetStatus", () => {
  it("lists every ship of the fleet in preset order while nothing has sunk", () => {
    const status = enemyFleetStatus(gameView());

    expect(status.map((entry) => entry.kind)).toEqual([
      "carrier",
      "cruiser",
      "submarine",
      "destroyer",
      "boat",
    ]);
    expect(status.every((entry) => !entry.sunk)).toBe(true);
  });

  it("marks the ship that has the shape of a sunk ship", () => {
    const game = gameView({ sunkEnemyShips: [horizontal(4, 4, 2)] });

    expect(kindsSunk(game)).toEqual(["boat"]);
  });

  it("recognizes a sunk ship wherever it lay and however it was turned", () => {
    const game = gameView({ sunkEnemyShips: [vertical(3, 7, 5)] });

    expect(kindsSunk(game)).toEqual(["carrier"]);
  });

  it("marks only one of two equal ships for one sunk ship", () => {
    const game = gameView({ sunkEnemyShips: [horizontal(0, 0, 3)] });

    expect(kindsSunk(game)).toEqual(["submarine"]);
  });

  it("marks both equal ships when both have sunk", () => {
    const game = gameView({ sunkEnemyShips: [horizontal(0, 0, 3), vertical(5, 5, 3)] });

    expect(kindsSunk(game)).toEqual(["submarine", "destroyer"]);
  });

  it("tells ships of the same length apart by their shape", () => {
    const tShaped: CellDto[] = [
      { row: 6, column: 2 },
      { row: 6, column: 3 },
      { row: 6, column: 4 },
      { row: 7, column: 3 },
    ];
    const settings = { boardSize: 10, fleetPreset: "standard", allowTouching: false, turnSeconds: 20 } as const;

    expect(kindsSunk(gameView({ settings, sunkEnemyShips: [tShaped] }))).toEqual(["tanker"]);
    expect(kindsSunk(gameView({ settings, sunkEnemyShips: [horizontal(0, 0, 4)] }))).toEqual(["cruiser"]);
  });

  it("counts the three boats of the russian fleet one by one", () => {
    const settings = { boardSize: 10, fleetPreset: "russian", allowTouching: false, turnSeconds: 20 } as const;
    const game = gameView({ settings, sunkEnemyShips: [horizontal(0, 0, 2), vertical(5, 5, 2)] });

    expect(kindsSunk(game)).toEqual(["boat", "boat"]);
  });
});

describe("shipsLeft", () => {
  it("counts the ships that have not sunk", () => {
    const game = gameView({ sunkEnemyShips: [horizontal(0, 0, 2), horizontal(2, 0, 5)] });

    expect(shipsLeft(enemyFleetStatus(game))).toBe(3);
  });
});
