import { describe, expect, it } from "vitest";
import { LocalStoragePreferences } from "../../src/infrastructure/LocalStoragePreferences";
import type { KeyValueStorage } from "../../src/infrastructure/LocalStorageSessionStore";

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  getItem = (key: string) => this.values.get(key) ?? null;
  setItem = (key: string, value: string) => void this.values.set(key, value);
  removeItem = (key: string) => void this.values.delete(key);
}

class BrokenStorage implements KeyValueStorage {
  getItem(): string | null {
    throw new Error("Storage is not available.");
  }
  setItem(): void {
    throw new Error("Storage is full.");
  }
  removeItem(): void {
    throw new Error("Storage is not available.");
  }
}

const layout = [
  { kind: "carrier", row: 0, column: 0, quarterTurns: 0 },
  { kind: "boat", row: 8, column: 5, quarterTurns: 3 },
] as const;

describe("LocalStoragePreferences: the name", () => {
  it("has no name before one is saved", () => {
    expect(new LocalStoragePreferences(new MemoryStorage()).loadName()).toBe("");
  });

  it("gives back the name that was saved", () => {
    const preferences = new LocalStoragePreferences(new MemoryStorage());

    preferences.saveName("Emre");

    expect(preferences.loadName()).toBe("Emre");
  });
});

describe("LocalStoragePreferences: the layout", () => {
  it("has no layout before one is saved", () => {
    expect(new LocalStoragePreferences(new MemoryStorage()).loadLayout("classic")).toBeUndefined();
  });

  it("gives back the layout that was saved", () => {
    const preferences = new LocalStoragePreferences(new MemoryStorage());

    preferences.saveLayout("classic", layout);

    expect(preferences.loadLayout("classic")).toEqual(layout);
  });

  it("keeps a layout for each fleet", () => {
    const preferences = new LocalStoragePreferences(new MemoryStorage());

    preferences.saveLayout("classic", layout);

    expect(preferences.loadLayout("russian")).toBeUndefined();
  });

  it.each([
    ["not json", "{{"],
    ["not a list", '{"kind":"boat"}'],
    ["a ship of unknown kind", '[{"kind":"raft","row":0,"column":0,"quarterTurns":0}]'],
    ["a ship with a fractional place", '[{"kind":"boat","row":0.5,"column":0,"quarterTurns":0}]'],
    ["a ship with a missing field", '[{"kind":"boat","row":0,"column":0}]'],
  ])("ignores a saved layout that is %s", (_name, text) => {
    const storage = new MemoryStorage();
    storage.setItem("amiral-layout-classic", text);

    expect(new LocalStoragePreferences(storage).loadLayout("classic")).toBeUndefined();
  });
});

describe("LocalStoragePreferences: a storage that does not work", () => {
  it("still lets the game go on", () => {
    const preferences = new LocalStoragePreferences(new BrokenStorage());

    expect(() => preferences.saveName("Emre")).not.toThrow();
    expect(() => preferences.saveLayout("classic", layout)).not.toThrow();
    expect(preferences.loadName()).toBe("");
    expect(preferences.loadLayout("classic")).toBeUndefined();
  });
});
