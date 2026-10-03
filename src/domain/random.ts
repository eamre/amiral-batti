export type RandomSource = () => number;

export function randomInt(random: RandomSource, count: number): number {
  return Math.floor(random() * count);
}