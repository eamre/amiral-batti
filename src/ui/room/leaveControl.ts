import { h } from "../dom/h";
import { svg } from "../dom/svg";
import { leaveText } from "./roomText";

export interface LeaveControl {
  readonly element: HTMLElement;
  setVisible(visible: boolean): void;
}

const QUESTION_ID = "leave-question";

/**
 * The way out of a room: an icon that is small enough for the page header. Pressing it does not
 * leave at once, since a finger can slip: it asks first, in a modal dialog whose safe answer
 * ("Vazgeç") comes first and is the one that has the focus.
 */
export function createLeaveControl(onLeave: () => void): LeaveControl {
  const stay = h(
    "button",
    { class: "button", attrs: { type: "button", "data-role": "leave-stay" }, on: { click: () => dialog.close() } },
    leaveText.stay,
  );
  const confirm = h(
    "button",
    {
      class: "button button--danger",
      attrs: { type: "button", "data-role": "leave-confirm" },
      on: {
        click: () => {
          dialog.close();
          onLeave();
        },
      },
    },
    leaveText.confirm,
  );
  const dialog = h(
    "dialog",
    { class: "dialog", attrs: { "data-role": "leave-dialog", "aria-labelledby": QUESTION_ID } },
    h("h2", { class: "dialog__title", attrs: { id: QUESTION_ID } }, leaveText.question),
    h("div", { class: "row" }, stay, confirm),
  );
  const open = h(
    "button",
    {
      class: "icon-button",
      attrs: { type: "button", "data-role": "leave-open", "aria-label": leaveText.label, title: leaveText.label },
      on: { click: () => dialog.showModal() },
    },
    exitIcon(),
  );
  const element = h("div", { class: "leave", attrs: { "data-role": "leave" } }, open, dialog);

  return {
    element,
    setVisible(visible) {
      element.hidden = !visible;
      if (!visible) {
        dialog.close();
      }
    },
  };
}

/** The "log out" icon, drawn with lines so it takes the colour of the text around it. */
function exitIcon(): SVGSVGElement {
  return svg(
    "svg",
    { class: "icon", attrs: { viewBox: "0 0 24 24", "aria-hidden": "true" } },
    svg("path", { attrs: { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" } }),
    svg("path", { attrs: { d: "M16 17l5-5-5-5" } }),
    svg("path", { attrs: { d: "M21 12H9" } }),
  );
}
