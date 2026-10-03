import { describe, expect, it } from "vitest";
import { FLEET_PRESETS } from "../../src/domain/fleetPresets";
import { SHIP_KINDS } from "../../src/domain/ShipDefinition";

describe("SHIP_KINDS", () => {
  it("contains every kind that a fleet preset uses", () => {
    const usedKinds = Object.values(FLEET_PRESETS).flatMap((fleet) =>
      fleet.map((definition) => definition.kind),
    );

    for (const kind of usedKinds) {
      expect(SHIP_KINDS).toContain(kind);
    }
  });

  it("lists every kind once", () => {
    expect(new Set(SHIP_KINDS).size).toBe(SHIP_KINDS.length);
  });
});
