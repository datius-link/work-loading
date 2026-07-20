import * as SQLite from "expo-sqlite";
import { isNetworkError } from "./network";

const DB_NAME = "ekazi_offline_cache.db";
let databasePromise = null;

async function database() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cached_responses (
          cache_key TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          cached_at INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return databasePromise;
}

// Wipes every cached response. Cache keys like "posts:me" and
// "hiring:my-jobs" aren't scoped per-account, so without this a second
// account signing in on the same device would paint the first account's
// cached feed/jobs instantly on open, before the real fetch corrects it —
// called from clearUserSession() on every logout for exactly that reason.
export async function clearOfflineCache() {
  try {
    const db = await database();
    await db.execAsync("DELETE FROM cached_responses");
  } catch (error) {
    console.log("offline cache clear error:", error?.message);
  }
}

export async function initOfflineCache() {
  try {
    await database();
    return true;
  } catch (error) {
    console.log("offline cache init error:", error?.message);
    return false;
  }
}

export async function setCachedResponse(key, data) {
  if (!key) return;
  try {
    const db = await database();
    await db.runAsync(
      `INSERT INTO cached_responses (cache_key, payload, cached_at)
       VALUES (?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, cached_at = excluded.cached_at`,
      key,
      JSON.stringify(data),
      Date.now()
    );
  } catch (error) {
    console.log("offline cache write error:", error?.message);
  }
}

export async function getCachedResponse(key) {
  if (!key) return null;
  try {
    const db = await database();
    const row = await db.getFirstAsync(
      "SELECT payload, cached_at FROM cached_responses WHERE cache_key = ?",
      key
    );
    if (!row) return null;
    return { data: JSON.parse(row.payload), cachedAt: Number(row.cached_at) };
  } catch (error) {
    console.log("offline cache read error:", error?.message);
    return null;
  }
}

export async function cachedGet(key, fetcher, options = {}) {
  const { allowCacheOnAnyError = false, onFresh = null, onFreshError = null } = options;

  const fetchAndStore = async () => {
    const data = await fetcher();
    await setCachedResponse(key, data);
    return { data, fromCache: false, cachedAt: Date.now() };
  };

  // Stale-while-revalidate: when the caller passes onFresh and we already
  // have a cached copy, return it immediately (no network wait — the API's
  // cold starts were making every screen sit on a spinner) and refresh in
  // the background. onFresh only fires if the network actually answers;
  // onFreshError fires when it doesn't, so screens can say "this is stale"
  // instead of silently presenting old data as current.
  if (onFresh) {
    const cached = await getCachedResponse(key);
    if (cached) {
      fetchAndStore()
        .then((fresh) => onFresh(fresh))
        .catch((error) => {
          try {
            onFreshError?.(error);
          } catch {}
        });
      return { ...cached, fromCache: true, revalidating: true };
    }
  }

  try {
    return await fetchAndStore();
  } catch (error) {
    if (!allowCacheOnAnyError && !isNetworkError(error)) throw error;
    const cached = await getCachedResponse(key);
    if (!cached) throw error;
    return { ...cached, fromCache: true, originalError: error };
  }
}
