import { describe, expect, it } from "vitest";
import { FleetEditor, type EditorShip } from "../../src/application/FleetEditor";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";
import { FLEET_PRESETS } from "../../src/domain/fleetPresets";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";
import { placementsFrom, seededRandom } from "./fixtures";

const SETTINGS = DEFAULT_GAME_SETTINGS;
const TOUCHING = { ...DEFAULT_GAME_SETTINGS, allowTouching: true };

function boat(row: number, column: number, quarterTurns = 0): EditorShip {
  return { kind: "boat", ship: new Ship(ShipShape.straight(2), new Position(row, column), quarterTurns) };
}

/** The cells of a ship in reading order: a ship turned half way lists its cells the other way round. */
function cellsOf(editor: FleetEditor, index: number): Position[] {
  const cells = editor.ships[index]?.ship.cells ?? [];

  return [...cells].sort((a, b) => a.row - b.row || a.column - b.column);
}

describe("FleetEditor", () => {
  describe("random", () => {
    it("places every ship of the fleet in the order of the preset", () => {
      const editor = FleetEditor.random(SETTINGS, seededRandom(7));

      expect(editor.ships.map((item) => item.kind)).toEqual(
        FLEET_PRESETS.classic.map((definition) => definition.kind),
      );
    });

    it("gives a legal fleet", () => {
      expect(FleetEditor.random(SETTINGS, seededRandom(7)).isLegal).toBe(true);
    });

    it("gives a different fleet every time", () => {
      const random = seededRandom(7);

      const first = FleetEditor.random(SETTINGS, random).toPlacements();
      const second = FleetEditor.random(SETTINGS, random).toPlacements();

      expect(first).not.toEqual(second);
    });

    it("follows the preset of the settings", () => {
      const editor = FleetEditor.random({ ...SETTINGS, fleetPreset: "russian" }, seededRandom(7));

      expect(editor.ships).toHaveLength(10);
    });
  });

  describe("fromPlacements", () => {
    it("rebuilds an editor from placements it gave out", () => {
      const original = FleetEditor.random(SETTINGS, seededRandom(7));

      const rebuilt = FleetEditor.fromPlacements(SETTINGS, original.toPlacements());

      expect(rebuilt?.toPlacements()).toEqual(original.toPlacements());
    });

    it("accepts a legal fleet", () => {
      expect(FleetEditor.fromPlacements(SETTINGS, placementsFrom(0))?.isLegal).toBe(true);
    });

    it("gives nothing for a fleet that is not legal", () => {
      const placements = placementsFrom(0).map((placement, index) =>
        index === 1 ? { ...placement, origin: new Position(1, 0) } : placement,
      );

      expect(FleetEditor.fromPlacements(SETTINGS, placements)).toBeUndefined();
    });

    it("gives nothing for a fleet that has missing ships", () => {
      expect(FleetEditor.fromPlacements(SETTINGS, placementsFrom(0).slice(1))).toBeUndefined();
    });
  });

  describe("statusOf", () => {
    it("is valid for a ship that has room", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(0, 0), boat(5, 5)]);

      expect(editor.statusOf(0)).toBe("valid");
    });

    it("tells that two ships overlap, for both of them", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(0, 0), boat(0, 1)]);

      expect(editor.statusOf(0)).toBe("overlaps");
      expect(editor.statusOf(1)).toBe("overlaps");
    });

    it("tells that two ships touch when touching is not allowed", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(0, 0), boat(1, 2)]);

      expect(editor.statusOf(0)).toBe("touches");
    });

    it("lets ships touch when touching is allowed", () => {
      const editor = FleetEditor.of(TOUCHING, [boat(0, 0), boat(1, 2)]);

      expect(editor.statusOf(0)).toBe("valid");
    });

    it("refuses an index that does not exist", () => {
      expect(() => FleetEditor.of(SETTINGS, [boat(0, 0)]).statusOf(3)).toThrow(RangeError);
    });
  });

  describe("isLegal", () => {
    it("is true when every ship is valid", () => {
      expect(FleetEditor.of(SETTINGS, [boat(0, 0), boat(5, 5)]).isLegal).toBe(true);
    });

    it("is false when a single ship is not", () => {
      expect(FleetEditor.of(SETTINGS, [boat(0, 0), boat(5, 5), boat(5, 6)]).isLegal).toBe(false);
    });
  });

  describe("moveTo", () => {
    it("moves one ship and leaves the others alone", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(0, 0), boat(5, 5)]);

      const moved = editor.moveTo(0, new Position(2, 3));

      expect(cellsOf(moved, 0)).toEqual([new Position(2, 3), new Position(2, 4)]);
      expect(cellsOf(moved, 1)).toEqual(cellsOf(editor, 1));
    });

    it("does not change the original editor", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(0, 0)]);

      editor.moveTo(0, new Position(4, 4));

      expect(cellsOf(editor, 0)[0]).toEqual(new Position(0, 0));
    });

    it.each([
      ["bottom", new Position(12, 3), new Position(9, 3)],
      ["right", new Position(3, 14), new Position(3, 8)],
      ["top", new Position(-2, 3), new Position(0, 3)],
      ["left", new Position(3, -5), new Position(3, 0)],
    ])("pulls a ship back inside when it sticks out of the %s", (_side, wanted, expected) => {
      const editor = FleetEditor.of(SETTINGS, [boat(5, 5)]);

      expect(editor.moveTo(0, wanted).ships[0]?.ship.origin).toEqual(expected);
    });

    it("lets a ship be dropped where it does not fit; the status tells", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(0, 0), boat(5, 5)]);

      const moved = editor.moveTo(1, new Position(0, 1));

      expect(moved.statusOf(1)).toBe("overlaps");
      expect(moved.isLegal).toBe(false);
    });
  });

  describe("rotate", () => {
    it("turns a horizontal ship upright and keeps its top-left corner", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(2, 3)]);

      const rotated = editor.rotate(0);

      expect(cellsOf(rotated, 0)).toEqual([new Position(2, 3), new Position(3, 3)]);
    });

    it("turns it back with the next tap", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(2, 3)]);

      const rotated = editor.rotate(0).rotate(0);

      expect(cellsOf(rotated, 0)).toEqual([new Position(2, 3), new Position(2, 4)]);
    });

    it("pulls a ship back inside when turning would push it out of the board", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(9, 4)]);

      const rotated = editor.rotate(0);

      expect(cellsOf(rotated, 0)).toEqual([new Position(8, 4), new Position(9, 4)]);
    });

    it("does not change the original editor", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(2, 3)]);

      editor.rotate(0);

      expect(cellsOf(editor, 0)).toEqual([new Position(2, 3), new Position(2, 4)]);
    });

    it("leaves a ship that looks the same from every side alone", () => {
      const dinghy: EditorShip = {
        kind: "dinghy",
        ship: new Ship(ShipShape.straight(1), new Position(4, 4)),
      };
      const editor = FleetEditor.of(SETTINGS, [dinghy]);

      expect(cellsOf(editor.rotate(0), 0)).toEqual([new Position(4, 4)]);
    });

    it("gives all four ways of a T-shaped ship in turn", () => {
      const tanker: EditorShip = {
        kind: "tanker",
        ship: new Ship(ShipShape.tShaped(), new Position(3, 3)),
      };
      let editor = FleetEditor.of(TOUCHING, [tanker]);
      const seen = new Set<string>();

      for (let tap = 0; tap < 4; tap++) {
        seen.add(cellsOf(editor, 0).map((cell) => `${cell.row},${cell.column}`).join(" "));
        editor = editor.rotate(0);
      }

      expect(seen.size).toBe(4);
      expect(cellsOf(editor, 0)).toEqual([
        new Position(3, 3),
        new Position(4, 3),
        new Position(4, 4),
        new Position(5, 3),
      ]);
    });

    it("skips a way of standing that would collide, when another way is free", () => {
      const tanker: EditorShip = {
        kind: "tanker",
        ship: new Ship(ShipShape.tShaped(), new Position(3, 3)),
      };
      const dinghy: EditorShip = {
        kind: "dinghy",
        ship: new Ship(ShipShape.straight(1), new Position(3, 5)),
      };
      const editor = FleetEditor.of(TOUCHING, [tanker, dinghy]);

      const rotated = editor.rotate(0);

      expect(rotated.statusOf(0)).toBe("valid");
      expect(cellsOf(rotated, 0)).not.toEqual(cellsOf(editor, 0));
    });

    it("turns anyway when every other way collides; the status tells", () => {
      const blocker = boat(1, 0);
      const editor = FleetEditor.of(SETTINGS, [boat(0, 0), blocker]);

      const rotated = editor.rotate(0);

      expect(cellsOf(rotated, 0)).toEqual([new Position(0, 0), new Position(1, 0)]);
      expect(rotated.statusOf(0)).toBe("overlaps");
    });
  });

  describe("shipAt", () => {
    it("finds the ship that stands on a cell", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(0, 0), boat(5, 5)]);

      expect(editor.shipAt(new Position(5, 6))).toBe(1);
    });

    it("finds nothing on an empty cell", () => {
      expect(FleetEditor.of(SETTINGS, [boat(0, 0)]).shipAt(new Position(9, 9))).toBeUndefined();
    });
  });

  describe("toPlacements", () => {
    it("describes every ship by kind, corner and turns", () => {
      const editor = FleetEditor.of(SETTINGS, [boat(2, 3, 1)]);

      expect(editor.toPlacements()).toEqual([
        { kind: "boat", origin: new Position(2, 3), quarterTurns: 1 },
      ]);
    });
  });
});
