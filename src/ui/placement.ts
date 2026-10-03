import { FleetEditor } from "../application/FleetEditor";
import type { ShipPlacement } from "../application/buildFleet";
import { PlacementSession } from "../application/PlacementSession";
import type { RandomSource } from "../domain/random";
import { h } from "./dom/h";
import { createPlacementBoard } from "./placementBoard";
import { placementModel } from "./placementModel";
import { pointToBoard } from "./pointToBoard";
import { placementText } from "./texts";

/** How far a finger must travel, in pixels, before touching a ship becomes dragging it. */
const DRAG_THRESHOLD_PIXELS = 8;

export interface PlacementOptions {
  readonly initial: FleetEditor;
  readonly random: RandomSource;
  /** Called when the arranged fleet has changed (a ship was dropped or turned, or the fleet was shuffled). */
  readonly changed: (editor: FleetEditor) => void;
  readonly ready: (placements: ShipPlacement[]) => void;
}

export interface PlacementView {
  readonly element: HTMLElement;
  setOnline(online: boolean): void;
  /** Once the player is ready the fleet is locked. */
  setReady(ready: boolean): void;
}

/** The screen where the player arranges his fleet: the board, a hint, and the shuffle and ready buttons. */
export function createPlacement(options: PlacementOptions): PlacementView {
  const { settings } = options.initial;
  const size = settings.boardSize;
  let session = PlacementSession.start(options.initial);
  let online = true;
  let isReady = false;

  const board = createPlacementBoard(size, placementText.board);
  const hint = h("p", { class: "hint hint--center", attrs: { "data-role": "hint" } });
  const shuffleButton = h(
    "button",
    { class: "button", attrs: { type: "button", "data-role": "shuffle" }, on: { click: shuffle } },
    placementText.shuffle,
  );
  const readyButton = h(
    "button",
    {
      class: "button button--primary",
      attrs: { type: "button", "data-role": "ready" },
      on: { click: () => options.ready(session.editor.toPlacements()) },
    },
    placementText.ready,
  );

  function shuffle(): void {
    session = PlacementSession.start(FleetEditor.random(settings, options.random));
    render();
    options.changed(session.editor);
  }

  function render(): void {
    board.show(placementModel(session));
    hint.textContent = session.editor.isLegal ? placementText.hint : placementText.fix;
    readyButton.disabled = isReady || !online || !session.editor.isLegal;
    shuffleButton.disabled = isReady;
  }

  function boardPoint(event: PointerEvent) {
    return pointToBoard({ x: event.clientX, y: event.clientY }, board.element.getBoundingClientRect(), size);
  }

  function thresholdInCells(): number {
    const cellPixels = board.element.getBoundingClientRect().width / size;
    return DRAG_THRESHOLD_PIXELS / cellPixels;
  }

  function dragEnded(next: PlacementSession): void {
    const before = session.editor;
    session = next;
    render();

    if (session.editor !== before) {
      options.changed(session.editor);
    }
  }

  board.element.addEventListener("pointerdown", (event) => {
    if (isReady) {
      return;
    }
    event.preventDefault();
    // Keeps the events coming to the board even when the finger slides off it.
    board.element.setPointerCapture(event.pointerId);
    session = session.press(boardPoint(event), thresholdInCells());
  });
  board.element.addEventListener("pointermove", (event) => {
    const next = session.drag(boardPoint(event));

    // A mouse moves over the board all the time without holding anything: nothing to redraw then.
    if (next !== session) {
      session = next;
      render();
    }
  });
  board.element.addEventListener("pointerup", (event) => dragEnded(session.release(boardPoint(event))));
  board.element.addEventListener("pointercancel", () => dragEnded(session.cancel()));

  render();

  return {
    element: h(
      "div",
      { class: "screen" },
      board.element,
      hint,
      h("div", { class: "row" }, shuffleButton, readyButton),
    ),
    setOnline(isOnline) {
      online = isOnline;
      render();
    },
    setReady(ready) {
      isReady = ready;
      render();
    },
  };
}
