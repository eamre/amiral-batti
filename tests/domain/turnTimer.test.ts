import { describe, expect, it } from "vitest";
import { hasTurnExpired, secondsLeft } from "../../src/domain/turnTimer";

describe("secondsLeft", () => {
  it("is the whole limit at the moment the turn starts", () => {
    expect(secondsLeft(1000, 1000)).toBe(20);
  });

  it("counts down as time passes", () => {
    expect(secondsLeft(1000, 1000 + 5000)).toBe(15);
  });

  it("rounds a partly used second up", () => {
    expect(secondsLeft(1000, 1000 + 5500)).toBe(15);
  });

  it("never goes below zero", () => {
    expect(secondsLeft(1000, 1000 + 30000)).toBe(0);
  });

  it("uses the limit it is given", () => {
    expect(secondsLeft(0, 2000, 10)).toBe(8);
  });
});

describe("hasTurnExpired", () => {
  it("is false while there is time left", () => {
    expect(hasTurnExpired(1000, 1000 + 19999)).toBe(false);
  });

  it("is true when the whole limit has passed", () => {
    expect(hasTurnExpired(1000, 1000 + 20000)).toBe(true);
  });

  it("stays true after the limit", () => {
    expect(hasTurnExpired(1000, 1000 + 45000)).toBe(true);
  });
});
