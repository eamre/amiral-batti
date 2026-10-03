import { Board } from "../domain/Board";
import { FLEET_PRESETS } from "../domain/fleetPresets";
import { PlacementValidator, type PlacementResult } from "../domain/PlacementValidator";
import type { Position } from "../domain/Position";
import { RandomFleetGenerator } from "../domain/RandomFleetGenerator";
import type { RandomSource } from "../domain/random";
import type { Ship } from "../domain/Ship";
import type { ShipKind } from "../domain/ShipDefinition";
import { buildFleet, type ShipPlacement } from "./buildFleet";
import { GameRuleError } from "./GameRuleError";
import type { GameSettings } from "./GameSettings";

export interface EditorShip {
  readonly kind: ShipKind;
  readonly ship: Ship;
}

/**
 * The fleet while a player is arranging it. Unlike a fleet in a game it may be illegal for a
 * moment: a ship can be dropped on top of another one, and the editor says which ships are wrong.
 * Like the other objects it is immutable: every change returns a new editor.
 */
export class FleetEditor {
  static of(settings: GameSettings, ships: readonly EditorShip[]): FleetEditor {
    return new FleetEditor(settings, ships);
  }

  static random(settings: GameSettings, random: RandomSource): FleetEditor {
    const definitions = FLEET_PRESETS[settings.fleetPreset];
    const board = new Board(settings.boardSize);
    const validator = new PlacementValidator(board, settings.allowTouching);
    const ships = new RandomFleetGenerator(board, validator, random).generate(definitions);

    return new FleetEditor(
      settings,
      definitions.map((definition, index) => ({
        kind: definition.kind,
        ship: shipAt(ships, index),
      })),
    );
  }

  /** The editor for a fleet that was kept from an earlier game, or undefined if it is not legal here. */
  static fromPlacements(
    settings: GameSettings,
    placements: readonly ShipPlacement[],
  ): FleetEditor | undefined {
    const definitions = FLEET_PRESETS[settings.fleetPreset];
    const validator = new PlacementValidator(new Board(settings.boardSize), settings.allowTouching);

    try {
      const ships = buildFleet(definitions, placements, validator);

      return new FleetEditor(
        settings,
        definitions.map((definition, index) => ({
          kind: definition.kind,
          ship: shipAt(ships, index),
        })),
      );
    } catch (error) {
      if (error instanceof GameRuleError) {
        return undefined;
      }
      throw error;
    }
  }

  private constructor(
    readonly settings: GameSettings,
    readonly ships: readonly EditorShip[],
  ) {}

  get isLegal(): boolean {
    return this.ships.every((_, index) => this.statusOf(index) === "valid");
  }

  statusOf(index: number): PlacementResult {
    const { ship } = this.itemAt(index);
    const others = this.ships.filter((_, other) => other !== index).map((item) => item.ship);

    return this.validator.check(ship, others);
  }

  /** The index of the ship that stands on this cell, if there is one. */
  shipAt(position: Position): number | undefined {
    const index = this.ships.findIndex((item) => item.ship.occupies(position));

    return index === -1 ? undefined : index;
  }

  /** Moves a ship so its top-left corner is at `origin`; a ship that would stick out is pulled in. */
  moveTo(index: number, origin: Position): FleetEditor {
    const { ship } = this.itemAt(index);

    return this.replace(index, this.board.pulledInside(ship.movedTo(origin)));
  }

  /**
   * Turns a ship one quarter turn clockwise, keeping its top-left corner (pulled in if needed).
   * Every tap is the next quarter turn, so four taps bring the ship back. The editor does not
   * dodge other ships: if the new standing collides, the ship shows as misplaced and the
   * player turns it again or moves it.
   */
  rotate(index: number): FleetEditor {
    const { ship } = this.itemAt(index);

    return this.replace(index, this.board.pulledInside(ship.rotated()));
  }

  toPlacements(): ShipPlacement[] {
    return this.ships.map(({ kind, ship }) => ({
      kind,
      origin: ship.origin,
      quarterTurns: ship.quarterTurns,
    }));
  }

  private get board(): Board {
    return new Board(this.settings.boardSize);
  }

  private get validator(): PlacementValidator {
    return new PlacementValidator(this.board, this.settings.allowTouching);
  }

  private itemAt(index: number): EditorShip {
    const item = this.ships[index];

    if (item === undefined) {
      throw new RangeError(`There is no ship number ${index}.`);
    }
    return item;
  }

  private replace(index: number, ship: Ship): FleetEditor {
    return new FleetEditor(
      this.settings,
      this.ships.map((item, position) => (position === index ? { kind: item.kind, ship } : item)),
    );
  }
}

function shipAt(ships: readonly Ship[], index: number): Ship {
  const ship = ships[index];

  if (ship === undefined) {
    throw new Error("The fleet has fewer ships than its definitions.");
  }
  return ship;
}
