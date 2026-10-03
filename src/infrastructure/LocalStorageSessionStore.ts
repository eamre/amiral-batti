import type { Session, SessionStore } from "./GameClient";

/** The part of the browser's Storage that we use. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Remembers the seat in the browser. Storage can be missing or full (private windows),
 * so a failure here must never break the game: the player just cannot come back after a refresh.
 */
export class LocalStorageSessionStore implements SessionStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = "amiral-session",
  ) {}

  load(): Session | undefined {
    try {
      const value: unknown = JSON.parse(this.storage.getItem(this.key) ?? "null");

      return isSession(value) ? { code: value.code, token: value.token } : undefined;
    } catch {
      return undefined;
    }
  }

  save(session: Session): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(session));
    } catch {
      // See the class comment.
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch {
      // See the class comment.
    }
  }
}

function isSession(value: unknown): value is Session {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "token" in value &&
    typeof value.code === "string" &&
    typeof value.token === "string"
  );
}
