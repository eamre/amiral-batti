import type { FleetPresetId } from "../../domain/fleetPresets";

// The names of the fleets, said where a fleet is chosen (the lobby) and where it is told (the room).
// The `Record` type makes the compiler ask for a name whenever a new fleet is added.
export const presetName: Record<FleetPresetId, string> = {
  classic: "Klasik",
  russian: "Rus",
  standard: "Standart",
};
