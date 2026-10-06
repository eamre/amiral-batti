import type { RoomViewDto } from "../../shared/protocol";
import { h } from "../dom/h";
import { statusOf } from "../app/screenRules";
import { presetName } from "../texts/fleetText";
import { statusText } from "../texts/statusText";
import { roomText } from "./roomText";

export interface RoomCardView {
  readonly element: HTMLElement;
  update(room: RoomViewDto): void;
}

/**
 * The card above the fleet: what the player is to do or wait for, the rules that were chosen
 * for the room (the one who joined did not choose them), and, while the opponent has not come
 * yet, the code he has to give to him.
 */
export function createRoomCard(copy: (text: string) => void): RoomCardView {
  const status = h("p", { class: "status__text", attrs: { "data-role": "status" } });
  const rules = h("p", { class: "hint", attrs: { "data-role": "rules" } });
  const codeSlot = h("div");
  const element = h("section", { class: "card status" }, status, rules, codeSlot);

  return {
    element,
    update(room) {
      const { fleetPreset, allowTouching } = room.game.settings;

      status.textContent = statusText(statusOf(room), room.opponentName);
      rules.textContent = roomText.rules(presetName[fleetPreset], allowTouching);
      codeSlot.replaceChildren(...(room.opponentName === undefined ? codeBlock(room.code, copy) : []));
    },
  };
}

function codeBlock(code: string, copy: (text: string) => void): HTMLElement[] {
  return [
    h("p", { class: "hint" }, roomText.send),
    h(
      "div",
      { class: "code" },
      h("span", { class: "code__text", attrs: { "data-role": "code", "aria-label": roomText.code } }, code),
      h(
        "button",
        { class: "button", attrs: { type: "button", "data-role": "copy" }, on: { click: () => copy(code) } },
        roomText.copy,
      ),
    ),
  ];
}
