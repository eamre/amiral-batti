import { describe, expect, it } from "vitest";
import { Position } from "../../src/domain/Position";
import { fromPlacementDto, toPlacementDto } from "../../src/ui/placementDto";

describe("placement DTOs", () => {
  const placement = { kind: "cruiser", origin: new Position(3, 4), quarterTurns: 1 } as const;
  const dto = { kind: "cruiser", row: 3, column: 4, quarterTurns: 1 } as const;

  it("turns a placement into plain data for the wire", () => {
    expect(toPlacementDto(placement)).toEqual(dto);
  });

  it("turns plain data back into a placement", () => {
    expect(fromPlacementDto(dto)).toEqual(placement);
  });

  it("gets back what it started with", () => {
    expect(fromPlacementDto(toPlacementDto(placement))).toEqual(placement);
  });
});
