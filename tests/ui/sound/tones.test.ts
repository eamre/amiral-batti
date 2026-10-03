import { describe, expect, it } from "vitest";
import type { SoundCue } from "../../../src/ui/sound/sound";
import { tonesFor, type Tone } from "../../../src/ui/sound/tones";

const cues: readonly SoundCue[] = ["miss", "hit", "sunk", "win", "lose"];

const endOf = (tones: readonly Tone[]) => Math.max(...tones.map((tone) => tone.start + tone.length));
const startOf = (tones: readonly Tone[]) => Math.min(...tones.map((tone) => tone.start));
const notes = (cue: SoundCue) =>
  tonesFor(cue)
    .filter((tone) => tone.wave === "triangle")
    .sort((a, b) => a.start - b.start);

describe("tonesFor", () => {
  it.each(cues)("makes %s from tones that an audio context can play", (cue) => {
    const tones = tonesFor(cue);

    expect(tones.length).toBeGreaterThan(0);
    for (const tone of tones) {
      // An exponential ramp cannot start or end at zero, so a pitch has to be above it.
      expect(tone.from).toBeGreaterThan(0);
      expect(tone.to).toBeGreaterThan(0);
      expect(tone.start).toBeGreaterThanOrEqual(0);
      expect(tone.length).toBeGreaterThan(0);
      expect(tone.volume).toBeGreaterThan(0);
      expect(tone.volume).toBeLessThanOrEqual(1);
    }
  });

  it.each(cues)("keeps %s short enough to be over before the next move", (cue) => {
    expect(endOf(tonesFor(cue))).toBeLessThan(2.5);
  });

  it("makes a miss a short plop that falls in pitch", () => {
    const plop = tonesFor("miss").find((tone) => tone.wave === "sine");

    expect(plop).toBeDefined();
    expect(plop!.to).toBeLessThan(plop!.from);
    expect(endOf(tonesFor("miss"))).toBeLessThan(0.5);
  });

  it("makes a hit a blast with a low thud under it", () => {
    const waves = tonesFor("hit").map((tone) => tone.wave);

    expect(waves).toContain("noise");
    expect(waves).toContain("sine");
  });

  it("makes a ship going down bigger than a hit: longer, and with more than one boom", () => {
    expect(endOf(tonesFor("sunk"))).toBeGreaterThan(endOf(tonesFor("hit")));
    expect(tonesFor("sunk").filter((tone) => tone.wave === "sine").length).toBeGreaterThanOrEqual(2);
  });

  it("makes winning four notes that climb", () => {
    const pitches = notes("win").map((tone) => tone.from);

    expect(pitches).toHaveLength(4);
    expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
    expect(new Set(pitches).size).toBe(4);
  });

  it("makes losing four notes that sink", () => {
    const pitches = notes("lose").map((tone) => tone.from);

    expect(pitches).toHaveLength(4);
    expect(pitches).toEqual([...pitches].sort((a, b) => b - a));
    expect(new Set(pitches).size).toBe(4);
  });

  it.each(["win", "lose"] as const)("lets the last ship go down before %s begins", (cue) => {
    expect(startOf(tonesFor(cue))).toBeGreaterThanOrEqual(0.5);
  });

  it("gives the same answer every time, and one that cannot be changed from outside", () => {
    expect(tonesFor("hit")).toEqual(tonesFor("hit"));
    expect(Object.isFrozen(tonesFor("hit"))).toBe(true);
  });
});
