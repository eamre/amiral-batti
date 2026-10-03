/** Numbers for `Math.random`-free noise: the same ones every time, which is all that noise needs and what a test needs. */
const MULTIPLIER = 1_664_525;
const INCREMENT = 1_013_904_223;
const RANGE = 2 ** 32;

/**
 * White noise: samples that have nothing to do with each other, between -1 and 1.
 * They come from a small, well known formula (a linear congruential generator) that always starts from the same place.
 */
export function noiseSamples(count: number): number[] {
  const samples: number[] = [];
  let seed = 1;

  for (let index = 0; index < count; index += 1) {
    seed = (Math.imul(seed, MULTIPLIER) + INCREMENT) >>> 0;
    samples.push((seed / RANGE) * 2 - 1);
  }
  return samples;
}
