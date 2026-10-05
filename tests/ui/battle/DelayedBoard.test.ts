import { describe, expect, it } from "vitest";
import { DelayedBoard } from "../../../src/ui/battle/DelayedBoard";
import type { BoardSide } from "../../../src/ui/app/screenRules";

/** A scheduler that does nothing until the test says that time has passed. */
function fakeScheduler() {
  const waiting: { action: () => void; delay: number }[] = [];
  return {
    schedule: (action: () => void, delay: number) => waiting.push({ action, delay }),
    waiting,
    timePasses: () => waiting.splice(0).forEach(({ action }) => action()),
  };
}

function delayedBoard() {
  const scheduler = fakeScheduler();
  const shown: BoardSide[] = [];
  const board = new DelayedBoard(900, scheduler.schedule, (side) => shown.push(side));
  return { board, scheduler, shown };
}

describe("DelayedBoard", () => {
  it("shows the first board at once", () => {
    const { board, shown } = delayedBoard();

    board.want("enemy");

    expect(shown).toEqual(["enemy"]);
    expect(board.shown).toBe("enemy");
  });

  it("is showing nothing before it was told anything", () => {
    expect(delayedBoard().board.shown).toBeUndefined();
  });

  it("waits before it changes the board", () => {
    const { board, shown } = delayedBoard();
    board.want("enemy");

    board.want("own");

    expect(board.shown).toBe("enemy");
    expect(shown).toEqual(["enemy"]);
  });

  it("changes the board when the delay is over", () => {
    const { board, scheduler, shown } = delayedBoard();
    board.want("enemy");
    board.want("own");

    scheduler.timePasses();

    expect(board.shown).toBe("own");
    expect(shown).toEqual(["enemy", "own"]);
  });

  it("asks to wait as long as it was told", () => {
    const { board, scheduler } = delayedBoard();
    board.want("enemy");

    board.want("own");

    expect(scheduler.waiting.map((entry) => entry.delay)).toEqual([900]);
  });

  it("does not change at all if the board it shows is wanted again before the delay is over", () => {
    const { board, scheduler, shown } = delayedBoard();
    board.want("enemy");
    board.want("own");
    board.want("enemy");

    scheduler.timePasses();

    expect(board.shown).toBe("enemy");
    expect(shown).toEqual(["enemy"]);
  });

  it("follows the last wish when it changes its mind twice", () => {
    const { board, scheduler } = delayedBoard();
    board.want("enemy");
    board.want("own");
    board.want("enemy");
    board.want("own");

    scheduler.timePasses();

    expect(board.shown).toBe("own");
  });

  it("does nothing when it is told what it already wants", () => {
    const { board, scheduler } = delayedBoard();
    board.want("enemy");

    board.want("enemy");

    expect(scheduler.waiting).toHaveLength(0);
  });

  it("does not schedule a second change for the same wish", () => {
    const { board, scheduler } = delayedBoard();
    board.want("enemy");
    board.want("own");

    board.want("own");

    expect(scheduler.waiting).toHaveLength(1);
  });
});
