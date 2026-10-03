import { ShipShape } from "./ShipShape";

export const SHIP_KINDS = [
  "carrier",
  "cruiser",
  "submarine",
  "destroyer",
  "boat",
  "dinghy",
  "tanker",
  "battleship",
] as const;

export type ShipKind = (typeof SHIP_KINDS)[number];

export interface ShipDefinition {
  readonly kind: ShipKind;
  readonly shape: ShipShape;
}
