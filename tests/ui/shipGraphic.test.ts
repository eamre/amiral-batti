// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { shipGraphic } from "../../src/ui/shipGraphic";

const flat = [
  { row: 0, column: 0 },
  { row: 0, column: 1 },
  { row: 0, column: 2 },
];

describe("shipGraphic", () => {
  it("draws the hull twice: once for the outline, once for the body", () => {
    const graphic = shipGraphic(flat, false);

    expect(graphic.querySelectorAll(".ship__outline polygon")).toHaveLength(1);
    expect(graphic.querySelectorAll(".ship__body polygon")).toHaveLength(1);
  });

  it("draws the cabins", () => {
    expect(shipGraphic(flat, false).querySelectorAll(".ship__cabin")).toHaveLength(1);
  });

  it("is a plain ship while it floats", () => {
    expect(shipGraphic(flat, false).classList.contains("ship--sunk")).toBe(false);
  });

  it("is marked when it has sunk", () => {
    expect(shipGraphic(flat, true).classList.contains("ship--sunk")).toBe(true);
  });
});
