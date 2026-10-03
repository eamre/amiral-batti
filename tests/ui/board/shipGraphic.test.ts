// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { shipGraphic } from "../../../src/ui/board/shipGraphic";

const flat = [
  { row: 0, column: 0 },
  { row: 0, column: 1 },
  { row: 0, column: 2 },
];

describe("shipGraphic", () => {
  it("draws the hull twice: once for the outline, once for the body", () => {
    const graphic = shipGraphic(flat, "afloat");

    expect(graphic.querySelectorAll(".ship__outline polygon")).toHaveLength(1);
    expect(graphic.querySelectorAll(".ship__body polygon")).toHaveLength(1);
  });

  it("points its bow the way the ship was turned", () => {
    const points = (turns: number) =>
      shipGraphic(flat, "afloat", turns).querySelector(".ship__body polygon")?.getAttribute("points");

    expect(points(2)).not.toBe(points(0));
    expect(points(0)).toContain("2.94,0.5");
    expect(points(2)).toContain("0.06,0.5");
  });

  it("draws the cabins", () => {
    expect(shipGraphic(flat, "afloat").querySelectorAll(".ship__cabin")).toHaveLength(1);
  });

  it("is a plain ship while it floats", () => {
    expect(shipGraphic(flat, "afloat").classList.contains("ship--sunk")).toBe(false);
  });

  it.each(["sunk", "misplaced", "lifted"] as const)("is marked when it is %s", (look) => {
    expect(shipGraphic(flat, look).classList.contains(`ship--${look}`)).toBe(true);
  });
});
