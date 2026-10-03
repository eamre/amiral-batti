import { describe, expect, it } from "vitest";
import { buildFleet, type ShipPlacement } from "../../src/application/buildFleet";
import { Board } from "../../src/domain/Board";
import { FLEET_PRESETS } from "../../src/domain/fleetPresets";
import { PlacementValidator } from "../../src/domain/PlacementValidator";
import { Position } from "../../src/domain/Position";
import { errorCodeOf } from "./errorCodeOf";

const definitions = FLEET_PRESETS.classic;

function validator(allowTouching = false): PlacementValidator {
  return new PlacementValidator(new Board(10), allowTouching);
}

function classicPlacements(): ShipPlacement[] {
  return [
    { kind: "carrier", origin: new Position(0, 0), quarterTurns: 0 },
    { kind: "cruiser", origin: new Position(2, 0), quarterTurns: 0 },
    { kind: "submarine", origin: new Position(4, 0), quarterTurns: 0 },
    { kind: "destroyer", origin: new Position(6, 0), quarterTurns: 0 },
    { kind: "boat", origin: new Position(8, 0), quarterTurns: 0 },
  ];
}

describe("buildFleet", () => {
  it("builds one ship for every definition", () => {
    const ships = buildFleet(definitions, classicPlacements(), validator());

    expect(ships.map((ship) => ship.cells.length)).toEqual([5, 4, 3, 3, 2]);
  });

  it("puts every ship where its placement says", () => {
    const ships = buildFleet(definitions, classicPlacements(), validator());

    expect(ships[1]?.origin).toEqual(new Position(2, 0));
    expect(ships[1]?.occupies(new Position(2, 3))).toBe(true);
  });

  it("applies the rotation of a placement", () => {
    const placements = classicPlacements();
    placements[4] = { kind: "boat", origin: new Position(7, 9), quarterTurns: 1 };

    const ships = buildFleet(definitions, placements, validator());

    expect(ships[4]?.cells).toEqual([new Position(7, 9), new Position(8, 9)]);
  });

  it("does not care in which order the placements arrive", () => {
    const reversed = classicPlacements().reverse();

    const ships = buildFleet(definitions, reversed, validator());

    expect(ships.map((ship) => ship.cells.length)).toEqual([5, 4, 3, 3, 2]);
  });

  it("matches repeated kinds one by one", () => {
    const russian = FLEET_PRESETS.russian;
    const placements: ShipPlacement[] = [
      { kind: "cruiser", origin: new Position(0, 0), quarterTurns: 0 },
      { kind: "submarine", origin: new Position(2, 0), quarterTurns: 0 },
      { kind: "destroyer", origin: new Position(4, 0), quarterTurns: 0 },
      { kind: "boat", origin: new Position(0, 6), quarterTurns: 0 },
      { kind: "boat", origin: new Position(2, 6), quarterTurns: 0 },
      { kind: "boat", origin: new Position(4, 6), quarterTurns: 0 },
      { kind: "dinghy", origin: new Position(7, 0), quarterTurns: 0 },
      { kind: "dinghy", origin: new Position(7, 2), quarterTurns: 0 },
      { kind: "dinghy", origin: new Position(7, 4), quarterTurns: 0 },
      { kind: "dinghy", origin: new Position(7, 6), quarterTurns: 0 },
    ];

    const ships = buildFleet(russian, placements, validator());

    expect(ships).toHaveLength(10);
  });

  it("rejects a fleet with a missing ship", () => {
    const placements = classicPlacements().slice(1);

    expect(errorCodeOf(() => buildFleet(definitions, placements, validator()))).toBe(
      "wrong-fleet",
    );
  });

  it("rejects a fleet with a ship that does not belong to it", () => {
    const placements = classicPlacements();
    placements[4] = { kind: "dinghy", origin: new Position(8, 0), quarterTurns: 0 };

    expect(errorCodeOf(() => buildFleet(definitions, placements, validator()))).toBe(
      "wrong-fleet",
    );
  });

  it("rejects a ship that sticks out of the board", () => {
    const placements = classicPlacements();
    placements[0] = { kind: "carrier", origin: new Position(0, 7), quarterTurns: 0 };

    expect(errorCodeOf(() => buildFleet(definitions, placements, validator()))).toBe(
      "bad-placement",
    );
  });

  it("rejects ships that overlap", () => {
    const placements = classicPlacements();
    placements[1] = { kind: "cruiser", origin: new Position(0, 2), quarterTurns: 0 };

    expect(errorCodeOf(() => buildFleet(definitions, placements, validator()))).toBe(
      "bad-placement",
    );
  });

  it("rejects ships that touch when touching is not allowed", () => {
    const placements = classicPlacements();
    placements[1] = { kind: "cruiser", origin: new Position(1, 0), quarterTurns: 0 };

    expect(errorCodeOf(() => buildFleet(definitions, placements, validator(false)))).toBe(
      "bad-placement",
    );
  });

  it("accepts ships that touch when touching is allowed", () => {
    const placements = classicPlacements();
    placements[1] = { kind: "cruiser", origin: new Position(1, 0), quarterTurns: 0 };

    expect(buildFleet(definitions, placements, validator(true))).toHaveLength(5);
  });

  it.each([-1, 4, 1.5])("rejects %s quarter turns", (quarterTurns) => {
    const placements = classicPlacements();
    placements[0] = { kind: "carrier", origin: new Position(0, 0), quarterTurns };

    expect(errorCodeOf(() => buildFleet(definitions, placements, validator()))).toBe(
      "bad-placement",
    );
  });
});
