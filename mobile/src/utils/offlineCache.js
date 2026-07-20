import AsyncStorage from "@react-native-async-storage/async-storage";
import { isNetworkError } from "./network";

const STORAGE_PREFIX = "@ekazi_cache:";

export async function initOfflineCache() {
  return true;
}

// Web/fallback counterpart to offlineCache.native.js's clearOfflineCache —
// see that file for why this needs to exist (unscoped cache keys leaking
// between accounts on logout).
export async function clearOfflineCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.log("offline cache clear error:", error?.message);
  }
}

export async function setCachedResponse(key, data) {
  if (!key) return;
  try {
    await AsyncStorage.setItem(
      `${STORAGE_PREFIX}${key}`,
      JSON.stringify({ data, cachedAt: Date.now() })
    );
  } catch (error) {
    console.log("offline cache write error:", error?.message);
  }
}

export async function getCachedResponse(key) {
  if (!key) return null;
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
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

  // Stale-while-revalidate: see offlineCache.native.js — cached copy is
  // returned immediately, onFresh fires later with live data, and
  // onFreshError fires if the background refresh fails.
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
