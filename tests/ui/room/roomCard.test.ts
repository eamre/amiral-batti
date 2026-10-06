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

  it("tells the rules of the room, so the one who joined knows what was chosen", () => {
    const { find } = card(roomView({ game: placing }));

    expect(find("rules")?.textContent).toBe("Filo: Klasik · Gemiler yan yana olamaz");
  });

  it("names the fleet that was chosen", () => {
    const russian = gameView({ phase: "placing", settings: { boardSize: 10, fleetPreset: "russian", allowTouching: false, turnSeconds: 20 } });

    expect(card(roomView({ game: russian })).find("rules")?.textContent).toBe("Filo: Rus · Gemiler yan yana olamaz");
  });

  it("tells when the ships may touch", () => {
    const touching = gameView({ phase: "placing", settings: { boardSize: 10, fleetPreset: "standard", allowTouching: true, turnSeconds: 20 } });

    expect(card(roomView({ game: touching })).find("rules")?.textContent).toBe("Filo: Standart · Gemiler yan yana olabilir");
  });

  it("tells the rules to the one who made the room as well, while he waits", () => {
    expect(card().find("rules")?.textContent).toBe("Filo: Klasik · Gemiler yan yana olamaz");
  });
});
