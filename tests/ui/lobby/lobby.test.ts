// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createLobby, type LobbyCallbacks } from "../../../src/ui/lobby/lobby";

/** A lobby where a name is already there, as it is for a player who has played before. */
function lobby(initialName = "Emre") {
  const callbacks = { create: vi.fn(), join: vi.fn() } satisfies LobbyCallbacks;
  const view = createLobby(callbacks, initialName);
  const find = <T extends HTMLElement>(selector: string): T => {
    const element = view.element.querySelector<T>(selector);
    if (element === null) {
      throw new Error(`Nothing matches ${selector}`);
    }
    return element;
  };

  return {
    view,
    callbacks,
    nameField: find<HTMLInputElement>("[data-role=name]"),
    presetButton: (id: string) => find<HTMLButtonElement>(`[data-preset=${id}]`),
    touchingBox: find<HTMLInputElement>("[data-role=touching]"),
    touchingHint: find<HTMLElement>("[data-role=touching-hint]"),
    summary: find<HTMLElement>("[data-role=summary]"),
    createButton: find<HTMLButtonElement>("[data-role=create]"),
    codeField: find<HTMLInputElement>("[data-role=code]"),
    joinButton: find<HTMLButtonElement>("[data-role=join]"),
    type(field: HTMLInputElement, text: string) {
      field.value = text;
      field.dispatchEvent(new Event("input"));
    },
  };
}

describe("createLobby: creating a room", () => {
  it("creates a classic room with separated ships unless told otherwise", () => {
    const { nameField, createButton, callbacks, type } = lobby();
    type(nameField, "Emre");

    createButton.click();

    expect(callbacks.create).toHaveBeenCalledWith("Emre", {
      fleetPreset: "classic",
      allowTouching: false,
    });
  });

  it("creates the fleet that was chosen", () => {
    const { presetButton, createButton, callbacks } = lobby();

    presetButton("russian").click();
    createButton.click();

    expect(callbacks.create).toHaveBeenCalledWith("Emre", expect.objectContaining({ fleetPreset: "russian" }));
  });

  it("marks only the chosen fleet as pressed", () => {
    const { presetButton } = lobby();

    presetButton("standard").click();

    expect(presetButton("standard").getAttribute("aria-pressed")).toBe("true");
    expect(presetButton("classic").getAttribute("aria-pressed")).toBe("false");
    expect(presetButton("russian").getAttribute("aria-pressed")).toBe("false");
  });

  it("describes the chosen fleet", () => {
    const { presetButton, summary } = lobby();
    expect(summary.textContent).toBe("5 gemi, 17 kare");

    presetButton("russian").click();

    expect(summary.textContent).toBe("10 gemi, 20 kare");
  });

  it("creates a room where ships may touch when that box is ticked", () => {
    const { touchingBox, createButton, callbacks } = lobby();

    touchingBox.click();
    createButton.click();

    expect(callbacks.create).toHaveBeenCalledWith("Emre", expect.objectContaining({ allowTouching: true }));
  });

  it("sends the name without the spaces around it", () => {
    const { nameField, createButton, callbacks, type } = lobby();
    type(nameField, "  Emre  ");

    createButton.click();

    expect(callbacks.create).toHaveBeenCalledWith("Emre", expect.anything());
  });

  it("starts with the name that was remembered", () => {
    const { nameField } = lobby("Emre");

    expect(nameField.value).toBe("Emre");
  });

  it("limits the name to sixteen characters", () => {
    const { nameField } = lobby();

    expect(nameField.getAttribute("maxlength")).toBe("16");
  });
});

describe("createLobby: joining a room", () => {
  it("cannot join before the whole code is typed", () => {
    const { codeField, joinButton, type } = lobby();

    type(codeField, "K7P");

    expect(joinButton.disabled).toBe(true);
  });

  it("can join once the code has four characters", () => {
    const { codeField, joinButton, type } = lobby();

    type(codeField, "K7P2");

    expect(joinButton.disabled).toBe(false);
  });

  it("writes the code in capitals as it is typed", () => {
    const { codeField, type } = lobby();

    type(codeField, "k7p2");

    expect(codeField.value).toBe("K7P2");
  });

  it("joins with the code and the name", () => {
    const { nameField, codeField, joinButton, callbacks, type } = lobby();
    type(nameField, "Ayşe");
    type(codeField, "k7p2");

    joinButton.click();

    expect(callbacks.join).toHaveBeenCalledWith("K7P2", "Ayşe");
  });
});

