import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_NOTIFICATION_SETTINGS } from "../views/Settings/NotificationSettings";

// A synchronous, in-memory mirror of the notification_settings the user has
// saved (see Settings.js / NotificationSettings.js), persisted to
// AsyncStorage so it's available immediately on cold start - before the
// Settings screen has ever been opened this session - for the notification
// handler (pushNotifications.js) to consult when deciding how to present a
// notification.
const STORAGE_KEY = "cached_notification_settings";

let current = { ...DEFAULT_NOTIFICATION_SETTINGS };
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(current);
    } catch (_) {
      // ignore listener errors
    }
  });
}

export function getCachedNotificationSettings() {
  return current;
}

export function subscribeNotificationSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadCachedNotificationSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        current = { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
      }
    }
  } catch (_) {
    // keep defaults
  }
  return current;
}

export async function setCachedNotificationSettings(next) {
  current = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(next || {}) };
  notify();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (_) {
    // best effort only
  }
  return current;
}
