import { describe, expect, it } from "vitest";
import type { ShipPlacement } from "../../src/application/buildFleet";
import { Game } from "../../src/application/Game";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";
import { Position } from "../../src/domain/Position";
import { errorCodeOf } from "./errorCodeOf";

const NOW = 1_000;
const SECOND = 1_000;

// Both players use this layout: five horizontal ships on rows 0, 2, 4, 6 and 8.
const SHIP_LENGTHS = [5, 4, 3, 3, 2];
const KINDS = ["carrier", "cruiser", "submarine", "destroyer", "boat"] as const;

function classicPlacements(): ShipPlacement[] {
  return KINDS.map((kind, index) => ({
    kind,
    origin: new Position(index * 2, 0),
    quarterTurns: 0,
  }));
}

function allShipCells(): Position[] {
  return SHIP_LENGTHS.flatMap((length, index) =>
    Array.from({ length }, (_, column) => new Position(index * 2, column)),
  );
}

const HIT = new Position(0, 0);
const MISS = new Position(9, 9);

function gameInBattle(): Game {
  return Game.create()
    .markReady("first", classicPlacements(), NOW)
    .markReady("second", classicPlacements(), NOW);
}

function finishedGame(): Game {
  return allShipCells().reduce(
    (game, cell) => game.fire("first", cell, NOW).game,
    gameInBattle(),
  );
}

