import { svg } from "../dom/svg";
import { seaAndGrid } from "../board/boardView";
import type { PlacementModel } from "./placementModel";
import { shipGraphic } from "../board/shipGraphic";

export interface PlacementBoard {
  readonly element: SVGSVGElement;
  show(model: PlacementModel): void;
}

/**
 * The board where the fleet is arranged. Unlike the battle board it is not drawn again from
 * scratch: a finger is holding it, and a replaced element would lose the finger. So the
 * element stays, and only the ships on it are replaced.
 */
export function createPlacementBoard(size: number, label: string): PlacementBoard {
  const ships = svg("g", { class: "ships" });
  const element = svg(
    "svg",
    {
      class: "board board--placing",
      attrs: { viewBox: `0 0 ${size} ${size}`, role: "group", "aria-label": label },
    },
    ...seaAndGrid(size),
    ships,
  );

  return {
    element,
    show(model) {
      ships.replaceChildren(...model.ships.map((ship) => shipGraphic(ship.cells, ship.look, ship.quarterTurns)));
    },
  };
}
