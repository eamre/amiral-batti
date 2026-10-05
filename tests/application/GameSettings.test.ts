import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";

describe("DEFAULT_GAME_SETTINGS", () => {
  it("plays on a board of 10 by 10", () => {
    expect(DEFAULT_GAME_SETTINGS.boardSize).toBe(10);
  });

  it("gives each turn 20 seconds", () => {
    expect(DEFAULT_GAME_SETTINGS.turnSeconds).toBe(20);
  });

  it("is the classic fleet, with ships kept apart", () => {
    expect(DEFAULT_GAME_SETTINGS.fleetPreset).toBe("classic");
    expect(DEFAULT_GAME_SETTINGS.allowTouching).toBe(false);
  });
});
