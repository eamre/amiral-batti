import { describe, expect, it } from "vitest";
import { ConnectedPlayers, type Connection } from "../../src/server/ConnectedPlayers";
import type { ServerMessage } from "../../src/shared/protocol";

function browser() {
  const heard: ServerMessage[] = [];
  let closed = false;
  const connection: Connection = {
    send: (message) => heard.push(message),
    close: () => {
      closed = true;
    },
  };

  return { connection, heard, wasClosed: () => closed };
}

const online: ServerMessage = { type: "presence", opponentOnline: true };

function tableOfTwo() {
  const players = new ConnectedPlayers();
  const ahmet = browser();
  const ayse = browser();

  players.seat(ahmet.connection, { code: "ABCD", token: "ahmet" });
  players.seat(ayse.connection, { code: "ABCD", token: "ayse" });
  return { players, ahmet, ayse };
}

describe("ConnectedPlayers: seats", () => {
  it("remembers where a browser sits", () => {
    const { players, ahmet } = tableOfTwo();

    expect(players.seatOf(ahmet.connection)).toEqual({ code: "ABCD", token: "ahmet" });
  });

  it("knows nothing about a browser that never sat down", () => {
    expect(new ConnectedPlayers().seatOf(browser().connection)).toBeUndefined();
  });

  it("gives the seat back when a browser leaves, and forgets it", () => {
    const { players, ahmet } = tableOfTwo();

    expect(players.release(ahmet.connection)).toEqual({ code: "ABCD", token: "ahmet" });
    expect(players.seatOf(ahmet.connection)).toBeUndefined();
  });

  it("has nothing to give back for a browser that never sat down", () => {
    expect(new ConnectedPlayers().release(browser().connection)).toBeUndefined();
  });

  it("knows whether anybody is in a room", () => {
    const { players, ahmet, ayse } = tableOfTwo();

    expect(players.hasAnyoneIn("ABCD")).toBe(true);
    expect(players.hasAnyoneIn("WXYZ")).toBe(false);
    players.release(ahmet.connection);
    players.release(ayse.connection);
    expect(players.hasAnyoneIn("ABCD")).toBe(false);
  });

  it("knows whether somebody else is in the room", () => {
    const { players, ahmet } = tableOfTwo();

    expect(players.hasAnyoneBesides("ABCD", "ahmet")).toBe(true);
    players.release(ahmet.connection);
    expect(players.hasAnyoneBesides("ABCD", "ayse")).toBe(false);
  });
});

describe("ConnectedPlayers: messages", () => {
  it("tells everybody in the room, and nobody in another", () => {
    const { players, ahmet, ayse } = tableOfTwo();
    const stranger = browser();
    players.seat(stranger.connection, { code: "WXYZ", token: "stranger" });

    players.sendToRoom("ABCD", online);

    expect(ahmet.heard).toEqual([online]);
    expect(ayse.heard).toEqual([online]);
    expect(stranger.heard).toEqual([]);
  });

  it("leaves out the browser that is not to hear it", () => {
    const { players, ahmet, ayse } = tableOfTwo();

    players.sendToRoom("ABCD", online, ahmet.connection);

    expect(ahmet.heard).toEqual([]);
    expect(ayse.heard).toEqual([online]);
  });

  it("can tell each one something of his own", () => {
    const { players, ahmet, ayse } = tableOfTwo();

    players.sendToEach("ABCD", ({ token }) => ({ type: "error", code: "bad-message", message: token }));

    expect(ahmet.heard).toEqual([{ type: "error", code: "bad-message", message: "ahmet" }]);
    expect(ayse.heard).toEqual([{ type: "error", code: "bad-message", message: "ayse" }]);
  });
});

describe("ConnectedPlayers: one browser per seat", () => {
  it("closes the other browsers of the same seat and forgets them", () => {
    const { players, ahmet } = tableOfTwo();
    const second = browser();
    players.seat(second.connection, { code: "ABCD", token: "ahmet" });

    players.closeOthersAt("ABCD", "ahmet");

    expect(ahmet.wasClosed()).toBe(true);
    expect(second.wasClosed()).toBe(true);
    expect(players.seatOf(ahmet.connection)).toBeUndefined();
  });

  it("leaves the other seats alone", () => {
    const { players, ayse } = tableOfTwo();

    players.closeOthersAt("ABCD", "ahmet");

    expect(ayse.wasClosed()).toBe(false);
    expect(players.seatOf(ayse.connection)).toEqual({ code: "ABCD", token: "ayse" });
  });
});

describe("ConnectedPlayers: closing a room", () => {
  it("lets every browser of the room go, without closing them", () => {
    const { players, ahmet, ayse } = tableOfTwo();

    players.releaseRoom("ABCD");

    expect(players.seatOf(ahmet.connection)).toBeUndefined();
    expect(players.seatOf(ayse.connection)).toBeUndefined();
    expect(players.hasAnyoneIn("ABCD")).toBe(false);
    expect(ahmet.wasClosed()).toBe(false);
    expect(ayse.wasClosed()).toBe(false);
  });

  it("leaves the browsers of other rooms seated", () => {
    const { players } = tableOfTwo();
    const stranger = browser();
    players.seat(stranger.connection, { code: "WXYZ", token: "stranger" });

    players.releaseRoom("ABCD");

    expect(players.seatOf(stranger.connection)).toEqual({ code: "WXYZ", token: "stranger" });
  });
});
