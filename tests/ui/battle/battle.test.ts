// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import type { RoomViewDto, ShotDto } from "../../../src/shared/protocol";
import { createBattle } from "../../../src/ui/battle/battle";
import { gameView, roomView } from "../fixtures";

function battle(room: RoomViewDto = roomView()) {
  let now = 1_000;
  const delayed: (() => void)[] = [];
  const callbacks = { onFire: vi.fn(), onRematch: vi.fn() };
  const view = createBattle({ now: () => now, schedule: (action) => delayed.push(action), ...callbacks });
  view.update(room, now);

  const find = (role: string) => view.element.querySelector<HTMLElement>(`[data-role=${role}]`);
  const board = () => view.element.querySelector(".board");

  return {
    view,
    callbacks,
    find,
    boardName: () => board()?.getAttribute("aria-label"),
    targets: () => view.element.querySelectorAll(".target").length,
    timePasses: (seconds: number) => {
      now += seconds * 1000;
      view.tick();
    },
    delayIsOver: () => delayed.splice(0).forEach((action) => action()),
    update: (next: RoomViewDto) => view.update(next, now),
  };
}

const opponentsTurn = () => roomView({ game: gameView({ yourTurn: false }) });
const finished = (changes: Partial<RoomViewDto> = {}, winner: "first" | "second" = "first") =>
  roomView({
    game: gameView({ phase: "finished", winner, yourTurn: false, secondsLeft: undefined, wins: { first: 1, second: 0 } }),
    ...changes,
  });

describe("createBattle: the board", () => {
  it("sits in a slot that gives way when the window is short, whichever board it is", () => {
    const { view, delayIsOver, update } = battle();
    const inSlot = () => view.element.querySelector(".board-slot > .board") !== null;

    expect(inSlot()).toBe(true);
    update(opponentsTurn());
    delayIsOver();
    expect(inSlot()).toBe(true);
  });
});

describe("createBattle: whose turn it is", () => {
  it("says it is the viewer's turn", () => {
    expect(battle().find("status")?.textContent).toBe("Sıra sende — ateş et!");
  });

  it("says it is the opponent's turn, by name", () => {
    expect(battle(opponentsTurn()).find("status")?.textContent).toBe("Ayse ateş ediyor…");
  });

  it("shows the enemy waters, with targets, on the viewer's turn", () => {
    const { boardName, targets } = battle();

    expect(boardName()).toBe("Düşman suları");
    expect(targets()).toBeGreaterThan(0);
  });

  it("shows the own fleet, with no targets, on the opponent's turn", () => {
    const { boardName, targets } = battle(opponentsTurn());

    expect(boardName()).toBe("Filon");
    expect(targets()).toBe(0);
  });
});

describe("createBattle: the board changes after a moment", () => {
  it("keeps the enemy waters for a moment when the turn passes, but takes the targets away at once", () => {
    const { update, boardName, targets, find } = battle();

    update(opponentsTurn());

    expect(find("status")?.textContent).toBe("Ayse ateş ediyor…");
    expect(boardName()).toBe("Düşman suları");
    expect(targets()).toBe(0);
  });

  it("then shows the own fleet", () => {
    const { update, boardName, delayIsOver } = battle();
    update(opponentsTurn());

    delayIsOver();

    expect(boardName()).toBe("Filon");
  });
});

describe("createBattle: firing", () => {
  it("fires at the cell that was clicked", () => {
    const { view, callbacks } = battle();

    view.element
      .querySelector('.target[data-row="2"][data-column="3"]')
      ?.dispatchEvent(new Event("click"));

    expect(callbacks.onFire).toHaveBeenCalledWith({ row: 2, column: 3 });
  });

  it("cannot fire while offline", () => {
    const { view, targets } = battle();

    view.setOnline(false);

    expect(targets()).toBe(0);
  });

  it("can fire again when the connection is back", () => {
    const { view, targets } = battle();
    view.setOnline(false);

    view.setOnline(true);

    expect(targets()).toBeGreaterThan(0);
  });
});

describe("createBattle: the clock", () => {
  it("shows the seconds the server said were left", () => {
    expect(battle().find("timer")?.textContent).toBe("⏱ 20");
  });

  it("counts down on its own between messages", () => {
    const { find, timePasses } = battle();

    timePasses(3);

    expect(find("timer")?.textContent).toBe("⏱ 17");
  });

  it("turns urgent in the last seconds", () => {
    const { find, timePasses } = battle();
    expect(find("timer")?.classList.contains("timer--urgent")).toBe(false);

    timePasses(16);

    expect(find("timer")?.classList.contains("timer--urgent")).toBe(true);
  });

  it("starts over when the server sends a new turn", () => {
    const { find, timePasses, update } = battle();
    timePasses(10);

    update(roomView({ game: gameView({ secondsLeft: 20 }) }));

    expect(find("timer")?.textContent).toBe("⏱ 20");
  });

  it("shows nothing when the game is over", () => {
    expect(battle(finished()).find("timer")?.textContent).toBe("");
  });
});

describe("createBattle: the last shot", () => {
  const shot: ShotDto = {
    shooter: "first",
    cell: { row: 1, column: 1 },
    outcome: "hit",
    wasRandom: false,
  };

  it("says nothing before a shot has been fired", () => {
    expect(battle().find("message")?.textContent).toBe("");
  });

  it("tells what the shot did", () => {
    const { view, find } = battle();

    view.showShot(shot);

    expect(find("message")?.textContent).toBe("Vurdun!");
  });

  it("keeps telling it when the room changes", () => {
    const { view, find, update } = battle();
    view.showShot(shot);

    update(opponentsTurn());

    expect(find("message")?.textContent).toBe("Vurdun!");
  });
});

