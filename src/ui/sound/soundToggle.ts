import { h } from "../dom/h";
import { svg } from "../dom/svg";
import { soundText } from "../texts/texts";
import type { Muting } from "./sound";

/**
 * The button in the header that turns the sound of the game off and on. It is a toggle button:
 * `aria-pressed` says whether the sound is on, and the title says what pressing it will do.
 */
export function createSoundToggle(sound: Muting): HTMLButtonElement {
  const button = h("button", {
    class: "icon-button",
    attrs: { type: "button", "data-role": "sound-toggle", "aria-label": soundText.label },
    on: {
      click: () => {
        sound.setMuted(!sound.isMuted());
        show();
      },
    },
  });

  function show(): void {
    const muted = sound.isMuted();

    button.setAttribute("aria-pressed", String(!muted));
    button.setAttribute("title", muted ? soundText.turnOn : soundText.turnOff);
    button.replaceChildren(muted ? mutedIcon() : loudIcon());
  }

  show();
  return button;
}

/** The speaker, drawn with lines so it takes the colour of the text around it. */
function speaker(...extra: readonly SVGElement[]): SVGSVGElement {
  return svg(
    "svg",
    { class: "icon", attrs: { viewBox: "0 0 24 24", "aria-hidden": "true" } },
    svg("polygon", { attrs: { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" } }),
    ...extra,
  );
}

/** A speaker with sound waves coming out of it. */
function loudIcon(): SVGSVGElement {
  return speaker(svg("path", { attrs: { d: "M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" } }));
}

/** A speaker crossed out. */
function mutedIcon(): SVGSVGElement {
  return speaker(
    svg("line", { attrs: { x1: 23, y1: 9, x2: 17, y2: 15 } }),
    svg("line", { attrs: { x1: 17, y1: 9, x2: 23, y2: 15 } }),
  );
}
