import { beforeEach, describe, expect, it } from "vitest";
import type { Connection } from "../../src/server/ConnectedPlayers";
import { GameServer } from "../../src/server/GameServer";
import type { ClientMessage, ServerMessage } from "../../src/shared/protocol";
import { allShipCells, placementsFrom } from "../application/fixtures";

const SECOND = 1_000;
const HOUR = 60 * 60 * 1000;
const RULES = { fleetPreset: "classic", allowTouching: false } as const;

class FakeConnection implements Connection {
  readonly received: ServerMessage[] = [];
  closed = false;

  send(message: ServerMessage): void {
    this.received.push(message);
  }

  close(): void {
    this.closed = true;
  }

  of<Type extends ServerMessage["type"]>(type: Type): Extract<ServerMessage, { type: Type }>[] {
    return this.received.filter(
      (message): message is Extract<ServerMessage, { type: Type }> => message.type === type,
    );
  }

  get last(): ServerMessage | undefined {
    return this.received[this.received.length - 1];
  }
}

function shipsFrom(firstColumn: number): ClientMessage {
  return {
    type: "ready",
    ships: placementsFrom(firstColumn).map((placement) => ({
      kind: placement.kind,
      row: placement.origin.row,
      column: placement.origin.column,
      quarterTurns: placement.quarterTurns,
    })),
  };
}

