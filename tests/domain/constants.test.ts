import { describe, expect, it } from "vitest";
import { BOARD_SIZE, TURN_SECONDS } from "../../src/domain/constants";

describe("constants", () => {
  it("board is 10x10", () => {
    expect(BOARD_SIZE).toBe(10);
  });

  it("a turn lasts 20 seconds", () => {
    expect(TURN_SECONDS).toBe(20);
  });
});
