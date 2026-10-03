// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { Preferences } from "../../../src/infrastructure/LocalStoragePreferences";
import type { ClientState, ConnectionStatus } from "../../../src/infrastructure/GameClient";
import type { RoomViewDto, ShipPlacementDto } from "../../../src/shared/protocol";
import { createApp } from "../../../src/ui/app/app";
import { gameView, roomView } from "../fixtures";

/** A deterministic stream of numbers in [0, 1). */
function stream(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const placing = (changes = {}) =>
  gameView({ phase: "placing", youAreReady: false, opponentIsReady: false, yourTurn: false, secondsLeft: undefined, ...changes });

const state = (room?: RoomViewDto, status: ConnectionStatus = "online", opponentOnline = true): ClientState => ({
  status,
  room,
  opponentOnline,
});

/** Five ships of the classic fleet that stand well. */
const savedLayout: ShipPlacementDto[] = [
  { kind: "carrier", row: 0, column: 0, quarterTurns: 0 },
  { kind: "cruiser", row: 2, column: 0, quarterTurns: 0 },
  { kind: "submarine", row: 4, column: 0, quarterTurns: 0 },
  { kind: "destroyer", row: 6, column: 0, quarterTurns: 0 },
  { kind: "boat", row: 8, column: 0, quarterTurns: 0 },
];

function newApp(remembered: { name?: string; layout?: ShipPlacementDto[] } = {}) {
  let now = 1_000;
  const later: (() => void)[] = [];
  const commands = {
    create: vi.fn(),
    join: vi.fn(),
    ready: vi.fn(),
    fire: vi.fn(),
    rematch: vi.fn(),
    leave: vi.fn(),
  };
  const preferences = {
    loadName: vi.fn(() => remembered.name ?? ""),
    saveName: vi.fn(),
    loadLayout: vi.fn(() => remembered.layout),
    saveLayout: vi.fn(),
  } satisfies Preferences;
  const copy = vi.fn();
  const app = createApp({
    commands,
    preferences,
    copy,
    random: stream(3),
    now: () => now,
    schedule: (action) => later.push(action),
  });

  const find = (selector: string) => app.element.querySelector<HTMLElement>(selector);
  const role = (name: string) => find(`[data-role=${name}]`);

  return {
    app,
    commands,
    preferences,
    copy,
    find,
    role,
    show: (next: ClientState) => app.listener.stateChanged(next),
    timePasses: (seconds: number) => {
      now += seconds * 1000;
      app.tick();
    },
    laterIsNow: () => later.splice(0).forEach((action) => action()),
    /** Only the one that was asked for first. */
    firstLaterIsNow: () => later.shift()?.(),
    type: (field: HTMLElement | null, text: string) => {
      (field as HTMLInputElement).value = text;
      field?.dispatchEvent(new Event("input"));
    },
  };
}

describe("createApp: the way out of a room", () => {
  const screens = {
    "arranging the fleet": () => roomView({ game: placing() }),
    "waiting for the opponent's fleet": () => roomView({ game: placing({ youAreReady: true }) }),
    "the battle": () => roomView(),
    "the end of a game": () =>
      roomView({ game: gameView({ phase: "finished", winner: "first", yourTurn: false, secondsLeft: undefined }) }),
  };

  it("is not offered in the lobby, where there is no room to leave", () => {
    const { find } = newApp();

    expect(find("[data-role=leave]")?.hidden).toBe(true);
  });

  it.each(Object.entries(screens))("is one icon in the header while %s", (_screen, room) => {
    const { show, app } = newApp();

    show(state(room()));

    const buttons = app.element.querySelectorAll<HTMLElement>("[data-role=leave]");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.hidden).toBe(false);
    expect(buttons[0]?.closest(".header")).not.toBeNull();
  });

  it("goes away again when the player is back in the lobby", () => {
    const { show, find } = newApp();
    show(state(roomView()));

    show(state(undefined));

    expect(find("[data-role=leave]")?.hidden).toBe(true);
  });

  it.each(Object.entries(screens))("leaves the room when it is pressed while %s", (_screen, room) => {
    const { show, role, commands } = newApp();
    show(state(room()));

    role("leave")?.click();

    expect(commands.leave).toHaveBeenCalledTimes(1);
  });
});

