import AsyncStorage from "@react-native-async-storage/async-storage";
import { isNetworkError } from "./network";

const STORAGE_PREFIX = "@ekazi_cache:";

export async function initOfflineCache() {
  return true;
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
  const { allowCacheOnAnyError = false } = options;
  try {
    const data = await fetcher();
    await setCachedResponse(key, data);
    return { data, fromCache: false, cachedAt: Date.now() };
  } catch (error) {
    if (!allowCacheOnAnyError && !isNetworkError(error)) throw error;
    const cached = await getCachedResponse(key);
    if (!cached) throw error;
    return { ...cached, fromCache: true, originalError: error };
  }
}
