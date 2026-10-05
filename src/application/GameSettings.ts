import type { FleetPresetId } from "../domain/fleetPresets";

export interface GameSettings {
  readonly boardSize: number;
  readonly fleetPreset: FleetPresetId;
  readonly allowTouching: boolean;
  readonly turnSeconds: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  boardSize: 10,
  fleetPreset: "classic",
  allowTouching: false,
  turnSeconds: 20,
};
