import { describe, expect, it } from "vitest";
import { noiseSamples } from "../../../src/ui/sound/noise";

describe("noiseSamples", () => {
  it("makes as many samples as were asked for", () => {
    expect(noiseSamples(0)).toHaveLength(0);
    expect(noiseSamples(1234)).toHaveLength(1234);
  });

  it("keeps every sample inside what a speaker accepts", () => {
    for (const sample of noiseSamples(5000)) {
      expect(sample).toBeGreaterThanOrEqual(-1);
      expect(sample).toBeLessThanOrEqual(1);
    }
  });

  it("is noise rather than a tone: both signs, no long runs of the same value, an average near silence", () => {
    const samples = noiseSamples(5000);
    const average = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;

    expect(samples.some((sample) => sample > 0.5)).toBe(true);
    expect(samples.some((sample) => sample < -0.5)).toBe(true);
    expect(new Set(samples).size).toBeGreaterThan(4000);
    expect(Math.abs(average)).toBeLessThan(0.05);
  });

  it("is the same noise every time, so a sound can be tested", () => {
    expect(noiseSamples(100)).toEqual(noiseSamples(100));
  });
});
