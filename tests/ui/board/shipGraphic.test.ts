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
    expect(points(0)).toContain("2.95,0.5");
    expect(points(2)).toContain("0.05,0.5");
  });

  it("draws the cabins", () => {
    expect(shipGraphic(flat, "afloat").querySelectorAll(".ship__cabin")).toHaveLength(1);
  });

  it("draws a window in every cabin", () => {
    const graphic = shipGraphic(flat, "afloat");

    expect(graphic.querySelectorAll(".ship__window")).toHaveLength(1);
  });

  it("draws the line along the deck", () => {
    expect(shipGraphic(flat, "afloat").querySelectorAll(".ship__deck")).toHaveLength(1);
  });

  it("draws the deck line under the cabins, so a cabin hides it", () => {
    const graphic = shipGraphic(flat, "afloat");
    const order = [...graphic.querySelectorAll(".ship__deck, .ship__cabin")].map((part) => part.getAttribute("class"));

    expect(order).toEqual(["ship__deck", "ship__cabin"]);
  });

  it("draws the window above its cabin", () => {
    const graphic = shipGraphic(flat, "afloat");
    const order = [...graphic.querySelectorAll(".ship__cabin, .ship__window")].map((part) => part.getAttribute("class"));

    expect(order).toEqual(["ship__cabin", "ship__window"]);
  });

  it("keeps the corners of a cabin round", () => {
    const cabin = shipGraphic(flat, "afloat").querySelector(".ship__cabin");

    expect(Number(cabin?.getAttribute("rx"))).toBeGreaterThanOrEqual(0.1);
  });

  it("draws only blocks for a bent ship, with no deck line, cabin or window", () => {
    const bent = [{ row: 0, column: 0 }, { row: 1, column: 0 }, { row: 1, column: 1 }];
    const graphic = shipGraphic(bent, "afloat");

    expect(graphic.querySelectorAll(".ship__deck, .ship__cabin, .ship__window")).toHaveLength(0);
    expect(graphic.querySelectorAll(".ship__body polygon")).toHaveLength(3);
  });

  it("is a plain ship while it floats", () => {
    expect(shipGraphic(flat, "afloat").classList.contains("ship--sunk")).toBe(false);
  });

  it.each(["sunk", "misplaced", "lifted"] as const)("is marked when it is %s", (look) => {
    expect(shipGraphic(flat, look).classList.contains(`ship--${look}`)).toBe(true);
  });
});