describe("GameServer", () => {
  let now: number;
  let server: GameServer;
  let ahmet: FakeConnection;
  let ayse: FakeConnection;
  let tokens: number;
  let steps: number;

  function say(connection: FakeConnection, message: ClientMessage | string): void {
    server.receive(connection, typeof message === "string" ? message : JSON.stringify(message));
  }

  function codeOfRoom(): string {
    return ahmet.of("entered")[0]?.room.code ?? "";
  }

  function startRoom(): void {
    say(ahmet, { type: "create", name: "Ahmet", rules: RULES });
    say(ayse, { type: "join", code: codeOfRoom(), name: "Ayse" });
  }

  function startBattle(): void {
    startRoom();
    say(ahmet, shipsFrom(0));
    say(ayse, shipsFrom(5));
  }

  beforeEach(() => {
    now = 1_000;
    tokens = 0;
    steps = 0;
    server = new GameServer({
      clock: () => now,
      random: () => {
        steps += 1;
        return (steps * 0.618033988749) % 1;
      },
      newToken: () => `token-${(tokens += 1)}`,
    });
    ahmet = new FakeConnection();
    ayse = new FakeConnection();
  });

  describe("create", () => {
    it("seats the creator and hands him his token", () => {
      say(ahmet, { type: "create", name: "Ahmet", rules: RULES });

      const entered = ahmet.of("entered")[0];

      expect(entered?.token).toBe("token-1");
      expect(entered?.room.code).toHaveLength(4);
      expect(entered?.room.yourName).toBe("Ahmet");
      expect(entered?.opponentOnline).toBe(false);
    });

    it("uses the rules the creator picked", () => {
      say(ahmet, { type: "create", name: "Ahmet", rules: { fleetPreset: "russian", allowTouching: true } });

      const settings = ahmet.of("entered")[0]?.room.game.settings;

      expect(settings?.fleetPreset).toBe("russian");
      expect(settings?.allowTouching).toBe(true);
    });
  });

  describe("join", () => {
    it("seats the joiner and tells him about the opponent", () => {
      startRoom();

      const entered = ayse.of("entered")[0];

      expect(entered?.room.opponentName).toBe("Ahmet");
      expect(entered?.opponentOnline).toBe(true);
      expect(entered?.token).toBe("token-2");
    });

    it("tells the creator that somebody joined", () => {
      startRoom();

      expect(ahmet.of("state").at(-1)?.room.opponentName).toBe("Ayse");
      expect(ahmet.of("presence").at(-1)?.opponentOnline).toBe(true);
    });

    it("accepts a code in lower case", () => {
      say(ahmet, { type: "create", name: "Ahmet", rules: RULES });

      say(ayse, { type: "join", code: codeOfRoom().toLowerCase(), name: "Ayse" });

      expect(ayse.of("entered")).toHaveLength(1);
    });

    it("rejects a code nobody opened", () => {
      say(ayse, { type: "join", code: "ZZZZ", name: "Ayse" });

      expect(ayse.last).toMatchObject({ type: "error", code: "no-such-room" });
    });

    it("rejects a third player", () => {
      startRoom();
      const can = new FakeConnection();

      say(can, { type: "join", code: codeOfRoom(), name: "Can" });

      expect(can.last).toMatchObject({ type: "error", code: "room-full" });
    });
  });

  describe("bad input", () => {
    it("answers unreadable text with an error and carries on", () => {
      say(ahmet, "this is not json");
      say(ahmet, { type: "create", name: "Ahmet", rules: RULES });

      expect(ahmet.received[0]).toMatchObject({ type: "error", code: "bad-message" });
      expect(ahmet.of("entered")).toHaveLength(1);
    });

    it("rejects a command from a browser that has no seat", () => {
      say(ahmet, { type: "fire", cell: { row: 0, column: 0 } });

      expect(ahmet.last).toMatchObject({ type: "error", code: "not-in-room" });
    });
  });

  describe("placing ships", () => {
    it("tells both players when one of them is ready", () => {
      startRoom();

      say(ahmet, shipsFrom(0));

      expect(ahmet.of("state").at(-1)?.room.game.youAreReady).toBe(true);
      expect(ayse.of("state").at(-1)?.room.game.opponentIsReady).toBe(true);
    });

    it("tells the player when his fleet is not legal", () => {
      startRoom();

      say(ahmet, { type: "ready", ships: [] });

      expect(ahmet.last).toMatchObject({ type: "error", code: "wrong-fleet" });
      expect(ayse.of("error")).toHaveLength(0);
    });

    it("starts the battle when both players are ready", () => {
      startBattle();

      expect(ahmet.of("state").at(-1)?.room.game.phase).toBe("battle");
      expect(ahmet.of("state").at(-1)?.room.game.yourTurn).toBe(true);
      expect(ayse.of("state").at(-1)?.room.game.yourTurn).toBe(false);
    });
  });

  describe("firing", () => {
    it("tells both players the new state, each from his own side", () => {
      startBattle();

      say(ahmet, { type: "fire", cell: { row: 9, column: 9 } });

      const ahmetsView = ahmet.of("state").at(-1)?.room.game;
      const ayses = ayse.of("state").at(-1)?.room.game;

      expect(ahmetsView?.you).toBe("first");
      expect(ahmetsView?.yourShots).toEqual([{ cell: { row: 9, column: 9 }, hit: false }]);
      expect(ayses?.you).toBe("second");
      expect(ayses?.shotsAtYou).toEqual([{ row: 9, column: 9 }]);
      expect(ayses?.yourTurn).toBe(true);
    });

    it("announces the shot to both players", () => {
      startBattle();

      say(ahmet, { type: "fire", cell: { row: 0, column: 5 } });

      for (const connection of [ahmet, ayse]) {
        expect(connection.of("shot").at(-1)?.shot).toMatchObject({
          shooter: "first",
          cell: { row: 0, column: 5 },
          outcome: "hit",
          wasRandom: false,
        });
      }
    });

    it("sends the new state before announcing the shot", () => {
      startBattle();
      const before = ahmet.received.length;

      say(ahmet, { type: "fire", cell: { row: 9, column: 9 } });

      expect(ahmet.received.slice(before).map((message) => message.type)).toEqual(["state", "shot"]);
    });

    it("tells only the offender when it is not his turn", () => {
      startBattle();
      const before = ahmet.received.length;

      say(ayse, { type: "fire", cell: { row: 0, column: 0 } });

      expect(ayse.last).toMatchObject({ type: "error", code: "not-your-turn" });
      expect(ahmet.received).toHaveLength(before);
    });

    it("tells the winner and the loser who won", () => {
      startBattle();

      for (const cell of allShipCells(5)) {
        say(ahmet, { type: "fire", cell });
      }

      expect(ahmet.of("state").at(-1)?.room.game.winner).toBe("first");
      expect(ayse.of("state").at(-1)?.room.game.winner).toBe("first");
    });
  });

  describe("rematch", () => {
    it("starts a new round when both players asked for it", () => {
      startBattle();
      for (const cell of allShipCells(5)) {
        say(ahmet, { type: "fire", cell });
      }

      say(ayse, { type: "rematch" });
      expect(ahmet.of("state").at(-1)?.room.opponentWantsRematch).toBe(true);

      say(ahmet, { type: "rematch" });
      expect(ahmet.of("state").at(-1)?.room.game.phase).toBe("placing");
      expect(ayse.of("state").at(-1)?.room.game.wins).toEqual({ first: 1, second: 0 });
    });
  });

  describe("secrets", () => {
    it("never sends one player's token to the other", () => {
      startBattle();
      say(ahmet, { type: "fire", cell: { row: 0, column: 5 } });

      expect(JSON.stringify(ahmet.received)).not.toContain("token-2");
      expect(JSON.stringify(ayse.received)).not.toContain("token-1");
    });

    it("never sends a cell of the opponent's ships that was not hit", () => {
      startBattle();
      say(ahmet, { type: "fire", cell: { row: 9, column: 9 } });

      const json = JSON.stringify(ahmet.received);

      for (const cell of allShipCells(5)) {
        expect(json).not.toContain(JSON.stringify(cell));
      }
    });
  });

  describe("disconnect and rejoin", () => {
    it("tells the opponent that a player went away", () => {
      startRoom();

      server.disconnect(ayse);

      expect(ahmet.of("presence").at(-1)?.opponentOnline).toBe(false);
    });

    it("lets a player come back with his token and see the game as it is", () => {
      startBattle();
      say(ahmet, { type: "fire", cell: { row: 9, column: 9 } });
      server.disconnect(ayse);
      const returned = new FakeConnection();

      say(returned, { type: "rejoin", code: codeOfRoom(), token: "token-2" });

      const entered = returned.of("entered")[0];

      expect(entered?.room.game.you).toBe("second");
      expect(entered?.room.game.shotsAtYou).toEqual([{ row: 9, column: 9 }]);
      expect(entered?.opponentOnline).toBe(true);
      expect(ahmet.of("presence").at(-1)?.opponentOnline).toBe(true);
    });

    it("lets him fire after coming back", () => {
      startBattle();
      say(ahmet, { type: "fire", cell: { row: 9, column: 9 } });
      server.disconnect(ayse);
      const returned = new FakeConnection();
      say(returned, { type: "rejoin", code: codeOfRoom(), token: "token-2" });

      say(returned, { type: "fire", cell: { row: 9, column: 9 } });

      expect(returned.of("shot")).toHaveLength(1);
    });

    it("pushes out the old browser when the same player comes back from another one", () => {
      startRoom();
      const second = new FakeConnection();

      say(second, { type: "rejoin", code: codeOfRoom(), token: "token-2" });

      expect(ayse.closed).toBe(true);
      expect(second.of("entered")).toHaveLength(1);
    });

    it("ignores the closing of a browser that was already pushed out", () => {
      startRoom();
      say(new FakeConnection(), { type: "rejoin", code: codeOfRoom(), token: "token-2" });
      const before = ahmet.received.length;

      server.disconnect(ayse);

      expect(ahmet.received).toHaveLength(before);
    });

    it("rejects a wrong token", () => {
      startRoom();
      const stranger = new FakeConnection();

      say(stranger, { type: "rejoin", code: codeOfRoom(), token: "guess" });

      expect(stranger.last).toMatchObject({ type: "error", code: "no-such-room" });
    });

    it("rejects a room that does not exist", () => {
      say(ayse, { type: "rejoin", code: "ZZZZ", token: "token-2" });

      expect(ayse.last).toMatchObject({ type: "error", code: "no-such-room" });
    });
  });

  describe("leave", () => {
    it("tells the opponent that the player has left for good", () => {
      startRoom();

      say(ayse, { type: "leave" });

      expect(ahmet.of("opponent-left")).toHaveLength(1);
    });

    it("tells the one who leaves nothing", () => {
      startRoom();
      const before = ayse.received.length;

      say(ayse, { type: "leave" });

      expect(ayse.received).toHaveLength(before);
    });

    it("closes the room: nobody can come back to it, with a token or a code", () => {
      startRoom();
      const code = codeOfRoom();
      say(ayse, { type: "leave" });
      const returned = new FakeConnection();

      say(returned, { type: "rejoin", code, token: "token-1" });
      say(returned, { type: "join", code, name: "Late" });

      expect(returned.of("error").map((error) => error.code)).toEqual(["no-such-room", "no-such-room"]);
    });

    it("lets the one who stays go too: he sits nowhere afterwards", () => {
      startBattle();
      say(ayse, { type: "leave" });

      say(ahmet, { type: "fire", cell: { row: 9, column: 9 } });

      expect(ahmet.of("error").at(-1)?.code).toBe("not-in-room");
    });

    it("works when the player is alone in the room", () => {
      say(ahmet, { type: "create", name: "Ahmet", rules: RULES });
      const code = codeOfRoom();

      say(ahmet, { type: "leave" });

      const returned = new FakeConnection();
      say(returned, { type: "join", code, name: "Late" });
      expect(returned.of("error")[0]?.code).toBe("no-such-room");
    });

    it("is not an error to leave when there is no room", () => {
      say(ahmet, { type: "leave" });

      expect(ahmet.received).toEqual([]);
    });

    it("does not touch other rooms", () => {
      startRoom();
      const other = new FakeConnection();
      const otherFriend = new FakeConnection();
      say(other, { type: "create", name: "Other", rules: RULES });
      say(otherFriend, { type: "join", code: other.of("entered")[0]?.room.code ?? "", name: "Friend" });

      say(ayse, { type: "leave" });

      expect(other.of("opponent-left")).toEqual([]);
      expect(otherFriend.of("opponent-left")).toEqual([]);
    });

    it("is not the same as going away: a disconnected player can still come back", () => {
      startRoom();

      server.disconnect(ayse);

      expect(ahmet.of("opponent-left")).toEqual([]);
    });
  });

  describe("tick", () => {
    it("does nothing while the player still has time", () => {
      startBattle();
      now += 19 * SECOND;
      const before = ahmet.received.length;

      server.tick();

      expect(ahmet.received).toHaveLength(before);
    });

    it("fires at random for the player on turn when his time is up", () => {
      startBattle();
      now += 20 * SECOND;

      server.tick();

      for (const connection of [ahmet, ayse]) {
        expect(connection.of("shot").at(-1)?.shot).toMatchObject({ shooter: "first", wasRandom: true });
      }
    });

    it("lets the game go on even when the player on turn is gone", () => {
      startBattle();
      server.disconnect(ahmet);
      now += 20 * SECOND;

      server.tick();

      expect(ayse.of("shot").at(-1)?.shot.wasRandom).toBe(true);
    });

    it("gives the player a fresh 20 seconds after the random shot", () => {
      startBattle();
      now += 20 * SECOND;
      server.tick();
      const before = ahmet.received.length;

      server.tick();

      expect(ahmet.received).toHaveLength(before);
    });
  });

  describe("sweep", () => {
    it("forgets a room that everybody left long ago", () => {
      startRoom();
      const code = codeOfRoom();
      server.disconnect(ahmet);
      server.disconnect(ayse);
      now += HOUR + 1;

      expect(server.sweep()).toEqual([code]);

      const late = new FakeConnection();
      say(late, { type: "rejoin", code, token: "token-1" });
      expect(late.last).toMatchObject({ type: "error", code: "no-such-room" });
    });

    it("keeps a room while somebody is still connected", () => {
      startRoom();
      server.disconnect(ayse);
      now += 5 * HOUR;

      expect(server.sweep()).toEqual([]);
    });

    it("keeps a room that was left only a moment ago", () => {
      startRoom();
      now += 2 * HOUR;
      server.disconnect(ahmet);
      server.disconnect(ayse);

      expect(server.sweep()).toEqual([]);
    });
  });
});
