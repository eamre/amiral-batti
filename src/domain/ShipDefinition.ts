import { ShipShape } from "./ShipShape";

export type ShipKind =
  | "carrier"
  | "cruiser"
  | "submarine"
  | "destroyer"
  | "boat"
  | "dinghy"
  | "tanker"
  | "battleship";

export interface ShipDefinition {
  readonly kind: ShipKind;
  readonly shape: ShipShape;
}
