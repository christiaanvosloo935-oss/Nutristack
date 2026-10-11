import type { Recipe } from "../types";

export interface LibraryCache {
  get(): Promise<{ recipes: Recipe[]; savedAt: number } | null>;
  put(recipes: Recipe[], savedAt: number): Promise<void>;
}

const DB_NAME = "nutristack";
const STORE = "library";
const KEY = "recipes";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createIdbCache(): LibraryCache {
  return {
    async get() {
      const db = await openDb();
      const value = await done(db.transaction(STORE).objectStore(STORE).get(KEY));
      db.close();
      return value ?? null;
    },
    async put(recipes, savedAt) {
      const db = await openDb();
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ recipes, savedAt }, KEY);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
  };
}
