import type { RoomViewDto } from "../../shared/protocol";
import { h } from "../dom/h";
import { statusOf } from "../app/screen";
import { roomText, statusText } from "../texts/texts";

export interface RoomCardView {
  readonly element: HTMLElement;
  update(room: RoomViewDto): void;
}

/**
 * The card above the fleet: what the player is to do or wait for, and, while the opponent
 * has not come yet, the code he has to give to him.
 */
export function createRoomCard(copy: (text: string) => void): RoomCardView {
  const status = h("p", { class: "status__text", attrs: { "data-role": "status" } });
  const codeSlot = h("div");
  const element = h("section", { class: "card status" }, status, codeSlot);

  return {
    element,
    update(room) {
      status.textContent = statusText(statusOf(room), room.opponentName);
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
