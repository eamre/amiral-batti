import { describe, expect, it } from "vitest";
import { statusText } from "../../../src/ui/texts/statusText";

describe("statusText", () => {
  it("names the opponent when he is the one to wait for", () => {
    expect(statusText("opponent-turn", "Ayşe")).toBe("Ayşe ateş ediyor…");
  });

  it("calls an opponent without a name just that", () => {
    expect(statusText("opponent-is-arranging", undefined)).toBe("Rakip filosunu düzenliyor…");
  });

  it("does not need a name for the codes that never mention one", () => {
    expect(statusText("your-turn", undefined)).toBe("Sıra sende — ateş et!");
  });
});
