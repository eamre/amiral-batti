// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { boardLabels, LABEL_MARGIN, viewBoxOf } from "../../../src/ui/board/boardLabels";

const texts = (size: number) => [...boardLabels(size).querySelectorAll("text")];
const at = (element: Element) => ({ x: Number(element.getAttribute("x")), y: Number(element.getAttribute("y")) });

describe("viewBoxOf", () => {
  it("starts above and left of the board by the room the labels need, and ends where the board ends", () => {
    expect(viewBoxOf(10)).toBe(`${-LABEL_MARGIN} ${-LABEL_MARGIN} ${10 + LABEL_MARGIN} ${10 + LABEL_MARGIN}`);
  });
});

describe("boardLabels", () => {
  it("has a letter for every row and a number for every column", () => {
    expect(texts(10)).toHaveLength(20);
    expect(texts(8)).toHaveLength(16);
  });

  it("names the rows with letters, from A", () => {
    const letters = texts(10).slice(0, 10).map((label) => label.textContent);

    expect(letters).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
  });

  it("names the columns with numbers, from 1", () => {
    const numbers = texts(10).slice(10).map((label) => label.textContent);

    expect(numbers).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  });

  it("stops at the size of the board", () => {
    const lettersOf = (size: number) => texts(size).slice(0, size).map((label) => label.textContent).join("");

    expect(lettersOf(8)).toBe("ABCDEFGH");
  });

  it("puts each letter left of its row, in the middle of the row", () => {
    const [a, d] = [texts(10)[0], texts(10)[3]];

    expect(at(a!)).toEqual({ x: -LABEL_MARGIN / 2, y: 0.5 });
    expect(at(d!)).toEqual({ x: -LABEL_MARGIN / 2, y: 3.5 });
  });

  it("puts each number above its column, in the middle of the column", () => {
    const [one, four] = [texts(10)[10], texts(10)[13]];

    expect(at(one!)).toEqual({ x: 0.5, y: -LABEL_MARGIN / 2 });
    expect(at(four!)).toEqual({ x: 3.5, y: -LABEL_MARGIN / 2 });
  });

  it("is only decoration: the cells already have names for screen readers", () => {
    expect(boardLabels(10).getAttribute("aria-hidden")).toBe("true");
  });
});
