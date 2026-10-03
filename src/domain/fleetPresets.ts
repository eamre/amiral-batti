import type { ShipDefinition } from "./ShipDefinition";
import { ShipShape } from "./ShipShape";

export const FLEET_PRESET_IDS = ["classic", "russian", "standard"] as const;

export type FleetPresetId = (typeof FLEET_PRESET_IDS)[number];

export const FLEET_PRESETS: Record<FleetPresetId, readonly ShipDefinition[]> = {
  classic: [
    { kind: "carrier", shape: ShipShape.straight(5) },
    { kind: "cruiser", shape: ShipShape.straight(4) },
    { kind: "submarine", shape: ShipShape.straight(3) },
    { kind: "destroyer", shape: ShipShape.straight(3) },
    { kind: "boat", shape: ShipShape.straight(2) },
  ],
  russian: [
    { kind: "cruiser", shape: ShipShape.straight(4) },
    { kind: "submarine", shape: ShipShape.straight(3) },
    { kind: "destroyer", shape: ShipShape.straight(3) },
    { kind: "boat", shape: ShipShape.straight(2) },
    { kind: "boat", shape: ShipShape.straight(2) },
    { kind: "boat", shape: ShipShape.straight(2) },
    { kind: "dinghy", shape: ShipShape.straight(1) },
    { kind: "dinghy", shape: ShipShape.straight(1) },
    { kind: "dinghy", shape: ShipShape.straight(1) },
    { kind: "dinghy", shape: ShipShape.straight(1) },
  ],
  standard: [
    { kind: "carrier", shape: ShipShape.straight(5) },
    { kind: "cruiser", shape: ShipShape.straight(4) },
    { kind: "submarine", shape: ShipShape.straight(3) },
    { kind: "boat", shape: ShipShape.straight(2) },
    { kind: "tanker", shape: ShipShape.tShaped() },
    { kind: "battleship", shape: ShipShape.staggeredPair() },
  ],
};
