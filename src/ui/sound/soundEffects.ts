import type { ClientListener } from "../../infrastructure/clientState";
import type { GamePhase } from "../../application/Game";
import type { SoundPlayer } from "./sound";

/**
 * What the game sounds like. It listens to the same things as the screens do and turns them into cues:
 * every shot sounds as what it did, and the end of a game as a win or a loss for the viewer.
 */
export function createSoundEffects(player: SoundPlayer): Pick<ClientListener, "stateChanged" | "shotFired"> {
  // Only a game that ends while the viewer watches is announced, not one that was over before he came.
  let previousPhase: GamePhase | undefined;

  return {
    stateChanged(state) {
      const game = state.room?.game;

      if (previousPhase !== undefined && previousPhase !== "finished" && game?.phase === "finished") {
        if (game.winner !== undefined) {
          player.play(game.winner === game.you ? "win" : "lose");
        }
      }
      previousPhase = game?.phase;
    },
    shotFired(shot) {
      player.play(shot.outcome);
    },
  };
}