describe("createLobby: connection", () => {
  it("cannot create or join while offline", () => {
    const { view, codeField, createButton, joinButton, type } = lobby();
    type(codeField, "K7P2");

    view.setOnline(false);

    expect(createButton.disabled).toBe(true);
    expect(joinButton.disabled).toBe(true);
  });

  it("can create again when the connection is back", () => {
    const { view, createButton } = lobby();
    view.setOnline(false);

    view.setOnline(true);

    expect(createButton.disabled).toBe(false);
  });

  it("keeps joining closed after the connection is back if the code is short", () => {
    const { view, joinButton } = lobby();
    view.setOnline(false);

    view.setOnline(true);

    expect(joinButton.disabled).toBe(true);
  });
});

describe("createLobby: the name", () => {
  it("cannot create or join without a name", () => {
    const { createButton, joinButton, codeField, type } = lobby("");
    type(codeField, "ABCD");

    expect(createButton.disabled).toBe(true);
    expect(joinButton.disabled).toBe(true);
  });

  it("does not count spaces as a name", () => {
    const { createButton, nameField, type } = lobby("");

    type(nameField, "   ");

    expect(createButton.disabled).toBe(true);
  });

  it("can create and join as soon as a name is typed", () => {
    const { createButton, joinButton, nameField, codeField, type } = lobby("");
    type(codeField, "ABCD");

    type(nameField, "Ayşe");

    expect(createButton.disabled).toBe(false);
    expect(joinButton.disabled).toBe(false);
  });

  it("asks for the name inside the empty field, which takes no room of its own", () => {
    const { nameField, view } = lobby("");

    expect(nameField.placeholder).toBe("Önce adını yaz");
    expect(view.element.querySelector("[data-role=name-hint]")).toBeNull();
  });

  it("says why the buttons are closed on the buttons themselves, for a pointer that rests on them", () => {
    const { createButton, joinButton } = lobby("");

    expect(createButton.title).toBe("Oda kurmak ya da katılmak için önce adını yaz.");
    expect(joinButton.title).toBe("Oda kurmak ya da katılmak için önce adını yaz.");
  });

  it("says nothing on the buttons once there is a name", () => {
    const { createButton, joinButton, nameField, type } = lobby("");

    type(nameField, "Ayşe");

    expect(createButton.title).toBe("");
    expect(joinButton.title).toBe("");
  });

  it("says nothing on the buttons when the name was remembered", () => {
    const { createButton, joinButton } = lobby("Emre");

    expect(createButton.title).toBe("");
    expect(joinButton.title).toBe("");
  });

  it("explains the closed buttons again when the name is wiped out", () => {
    const { createButton, nameField, type } = lobby("Emre");

    type(nameField, "  ");

    expect(createButton.title).toBe("Oda kurmak ya da katılmak için önce adını yaz.");
  });
});

describe("createLobby: touching ships and the russian fleet", () => {
  it("unticks the box and closes it when the russian fleet is chosen", () => {
    const { touchingBox, presetButton } = lobby();
    touchingBox.click();

    presetButton("russian").click();

    expect(touchingBox.checked).toBe(false);
    expect(touchingBox.disabled).toBe(true);
  });

  it("creates the russian room with separated ships", () => {
    const { touchingBox, presetButton, createButton, callbacks } = lobby();
    touchingBox.click();
    presetButton("russian").click();

    createButton.click();

    expect(callbacks.create).toHaveBeenCalledWith("Emre", { fleetPreset: "russian", allowTouching: false });
  });

  it("opens the box again when another fleet is chosen", () => {
    const { touchingBox, presetButton } = lobby();
    presetButton("russian").click();

    presetButton("classic").click();

    expect(touchingBox.disabled).toBe(false);
  });

  it("tells why the box is closed", () => {
    const { touchingHint, presetButton } = lobby();

    presetButton("russian").click();

    expect(touchingHint.textContent).toBe("Rus filosunda gemiler birbirine değemez; bu kural değişmez.");
  });

  it("goes back to the ordinary hint when the box is open again", () => {
    const { touchingHint, touchingBox, presetButton } = lobby();
    presetButton("russian").click();

    presetButton("standard").click();
    touchingBox.checked = true;
    // A box that is not on a page does not announce its own change in this test environment.
    touchingBox.dispatchEvent(new Event("change"));

    expect(touchingHint.textContent).toBe("Gemiler birbirine değebilir.");
  });
});
