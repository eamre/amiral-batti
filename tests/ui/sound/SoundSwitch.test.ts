import { describe, expect, it, vi } from "vitest";
import type { MutePreference } from "../../../src/infrastructure/LocalStoragePreferences";
import { SoundSwitch } from "../../../src/ui/sound/SoundSwitch";

function newSwitch(muted = false) {
  const player = { play: vi.fn(), unlock: vi.fn() };
  const preference = { loadMuted: vi.fn(() => muted), saveMuted: vi.fn() } satisfies MutePreference;
  return { player, preference, sound: new SoundSwitch(player, preference) };
}

describe("SoundSwitch", () => {
  it("plays what it is given", () => {
    const { player, sound } = newSwitch();

    sound.play("sunk");

    expect(player.play).toHaveBeenCalledWith("sunk");
  });

  it("plays nothing while it is muted", () => {
    const { player, sound } = newSwitch();

    sound.setMuted(true);
    sound.play("sunk");

    expect(player.play).not.toHaveBeenCalled();
  });

  it("plays again when the sound is turned back on", () => {
    const { player, sound } = newSwitch();
    sound.setMuted(true);

    sound.setMuted(false);
    sound.play("hit");

    expect(player.play).toHaveBeenCalledWith("hit");
  });

  it("starts as the player left it", () => {
    expect(newSwitch(true).sound.isMuted()).toBe(true);
    expect(newSwitch(false).sound.isMuted()).toBe(false);
  });

  it("does not play at once when it starts muted", () => {
    const { player, sound } = newSwitch(true);

    sound.play("hit");

    expect(player.play).not.toHaveBeenCalled();
  });

  it("remembers the choice of the player", () => {
    const { preference, sound } = newSwitch();

    sound.setMuted(true);
    expect(preference.saveMuted).toHaveBeenLastCalledWith(true);

    sound.setMuted(false);
    expect(preference.saveMuted).toHaveBeenLastCalledWith(false);
    expect(sound.isMuted()).toBe(false);
  });

  it("still gets the player ready while it is muted, so that unmuting works at once", () => {
    const { player, sound } = newSwitch(true);

    sound.unlock();

    expect(player.unlock).toHaveBeenCalledTimes(1);
  });
});