describe("createApp: the lobby", () => {
  it("starts in the lobby", () => {
    expect(newApp().role("create")).not.toBeNull();
  });

  it("shows the connection", () => {
    const { role, show } = newApp();

    show(state(undefined, "offline"));

    expect(role("connection")?.textContent).toBe("bağlantı yok");
    expect(role("connection")?.getAttribute("data-state")).toBe("offline");
  });

  it("starts with the name that was remembered", () => {
    expect((newApp({ name: "Emre" }).role("name") as HTMLInputElement).value).toBe("Emre");
  });

  it("cannot create a room before the connection is made", () => {
    expect((newApp().role("create") as HTMLButtonElement).disabled).toBe(true);
  });

  it("creates a room with the chosen rules and remembers the name", () => {
    const { role, commands, preferences, type, show } = newApp();
    show(state(undefined));
    type(role("name"), "Emre");

    role("create")?.click();

    expect(commands.create).toHaveBeenCalledWith("Emre", { fleetPreset: "classic", allowTouching: false });
    expect(preferences.saveName).toHaveBeenCalledWith("Emre");
  });

  it("joins a room with its code and remembers the name", () => {
    const { role, commands, preferences, type, show } = newApp();
    show(state(undefined));
    type(role("name"), "Ayşe");
    type(role("code"), "k7p2");

    role("join")?.click();

    expect(commands.join).toHaveBeenCalledWith("K7P2", "Ayşe");
    expect(preferences.saveName).toHaveBeenCalledWith("Ayşe");
  });

  it("cannot create a room while offline", () => {
    const { role, show } = newApp();

    show(state(undefined, "offline"));

    expect((role("create") as HTMLButtonElement).disabled).toBe(true);
  });

  it("goes back to the lobby when the room is gone", () => {
    const { role, show } = newApp();
    show(state(roomView({ game: placing() })));

    show(state(undefined));

    expect(role("create")).not.toBeNull();
  });
});

describe("createApp: arranging the fleet", () => {
  const room = (changes = {}) => roomView({ game: placing(), ...changes });

  it("shows the board where the fleet is arranged", () => {
    const { show, find } = newApp();

    show(state(room()));

    expect(find(".board--placing")).not.toBeNull();
  });

  it("shows the code of the room while the opponent has not come", () => {
    const { show, role } = newApp();

    show(state(room({ opponentName: undefined })));

    expect(role("code")?.textContent).toBe("ABCD");
  });

  it("copies the code", () => {
    const { show, role, copy } = newApp();
    show(state(room({ opponentName: undefined })));

    role("copy")?.click();

    expect(copy).toHaveBeenCalledWith("ABCD");
  });

  it("deals a fleet when none was remembered, and says ready with it", () => {
    const { show, role, commands } = newApp();
    show(state(room()));

    role("ready")?.click();

    const [ships] = commands.ready.mock.calls[0] as [ShipPlacementDto[]];
    expect(ships).toHaveLength(5);
    expect(ships[0]).toEqual({
      kind: expect.any(String),
      row: expect.any(Number),
      column: expect.any(Number),
      quarterTurns: expect.any(Number),
    });
  });

  it("starts with the fleet that was remembered for these rules", () => {
    const { show, role, commands, preferences } = newApp({ layout: savedLayout });
    show(state(room()));

    role("ready")?.click();

    expect(preferences.loadLayout).toHaveBeenCalledWith("classic");
    expect(commands.ready).toHaveBeenCalledWith(savedLayout);
  });

  it("does not use a remembered fleet that the rules do not allow", () => {
    const onTopOfEachOther = savedLayout.map((ship) => ({ ...ship, row: 0 }));
    const { show, role, commands } = newApp({ layout: onTopOfEachOther });
    show(state(room()));

    role("ready")?.click();

    expect(commands.ready).toHaveBeenCalledTimes(1);
    expect(commands.ready).not.toHaveBeenCalledWith(onTopOfEachOther);
  });

  it("remembers the fleet when it is shuffled", () => {
    const { show, role, preferences } = newApp();
    show(state(room()));

    role("shuffle")?.click();

    expect(preferences.saveLayout).toHaveBeenCalledWith("classic", expect.any(Array));
    expect(preferences.saveLayout.mock.calls[0]![1]).toHaveLength(5);
  });

  it("remembers the fleet that was sent too", () => {
    const { show, role, preferences } = newApp({ layout: savedLayout });
    show(state(room()));

    role("ready")?.click();

    expect(preferences.saveLayout).toHaveBeenCalledWith("classic", savedLayout);
  });

  it("keeps the same board when the room changes but the player is still arranging", () => {
    const { show, find } = newApp();
    show(state(room({ opponentName: undefined })));
    const board = find(".board--placing");

    show(state(room()));

    expect(find(".board--placing")).toBe(board);
  });
});

