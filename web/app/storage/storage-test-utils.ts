import { afterEach, beforeEach } from "vitest";

type StorageRecord = Record<string, string>;

export function createMemoryStorage(initial: StorageRecord = {}): Storage {
  let store: StorageRecord = { ...initial };

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

export function installMemoryStorage() {
  const storage = createMemoryStorage();

  beforeEach(() => {
    storage.clear();
    globalThis.localStorage = storage;
  });

  afterEach(() => {
    storage.clear();
  });

  return storage;
}
