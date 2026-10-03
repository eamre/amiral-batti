import type { MutePreference } from "../../infrastructure/LocalStoragePreferences";
import type { Muting, SoundCue, SoundPlayer } from "./sound";

/** Puts a switch in front of a player: while it is muted nothing is played. */
export class SoundSwitch implements SoundPlayer, Muting {
  private muted: boolean;

  constructor(
    private readonly player: SoundPlayer,
    private readonly preference: MutePreference,
  ) {
    this.muted = preference.loadMuted();
  }

  play(cue: SoundCue): void {
    if (!this.muted) {
      this.player.play(cue);
    }
  }

  /** Muted or not, the player gets ready, so that the sound works at once when it is turned on. */
  unlock(): void {
    this.player.unlock();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.preference.saveMuted(muted);
  }
}
