import { beforeEach, describe, expect, it } from "vitest";
import type { ClientSocket, Session, SessionStore, SocketHandlers } from "../../src/infrastructure/clientPorts";
import type { ClientFailure, ClientListener, ClientState } from "../../src/infrastructure/clientState";
import { GameClient } from "../../src/infrastructure/GameClient";
import type { RoomViewDto, ServerMessage, ShotDto } from "../../src/shared/protocol";

const RULES = { fleetPreset: "classic", allowTouching: false } as const;
const RECONNECT_DELAY = 1_500;

class FakeSocket implements ClientSocket {
  readonly sent: string[] = [];
  closed = false;

  constructor(readonly handlers: SocketHandlers) {}

  send(text: string): void {
    this.sent.push(text);
  }

  close(): void {
    this.closed = true;
    this.handlers.onClose();
  }

  /** What the client has sent, as messages. */
  get messages(): { type: string; [key: string]: unknown }[] {
    return this.sent.map((text) => JSON.parse(text));
  }

  hear(message: ServerMessage | string): void {
    this.handlers.onMessage(typeof message === "string" ? message : JSON.stringify(message));
  }
}

class FakeStore implements SessionStore {
  session: Session | undefined;

  load(): Session | undefined {
    return this.session;
  }

  save(session: Session): void {
    this.session = session;
  }

  clear(): void {
    this.session = undefined;
  }
}

function room(code = "ABCD"): RoomViewDto {
  return {
    code,
    yourName: "Ahmet",
    youWantRematch: false,
    opponentWantsRematch: false,
    game: {
      you: "first",
      phase: "placing",
      settings: { boardSize: 10, fleetPreset: "classic", allowTouching: false, turnSeconds: 20 },
      wins: { first: 0, second: 0 },
      youAreReady: false,
      opponentIsReady: false,
      yourTurn: false,
      yourShips: [],
      shotsAtYou: [],
      yourShots: [],
      sunkEnemyShips: [],
      revealedEnemyShips: [],
      knownEmptyEnemyCells: [],
      knownEmptyOwnCells: [],
    },
  };
}

