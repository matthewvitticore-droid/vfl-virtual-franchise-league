/**
 * bigStorage — IndexedDB on web, AsyncStorage on native.
 *
 * localStorage is capped at ~5 MB (shared across all keys).
 * IndexedDB has no practical limit and is the right tool for large blobs.
 * We only use this for the heavy per-save season data keys.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DB_NAME    = "vfl_big_storage";
const DB_VERSION = 1;
const STORE      = "blobs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE);
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = ()  => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const put = tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => { db.close(); reject(tx.error); };
    put.onerror   = () => { db.close(); reject(put.error); };
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = () => { db.close(); reject(tx.error); };
    req.onerror   = () => { db.close(); reject(req.error); };
  });
}

export async function bigSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web" && typeof indexedDB !== "undefined") {
    return idbSet(key, value);
  }
  return AsyncStorage.setItem(key, value);
}

export async function bigGet(key: string): Promise<string | null> {
  if (Platform.OS === "web" && typeof indexedDB !== "undefined") {
    return idbGet(key);
  }
  return AsyncStorage.getItem(key);
}

export async function bigDelete(key: string): Promise<void> {
  if (Platform.OS === "web" && typeof indexedDB !== "undefined") {
    return idbDelete(key);
  }
  return AsyncStorage.removeItem(key);
}
