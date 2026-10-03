import { describe, expect, it, vi } from "vitest";
import { TonePlayer } from "../../../src/ui/sound/TonePlayer";
import { tonesFor } from "../../../src/ui/sound/tones";
import { FakeAudioContext } from "./fakeAudio";

function newPlayer(context = new FakeAudioContext()) {
  const create = vi.fn(() => context);
  return { context, create, player: new TonePlayer(create) };
}

describe("TonePlayer", () => {
  it("does not touch the audio of the browser until a sound is wanted", () => {
    const { create } = newPlayer();

    expect(create).not.toHaveBeenCalled();
  });

  it("plays the tones of the cue", () => {
    const { context, player } = newPlayer();

    player.play("hit");

    const tones = tonesFor("hit");
    expect(context.oscillators).toHaveLength(tones.filter((tone) => tone.wave !== "noise").length);
    expect(context.sources).toHaveLength(tones.filter((tone) => tone.wave === "noise").length);
  });

  it("makes one audio context and keeps it", () => {
    const { create, player } = newPlayer();

    player.unlock();
    player.play("miss");
    player.play("hit");

    expect(create).toHaveBeenCalledTimes(1);
  });

  it("wakes up a context that the browser has put to sleep", () => {
    const context = new FakeAudioContext();
    context.state = "suspended";
    const { player } = newPlayer(context);

    player.play("miss");

    expect(context.resumed).toBe(1);
    expect(context.oscillators).toHaveLength(1);
  });

  it("leaves a context that is running alone", () => {
    const { context, player } = newPlayer();

    player.play("miss");

    expect(context.resumed).toBe(0);
  });

  it("is ready to play after the first touch of the player", () => {
    const context = new FakeAudioContext();
    context.state = "suspended";
    const { create, player } = newPlayer(context);

    player.unlock();

    expect(create).toHaveBeenCalledTimes(1);
    expect(context.resumed).toBe(1);
    expect(context.oscillators).toHaveLength(0);
  });

  it("does not mind when the browser refuses to wake the context", async () => {
    const context = new FakeAudioContext();
    context.state = "suspended";
    context.resume = () => Promise.reject(new Error("Not allowed."));
    const { player } = newPlayer(context);
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    player.play("miss");
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", unhandled);

    expect(unhandled).not.toHaveBeenCalled();
  });

  it("stays quiet when the browser has no audio", () => {
    const player = new TonePlayer(() => {
      throw new Error("No audio here.");
    });

    expect(() => player.play("hit")).not.toThrow();
    expect(() => player.unlock()).not.toThrow();
  });

  it("stays quiet when making the sound fails", () => {
    const context = new FakeAudioContext();
    context.createGain = () => {
      throw new Error("Out of voices.");
    };
    const { player } = newPlayer(context);

    expect(() => player.play("hit")).not.toThrow();
  });
});
