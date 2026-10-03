import { describe, expect, it } from "vitest";
import { fleetSummary } from "../../src/ui/fleetSummary";

describe("fleetSummary", () => {
  it.each([
    ["classic", { ships: 5, cells: 17 }],
    ["russian", { ships: 10, cells: 20 }],
    ["standard", { ships: 6, cells: 24 }],
  ] as const)("counts the ships and cells of the %s fleet", (preset, expected) => {
    expect(fleetSummary(preset)).toEqual(expected);
  });
});
