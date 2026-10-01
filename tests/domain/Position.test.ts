import { describe, expect, it } from "vitest";
import { Position } from "../../src/domain/Position";

describe("Position", () => {
  it("satır ve sütunu saklar", () => {
    const position = new Position(2, 5);

    expect(position.row).toBe(2);
    expect(position.column).toBe(5);
  });

  it("aynı satır ve sütuna sahip iki konum eşittir", () => {
    expect(new Position(3, 4).equals(new Position(3, 4))).toBe(true);
  });

  it("farklı satır ya da sütuna sahip konumlar eşit değildir", () => {
    expect(new Position(3, 4).equals(new Position(4, 3))).toBe(false);
  });

  it("satırı aynı ama sütunu farklı konumlar eşit değildir", () => {
    expect(new Position(3, 4).equals(new Position(3, 5))).toBe(false);
  });

  it("sütunu aynı ama satırı farklı konumlar eşit değildir", () => {
    expect(new Position(3, 4).equals(new Position(2, 4))).toBe(false);
  });

  it("offsetBy yeni bir konum döndürür, eskisini değiştirmez", () => {
    const original = new Position(1, 1);

    const moved = original.offsetBy(2, -1);

    expect(moved.equals(new Position(3, 0))).toBe(true);
    expect(original.equals(new Position(1, 1))).toBe(true);
  });
});