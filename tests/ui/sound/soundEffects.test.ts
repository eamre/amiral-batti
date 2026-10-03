import { describe, expect, it, vi } from "vitest";
import type { ClientState } from "../../../src/infrastructure/GameClient";
import type { ShotDto } from "../../../src/shared/protocol";
import { createSoundEffects } from "../../../src/ui/sound/soundEffects";
import { gameView, roomView } from "../fixtures";

function newEffects() {
  const player = { play: vi.fn(), unlock: vi.fn() };
  const effects = createSoundEffects(player);
  const show = (room: ReturnType<typeof roomView> | undefined) =>
    effects.stateChanged({ status: "online", opponentOnline: true, room } satisfies ClientState);
  return { player, effects, show };
}

const placing = () => roomView({ game: gameView({ phase: "placing", yourTurn: false, secondsLeft: undefined }) });
const battle = () => roomView();
const finished = (winner: "first" | "second", you: "first" | "second" = "first") =>
  roomView({ game: gameView({ phase: "finished", you, winner, yourTurn: false, secondsLeft: undefined }) });

const shot = (changes: Partial<ShotDto>): ShotDto => ({
  shooter: "first",
  cell: { row: 1, column: 1 },
  outcome: "miss",
  wasRandom: false,
  ...changes,
});

describe("createSoundEffects: shots", () => {
  it.each(["miss", "hit", "sunk"] as const)("plays %s for a shot that is that", (outcome) => {
    const { effects, player } = newEffects();

    effects.shotFired(shot({ outcome }));

    expect(player.play).toHaveBeenCalledExactlyOnceWith(outcome);
  });

  it.each(["first", "second"] as const)("sounds the same whoever fired it (%s)", (shooter) => {
    const { effects, player } = newEffects();

    effects.shotFired(shot({ shooter, outcome: "hit" }));

    expect(player.play).toHaveBeenCalledExactlyOnceWith("hit");
  });
});

describe("createSoundEffects: the end of a game", () => {
  it("plays win when the game ends and the viewer is the winner", () => {
    const { show, player } = newEffects();
    show(battle());

    show(finished("first", "first"));

    expect(player.play).toHaveBeenCalledExactlyOnceWith("win");
  });

  it("plays lose when the game ends and the opponent is the winner", () => {
    const { show, player } = newEffects();
    show(battle());

    show(finished("second", "first"));

    expect(player.play).toHaveBeenCalledExactlyOnceWith("lose");
  });

  it("knows who is who from the point of view of the viewer", () => {
    const { show, player } = newEffects();
    show(battle());

    show(finished("second", "second"));

    expect(player.play).toHaveBeenCalledExactlyOnceWith("win");
  });

  it("says nothing about a game that was already over when the page was opened", () => {
    const { show, player } = newEffects();

    show(finished("first"));

    expect(player.play).not.toHaveBeenCalled();
  });

  it("says nothing about a game the viewer came back to after it ended", () => {
    const { show, player } = newEffects();
    show(battle());
    show(undefined);

    show(finished("first"));

    expect(player.play).not.toHaveBeenCalled();
  });

  it("says it once, however many times the finished game is reported", () => {
    const { show, player } = newEffects();
    show(battle());

    show(finished("first"));
    show(finished("first"));
    show(roomView({ game: finished("first").game, youWantRematch: true }));

    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("says it again for the game after a rematch", () => {
    const { show, player } = newEffects();
    show(battle());
    show(finished("first"));

    show(placing());
    show(battle());
    show(finished("second"));

    expect(player.play.mock.calls).toEqual([["win"], ["lose"]]);
  });

  it("is quiet while the game goes on", () => {
    const { show, player } = newEffects();

    show(placing());
    show(battle());
    show(battle());
    show(undefined);

    expect(player.play).not.toHaveBeenCalled();
  });

  it("is quiet about a finished game that has no winner", () => {
    const { show, player } = newEffects();
    show(battle());

    show(roomView({ game: gameView({ phase: "finished", winner: undefined }) }));

    expect(player.play).not.toHaveBeenCalled();
  });

  it("does not listen for failures, so there is nothing else to call", () => {
    expect(Object.keys(newEffects().effects).sort()).toEqual(["shotFired", "stateChanged"]);
  });
});
