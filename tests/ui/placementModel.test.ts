import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";
import { FleetEditor } from "../../src/application/FleetEditor";
import { PlacementSession } from "../../src/application/PlacementSession";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";
import { placementModel } from "../../src/ui/placementModel";

const ship = (length: number, row: number, column: number) =>
  new Ship(ShipShape.straight(length), new Position(row, column));

const sessionOf = (...ships: Ship[]) =>
  PlacementSession.start(
    FleetEditor.of(
      DEFAULT_GAME_SETTINGS,
      ships.map((one) => ({ kind: "boat", ship: one })),
    ),
  );

const looks = (session: PlacementSession) => placementModel(session).ships.map((one) => one.look);

describe("placementModel", () => {
  it("is as big as the board", () => {
    expect(placementModel(sessionOf(ship(3, 0, 0))).size).toBe(10);
  });

  it("carries the cells of every ship", () => {
    const model = placementModel(sessionOf(ship(2, 4, 4)));

    expect(model.ships[0]!.cells).toEqual([
      { row: 4, column: 4 },
      { row: 4, column: 5 },
    ]);
  });

  it("shows ships that stand where they should as afloat", () => {
    expect(looks(sessionOf(ship(3, 0, 0), ship(2, 5, 5)))).toEqual(["afloat", "afloat"]);
  });

  it("shows ships that lie on each other as misplaced", () => {
    expect(looks(sessionOf(ship(3, 0, 0), ship(2, 0, 2)))).toEqual(["misplaced", "misplaced"]);
  });

  it("shows ships that touch as misplaced when touching is not allowed", () => {
    expect(looks(sessionOf(ship(3, 0, 0), ship(2, 1, 0)))).toEqual(["misplaced", "misplaced"]);
  });

  it("lifts the ship that is being dragged to a good place", () => {
    const session = sessionOf(ship(3, 0, 0), ship(2, 5, 5)).press({ row: 0.5, column: 0.5 }, 0.3).drag({ row: 3.5, column: 0.5 });

    expect(looks(session)).toEqual(["lifted", "afloat"]);
  });

  it("shows the dragged ship as misplaced over a bad place, and the ship it hits too", () => {
    const session = sessionOf(ship(3, 0, 0), ship(2, 5, 5)).press({ row: 0.5, column: 0.5 }, 0.3).drag({ row: 5.5, column: 5.5 });

    expect(looks(session)).toEqual(["misplaced", "misplaced"]);
  });
});
