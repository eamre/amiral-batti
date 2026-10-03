// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createLeaveControl } from "../../../src/ui/room/leaveControl";

function control() {
  const onLeave = vi.fn();
  const view = createLeaveControl(onLeave);
  const find = <T extends HTMLElement>(role: string) => view.element.querySelector<T>(`[data-role=${role}]`)!;

  return {
    view,
    onLeave,
    open: find<HTMLButtonElement>("leave-open"),
    dialog: find<HTMLDialogElement>("leave-dialog"),
    confirm: find<HTMLButtonElement>("leave-confirm"),
    stay: find<HTMLButtonElement>("leave-stay"),
  };
}

describe("createLeaveControl: the icon", () => {
  it("is a button that does not submit anything", () => {
    expect(control().open.getAttribute("type")).toBe("button");
  });

  it("is only a picture, so it carries a name for those who cannot see it", () => {
    const { open } = control();

    expect(open.getAttribute("aria-label")).toBe("Odadan çık");
    expect(open.getAttribute("title")).toBe("Odadan çık");
    expect(open.textContent).toBe("");
  });

  it("draws an icon that screen readers skip", () => {
    const icon = control().open.querySelector("svg");

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("createLeaveControl: asking first", () => {
  it("does not ask anything until the icon is pressed", () => {
    expect(control().dialog.open).toBe(false);
  });

  it("asks when the icon is pressed, and does not leave yet", () => {
    const { open, dialog, onLeave } = control();

    open.click();

    expect(dialog.open).toBe(true);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("asks in words, as a modal dialog that has the question for a name", () => {
    const { open, dialog } = control();
    open.click();

    const title = dialog.querySelector<HTMLElement>(`#${dialog.getAttribute("aria-labelledby")}`);

    expect(title?.textContent).toBe("Odadan çıkmak istediğine emin misin?");
  });

  it("leaves when the player says yes, and closes the question", () => {
    const { open, confirm, dialog, onLeave } = control();
    open.click();

    confirm.click();

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(false);
  });

  it("stays when the player says no, and closes the question", () => {
    const { open, stay, dialog, onLeave } = control();
    open.click();

    stay.click();

    expect(onLeave).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });

  it("can be asked again after a no", () => {
    const { open, stay, dialog } = control();
    open.click();
    stay.click();

    open.click();

    expect(dialog.open).toBe(true);
  });

  it("names its two answers", () => {
    const { confirm, stay } = control();

    expect(confirm.textContent).toBe("Çık");
    expect(stay.textContent).toBe("Vazgeç");
  });
});

describe("createLeaveControl: visibility", () => {
  it("can be hidden, as in the lobby where there is no room to leave", () => {
    const { view } = control();

    view.setVisible(false);

    expect(view.element.hidden).toBe(true);
  });

  it("can be shown again", () => {
    const { view } = control();
    view.setVisible(false);

    view.setVisible(true);

    expect(view.element.hidden).toBe(false);
  });

  it("takes the question away when it is hidden, so it is not waiting there when the icon returns", () => {
    const { view, open, dialog } = control();
    open.click();

    view.setVisible(false);

    expect(dialog.open).toBe(false);
  });
});
