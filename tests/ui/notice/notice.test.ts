// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { ClientState, ConnectionStatus } from "../../../src/infrastructure/GameClient";
import { createNotice } from "../../../src/ui/notice/notice";
import { gameView, roomView } from "../fixtures";

function newNotice() {
  const later: (() => void)[] = [];
  const notice = createNotice((action) => later.push(action));

  return {
    notice,
    text: () => notice.element.textContent,
    firstLaterIsNow: () => later.shift()?.(),
  };
}

const state = (
  room = roomView(),
  status: ConnectionStatus = "online",
  opponentOnline = true,
): ClientState => ({ status, room, opponentOnline });

describe("createNotice: things that went wrong", () => {
  it("tells the player what the server refused", () => {
    const { notice, text } = newNotice();

    notice.complain("no-such-room");

    expect(text()).toBe("Böyle bir oda yok.");
  });

  it("stops telling it after a while", () => {
    const { notice, text, firstLaterIsNow } = newNotice();
    notice.complain("no-such-room");

    firstLaterIsNow();

    expect(text()).toBe("");
  });

  it("keeps a newer problem on the screen when an older one times out", () => {
    const { notice, text, firstLaterIsNow } = newNotice();
    notice.complain("no-such-room");
    notice.complain("room-full");

    firstLaterIsNow();

    expect(text()).toBe("Bu oda dolu.");
  });

  it("takes the newer problem away when its own time is up", () => {
    const { notice, text, firstLaterIsNow } = newNotice();
    notice.complain("no-such-room");
    notice.complain("room-full");

    firstLaterIsNow();
    firstLaterIsNow();

    expect(text()).toBe("");
  });

  it("waits four seconds before it takes a problem away", () => {
    const delays: number[] = [];
    const notice = createNotice((_action, delay) => delays.push(delay));

    notice.complain("room-full");

    expect(delays).toEqual([4_000]);
  });

  it("speaks about a problem before anything else", () => {
    const { notice, text } = newNotice();
    notice.showState(state(roomView(), "online", false));

    notice.complain("room-full");

    expect(text()).toBe("Bu oda dolu.");
  });

  it("goes back to the state when the problem is gone", () => {
    const { notice, text, firstLaterIsNow } = newNotice();
    notice.showState(state(roomView(), "online", false));
    notice.complain("room-full");

    firstLaterIsNow();

    expect(text()).toBe("Rakibin bağlantısı koptu. Dönmesi bekleniyor…");
  });
});

describe("createNotice: the opponent's connection", () => {
  it("says when the opponent has lost his connection", () => {
    const { notice, text } = newNotice();

    notice.showState(state(roomView(), "online", false));

    expect(text()).toBe("Rakibin bağlantısı koptu. Dönmesi bekleniyor…");
  });

  it("says nothing while the opponent is there", () => {
    const { notice, text } = newNotice();

    notice.showState(state());

    expect(text()).toBe("");
  });

  it("does not say it when there is no opponent yet", () => {
    const { notice, text } = newNotice();
    const placing = gameView({ phase: "placing", youAreReady: false, opponentIsReady: false, yourTurn: false });

    notice.showState(state(roomView({ opponentName: undefined, game: placing }), "online", false));

    expect(text()).toBe("");
  });

  it("does not blame the opponent when it is the player's own connection that is lost", () => {
    const { notice, text } = newNotice();

    notice.showState(state(roomView(), "offline", false));

    expect(text()).toBe("");
  });

  it("says nothing before it was told anything", () => {
    expect(newNotice().text()).toBe("");
  });
});