describe("GameClient", () => {
  let sockets: FakeSocket[];
  let store: FakeStore;
  let scheduled: { action: () => void; delay: number }[];
  let states: ClientState[];
  let shots: ShotDto[];
  let failures: ClientFailure[];
  let client: GameClient;

  const socket = (): FakeSocket => sockets[sockets.length - 1] as FakeSocket;

  function connectAndOpen(): void {
    client.start();
    socket().handlers.onOpen();
  }

  function enter(code = "ABCD", token = "secret", opponentOnline = false): void {
    socket().hear({ type: "entered", token, room: room(code), opponentOnline });
  }

  function runScheduled(): void {
    const due = scheduled;
    scheduled = [];
    due.forEach((item) => item.action());
  }

  beforeEach(() => {
    sockets = [];
    store = new FakeStore();
    scheduled = [];
    states = [];
    shots = [];
    failures = [];
    const listener: ClientListener = {
      stateChanged: (state) => states.push(state),
      shotFired: (shot) => shots.push(shot),
      failed: (failure) => failures.push(failure),
    };
    client = new GameClient({
      createSocket: (handlers) => {
        const created = new FakeSocket(handlers);
        sockets.push(created);
        return created;
      },
      store,
      schedule: (action, delay) => scheduled.push({ action, delay }),
      listener,
    });
  });

  describe("connecting", () => {
    it("is connecting until the connection opens", () => {
      client.start();

      expect(client.currentState.status).toBe("connecting");
    });

    it("is online once the connection opens", () => {
      connectAndOpen();

      expect(client.currentState.status).toBe("online");
    });

    it("says nothing on its own when there is no seat to come back to", () => {
      connectAndOpen();

      expect(socket().sent).toEqual([]);
    });

    it("asks for its old seat back when it remembers one", () => {
      store.session = { code: "ABCD", token: "secret" };

      connectAndOpen();

      expect(socket().messages).toEqual([{ type: "rejoin", code: "ABCD", token: "secret" }]);
    });
  });

  describe("commands", () => {
    it("sends a command as a message", () => {
      connectAndOpen();

      expect(client.create("Ahmet", RULES)).toBe(true);
      expect(client.join("ABCD", "Ayse")).toBe(true);
      expect(client.ready([{ kind: "boat", row: 0, column: 0, quarterTurns: 0 }])).toBe(true);
      expect(client.fire({ row: 1, column: 2 })).toBe(true);
      expect(client.rematch()).toBe(true);

      expect(socket().messages.map((message) => message.type)).toEqual([
        "create", "join", "ready", "fire", "rematch",
      ]);
      expect(socket().messages[3]).toEqual({ type: "fire", cell: { row: 1, column: 2 } });
    });

    it("does not send while it is still connecting", () => {
      client.start();

      expect(client.fire({ row: 0, column: 0 })).toBe(false);
      expect(socket().sent).toEqual([]);
    });

    it("does not send while it is offline", () => {
      connectAndOpen();
      socket().handlers.onClose();

      expect(client.fire({ row: 0, column: 0 })).toBe(false);
    });
  });

  describe("what the server says", () => {
    it("takes its seat and remembers how to come back", () => {
      connectAndOpen();

      enter("ABCD", "secret", true);

      expect(client.currentState.room?.code).toBe("ABCD");
      expect(client.currentState.opponentOnline).toBe(true);
      expect(store.session).toEqual({ code: "ABCD", token: "secret" });
    });

    it("never puts the token in the state it shows to the screen", () => {
      connectAndOpen();

      enter("ABCD", "secret");

      expect(JSON.stringify(client.currentState)).not.toContain("secret");
    });

    it("replaces the room when a new state arrives", () => {
      connectAndOpen();
      enter();

      socket().hear({ type: "state", room: { ...room(), yourName: "Changed" } });

      expect(client.currentState.room?.yourName).toBe("Changed");
    });

    it("follows the presence of the opponent", () => {
      connectAndOpen();
      enter();

      socket().hear({ type: "presence", opponentOnline: true });
      expect(client.currentState.opponentOnline).toBe(true);

      socket().hear({ type: "presence", opponentOnline: false });
      expect(client.currentState.opponentOnline).toBe(false);
    });

    it("passes a shot on to the listener", () => {
      connectAndOpen();
      const shot: ShotDto = { shooter: "first", cell: { row: 1, column: 1 }, outcome: "hit", wasRandom: false };

      socket().hear({ type: "shot", shot });

      expect(shots).toEqual([shot]);
    });

    it("passes an error on to the listener", () => {
      connectAndOpen();

      socket().hear({ type: "error", code: "not-your-turn", message: "No." });

      expect(failures).toEqual([{ code: "not-your-turn", message: "No." }]);
    });

    it("ignores text that is not a message", () => {
      connectAndOpen();
      const before = states.length;

      socket().hear("not json");
      socket().hear('{"type":"unknown"}');
      socket().hear("42");
      socket().hear("null");

      expect(states).toHaveLength(before);
      expect(failures).toEqual([]);
    });
  });

  describe("coming back to a seat", () => {
    it("forgets the seat when the server says the room is gone", () => {
      store.session = { code: "ABCD", token: "secret" };
      connectAndOpen();

      socket().hear({ type: "error", code: "no-such-room", message: "Gone." });

      expect(store.session).toBeUndefined();
      expect(client.currentState.room).toBeUndefined();
      expect(failures).toHaveLength(1);
    });

    it("keeps the seat when a join fails because the code was wrong", () => {
      connectAndOpen();
      enter();

      socket().hear({ type: "error", code: "no-such-room", message: "No such room." });

      expect(store.session).toEqual({ code: "ABCD", token: "secret" });
    });

    it("takes the seat again when the server agrees", () => {
      store.session = { code: "ABCD", token: "secret" };
      connectAndOpen();

      enter("ABCD", "secret", true);

      expect(client.currentState.room?.code).toBe("ABCD");
      expect(store.session).toEqual({ code: "ABCD", token: "secret" });
    });
  });

  describe("losing the connection", () => {
    it("goes offline but keeps showing the room", () => {
      connectAndOpen();
      enter();

      socket().handlers.onClose();

      expect(client.currentState.status).toBe("offline");
      expect(client.currentState.room?.code).toBe("ABCD");
      expect(client.currentState.opponentOnline).toBe(false);
    });

    it("tries again after a short while", () => {
      connectAndOpen();

      socket().handlers.onClose();

      expect(scheduled).toHaveLength(1);
      expect(scheduled[0]?.delay).toBe(RECONNECT_DELAY);
      expect(sockets).toHaveLength(1);
    });

    it("comes back to the same seat after it reconnects", () => {
      connectAndOpen();
      enter("ABCD", "secret");
      socket().handlers.onClose();

      runScheduled();
      socket().handlers.onOpen();

      expect(sockets).toHaveLength(2);
      expect(client.currentState.status).toBe("online");
      expect(socket().messages).toEqual([{ type: "rejoin", code: "ABCD", token: "secret" }]);
    });

    it("keeps trying when the server is still not there", () => {
      connectAndOpen();
      socket().handlers.onClose();

      runScheduled();
      socket().handlers.onClose();

      expect(scheduled).toHaveLength(1);
    });

    it("does not try again once it has been stopped", () => {
      connectAndOpen();

      client.stop();

      expect(socket().closed).toBe(true);
      expect(scheduled).toEqual([]);
    });
  });

  describe("leave", () => {
    it("forgets the seat and the room", () => {
      connectAndOpen();
      enter();

      client.leave();

      expect(store.session).toBeUndefined();
      expect(client.currentState.room).toBeUndefined();
    });

    it("closes the connection, so the server lets go of the seat, and then reconnects without a seat", () => {
      connectAndOpen();
      enter();

      client.leave();
      runScheduled();
      socket().handlers.onOpen();

      expect(sockets[0]?.closed).toBe(true);
      expect(sockets).toHaveLength(2);
      expect(socket().sent).toEqual([]);
    });
  });
});
