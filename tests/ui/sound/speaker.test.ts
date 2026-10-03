import { describe, expect, it } from "vitest";
import { noiseSamples } from "../../../src/ui/sound/noise";
import { playTones } from "../../../src/ui/sound/speaker";
import type { Tone } from "../../../src/ui/sound/tones";
import { FakeAudioContext } from "./fakeAudio";

const plop: Tone = { wave: "sine", from: 520, to: 180, start: 0.1, length: 0.2, volume: 0.5 };
const blast: Tone = { wave: "noise", from: 1200, to: 200, start: 0.25, length: 0.5, volume: 0.4 };

describe("playTones: a pitched tone", () => {
  it("sets an oscillator of the wave going, and stops it when the tone is over", () => {
    const context = new FakeAudioContext();

    playTones(context, [plop]);

    const [oscillator] = context.oscillators;
    expect(context.oscillators).toHaveLength(1);
    expect(oscillator?.type).toBe("sine");
    expect(oscillator?.startedAt).toBeCloseTo(10.1);
    expect(oscillator?.stoppedAt).toBeCloseTo(10.3);
  });

  it("slides the pitch from where it begins to where it ends", () => {
    const context = new FakeAudioContext();

    playTones(context, [plop]);

    const events = context.oscillators[0]?.frequency.events;
    expect(events).toEqual([
      { kind: "set", value: 520, time: expect.closeTo(10.1) },
      { kind: "ramp", value: 180, time: expect.closeTo(10.3) },
    ]);
  });

  it("starts at the volume of the tone and fades away to (nearly) nothing", () => {
    const context = new FakeAudioContext();

    playTones(context, [plop]);

    const events = context.gains[0]?.gain.events;
    expect(events).toEqual([
      { kind: "set", value: 0.5, time: expect.closeTo(10.1) },
      { kind: "ramp", value: expect.closeTo(0.0001, 6), time: expect.closeTo(10.3) },
    ]);
    // An exponential ramp cannot reach zero.
    expect(events?.[1]?.value).toBeGreaterThan(0);
  });

  it("sends the oscillator through its volume to the speakers", () => {
    const context = new FakeAudioContext();

    playTones(context, [plop]);

    expect(context.oscillators[0]?.connections).toEqual([context.gains[0]]);
    expect(context.gains[0]?.connections).toEqual([context.destination]);
  });
});

describe("playTones: noise", () => {
  it("plays a buffer of noise as long as the tone", () => {
    const context = new FakeAudioContext();

    playTones(context, [blast]);

    const [buffer] = context.buffers;
    const [source] = context.sources;
    expect(context.oscillators).toHaveLength(0);
    expect(buffer?.channels).toBe(1);
    expect(buffer?.sampleRate).toBe(8000);
    expect(buffer?.length).toBe(4000);
    expect(Array.from(buffer?.data ?? [])).toEqual(Array.from(new Float32Array(noiseSamples(4000))));
    expect(source?.buffer).toBe(buffer);
    expect(source?.startedAt).toBeCloseTo(10.25);
    expect(source?.stoppedAt).toBeCloseTo(10.75);
  });

  it("rounds the buffer up so that the end of the tone is not cut", () => {
    const context = new FakeAudioContext();

    playTones(context, [{ ...blast, length: 0.00031 }]);

    expect(context.buffers[0]?.length).toBe(3);
  });

  it("muffles it with a filter whose cutoff slides from where it begins to where it ends", () => {
    const context = new FakeAudioContext();

    playTones(context, [blast]);

    const [filter] = context.filters;
    expect(filter?.type).toBe("lowpass");
    expect(filter?.frequency.events).toEqual([
      { kind: "set", value: 1200, time: expect.closeTo(10.25) },
      { kind: "ramp", value: 200, time: expect.closeTo(10.75) },
    ]);
  });

  it("sends the noise through the filter and the volume to the speakers", () => {
    const context = new FakeAudioContext();

    playTones(context, [blast]);

    expect(context.sources[0]?.connections).toEqual([context.filters[0]]);
    expect(context.filters[0]?.connections).toEqual([context.gains[0]]);
    expect(context.gains[0]?.connections).toEqual([context.destination]);
    expect(context.gains[0]?.gain.events[0]).toEqual({ kind: "set", value: 0.4, time: expect.closeTo(10.25) });
  });
});

describe("playTones: several tones", () => {
  it("plays each on its own, from the time the context has now", () => {
    const context = new FakeAudioContext();
    context.currentTime = 50;

    playTones(context, [plop, blast, { ...plop, wave: "triangle" }]);

    expect(context.oscillators.map((oscillator) => oscillator.type)).toEqual(["sine", "triangle"]);
    expect(context.sources).toHaveLength(1);
    expect(context.gains).toHaveLength(3);
    expect(context.oscillators[0]?.startedAt).toBeCloseTo(50.1);
  });

  it("makes nothing out of nothing", () => {
    const context = new FakeAudioContext();

    playTones(context, []);

    expect(context.gains).toHaveLength(0);
    expect(context.oscillators).toHaveLength(0);
    expect(context.sources).toHaveLength(0);
  });
});
