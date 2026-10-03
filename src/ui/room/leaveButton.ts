import { h } from "../dom/h";
import { svg } from "../dom/svg";
import { appText } from "../texts/texts";

/**
 * The way out of a room: a door with an arrow, small enough to sit in the page header.
 * It has no words, so the name goes into `aria-label` for screen readers and `title` for a mouse.
 */
export function createLeaveButton(onLeave: () => void): HTMLButtonElement {
  return h(
    "button",
    {
      class: "icon-button",
      attrs: { type: "button", "data-role": "leave", "aria-label": appText.leave, title: appText.leave },
      on: { click: onLeave },
    },
    exitIcon(),
  );
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
