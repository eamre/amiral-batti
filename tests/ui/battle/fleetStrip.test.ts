// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createFleetStrip } from "../../../src/ui/battle/fleetStrip";
import { enemyFleetStatus } from "../../../src/ui/battle/fleetStatus";
import { gameView } from "../fixtures";

const strip = (changes = {}) => createFleetStrip(enemyFleetStatus(gameView(changes)));
const boatSunk = { sunkEnemyShips: [[{ row: 4, column: 4 }, { row: 4, column: 5 }]] };

describe("createFleetStrip", () => {
  it("shows one ship for every ship of the fleet", () => {
    expect(strip().querySelectorAll(".fleet__ship")).toHaveLength(5);
  });

  it("shows how many ships are left out of how many there were", () => {
    expect(strip(boatSunk).querySelector(".fleet__count")?.textContent).toBe("4 / 5");
  });

  it("marks only the ships that have sunk", () => {
    expect(strip(boatSunk).querySelectorAll(".fleet__ship--sunk")).toHaveLength(1);
  });

  it("is named for the enemy fleet", () => {
    expect(strip().getAttribute("aria-label")).toBe("Düşman filosu");
  });

  it("names every ship, and says which one has sunk", () => {
    const labels = Array.from(strip(boatSunk).querySelectorAll(".fleet__ship")).map((ship) =>
      ship.getAttribute("aria-label"),
    );

    expect(labels).toEqual(["Uçak gemisi", "Kruvazör", "Denizaltı", "Muhrip", "Bot, battı"]);
  });

  it("sizes each ship by the cells it covers", () => {
    const [carrier] = Array.from(strip().querySelectorAll(".fleet__ship"));

    expect(carrier?.getAttribute("viewBox")).toBe("0 0 5 1");
  });
});
