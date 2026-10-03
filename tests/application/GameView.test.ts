import { describe, expect, it } from "vitest";
import type { ShipPlacement } from "../../src/application/buildFleet";
import { Game } from "../../src/application/Game";
import { viewFor } from "../../src/application/GameView";
import { Position } from "../../src/domain/Position";
import type { Player } from "../../src/domain/Player";

const NOW = 1_000;
const SECOND = 1_000;
const KINDS = ["carrier", "cruiser", "submarine", "destroyer", "boat"] as const;
const SHIP_LENGTHS = [5, 4, 3, 3, 2];

// The first player's ships start at column 0, the second player's at column 5,
// so a cell tells us whose ship it belongs to.
function placementsFrom(firstColumn: number): ShipPlacement[] {
  return KINDS.map((kind, index) => ({
    kind,
    origin: new Position(index * 2, firstColumn),
    quarterTurns: 0,
  }));
}

function cellsOfShipAt(index: number, firstColumn: number): Position[] {
  return Array.from(
    { length: SHIP_LENGTHS[index] ?? 0 },
    (_, offset) => new Position(index * 2, firstColumn + offset),
  );
}

function gameInBattle(): Game {
  return Game.create()
    .markReady("first", placementsFrom(0), NOW)
    .markReady("second", placementsFrom(5), NOW);
}

function fireAll(game: Game, player: Player, cells: Position[]): Game {
  return cells.reduce((current, cell) => current.fire(player, cell, NOW).game, game);
}

const secondsBoat = cellsOfShipAt(4, 5);
const secondsDestroyer = cellsOfShipAt(3, 5);

describe("viewFor", () => {
  describe("while placing ships", () => {
    it("tells who the viewer is and which phase it is", () => {
      const view = viewFor(Game.create(), "second", NOW);

      expect(view.you).toBe("second");
      expect(view.phase).toBe("placing");
      expect(view.yourTurn).toBe(false);
      expect(view.secondsLeft).toBeUndefined();
    });

    it("tells whether each player is ready", () => {
      const game = Game.create().markReady("first", placementsFrom(0), NOW);

      const view = viewFor(game, "second", NOW);

      expect(view.youAreReady).toBe(false);
      expect(view.opponentIsReady).toBe(true);
    });

    it("shows no ships to a player who is not ready", () => {
      expect(viewFor(Game.create(), "first", NOW).yourShips).toEqual([]);
    });

    it("shows his own ships to a player who is ready", () => {
      const game = Game.create().markReady("first", placementsFrom(0), NOW);

      expect(viewFor(game, "first", NOW).yourShips).toHaveLength(5);
    });

    it("shows nothing about the opponent's ships", () => {
      const game = Game.create().markReady("second", placementsFrom(5), NOW);

      const view = viewFor(game, "first", NOW);

      expect(view.yourShots).toEqual([]);
      expect(view.sunkEnemyShips).toEqual([]);
    });
  });

  describe("during the battle", () => {
    it("shows the viewer's own ships cell by cell", () => {
      const view = viewFor(gameInBattle(), "first", NOW);

      expect(view.yourShips[4]).toEqual(cellsOfShipAt(4, 0));
    });

    it("says whose turn it is and how many seconds are left", () => {
      const game = gameInBattle();

      expect(viewFor(game, "first", NOW + 5 * SECOND).yourTurn).toBe(true);
      expect(viewFor(game, "second", NOW + 5 * SECOND).yourTurn).toBe(false);
      expect(viewFor(game, "first", NOW + 5 * SECOND).secondsLeft).toBe(15);
    });

    it("shows the viewer's shots as hits and misses", () => {
      const game = gameInBattle()
        .fire("first", new Position(0, 5), NOW).game
        .fire("first", new Position(9, 9), NOW).game;

      expect(viewFor(game, "first", NOW).yourShots).toEqual([
        { position: new Position(0, 5), hit: true },
        { position: new Position(9, 9), hit: false },
      ]);
    });

    it("shows the shots the opponent fired at the viewer", () => {
      const game = gameInBattle()
        .fire("first", new Position(9, 9), NOW).game
        .fire("second", new Position(0, 0), NOW).game;

      expect(viewFor(game, "first", NOW).shotsAtYou).toEqual([new Position(0, 0)]);
      expect(viewFor(game, "second", NOW).shotsAtYou).toEqual([new Position(9, 9)]);
    });

    it("does not leak any cell of the opponent's ships that was not hit", () => {
      const game = gameInBattle().fire("first", new Position(9, 9), NOW).game;

      const json = JSON.stringify(viewFor(game, "first", NOW));

      for (let index = 0; index < KINDS.length; index++) {
        for (const cell of cellsOfShipAt(index, 5)) {
          expect(json).not.toContain(JSON.stringify(cell));
        }
      }
    });

    it("reveals a ship of the opponent once it has sunk", () => {
      const game = fireAll(gameInBattle(), "first", secondsBoat);

      const view = viewFor(game, "first", NOW);

      expect(view.sunkEnemyShips).toEqual([secondsBoat]);
      expect(viewFor(game, "second", NOW).sunkEnemyShips).toEqual([]);
    });

    it("lists the cells around a sunk ship as known to be empty", () => {
      const game = fireAll(gameInBattle(), "first", secondsBoat);

      const view = viewFor(game, "first", NOW);

      expect(view.knownEmptyCells).toHaveLength(10);
      expect(view.knownEmptyCells).toContainEqual(new Position(7, 4));
      expect(view.knownEmptyCells).toContainEqual(new Position(9, 7));
    });

    it("leaves out known empty cells that were already fired at", () => {
      const game = fireAll(
        gameInBattle()
          .fire("first", new Position(7, 4), NOW).game
          .fire("second", new Position(9, 9), NOW).game,
        "first",
        secondsBoat,
      );

      const view = viewFor(game, "first", NOW);

      expect(view.knownEmptyCells).toHaveLength(9);
      expect(view.knownEmptyCells).not.toContainEqual(new Position(7, 4));
    });

    it("lists a known empty cell only once even when two sunk ships share it", () => {
      const game = fireAll(gameInBattle(), "first", [...secondsDestroyer, ...secondsBoat]);

      const view = viewFor(game, "first", NOW);
      const keys = view.knownEmptyCells.map((cell) => `${cell.row},${cell.column}`);

      expect(view.knownEmptyCells).toHaveLength(18);
      expect(new Set(keys).size).toBe(18);
    });
  });

  describe("after the battle", () => {
    it("shows the winner and the score to both players", () => {
      const allCells = [0, 1, 2, 3, 4].flatMap((index) => cellsOfShipAt(index, 5));
      const game = fireAll(gameInBattle(), "first", allCells);

      expect(viewFor(game, "first", NOW).winner).toBe("first");
      expect(viewFor(game, "second", NOW).winner).toBe("first");
      expect(viewFor(game, "second", NOW).wins).toEqual({ first: 1, second: 0 });
      expect(viewFor(game, "first", NOW).phase).toBe("finished");
    });
  });
});
