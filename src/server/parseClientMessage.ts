import { FLEET_PRESET_IDS } from "../domain/fleetPresets";
import { SHIP_KINDS } from "../domain/ShipDefinition";
import type {
  CellDto,
  ClientMessage,
  RoomRulesDto,
  ShipPlacementDto,
} from "../shared/protocol";

const MAX_SHIPS = 30;

type Fields = Readonly<Record<string, unknown>>;

/**
 * Text from the network in, a well-formed message out, or undefined.
 * Nothing that comes from a browser is trusted until it has passed here.
 */
export function parseClientMessage(raw: string): ClientMessage | undefined {
  const fields = parseObject(raw);

  if (fields === undefined) {
    return undefined;
  }

  switch (fields.type) {
    case "create":
      return parseCreate(fields);
    case "join":
      return parseJoin(fields);
    case "rejoin":
      return parseRejoin(fields);
    case "ready":
      return parseReady(fields);
    case "fire":
      return parseFire(fields);
    case "rematch":
      return { type: "rematch" };
    default:
      return undefined;
  }
}

function parseCreate(fields: Fields): ClientMessage | undefined {
  const rules = parseRules(fields.rules);

  if (typeof fields.name !== "string" || rules === undefined) {
    return undefined;
  }
  return { type: "create", name: fields.name, rules };
}

function parseJoin(fields: Fields): ClientMessage | undefined {
  if (typeof fields.code !== "string" || typeof fields.name !== "string") {
    return undefined;
  }
  return { type: "join", code: fields.code.trim().toUpperCase(), name: fields.name };
}

function parseRejoin(fields: Fields): ClientMessage | undefined {
  if (typeof fields.code !== "string" || typeof fields.token !== "string") {
    return undefined;
  }
  return { type: "rejoin", code: fields.code.trim().toUpperCase(), token: fields.token };
}

function parseReady(fields: Fields): ClientMessage | undefined {
  const { ships } = fields;

  if (!Array.isArray(ships) || ships.length > MAX_SHIPS) {
    return undefined;
  }

  const placements: ShipPlacementDto[] = [];

  for (const ship of ships) {
    const placement = parseShip(ship);

    if (placement === undefined) {
      return undefined;
    }
    placements.push(placement);
  }

  return { type: "ready", ships: placements };
}

function parseFire(fields: Fields): ClientMessage | undefined {
  const cell = parseCell(fields.cell);

  return cell === undefined ? undefined : { type: "fire", cell };
}

function parseRules(value: unknown): RoomRulesDto | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fleetPreset = FLEET_PRESET_IDS.find((id) => id === value.fleetPreset);

  if (fleetPreset === undefined || typeof value.allowTouching !== "boolean") {
    return undefined;
  }
  return { fleetPreset, allowTouching: value.allowTouching };
}

function parseShip(value: unknown): ShipPlacementDto | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const kind = SHIP_KINDS.find((known) => known === value.kind);

  const { row, column, quarterTurns } = value;

  if (
    kind === undefined ||
    !isInteger(row) ||
    !isInteger(column) ||
    !isInteger(quarterTurns)
  ) {
    return undefined;
  }
  return { kind, row, column, quarterTurns };
}

function parseCell(value: unknown): CellDto | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { row, column } = value;

  return isInteger(row) && isInteger(column) ? { row, column } : undefined;
}

function parseObject(raw: string): Fields | undefined {
  try {
    const value: unknown = JSON.parse(raw);

    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}
