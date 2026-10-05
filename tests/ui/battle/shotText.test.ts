import { describe, expect, it } from "vitest";
import type { ShotDto } from "../../../src/shared/protocol";
import { shotText } from "../../../src/ui/battle/battleText";

describe("shotText", () => {
  const cell = { row: 1, column: 1 };
  const sunkShip = [cell, { row: 1, column: 2 }, { row: 1, column: 3 }];
  const shot = (changes: Partial<ShotDto>): ShotDto => ({
    shooter: "first",
    cell,
    outcome: "miss",
    wasRandom: false,
    ...changes,
  });

  it.each([
    ["miss", "Iskaladın."],
    ["hit", "Vurdun!"],
  ] as const)("tells the viewer who fired what a %s was", (outcome, text) => {
    expect(shotText(shot({ outcome }), "first", "Ayşe")).toBe(text);
  });

  it("tells the viewer how big the ship he sank was", () => {
    expect(shotText(shot({ outcome: "sunk", sunkShip }), "first", "Ayşe")).toBe("3 karelik gemiyi batırdın!");
  });

  it.each([
    ["miss", "Ayşe ıskaladı."],
    ["hit", "Ayşe vurdu!"],
  ] as const)("tells what the opponent's %s was", (outcome, text) => {
    expect(shotText(shot({ shooter: "second", outcome }), "first", "Ayşe")).toBe(text);
  });

  it("tells the viewer how big the ship he lost was", () => {
    expect(shotText(shot({ shooter: "second", outcome: "sunk", sunkShip }), "first", "Ayşe")).toBe(
      "Ayşe 3 karelik gemini batırdı!",
    );
  });

  it("says when the shot was fired for the player because his time was up", () => {
    expect(shotText(shot({ outcome: "hit", wasRandom: true }), "first", "Ayşe")).toBe(
      "Süre doldu, rastgele atıldı: Vurdun!",
    );
  });

  it("calls an opponent without a name just that", () => {
    expect(shotText(shot({ shooter: "second" }), "first", undefined)).toBe("Rakip ıskaladı.");
  });
});
