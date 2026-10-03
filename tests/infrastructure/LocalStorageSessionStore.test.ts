import { describe, expect, it } from "vitest";
import {
  LocalStorageSessionStore,
  type KeyValueStorage,
} from "../../src/infrastructure/LocalStorageSessionStore";

class FakeStorage implements KeyValueStorage {
  readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

const brokenStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("LocalStorageSessionStore", () => {
  it("gives back what was saved", () => {
    const store = new LocalStorageSessionStore(new FakeStorage());

    store.save({ code: "ABCD", token: "secret" });

    expect(store.load()).toEqual({ code: "ABCD", token: "secret" });
  });

  it("has nothing before anything was saved", () => {
    expect(new LocalStorageSessionStore(new FakeStorage()).load()).toBeUndefined();
  });

  it("forgets what was cleared", () => {
    const store = new LocalStorageSessionStore(new FakeStorage());
    store.save({ code: "ABCD", token: "secret" });

    store.clear();

    expect(store.load()).toBeUndefined();
  });

  it("keeps the session under the key it is given", () => {
    const storage = new FakeStorage();

    new LocalStorageSessionStore(storage, "my-key").save({ code: "ABCD", token: "secret" });

    expect(storage.items.has("my-key")).toBe(true);
  });

  it.each([
    ["text that is not JSON", "not json"],
    ["JSON of the wrong shape", '{"code":"ABCD"}'],
    ["a code that is not text", '{"code":1,"token":"secret"}'],
    ["null", "null"],
  ])("ignores %s", (_reason, stored) => {
    const storage = new FakeStorage();
    storage.setItem("amiral-session", stored);

    expect(new LocalStorageSessionStore(storage).load()).toBeUndefined();
  });

  it("does not break the game when the storage is blocked", () => {
    const store = new LocalStorageSessionStore(brokenStorage);

    expect(() => store.save({ code: "ABCD", token: "secret" })).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(store.load()).toBeUndefined();
  });
});