describe("createApp: waiting for the opponent's fleet", () => {
  const ready = () => roomView({ game: placing({ youAreReady: true }) });

  it("shows the fleet that was sent, not a board to arrange", () => {
    const { show, find } = newApp();

    show(state(ready()));

    expect(find(".board--placing")).toBeNull();
    expect(find(".board")?.getAttribute("aria-label")).toBe("Filon");
  });

  it("says that the opponent is arranging his", () => {
    const { show, role } = newApp();

    show(state(ready()));

    expect(role("status")?.textContent).toBe("Ayse filosunu düzenliyor…");
  });
});

describe("createApp: the battle", () => {
  it("shows the battle once both are ready", () => {
    const { show, role } = newApp();

    show(state(roomView()));

    expect(role("status")?.textContent).toBe("Sıra sende — ateş et!");
  });

  it("fires at the cell that was clicked", () => {
    const { show, find, commands } = newApp();
    show(state(roomView()));

    find('.target[data-row="2"][data-column="3"]')?.dispatchEvent(new Event("click"));

    expect(commands.fire).toHaveBeenCalledWith({ row: 2, column: 3 });
  });

  it("cannot fire while offline", () => {
    const { show, find } = newApp();

    show(state(roomView(), "offline"));

    expect(find(".target")).toBeNull();
  });

  it("tells about a shot", () => {
    const { app, show, role } = newApp();
    show(state(roomView()));

    app.listener.shotFired({ shooter: "first", cell: { row: 1, column: 1 }, outcome: "hit", wasRandom: false });

    expect(role("message")?.textContent).toBe("Vurdun!");
  });

  it("lets the clock run", () => {
    const { show, role, timePasses } = newApp();
    show(state(roomView()));

    timePasses(5);

    expect(role("timer")?.textContent).toBe("⏱ 15");
  });

  it("asks for a rematch and can leave", () => {
    const { show, role, commands } = newApp();
    show(state(roomView({ game: gameView({ phase: "finished", winner: "first", yourTurn: false, secondsLeft: undefined }) })));

    role("rematch")?.click();
    role("leave")?.click();

    expect(commands.rematch).toHaveBeenCalledTimes(1);
    expect(commands.leave).toHaveBeenCalledTimes(1);
  });

  it("starts arranging again when a new round begins", () => {
    const { show, find } = newApp();
    show(state(roomView({ game: gameView({ phase: "finished", winner: "first", yourTurn: false }) })));

    show(state(roomView({ game: placing() })));

    expect(find(".board--placing")).not.toBeNull();
  });
});

describe("createApp: things that went wrong", () => {
  it("tells the player what the server refused", () => {
    const { app, role } = newApp();

    app.listener.failed({ code: "no-such-room", message: "No such room." });

    expect(role("notice")?.textContent).toBe("Böyle bir oda yok.");
  });

  it("stops telling it after a while", () => {
    const { app, role, laterIsNow } = newApp();
    app.listener.failed({ code: "no-such-room", message: "No such room." });

    laterIsNow();

    expect(role("notice")?.textContent).toBe("");
  });

  it("keeps a newer problem on the screen when an older one times out", () => {
    const { app, role, firstLaterIsNow } = newApp();
    app.listener.failed({ code: "no-such-room", message: "" });
    app.listener.failed({ code: "room-full", message: "" });

    firstLaterIsNow();

    expect(role("notice")?.textContent).toBe("Bu oda dolu.");
  });

  it("takes the newer problem away when its own time is up", () => {
    const { app, role, firstLaterIsNow } = newApp();
    app.listener.failed({ code: "no-such-room", message: "" });
    app.listener.failed({ code: "room-full", message: "" });

    firstLaterIsNow();
    firstLaterIsNow();

    expect(role("notice")?.textContent).toBe("");
  });

  it("says when the opponent has lost his connection", () => {
    const { show, role } = newApp();

    show(state(roomView(), "online", false));

    expect(role("notice")?.textContent).toBe("Rakibin bağlantısı koptu. Dönmesi bekleniyor…");
  });

  it("does not say it when there is no opponent yet", () => {
    const { show, role } = newApp();

    show(state(roomView({ opponentName: undefined, game: placing() }), "online", false));

    expect(role("notice")?.textContent).toBe("");
  });

  it("does not blame the opponent when it is the player's own connection that is lost", () => {
    const { show, role } = newApp();

    show(state(roomView(), "offline", false));

    expect(role("notice")?.textContent).toBe("");
  });
});
