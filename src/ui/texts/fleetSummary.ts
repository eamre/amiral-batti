import { FLEET_PRESETS, type FleetPresetId } from "../../domain/fleetPresets";

export interface FleetSummary {
  readonly ships: number;
  readonly cells: number;
}

export function fleetSummary(preset: FleetPresetId): FleetSummary {
  const definitions = FLEET_PRESETS[preset];

  return {
    ships: definitions.length,
    cells: definitions.reduce((total, definition) => total + definition.shape.length, 0),
  };
}
