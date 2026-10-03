import { SHIP_KINDS } from "../domain/ShipDefinition";
import type { FleetPresetId } from "../domain/fleetPresets";
import type { ShipPlacementDto } from "../shared/protocol";
import type { KeyValueStorage } from "./LocalStorageSessionStore";

/** What the browser remembers between visits, apart from the seat in a room. */
export interface Preferences {
  loadName(): string;
  saveName(name: string): void;
  /** The last arrangement of the fleet with these rules, if there is one worth trying again. */
  loadLayout(preset: FleetPresetId): readonly ShipPlacementDto[] | undefined;
  saveLayout(preset: FleetPresetId, ships: readonly ShipPlacementDto[]): void;
}

/** Whether the player wants the sounds of the game, kept between visits. */
export interface MutePreference {
  loadMuted(): boolean;
  saveMuted(muted: boolean): void;
}

const NAME_KEY = "amiral-name";
const MUTED_KEY = "amiral-muted";
const layoutKey = (preset: FleetPresetId): string => `amiral-layout-${preset}`;

/**
 * Storage can be missing or full (private windows), so a failure here must never break the game:
 * the player just starts without what was remembered.
 */
export class LocalStoragePreferences implements Preferences, MutePreference {
  constructor(private readonly storage: KeyValueStorage) {}

  loadName(): string {
    try {
      return this.storage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  }

  saveName(name: string): void {
    this.write(NAME_KEY, name);
  }

  loadLayout(preset: FleetPresetId): readonly ShipPlacementDto[] | undefined {
    try {
      const value: unknown = JSON.parse(this.storage.getItem(layoutKey(preset)) ?? "null");

      return isLayout(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  saveLayout(preset: FleetPresetId, ships: readonly ShipPlacementDto[]): void {
    this.write(layoutKey(preset), JSON.stringify(ships));
  }

  loadMuted(): boolean {
    try {
      return this.storage.getItem(MUTED_KEY) === "true";
    } catch {
      return false;
    }
  }

  saveMuted(muted: boolean): void {
    this.write(MUTED_KEY, String(muted));
  }

  private write(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      // See the class comment.
    }
  }
}

function isLayout(value: unknown): value is ShipPlacementDto[] {
  return Array.isArray(value) && value.every(isPlacement);
}

function isPlacement(value: unknown): value is ShipPlacementDto {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "row" in value &&
    "column" in value &&
    "quarterTurns" in value &&
    typeof value.kind === "string" &&
    SHIP_KINDS.some((kind) => kind === value.kind) &&
    Number.isInteger(value.row) &&
    Number.isInteger(value.column) &&
    Number.isInteger(value.quarterTurns)
  );
}
