import { describe, expect, it } from "vitest";
import { BOARD_SIZE } from "../../src/domain/constants";

describe("constants", () => {
  it("tahta 10x10 olmalı", () => {
    expect(BOARD_SIZE).toBe(10);
  });
});