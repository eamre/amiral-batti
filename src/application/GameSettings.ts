import { BOARD_SIZE, TURN_SECONDS } from "../domain/constants";
import type { FleetPresetId } from "../domain/fleetPresets";

export interface GameSettings {
  readonly boardSize: number;
  readonly fleetPreset: FleetPresetId;
  readonly allowTouching: boolean;
  readonly turnSeconds: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  boardSize: BOARD_SIZE,
  fleetPreset: "classic",
  allowTouching: false,
  turnSeconds: TURN_SECONDS,
};
