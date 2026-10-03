import { describe, expect, it } from "vitest";
import { opponentOf } from "../../src/domain/Player";

describe("opponentOf", () => {
  it("returns the second player for the first", () => {
    expect(opponentOf("first")).toBe("second");
  });

  it("returns the first player for the second", () => {
    expect(opponentOf("second")).toBe("first");
  });
});