import type { SoundCue } from "./sound";

/**
 * One sound in the making of a cue. A cue is a few of them, heard together or one after another.
 *
 * `from` and `to` are where the sound starts and where it ends: a pitch in hertz for the waves,
 * and the cutoff of a filter for noise (the lower it gets, the duller the noise sounds).
 */
export interface Tone {
  readonly wave: "sine" | "triangle" | "square" | "sawtooth" | "noise";
  readonly from: number;
  readonly to: number;
  /** Seconds after the cue was asked for. */
  readonly start: number;
  readonly length: number;
  /** From 0 to 1. */
  readonly volume: number;
}

/** The note that the winner's tune and the loser's tune are made of. */
const note = (pitch: number, start: number, length: number): Tone => ({
  wave: "triangle",
  from: pitch,
  to: pitch,
  start,
  length,
  volume: 0.3,
});

// The tune of the end of a game waits for the last explosion to die down.
const TUNE_STARTS_AT = 0.6;

const recipes: Record<SoundCue, readonly Tone[]> = {
  // A drop into water: a short plop that falls, and a little splash.
  miss: [
    { wave: "sine", from: 520, to: 180, start: 0, length: 0.12, volume: 0.35 },
    { wave: "noise", from: 1800, to: 300, start: 0, length: 0.25, volume: 0.1 },
  ],
  // An explosion: a burst that gets duller, and a thud under it.
  hit: [
    { wave: "noise", from: 1200, to: 200, start: 0, length: 0.25, volume: 0.5 },
    { wave: "sine", from: 150, to: 50, start: 0, length: 0.3, volume: 0.6 },
  ],
  // A bigger explosion that rumbles on, with a second boom as the ship breaks up.
  sunk: [
    { wave: "noise", from: 900, to: 80, start: 0, length: 0.9, volume: 0.6 },
    { wave: "sine", from: 120, to: 40, start: 0, length: 0.8, volume: 0.7 },
    { wave: "sine", from: 100, to: 35, start: 0.3, length: 0.7, volume: 0.5 },
  ],
  // C, E, G, and C an octave higher: up.
  win: [
    note(523, TUNE_STARTS_AT, 0.25),
    note(659, TUNE_STARTS_AT + 0.2, 0.25),
    note(784, TUNE_STARTS_AT + 0.4, 0.25),
    note(1047, TUNE_STARTS_AT + 0.6, 0.5),
  ],
  // G, E, C, and G an octave lower: down.
  lose: [
    note(392, TUNE_STARTS_AT, 0.3),
    note(330, TUNE_STARTS_AT + 0.25, 0.3),
    note(262, TUNE_STARTS_AT + 0.5, 0.3),
    note(196, TUNE_STARTS_AT + 0.75, 0.6),
  ],
};

for (const tones of Object.values(recipes)) {
  Object.freeze(tones);
}

export function tonesFor(cue: SoundCue): readonly Tone[] {
  return recipes[cue];
}
