import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";
import { Room } from "../../src/application/Room";
import { Position } from "../../src/domain/Position";
import { errorCodeOf } from "./errorCodeOf";
import { allShipCells, placementsFrom } from "./fixtures";

const NOW = 1_000;
const SECOND = 1_000;

const AHMET = { name: "Ahmet", token: "token-of-ahmet" };
const AYSE = { name: "Ayse", token: "token-of-ayse" };

function roomWithOnePlayer(): Room {
  return Room.open("ABCD", DEFAULT_GAME_SETTINGS, AHMET);
}

function roomWithTwoPlayers(): Room {
  return roomWithOnePlayer().join(AYSE);
}

function roomInBattle(): Room {
  return roomWithTwoPlayers()
    .markReady(AHMET.token, placementsFrom(0), NOW)
    .markReady(AYSE.token, placementsFrom(5), NOW);
}

function finishedRoom(): Room {
  return allShipCells(5).reduce(
    (room, cell) => room.fire(AHMET.token, cell, NOW).room,
    roomInBattle(),
  );
}

describe("Room", () => {
  describe("open", () => {
    it("seats the creator as the first player", () => {
      expect(roomWithOnePlayer().seatOf(AHMET.token)).toBe("first");
    });

    it("keeps the code and the settings it is given", () => {
      const settings = { ...DEFAULT_GAME_SETTINGS, turnSeconds: 7 };

      const room = Room.open("WXYZ", settings, AHMET);

      expect(room.code).toBe("WXYZ");
      expect(room.game.settings.turnSeconds).toBe(7);
    });

    it("has no opponent yet", () => {
      const view = roomWithOnePlayer().viewFor(AHMET.token, NOW);

      expect(view.opponentName).toBeUndefined();
    });
  });

  describe("join", () => {
    it("seats the joiner as the second player", () => {
      expect(roomWithTwoPlayers().seatOf(AYSE.token)).toBe("second");
    });

    it("tells each player the name of the other", () => {
      const room = roomWithTwoPlayers();

      expect(room.viewFor(AHMET.token, NOW).opponentName).toBe("Ayse");
      expect(room.viewFor(AYSE.token, NOW).opponentName).toBe("Ahmet");
    });

    it("rejects a third player", () => {
      const third = { name: "Can", token: "token-of-can" };

      expect(errorCodeOf(() => roomWithTwoPlayers().join(third))).toBe("room-full");
    });

    it("does not change the original room", () => {
      const room = roomWithOnePlayer();

      room.join(AYSE);

      expect(room.seatOf(AYSE.token)).toBeUndefined();
    });
  });

  describe("names", () => {
    it("trims a name", () => {
      const room = Room.open("ABCD", DEFAULT_GAME_SETTINGS, { name: "  Emre  ", token: "t" });

      expect(room.viewFor("t", NOW).yourName).toBe("Emre");
    });

    it("cuts a name to 16 characters", () => {
      const room = Room.open("ABCD", DEFAULT_GAME_SETTINGS, {
        name: "A name that is much too long",
        token: "t",
      });

      expect(room.viewFor("t", NOW).yourName).toBe("A name that is m");
    });

    it("uses a default name when none is given", () => {
      const room = Room.open("ABCD", DEFAULT_GAME_SETTINGS, { name: "   ", token: "t" });

      expect(room.viewFor("t", NOW).yourName).toBe("Player");
    });
  });

  describe("seatOf", () => {
    it("is undefined for a token nobody has", () => {
      expect(roomWithTwoPlayers().seatOf("stranger")).toBeUndefined();
    });
  });

  describe("markReady", () => {
    it("marks only the player with that token as ready", () => {
      const room = roomWithTwoPlayers().markReady(AHMET.token, placementsFrom(0), NOW);

      expect(room.game.isReady("first")).toBe(true);
      expect(room.game.isReady("second")).toBe(false);
    });

    it("starts the battle when both players are ready", () => {
      expect(roomInBattle().game.phase).toBe("battle");
    });

    it("rejects an unknown token", () => {
      const room = roomWithTwoPlayers();

      expect(errorCodeOf(() => room.markReady("stranger", placementsFrom(0), NOW))).toBe(
        "unknown-player",
      );
    });

    it("passes the rule errors of the game through", () => {
      const room = roomWithTwoPlayers();

      expect(errorCodeOf(() => room.markReady(AHMET.token, [], NOW))).toBe("wrong-fleet");
    });

    it("does not change the original room", () => {
      const room = roomWithTwoPlayers();

      room.markReady(AHMET.token, placementsFrom(0), NOW);

      expect(room.game.isReady("first")).toBe(false);
    });
  });

  describe("fire", () => {
    it("fires for the player with that token and reports the shot", () => {
      const { room, shot } = roomInBattle().fire(AHMET.token, new Position(0, 5), NOW);

      expect(shot.shooter).toBe("first");
      expect(shot.outcome).toBe("hit");
      expect(room.game.battle?.fleetOf("second").shotsReceived).toEqual([
        new Position(0, 5),
      ]);
    });

    it("rejects a player who is not on turn", () => {
      expect(
        errorCodeOf(() => roomInBattle().fire(AYSE.token, new Position(0, 0), NOW)),
      ).toBe("not-your-turn");
    });

    it("rejects an unknown token", () => {
      expect(
        errorCodeOf(() => roomInBattle().fire("stranger", new Position(0, 0), NOW)),
      ).toBe("unknown-player");
    });
  });

  describe("fireIfTimeIsUp", () => {
    it("does nothing while the player still has time", () => {
      expect(roomInBattle().fireIfTimeIsUp(NOW + 19 * SECOND, () => 0.99)).toBeUndefined();
    });

    it("fires at random for the player on turn when time is up", () => {
      const result = roomInBattle().fireIfTimeIsUp(NOW + 20 * SECOND, () => 0.99);

      expect(result?.shot.shooter).toBe("first");
      expect(result?.shot.wasRandom).toBe(true);
      expect(result?.room.game.turn).toBe("second");
    });
  });

  describe("voteForRematch", () => {
    it("rejects a vote before the round is over", () => {
      expect(errorCodeOf(() => roomInBattle().voteForRematch(AHMET.token))).toBe(
        "wrong-phase",
      );
    });

    it("rejects an unknown token", () => {
      expect(errorCodeOf(() => finishedRoom().voteForRematch("stranger"))).toBe(
        "unknown-player",
      );
    });

    it("shows a vote to both players", () => {
      const room = finishedRoom().voteForRematch(AYSE.token);

      expect(room.viewFor(AYSE.token, NOW).youWantRematch).toBe(true);
      expect(room.viewFor(AYSE.token, NOW).opponentWantsRematch).toBe(false);
      expect(room.viewFor(AHMET.token, NOW).youWantRematch).toBe(false);
      expect(room.viewFor(AHMET.token, NOW).opponentWantsRematch).toBe(true);
    });

    it("keeps waiting while only one player has voted", () => {
      const room = finishedRoom().voteForRematch(AYSE.token);

      expect(room.game.phase).toBe("finished");
    });

    it("starts the next round when both players have voted", () => {
      const room = finishedRoom().voteForRematch(AYSE.token).voteForRematch(AHMET.token);

      expect(room.game.phase).toBe("placing");
      expect(room.game.wins).toEqual({ first: 1, second: 0 });
    });

    it("clears the votes for the next round", () => {
      const room = finishedRoom().voteForRematch(AYSE.token).voteForRematch(AHMET.token);

      expect(room.viewFor(AHMET.token, NOW).youWantRematch).toBe(false);
      expect(room.viewFor(AHMET.token, NOW).opponentWantsRematch).toBe(false);
    });
  });

  describe("viewFor", () => {
    it("gives every player the view of his own seat", () => {
      const room = roomInBattle();

      expect(room.viewFor(AHMET.token, NOW).game.you).toBe("first");
      expect(room.viewFor(AYSE.token, NOW).game.you).toBe("second");
    });

    it("carries the code of the room", () => {
      expect(roomWithTwoPlayers().viewFor(AYSE.token, NOW).code).toBe("ABCD");
    });

    it("never contains a token", () => {
      const json = JSON.stringify(roomInBattle().viewFor(AHMET.token, NOW));

      expect(json).not.toContain(AHMET.token);
      expect(json).not.toContain(AYSE.token);
    });

    it("rejects an unknown token", () => {
      expect(errorCodeOf(() => roomWithTwoPlayers().viewFor("stranger", NOW))).toBe(
        "unknown-player",
      );
    });
  });
});
