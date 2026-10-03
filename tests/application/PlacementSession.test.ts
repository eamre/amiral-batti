import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";
import { FleetEditor } from "../../src/application/FleetEditor";
import { PlacementSession } from "../../src/application/PlacementSession";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";

const THRESHOLD = 0.3;

const at = (row: number, column: number) => ({ row, column });

/** A three-cell submarine lying at the top left and a two-cell boat in the middle of the board. */
function newSession(): PlacementSession {
  const editor = FleetEditor.of(DEFAULT_GAME_SETTINGS, [
    { kind: "submarine", ship: new Ship(ShipShape.straight(3), new Position(0, 0)) },
    { kind: "boat", ship: new Ship(ShipShape.straight(2), new Position(5, 5)) },
  ]);
  return PlacementSession.start(editor);
}

function cellsOf(session: PlacementSession, index: number): string[] {
  return session.editor.ships[index]!.ship.cells.map((cell) => `${cell.row},${cell.column}`).sort();
}

describe("PlacementSession: a tap", () => {
  it("turns the ship that was touched", () => {
    const session = newSession().press(at(0.5, 1.5), THRESHOLD).release(at(0.5, 1.5));

    expect(cellsOf(session, 0)).toEqual(["0,0", "1,0", "2,0"]);
  });

  it("is still a tap when the finger slipped a little", () => {
    const session = newSession()
      .press(at(0.5, 1.5), THRESHOLD)
      .drag(at(0.55, 1.5))
      .release(at(0.55, 1.5));

    expect(cellsOf(session, 0)).toEqual(["0,0", "1,0", "2,0"]);
  });

  it("does nothing on open water", () => {
    const start = newSession();

    const session = start.press(at(8.5, 8.5), THRESHOLD).release(at(8.5, 8.5));

    expect(session.editor).toBe(start.editor);
  });
});

describe("PlacementSession: a drag", () => {
  it("does not start before the finger has moved far enough", () => {
    const session = newSession().press(at(0.5, 1.5), THRESHOLD).drag(at(0.6, 1.5));

    expect(session.draggingIndex).toBeUndefined();
    expect(session.shown).toBe(session.editor);
  });

  it("shows the ship where the finger is, keeping the grabbed cell under it", () => {
    const session = newSession().press(at(0.5, 1.5), THRESHOLD).drag(at(3.5, 4.5));

    const shown = session.shown.ships[0]!.ship.cells.map((cell) => `${cell.row},${cell.column}`).sort();
    expect(shown).toEqual(["3,3", "3,4", "3,5"]);
    expect(session.draggingIndex).toBe(0);
  });

  it("does not move the real fleet until the finger is lifted", () => {
    const session = newSession().press(at(0.5, 1.5), THRESHOLD).drag(at(3.5, 4.5));

    expect(cellsOf(session, 0)).toEqual(["0,0", "0,1", "0,2"]);
  });

  it("moves the ship when the finger is lifted", () => {
    const session = newSession().press(at(0.5, 1.5), THRESHOLD).drag(at(3.5, 4.5)).release(at(3.5, 4.5));

    expect(cellsOf(session, 0)).toEqual(["3,3", "3,4", "3,5"]);
    expect(session.draggingIndex).toBeUndefined();
  });

  it("counts the place where the finger is lifted, even if no move was seen on the way", () => {
    const session = newSession().press(at(0.5, 1.5), THRESHOLD).release(at(3.5, 4.5));

    expect(cellsOf(session, 0)).toEqual(["3,3", "3,4", "3,5"]);
  });

  it("moves the ship that was grabbed, not the first one", () => {
    const session = newSession().press(at(5.5, 5.5), THRESHOLD).drag(at(8.5, 2.5));

    expect(session.draggingIndex).toBe(1);
    expect(session.shown.ships[1]!.ship.cells.map((cell) => `${cell.row},${cell.column}`).sort()).toEqual([
      "8,2",
      "8,3",
    ]);
  });

  it("lets a ship be dropped where it does not fit, and says so", () => {
    const session = newSession().press(at(0.5, 1.5), THRESHOLD).drag(at(5.5, 6.5));

    expect(session.shown.statusOf(0)).toBe("overlaps");
    expect(session.shown.isLegal).toBe(false);
  });

  it("goes back to where it was when it is dropped outside the board", () => {
    const start = newSession();

    const dragged = start.press(at(0.5, 1.5), THRESHOLD).drag(at(-2, -2));
    const released = dragged.release(at(-2, -2));

    expect(dragged.shown).toBe(dragged.editor);
    expect(dragged.draggingIndex).toBeUndefined();
    expect(released.editor).toBe(start.editor);
  });

  it("is forgotten when it is cancelled", () => {
    const start = newSession();

    const session = start.press(at(0.5, 1.5), THRESHOLD).drag(at(3.5, 4.5)).cancel();

    expect(session.editor).toBe(start.editor);
    expect(session.draggingIndex).toBeUndefined();
  });

  it("can be followed by a new one", () => {
    const session = newSession()
      .press(at(0.5, 1.5), THRESHOLD)
      .drag(at(3.5, 4.5))
      .release(at(3.5, 4.5))
      .press(at(3.5, 3.5), THRESHOLD)
      .drag(at(7.5, 0.5));

    expect(session.draggingIndex).toBe(0);
  });
});

describe("PlacementSession: a session never changes", () => {
  it("leaves the session it was called on as it was", () => {
    const start = newSession();

    start.press(at(0.5, 1.5), THRESHOLD).drag(at(3.5, 4.5));

    expect(start.draggingIndex).toBeUndefined();
    expect(start.shown).toBe(start.editor);
  });

  it("ignores moving and lifting when nothing was pressed", () => {
    const start = newSession();

    expect(start.drag(at(3.5, 4.5))).toBe(start);
    expect(start.release(at(3.5, 4.5))).toBe(start);
  });
});
