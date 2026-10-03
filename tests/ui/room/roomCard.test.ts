// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createRoomCard } from "../../../src/ui/room/roomCard";
import { gameView, roomView } from "../fixtures";

const placing = gameView({ phase: "placing", youAreReady: false, yourTurn: false });

function card(room = roomView({ opponentName: undefined, game: placing })) {
  const copy = vi.fn();
  const view = createRoomCard(copy);
  view.update(room);
  const find = (role: string) => view.element.querySelector<HTMLElement>(`[data-role=${role}]`);
  return { view, copy, find };
}

describe("createRoomCard", () => {
  it("says what the player is to do or wait for", () => {
    expect(card().find("status")?.textContent).toBe("Rakip bekleniyor…");
  });

  it("shows the code of the room while the opponent has not come", () => {
    expect(card().find("code")?.textContent).toBe("ABCD");
  });

  it("copies the code when the button is pressed", () => {
    const { find, copy } = card();

    find("copy")?.click();

    expect(copy).toHaveBeenCalledWith("ABCD");
  });

  it("hides the code once the opponent has come", () => {
    const { find } = card(roomView({ game: placing }));

    expect(find("code")).toBeNull();
    expect(find("copy")).toBeNull();
  });

  it("goes on saying what to do after the opponent has come", () => {
    const { find } = card(roomView({ game: placing }));

    expect(find("status")?.textContent).toBe("Filonu istediğin gibi düzenle, sonra Hazırım'a bas.");
  });

  it("changes with the room", () => {
    const { view, find } = card();

    view.update(roomView({ game: gameView({ phase: "placing", youAreReady: true, yourTurn: false }) }));

    expect(find("status")?.textContent).toBe("Ayse filosunu düzenliyor…");
    expect(find("code")).toBeNull();
  });
});