describe("createBattle: the ping of a shot", () => {
  const at = (changes: Partial<ShotDto>): ShotDto => ({
    shooter: "first",
    cell: { row: 1, column: 2 },
    outcome: "miss",
    wasRandom: false,
    ...changes,
  });
  const rings = (view: { element: HTMLElement }) => view.element.querySelectorAll(".ping");

  it("rings the cell the viewer shot at, on the enemy waters", () => {
    const { view } = battle();

    view.showShot(at({ shooter: "first" }));

    const ring = view.element.querySelector(".ping");
    expect(rings(view)).toHaveLength(1);
    expect(ring?.getAttribute("cx")).toBe("2.5");
    expect(ring?.getAttribute("cy")).toBe("1.5");
  });

  it("rings the cell the opponent shot at, on the viewer's own waters", () => {
    const { view, update, delayIsOver, boardName } = battle();
    update(opponentsTurn());
    delayIsOver();

    view.showShot(at({ shooter: "second" }));

    expect(boardName()).toBe("Filon");
    expect(rings(view)).toHaveLength(1);
  });

  it("does not ring a shot whose board is not on the screen", () => {
    const { view } = battle();

    view.showShot(at({ shooter: "second" }));

    expect(rings(view)).toHaveLength(0);
  });

  it("marks a hit and a sunk ship as hits, and a miss as water", () => {
    const hit = battle();
    const sunk = battle();
    const miss = battle();

    hit.view.showShot(at({ outcome: "hit" }));
    sunk.view.showShot(at({ outcome: "sunk" }));
    miss.view.showShot(at({ outcome: "miss" }));

    expect(hit.view.element.querySelector(".ping--hit")).not.toBeNull();
    expect(sunk.view.element.querySelector(".ping--hit")).not.toBeNull();
    expect(miss.view.element.querySelector(".ping--hit")).toBeNull();
  });

  it("goes away after a moment", () => {
    const { view, delayIsOver } = battle();
    view.showShot(at({}));

    delayIsOver();

    expect(rings(view)).toHaveLength(0);
  });

  it("does not take away the ring of a newer shot when the older one is over", () => {
    const later: (() => void)[] = [];
    const view = createBattle({ now: () => 1_000, schedule: (action) => later.push(action), onFire: vi.fn(), onRematch: vi.fn() });
    view.update(roomView(), 1_000);
    view.showShot(at({ cell: { row: 0, column: 0 } }));
    view.showShot(at({ cell: { row: 5, column: 5 } }));

    later[0]?.();

    expect(rings(view)).toHaveLength(1);
    expect(view.element.querySelector(".ping")?.getAttribute("cx")).toBe("5.5");
  });
});

describe("createBattle: the enemy fleet", () => {
  it("shows which ships are still afloat", () => {
    const { view } = battle();

    expect(view.element.querySelectorAll(".fleet__ship")).toHaveLength(5);
  });
});

describe("createBattle: the score", () => {
  it("shows nobody ahead before a round has been won", () => {
    expect(battle().find("score")).toBeNull();
  });

  it("shows the wins of both when there have been some", () => {
    const room = roomView({ game: gameView({ wins: { first: 2, second: 1 } }) });

    expect(battle(room).find("score")?.textContent).toBe("Sen 2 – 1 Ayse");
  });
});

describe("createBattle: after the game", () => {
  it("says who won", () => {
    expect(battle(finished()).find("status")?.textContent).toBe("Kazandın!");
    expect(battle(finished({}, "second")).find("status")?.textContent).toBe("Kaybettin.");
  });

  it("offers a rematch only when the game is over", () => {
    expect(battle().find("rematch")).toBeNull();
    expect(battle(finished()).find("rematch")?.textContent).toBe("Tekrar oyna");
  });

  it("asks for the rematch when the button is pressed", () => {
    const { find, callbacks } = battle(finished());

    find("rematch")?.click();

    expect(callbacks.onRematch).toHaveBeenCalledTimes(1);
  });

  it("waits for the opponent once he has asked", () => {
    const rematch = battle(finished({ youWantRematch: true })).find("rematch") as HTMLButtonElement;

    expect(rematch.textContent).toBe("Rakip bekleniyor…");
    expect(rematch.disabled).toBe(true);
  });

  it("offers to accept when the opponent has asked first", () => {
    expect(battle(finished({ opponentWantsRematch: true })).find("rematch")?.textContent).toBe("Rövanşı kabul et");
  });
});

describe("createBattle: leaving", () => {
  it("has no leave button of its own: the page header has one for every screen", () => {
    expect(battle().find("leave")).toBeNull();
  });
});

describe("createBattle: the fleets after the game", () => {
  const revealed = [{ cells: [{ row: 2, column: 2 }, { row: 2, column: 3 }], quarterTurns: 0 }];
  const over = () => {
    const room = finished();
    return { ...room, game: { ...room.game, revealedEnemyShips: revealed } };
  };

  it("offers the button once the game is over", () => {
    expect(battle(over()).find("fleets")?.hidden).toBe(false);
  });

  it("offers nothing during the battle", () => {
    expect(battle().find("fleets")?.hidden).toBe(true);
  });

  it("keeps the dialog open when the room is updated, as a rematch vote would", () => {
    const { find, update } = battle(over());

    find("fleets-open")?.click();
    update({ ...over(), opponentWantsRematch: true });

    expect((find("fleets-dialog") as HTMLDialogElement).open).toBe(true);
  });
});
