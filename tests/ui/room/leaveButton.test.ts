// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createLeaveButton } from "../../../src/ui/room/leaveButton";

describe("createLeaveButton", () => {
  it("is a button that does not submit anything", () => {
    expect(createLeaveButton(() => undefined).getAttribute("type")).toBe("button");
  });

  it("is found by its role", () => {
    expect(createLeaveButton(() => undefined).getAttribute("data-role")).toBe("leave");
  });

  it("is only a picture, so it carries a name for those who cannot see it", () => {
    const button = createLeaveButton(() => undefined);

    expect(button.getAttribute("aria-label")).toBe("Odadan çık");
    expect(button.getAttribute("title")).toBe("Odadan çık");
    expect(button.textContent).toBe("");
  });

  it("draws an icon that screen readers skip", () => {
    const icon = createLeaveButton(() => undefined).querySelector("svg");

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("leaves when it is pressed", () => {
    const onLeave = vi.fn();

    createLeaveButton(onLeave).click();

    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
