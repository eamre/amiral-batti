import type { SoundCue, SoundPlayer } from "./sound";
import { playTones, type AudioContextPort } from "./speaker";
import { tonesFor } from "./tones";

/**
 * Plays the cues through the audio of the browser.
 *
 * The audio context is made when it is first needed, not when the page loads: browsers refuse to
 * start sound before the player has touched the page. Sound is a nicety, so whatever goes wrong
 * with it (no audio in the browser, a context that will not wake up) leaves the game silent but never broken.
 */
export class TonePlayer implements SoundPlayer {
  private context: AudioContextPort | undefined;

  constructor(private readonly createContext: () => AudioContextPort) {}

  play(cue: SoundCue): void {
    try {
      const context = this.ready();

      if (context !== undefined) {
        playTones(context, tonesFor(cue));
      }
    } catch {
      // See the class comment.
    }
  }

  unlock(): void {
    try {
      this.ready();
    } catch {
      // See the class comment.
    }
  }

  /** The context, made if need be and woken up if the browser put it to sleep. */
  private ready(): AudioContextPort | undefined {
    this.context ??= this.createContext();

    if (this.context.state === "suspended") {
      // Whether it wakes up is up to the browser; sounds that are asked for in the meantime wait for it.
      this.context.resume().catch(() => undefined);
    }
    return this.context;
  }
}
