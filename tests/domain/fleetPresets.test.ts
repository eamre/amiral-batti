import { describe, expect, it } from "vitest";
import type { ShipDefinition } from "../../src/domain/ShipDefinition";
import { FLEET_PRESET_IDS, FLEET_PRESETS } from "../../src/domain/fleetPresets";

function countCells(fleet: readonly ShipDefinition[]): number {
  return fleet.reduce(
    (total, definition) => total + definition.shape.length,
    0,
  );
}

describe("FLEET_PRESETS", () => {
  it("classic fleet has 5 ships covering 17 cells", () => {
    expect(FLEET_PRESETS.classic).toHaveLength(5);
    expect(countCells(FLEET_PRESETS.classic)).toBe(17);
  });

  it("russian fleet has 10 ships covering 20 cells", () => {
    expect(FLEET_PRESETS.russian).toHaveLength(10);
    expect(countCells(FLEET_PRESETS.russian)).toBe(20);
  });

  it("standard fleet has 6 ships covering 24 cells", () => {
    expect(FLEET_PRESETS.standard).toHaveLength(6);
    expect(countCells(FLEET_PRESETS.standard)).toBe(24);
  });

  it("has a definition for every preset id and no other", () => {
    expect([...FLEET_PRESET_IDS].sort()).toEqual(Object.keys(FLEET_PRESETS).sort());
  });
});