describe("Game", () => {
  describe("create", () => {
    it("starts in the placing phase with nobody ready", () => {
      const game = Game.create();

      expect(game.phase).toBe("placing");
      expect(game.isReady("first")).toBe(false);
      expect(game.isReady("second")).toBe(false);
      expect(game.wins).toEqual({ first: 0, second: 0 });
    });

    it("uses the settings it is given", () => {
      const settings = { ...DEFAULT_GAME_SETTINGS, turnSeconds: 7 };

      expect(Game.create(settings).settings.turnSeconds).toBe(7);
    });
  });

  describe("markReady", () => {
    it("marks only the player who got ready", () => {
      const game = Game.create().markReady("first", classicPlacements(), NOW);

      expect(game.isReady("first")).toBe(true);
      expect(game.isReady("second")).toBe(false);
      expect(game.phase).toBe("placing");
    });

    it("starts the battle when both players are ready", () => {
      const game = gameInBattle();

      expect(game.phase).toBe("battle");
      expect(game.turn).toBe("first");
      expect(game.timeLeft(NOW)).toBe(20);
    });

    it("does not change the original game", () => {
      const game = Game.create();

      game.markReady("first", classicPlacements(), NOW);

      expect(game.isReady("first")).toBe(false);
    });

    it("rejects a player who is already ready", () => {
      const game = Game.create().markReady("first", classicPlacements(), NOW);

      expect(errorCodeOf(() => game.markReady("first", classicPlacements(), NOW))).toBe(
        "already-ready",
      );
    });

    it("rejects an illegal fleet and does not mark the player ready", () => {
      const game = Game.create();

      expect(errorCodeOf(() => game.markReady("first", [], NOW))).toBe("wrong-fleet");
      expect(game.isReady("first")).toBe(false);
    });

    it("rejects placing ships once the battle has started", () => {
      expect(
        errorCodeOf(() => gameInBattle().markReady("first", classicPlacements(), NOW)),
      ).toBe("wrong-phase");
    });
  });

  describe("fire", () => {
    it("keeps the turn after a hit", () => {
      const report = gameInBattle().fire("first", HIT, NOW);

      expect(report.outcome).toBe("hit");
      expect(report.game.turn).toBe("first");
    });

    it("passes the turn after a miss", () => {
      const report = gameInBattle().fire("first", MISS, NOW);

      expect(report.outcome).toBe("miss");
      expect(report.game.turn).toBe("second");
    });

    it("reports who fired, where, and that the shot was not random", () => {
      const report = gameInBattle().fire("first", MISS, NOW);

      expect(report.shooter).toBe("first");
      expect(report.position).toEqual(MISS);
      expect(report.wasRandom).toBe(false);
    });

    it("reports the ship that was sunk", () => {
      const game = gameInBattle().fire("first", new Position(8, 0), NOW).game;

      const report = game.fire("first", new Position(8, 1), NOW);

      expect(report.outcome).toBe("sunk");
      expect(report.sunkShip?.cells).toEqual([new Position(8, 0), new Position(8, 1)]);
    });

    it("gives the next shot a fresh turn timer", () => {
      const report = gameInBattle().fire("first", HIT, NOW + 15 * SECOND);

      expect(report.game.timeLeft(NOW + 15 * SECOND)).toBe(20);
    });

    it("rejects a shot before the battle has started", () => {
      expect(errorCodeOf(() => Game.create().fire("first", HIT, NOW))).toBe("wrong-phase");
    });

    it("rejects a shot from the player who is not on turn", () => {
      expect(errorCodeOf(() => gameInBattle().fire("second", HIT, NOW))).toBe(
        "not-your-turn",
      );
    });

    it("rejects a shot at a cell that was already fired at", () => {
      const game = gameInBattle().fire("first", HIT, NOW).game;

      expect(errorCodeOf(() => game.fire("first", HIT, NOW))).toBe("shot-not-allowed");
    });

    it("rejects a shot outside the board", () => {
      expect(errorCodeOf(() => gameInBattle().fire("first", new Position(10, 0), NOW))).toBe(
        "shot-not-allowed",
      );
    });

    it("does not change the original game", () => {
      const game = gameInBattle();

      game.fire("first", MISS, NOW);

      expect(game.turn).toBe("first");
    });
  });

  describe("end of the round", () => {
    it("finishes the game and counts the win when the last ship sinks", () => {
      const game = finishedGame();

      expect(game.phase).toBe("finished");
      expect(game.winner).toBe("first");
      expect(game.wins).toEqual({ first: 1, second: 0 });
      expect(game.turn).toBeUndefined();
    });

    it("rejects shots after the game is finished", () => {
      expect(errorCodeOf(() => finishedGame().fire("first", MISS, NOW))).toBe("wrong-phase");
    });
  });

  describe("timeLeft", () => {
    it("counts down during the battle", () => {
      const game = gameInBattle();

      expect(game.timeLeft(NOW + 5 * SECOND)).toBe(15);
    });

    it("never goes below zero", () => {
      expect(gameInBattle().timeLeft(NOW + 60 * SECOND)).toBe(0);
    });

    it("is undefined outside the battle", () => {
      expect(Game.create().timeLeft(NOW)).toBeUndefined();
      expect(finishedGame().timeLeft(NOW)).toBeUndefined();
    });
  });

  describe("fireIfTimeIsUp", () => {
    it("does nothing while the player still has time", () => {
      const report = gameInBattle().fireIfTimeIsUp(NOW + 19 * SECOND, () => 0.99);

      expect(report).toBeUndefined();
    });

    it("fires at a random cell for the player on turn when time is up", () => {
      const report = gameInBattle().fireIfTimeIsUp(NOW + 20 * SECOND, () => 0.99);

      expect(report?.shooter).toBe("first");
      expect(report?.position).toEqual(MISS);
      expect(report?.wasRandom).toBe(true);
      expect(report?.game.turn).toBe("second");
    });

    it("gives the next player a fresh turn timer", () => {
      const lateTime = NOW + 20 * SECOND;

      const report = gameInBattle().fireIfTimeIsUp(lateTime, () => 0.99);

      expect(report?.game.timeLeft(lateTime)).toBe(20);
    });

    it("does nothing outside the battle", () => {
      expect(Game.create().fireIfTimeIsUp(NOW + 60 * SECOND, () => 0)).toBeUndefined();
      expect(finishedGame().fireIfTimeIsUp(NOW + 60 * SECOND, () => 0)).toBeUndefined();
    });
  });

  describe("nextRound", () => {
    it("goes back to placing ships and keeps the score", () => {
      const game = finishedGame().nextRound();

      expect(game.phase).toBe("placing");
      expect(game.isReady("first")).toBe(false);
      expect(game.wins).toEqual({ first: 1, second: 0 });
    });

    it("lets the other player start the next battle", () => {
      const game = finishedGame()
        .nextRound()
        .markReady("first", classicPlacements(), NOW)
        .markReady("second", classicPlacements(), NOW);

      expect(game.turn).toBe("second");
    });

    it("rejects starting a new round before the current one is over", () => {
      expect(errorCodeOf(() => gameInBattle().nextRound())).toBe("wrong-phase");
    });
  });
});
