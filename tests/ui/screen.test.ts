import { describe, expect, it } from "vitest";
import { canFireNow, shownBoard, statusOf } from "../../src/ui/screen";
import { gameView, roomView } from "./fixtures";

describe("shownBoard", () => {
  it("shows the viewer's own waters while ships are placed", () => {
    expect(shownBoard(gameView({ phase: "placing" }))).toBe("own");
  });

  it("shows the enemy waters when it is the viewer's turn", () => {
    expect(shownBoard(gameView({ yourTurn: true }))).toBe("enemy");
  });

  it("shows the own waters while the opponent is firing", () => {
    expect(shownBoard(gameView({ yourTurn: false }))).toBe("own");
  });

  it("shows the enemy waters to the winner", () => {
    expect(shownBoard(gameView({ phase: "finished", winner: "first", yourTurn: false }))).toBe(
      "enemy",
    );
  });

  it("shows the own waters to the loser", () => {
    expect(shownBoard(gameView({ phase: "finished", winner: "second", yourTurn: false }))).toBe(
      "own",
    );
  });
});

describe("statusOf", () => {
  it("waits for an opponent who has not come yet", () => {
    const room = roomView({
      opponentName: undefined,
      game: gameView({ phase: "placing", youAreReady: false, opponentIsReady: false }),
    });

    expect(statusOf(room)).toBe("waiting-for-opponent");
  });

  it("waits for an opponent even when the viewer is ready", () => {
    const room = roomView({
      opponentName: undefined,
      game: gameView({ phase: "placing", youAreReady: true, opponentIsReady: false }),
    });

    expect(statusOf(room)).toBe("waiting-for-opponent");
  });

  it("asks the viewer to arrange the fleet", () => {
    const room = roomView({
      game: gameView({ phase: "placing", youAreReady: false, opponentIsReady: false }),
    });

    expect(statusOf(room)).toBe("arrange-fleet");
  });

  it("tells that the opponent is still arranging", () => {
    const room = roomView({
      game: gameView({ phase: "placing", youAreReady: true, opponentIsReady: false }),
    });

    expect(statusOf(room)).toBe("opponent-is-arranging");
  });

  it("tells whose turn it is", () => {
    expect(statusOf(roomView({ game: gameView({ yourTurn: true }) }))).toBe("your-turn");
    expect(statusOf(roomView({ game: gameView({ yourTurn: false }) }))).toBe("opponent-turn");
  });

  it("tells who won", () => {
    expect(statusOf(roomView({ game: gameView({ phase: "finished", winner: "first" }) }))).toBe(
      "you-won",
    );
    expect(statusOf(roomView({ game: gameView({ phase: "finished", winner: "second" }) }))).toBe(
      "you-lost",
    );
  });
});

describe("canFireNow", () => {
  it("is true in a battle, on the viewer's turn, while online", () => {
    expect(canFireNow(gameView(), true)).toBe(true);
  });

  it("is false while offline", () => {
    expect(canFireNow(gameView(), false)).toBe(false);
  });

  it("is false on the opponent's turn", () => {
    expect(canFireNow(gameView({ yourTurn: false }), true)).toBe(false);
  });

  it("is false when the game is not in battle", () => {
    expect(canFireNow(gameView({ phase: "placing" }), true)).toBe(false);
    expect(canFireNow(gameView({ phase: "finished" }), true)).toBe(false);
  });
});
