import { describe, expect, it } from "vitest";
import type { ShipDefinition } from "../../src/domain/ShipDefinition";
import { FLEETS } from "../../src/domain/fleets";

function countCells(fleet: readonly ShipDefinition[]): number {
  return fleet.reduce((total, definition) => total + definition.shape.length, 0);
}

describe("FLEETS", () => {
  it("classic fleet has 5 ships covering 17 cells", () => {
    expect(FLEETS.classic).toHaveLength(5);
    expect(countCells(FLEETS.classic)).toBe(17);
  });

  it("russian fleet has 10 ships covering 20 cells", () => {
    expect(FLEETS.russian).toHaveLength(10);
    expect(countCells(FLEETS.russian)).toBe(20);
  });

  it("standard fleet has 6 ships covering 24 cells", () => {
    expect(FLEETS.standard).toHaveLength(6);
    expect(countCells(FLEETS.standard)).toBe(24);
  });
});