import type { ShotOutcome } from "../../domain/Fleet";

/** Every moment of a game that has a sound: the three things a shot can do, and the two ways a game can end. */
export type SoundCue = ShotOutcome | "win" | "lose";

/** Something that can make the sound of a cue. */
export interface SoundPlayer {
  play(cue: SoundCue): void;
  /**
   * Browsers keep a page silent until the player has touched it. Call this from a touch or a key
   * press so that the first sound of the game is not lost.
   */
  unlock(): void;
}

/** The player's choice to hear the game or not. */
export interface Muting {
  isMuted(): boolean;
  setMuted(muted: boolean): void;
}
