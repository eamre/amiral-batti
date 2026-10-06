import type { GameViewDto } from "../../shared/protocol";
import { enemyFleetModel, ownWatersModel, type BoardModel } from "../board/boardModel";
import { renderBoard } from "../board/boardView";
import { h } from "../dom/h";
import { battleText } from "./battleText";

export interface FleetsDialog {
  /** A button and the dialog it opens. It is hidden unless there is a fleet to show. */
  readonly element: HTMLElement;
  update(game: GameViewDto): void;
}

const TITLE_ID = "fleets-title";

/**
 * After the game, both fleets side by side: the own one with the shots of the opponent on it, and the
 * opponent's one with the shots of the viewer on it and its ships all uncovered.
 *
 * The dialog is built once and only its boards are drawn again, so a room update that comes in while
 * the player is looking at the fleets does not close it.
 */
export function createFleetsDialog(): FleetsDialog {
  const boards = h("div", { class: "fleets" });
  const close = h(
    "button",
    { class: "button", attrs: { type: "button", "data-role": "fleets-close" }, on: { click: () => dialog.close() } },
    battleText.fleetsClose,
  );
  const dialog = h(
    "dialog",
    { class: "dialog dialog--wide", attrs: { "data-role": "fleets-dialog", "aria-labelledby": TITLE_ID } },
    h("h2", { class: "dialog__title", attrs: { id: TITLE_ID } }, battleText.fleetsTitle),
    boards,
    close,
  );
  const open = h(
    "button",
    {
      class: "button button--narrow",
      attrs: { type: "button", "data-role": "fleets-open" },
      on: { click: () => dialog.showModal() },
    },
    battleText.fleetsShow,
  );
  const element = h("div", { attrs: { "data-role": "fleets" } }, open, dialog);
  element.hidden = true;

  return {
    element,
    update(game) {
      const known = game.phase === "finished" && game.revealedEnemyShips.length > 0;

      element.hidden = !known;
      if (!known) {
        dialog.close();
        boards.replaceChildren();
        return;
      }
      boards.replaceChildren(
        figure(battleText.fleetsOwn, ownWatersModel(game)),
        figure(battleText.fleetsEnemy, enemyFleetModel(game)),
      );
    },
  };
}

function figure(name: string, model: BoardModel): HTMLElement {
  return h(
    "figure",
    { class: "fleets__board" },
    h("figcaption", { class: "fleets__name" }, name),
    // The slot lets the style sheet size the board by the room that is left, which a phone needs.
    h("div", { class: "fleets__slot" }, renderBoard(model, { label: name, onFire: ignore })),
  );
}

/** Nobody fires from here. */
function ignore(): void {}
