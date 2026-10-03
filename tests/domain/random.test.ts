import { describe, expect, it } from "vitest";
import { randomInt } from "../../src/domain/random";

describe("randomInt", () => {
  it("returns 0 when the random source returns 0", () => {
    expect(randomInt(() => 0, 4)).toBe(0);
  });

  it("returns a middle value when the random source returns 0.5", () => {
    expect(randomInt(() => 0.5, 4)).toBe(2);
  });

  it("never returns count itself, even for the largest random value", () => {
    expect(randomInt(() => 0.999999, 4)).toBe(3);
  });
});
