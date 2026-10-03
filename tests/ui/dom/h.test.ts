// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { h } from "../../../src/ui/dom/h";

describe("h", () => {
  it("creates an element of the given tag", () => {
    expect(h("section").tagName).toBe("SECTION");
  });

  it("sets the class name", () => {
    expect(h("div", { class: "card card--wide" }).className).toBe("card card--wide");
  });

  it("puts text children in as text, never as markup", () => {
    const element = h("p", {}, "<b>Ayşe</b>");

    expect(element.textContent).toBe("<b>Ayşe</b>");
    expect(element.querySelector("b")).toBeNull();
  });

  it("appends element children in order", () => {
    const element = h("div", {}, h("span"), "between", h("em"));

    expect(Array.from(element.childNodes).map((node) => node.nodeName)).toEqual([
      "SPAN",
      "#text",
      "EM",
    ]);
  });

  it("sets attributes", () => {
    const element = h("input", { attrs: { placeholder: "Adın", maxlength: "16" } });

    expect(element.getAttribute("placeholder")).toBe("Adın");
    expect(element.getAttribute("maxlength")).toBe("16");
  });

  it("sets a true attribute without a value and skips a false one", () => {
    const element = h("button", { attrs: { disabled: true, hidden: false } });

    expect(element.hasAttribute("disabled")).toBe(true);
    expect(element.hasAttribute("hidden")).toBe(false);
  });

  it("calls a listener when its event happens", () => {
    const onClick = vi.fn();
    const element = h("button", { on: { click: onClick } });

    element.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
