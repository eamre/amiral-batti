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
