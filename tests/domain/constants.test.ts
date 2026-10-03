import { describe, expect, it } from "vitest";
import { BOARD_SIZE } from "../../src/domain/constants";

describe("constants", () => {
  it("board is 10x10", () => {
    expect(BOARD_SIZE).toBe(10);
  });
});