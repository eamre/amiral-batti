// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createSoundToggle } from "../../../src/ui/sound/soundToggle";
import { soundText } from "../../../src/ui/sound/soundText";

function newToggle(muted = false) {
  const sound = {
    muted,
    isMuted() {
      return this.muted;
    },
    setMuted(next: boolean) {
      this.muted = next;
    },
  };
  const toggle = createSoundToggle(sound);
  return { sound, toggle };
}

describe("createSoundToggle", () => {
  it("is a button that tells what it is for, and that the sound is on", () => {
    const { toggle } = newToggle();

    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle.getAttribute("aria-label")).toBe(soundText.label);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("title")).toBe(soundText.turnOff);
    expect(toggle.getAttribute("data-role")).toBe("sound-toggle");
  });

  it("shows that the sound is off when it starts muted", () => {
    const { toggle } = newToggle(true);

    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.getAttribute("title")).toBe(soundText.turnOn);
  });

  it("mutes the sound when it is pressed, and says so", () => {
    const { toggle, sound } = newToggle();

    toggle.click();

    expect(sound.isMuted()).toBe(true);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.getAttribute("title")).toBe(soundText.turnOn);
  });

  it("brings the sound back when it is pressed again", () => {
    const { toggle, sound } = newToggle();

    toggle.click();
    toggle.click();

    expect(sound.isMuted()).toBe(false);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("title")).toBe(soundText.turnOff);
  });

  it("draws a different picture for sound and for no sound", () => {
    const { toggle } = newToggle();
    const withSound = toggle.querySelector("svg")?.outerHTML;

    toggle.click();

    expect(toggle.querySelectorAll("svg")).toHaveLength(1);
    expect(toggle.querySelector("svg")?.outerHTML).not.toBe(withSound);
  });

  it("is a decoration-free icon: the picture is hidden from screen readers", () => {
    const { toggle } = newToggle();

    expect(toggle.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
