// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { FleetEditor } from "../../src/application/FleetEditor";
import { DEFAULT_GAME_SETTINGS } from "../../src/application/GameSettings";
import { Position } from "../../src/domain/Position";
import { Ship } from "../../src/domain/Ship";
import { ShipShape } from "../../src/domain/ShipShape";
import { createPlacement } from "../../src/ui/placement";
import { placementText } from "../../src/ui/texts";

const ship = (length: number, row: number, column: number) =>
  new Ship(ShipShape.straight(length), new Position(row, column));

const editorOf = (...ships: Ship[]) =>
  FleetEditor.of(
    DEFAULT_GAME_SETTINGS,
    ships.map((one) => ({ kind: "boat" as const, ship: one })),
  );

/** A deterministic stream of numbers in [0, 1). */
function stream(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function placement(initial: FleetEditor) {
  const callbacks = { changed: vi.fn(), ready: vi.fn() };
  const view = createPlacement({ initial, random: stream(7), ...callbacks });
  const board = view.element.querySelector<SVGSVGElement>(".board")!;

  // The board is 100 pixels wide for 10 cells, so a cell is 10 pixels.
  Object.defineProperties(board, {
    getBoundingClientRect: { value: () => ({ left: 0, top: 0, width: 100, height: 100 }) },
    setPointerCapture: { value: () => undefined },
  });

  const find = <T extends HTMLElement>(role: string) => view.element.querySelector<T>(`[data-role=${role}]`)!;
  const pointer = (type: string, x: number, y: number) =>
    board.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true }));

  return {
    view,
    callbacks,
    board,
    readyButton: find<HTMLButtonElement>("ready"),
    shuffleButton: find<HTMLButtonElement>("shuffle"),
    hint: find<HTMLElement>("hint"),
    pointer,
    shipCount: () => board.querySelectorAll(".ship").length,
  };
}

const fits = () => editorOf(ship(3, 0, 0), ship(2, 5, 5));
const onTopOfEachOther = () => editorOf(ship(3, 0, 0), ship(2, 0, 2));

describe("createPlacement: the board", () => {
  it("shows every ship of the fleet", () => {
    expect(placement(fits()).shipCount()).toBe(2);
  });

  it("turns a ship that is tapped", () => {
    const { pointer, callbacks } = placement(fits());

    pointer("pointerdown", 5, 5);
    pointer("pointerup", 5, 5);

    const turned = callbacks.changed.mock.calls[0]![0] as FleetEditor;
    expect(turned.ships[0]!.ship.cells.map((cell) => `${cell.row},${cell.column}`).sort()).toEqual([
      "0,0",
      "1,0",
      "2,0",
    ]);
  });

  it("moves a ship that is dragged", () => {
    const { pointer, callbacks } = placement(fits());

    pointer("pointerdown", 5, 5);
    pointer("pointermove", 65, 25);
    pointer("pointerup", 65, 25);

    const moved = callbacks.changed.mock.calls[0]![0] as FleetEditor;
    expect(moved.ships[0]!.ship.origin).toEqual(new Position(2, 6));
  });

  it("does not report a change while the ship is still being dragged", () => {
    const { pointer, callbacks } = placement(fits());

    pointer("pointerdown", 5, 5);
    pointer("pointermove", 65, 25);

    expect(callbacks.changed).not.toHaveBeenCalled();
  });

  it("shows the ship being dragged lifted", () => {
    const { pointer, board } = placement(fits());

    pointer("pointerdown", 5, 5);
    pointer("pointermove", 65, 25);

    expect(board.querySelectorAll(".ship--lifted")).toHaveLength(1);
  });

  it("leaves the ships alone while the pointer only passes over the board", () => {
    const { pointer, board } = placement(fits());
    const before = board.querySelector(".ship");

    pointer("pointermove", 45, 45);

    expect(board.querySelector(".ship")).toBe(before);
  });

  it("reports nothing when open water is touched", () => {
    const { pointer, callbacks } = placement(fits());

    pointer("pointerdown", 85, 85);
    pointer("pointerup", 85, 85);

    expect(callbacks.changed).not.toHaveBeenCalled();
  });

  it("forgets a drag that the system cancelled", () => {
    const { pointer, callbacks, board } = placement(fits());

    pointer("pointerdown", 5, 5);
    pointer("pointermove", 65, 25);
    pointer("pointercancel", 65, 25);

    expect(callbacks.changed).not.toHaveBeenCalled();
    expect(board.querySelectorAll(".ship--lifted")).toHaveLength(0);
  });
});

describe("createPlacement: being ready", () => {
  it("lets the player say he is ready when the fleet stands well", () => {
    expect(placement(fits()).readyButton.disabled).toBe(false);
  });

  it("does not while ships lie on each other, and asks to fix them", () => {
    const { readyButton, hint, board } = placement(onTopOfEachOther());

    expect(readyButton.disabled).toBe(true);
    expect(hint.textContent).toBe(placementText.fix);
    expect(board.querySelectorAll(".ship--misplaced")).toHaveLength(2);
  });

  it("allows it again once the fleet has been put right", () => {
    const { pointer, readyButton, hint } = placement(onTopOfEachOther());

    pointer("pointerdown", 25, 5);
    pointer("pointermove", 65, 65);
    pointer("pointerup", 65, 65);

    expect(readyButton.disabled).toBe(false);
    expect(hint.textContent).toBe(placementText.hint);
  });

  it("hands over the placements when the button is pressed", () => {
    const { readyButton, callbacks } = placement(fits());

    readyButton.click();

    expect(callbacks.ready).toHaveBeenCalledWith([
      { kind: "boat", origin: new Position(0, 0), quarterTurns: 0 },
      { kind: "boat", origin: new Position(5, 5), quarterTurns: 0 },
    ]);
  });

  it("cannot be said while offline", () => {
    const { view, readyButton } = placement(fits());

    view.setOnline(false);

    expect(readyButton.disabled).toBe(true);
  });

  it("can be said again when the connection is back", () => {
    const { view, readyButton } = placement(fits());
    view.setOnline(false);

    view.setOnline(true);

    expect(readyButton.disabled).toBe(false);
  });

});

describe("createPlacement: shuffling", () => {
  it("deals a new, legal fleet and reports it", () => {
    const { shuffleButton, callbacks, shipCount } = placement(FleetEditor.random(DEFAULT_GAME_SETTINGS, stream(1)));

    shuffleButton.click();

    const dealt = callbacks.changed.mock.calls[0]![0] as FleetEditor;
    expect(dealt.ships).toHaveLength(5);
    expect(dealt.isLegal).toBe(true);
    expect(shipCount()).toBe(5);
  });

  it("deals a fleet different from the one before", () => {
    const first = FleetEditor.random(DEFAULT_GAME_SETTINGS, stream(1));
    const { shuffleButton, callbacks } = placement(first);

    shuffleButton.click();

    const dealt = callbacks.changed.mock.calls[0]![0] as FleetEditor;
    expect(dealt.toPlacements()).not.toEqual(first.toPlacements());
  });
});
