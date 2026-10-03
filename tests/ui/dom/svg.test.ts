// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { svg } from "../../../src/ui/dom/svg";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

describe("svg", () => {
  it("creates an element in the SVG namespace", () => {
    expect(svg("circle").namespaceURI).toBe(SVG_NAMESPACE);
  });

  it("sets the class name", () => {
    expect(svg("g", { class: "ship ship--sunk" }).getAttribute("class")).toBe("ship ship--sunk");
  });

  it("writes numbers as attributes", () => {
    const circle = svg("circle", { attrs: { cx: 1.5, cy: 2, r: 0.25 } });

    expect(circle.getAttribute("cx")).toBe("1.5");
    expect(circle.getAttribute("r")).toBe("0.25");
  });

  it("appends children in order", () => {
    const group = svg("g", {}, svg("rect"), svg("circle"));

    expect(Array.from(group.children).map((child) => child.tagName)).toEqual(["rect", "circle"]);
  });

  it("calls a listener when its event happens", () => {
    const onClick = vi.fn();
    const rect = svg("rect", { on: { click: onClick } });

    rect.dispatchEvent(new Event("click"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
