import { h } from "../dom/h";
import { svg } from "../dom/svg";
import type { FleetStatusEntry } from "./fleetStatus";
import { shipsLeft } from "./fleetStatus";
import { shipGraphic } from "../board/shipGraphic";
import { battleText, shipName } from "./battleText";

/** The small box under the board: which ships of the enemy fleet are still afloat. */
export function createFleetStrip(status: readonly FleetStatusEntry[]): HTMLElement {
  return h(
    "section",
    { class: "fleet", attrs: { "aria-label": battleText.enemyFleet } },
    h(
      "div",
      { class: "fleet__header" },
      h("span", {}, battleText.enemyFleet),
      h("span", { class: "fleet__count" }, battleText.shipsLeft(shipsLeft(status), status.length)),
    ),
    h("div", { class: "fleet__ships", attrs: { style: rowSize(status) } }, ...status.map(shipIcon)),
  );
}

/**
 * What the stylesheet needs to fit the ships in one row: how many there are (for the gaps)
 * and how many cells wide they are together (for the size of a cell).
 */
function rowSize(status: readonly FleetStatusEntry[]): string {
  const span = status.reduce((total, { shape }) => total + shape.width, 0);

  return `--count:${status.length};--span:${span}`;
}

function shipIcon({ kind, shape, sunk }: FleetStatusEntry): SVGSVGElement {
  const name = sunk ? `${shipName[kind]}, ${battleText.sunkSuffix}` : shipName[kind];

  return svg(
    "svg",
    {
      class: sunk ? "fleet__ship fleet__ship--sunk" : "fleet__ship",
      attrs: {
        viewBox: `0 0 ${shape.width} ${shape.height}`,
        role: "img",
        "aria-label": name,
        style: `--w:${shape.width};--h:${shape.height}`,
      },
    },
    shipGraphic(shape.cells, sunk ? "sunk" : "afloat"),
  );
}
