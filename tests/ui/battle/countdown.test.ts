import { describe, expect, it } from "vitest";
import { isUrgent, secondsShown } from "../../../src/ui/battle/countdown";

describe("secondsShown", () => {
  it("shows what the server said at the moment it said it", () => {
    expect(secondsShown(20, 1_000, 1_000)).toBe(20);
  });

  it("counts down with the time that has passed since", () => {
    expect(secondsShown(20, 1_000, 4_000)).toBe(17);
  });

  it("keeps a second on the clock until it has fully passed", () => {
    expect(secondsShown(20, 0, 500)).toBe(20);
    expect(secondsShown(20, 0, 1_200)).toBe(19);
  });

  it("stops at zero", () => {
    expect(secondsShown(3, 0, 10_000)).toBe(0);
  });

  it("shows nothing when there is no turn to time", () => {
    expect(secondsShown(undefined, 0, 5_000)).toBeUndefined();
  });
});

describe("isUrgent", () => {
  it.each([
    [6, false],
    [5, true],
    [1, true],
    [0, true],
  ])("is %i seconds urgent? %s", (seconds, urgent) => {
    expect(isUrgent(seconds)).toBe(urgent);
  });
});
