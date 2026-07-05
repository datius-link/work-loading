import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { viewerRequest } from "../api/api";
import { ensureAndroidNotificationChannelsAsync } from "./notificationChannels";
import { getNotificationsModule, isRunningInExpoGo } from "./notificationRuntime";
import { buildChannelId, categoryForNotification } from "./pushCategories";
import { resolveNotificationDestination } from "./notificationRouting";
import { getCachedNotificationSettings, loadCachedNotificationSettings } from "./notificationSettingsCache";
import { showInAppBanner } from "./bannerController";
import { navigationRef as sharedNavigationRef } from "./navigationRef";

const STORED_TOKEN_KEY = "expo_push_token";

let listenersAttached = false;
let pendingDestination = null;

function itemFromPushData(data, fallbackTitle, fallbackBody) {
  return {
    id: data?.notification_id,
    type: data?.type,
    system: data?.system,
    job_id: data?.job_id,
    post_id: data?.post_id,
    job_code: data?.job_code,
    title: fallbackTitle,
    body: fallbackBody,
    meta: data?.meta || {},
  };
}

// Foreground presentation is decided per-notification (not just globally):
// if the user wants rich, privacy-aware in-app popups (popup_previews), we
// suppress the OS banner and show our own <NotificationBanner /> instead
// (see the received listener below); otherwise we let the OS show its own
// banner/list entry so the user is still informed.
export function configureNotificationHandler() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const settings = getCachedNotificationSettings();
      const useCustomBanner = settings.popup_previews !== false;
      return {
        shouldShowBanner: !useCustomBanner,
        shouldShowList: true,
        shouldPlaySound: settings.enable_sound !== false,
        shouldSetBadge: true,
      };
    },
  });
}

// Call once on app startup, regardless of login state: sets up the
// notification handler, hydrates the cached settings, and (Android only)
// pre-creates every notification channel variant.
export async function initPushNotifications() {
  await loadCachedNotificationSettings();
  configureNotificationHandler();
  await ensureAndroidNotificationChannelsAsync();
}

async function requestPermissionAsync() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true },
  });
  return !!requested.granted;
}


async function getExpoPushTokenAsync() {
  if (isRunningInExpoGo()) {
    console.log(
      "Skipping Expo push token: running inside Expo Go, which dropped remote push support in SDK 53+. " +
        "Build a development client (`eas build --profile development`) to test real push notifications."
    );
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) {
    console.log(
      "Skipping Expo push token: no EAS projectId configured. Run `eas init` to link this app to an EAS project."
    );
    return null;
  }

  try {
    const Notifications = getNotificationsModule();
    if (!Notifications?.getExpoPushTokenAsync) {
      console.log("Skipping Expo push token: token retrieval is only enabled in a development build path.");
      return null;
    }
    const response = await Notifications.getExpoPushTokenAsync({ projectId });
    return response?.data || null;
  } catch (err) {
    console.log("getExpoPushTokenAsync error:", err?.message || err);
    return null;
  }
}

// Requests permission and returns an Expo push token, or null if permission
// was denied / this isn't a real device. Does not talk to our server - call
// syncPushTokenToServer() with the result.
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device; skipping token registration.");
    return null;
  }

  const granted = await requestPermissionAsync();
  if (!granted) return null;

  return getExpoPushTokenAsync();
}

export async function syncPushTokenToServer(token) {
  if (!token) return;
  try {
    await viewerRequest("post", "/notifications/push-token", {
      expo_push_token: token,
      platform: Platform.OS,
      device_id: Constants.sessionId || Constants.installationId || null,
    });
    await AsyncStorage.setItem(STORED_TOKEN_KEY, token);
  } catch (err) {
    console.log("syncPushTokenToServer error:", err?.response?.data || err?.message);
  }
}

// Called after login: requests permission (if not already granted) and
// registers the resulting token with the backend so it starts receiving
// pushes for this account.
export async function registerDeviceForPush() {
  const token = await registerForPushNotificationsAsync();
  if (token) await syncPushTokenToServer(token);
  return token;
}

// Called on logout so the device stops receiving pushes for an account it's
// no longer signed into.
export async function unregisterDeviceForPush() {
  try {
    const token = await AsyncStorage.getItem(STORED_TOKEN_KEY);
    if (token) {
      await viewerRequest("delete", "/notifications/push-token", { expo_push_token: token });
    }
  } catch (err) {
    console.log("unregisterDeviceForPush error:", err?.response?.data || err?.message);
  } finally {
    await AsyncStorage.removeItem(STORED_TOKEN_KEY).catch(() => {});
    const Notifications = getNotificationsModule();
    await Notifications?.setBadgeCountAsync(0).catch(() => {});
  }
}

// Navigates using the shared app-wide navigationRef (see navigationRef.js).
// If the navigator isn't mounted/ready yet (cold start), the destination is
// queued and replayed by flushPendingNavigation() once it is.
export function navigateToDestination(destination, navigationRef = sharedNavigationRef) {
  if (!destination) return;
  if (navigationRef?.isReady?.()) {
    navigationRef.navigate(destination.name, destination.params);
  } else {
    pendingDestination = destination;
  }
}

// Called from the NavigationContainer's onReady prop, in case a
// notification was tapped before navigation finished mounting (cold start).
export function flushPendingNavigation(navigationRef = sharedNavigationRef) {
  if (pendingDestination && navigationRef?.isReady?.()) {
    const destination = pendingDestination;
    pendingDestination = null;
    navigationRef.navigate(destination.name, destination.params);
  }
}

function handleReceived(event) {
  const settings = getCachedNotificationSettings();
  if (settings.popup_previews === false) return;

  const content = event?.request?.content;
  const item = itemFromPushData(content?.data, content?.title, content?.body);
  showInAppBanner(item);
}

function handleResponse(response) {
  const content = response?.notification?.request?.content;
  const item = itemFromPushData(content?.data, content?.title, content?.body);
  const destination = resolveNotificationDestination(item, { fallbackToAlerts: true });
  navigateToDestination(destination);
}

// Wires up foreground-received (-> in-app banner) and tap (-> navigation)
// listeners, and replays a tap that launched the app from a killed state.
// Returns a cleanup function.
export function attachNotificationListeners() {
  if (listenersAttached) return () => {};
  const Notifications = getNotificationsModule();
  if (!Notifications) return () => {};

  listenersAttached = true;

  const receivedSub = Notifications.addNotificationReceivedListener(handleReceived);
  const responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse);

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) handleResponse(response);
    })
    .catch(() => {});

  return () => {
    listenersAttached = false;
    receivedSub.remove();
    responseSub.remove();
  };
}

// Exposed for anything that wants to schedule a genuinely local (non-push)
// notification using the same channel-selection rules as the server.
export async function scheduleLocalNotification({ title, body, data, category }) {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  const settings = getCachedNotificationSettings();
  const soundEnabled = settings.enable_sound !== false;
  const vibrationEnabled = settings.enable_vibration !== false;
  const channelId = buildChannelId(category || categoryForNotification(data || {}), {
    sound: soundEnabled,
    vibration: vibrationEnabled,
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: soundEnabled ? "default" : null,
      ...(Platform.OS === "android" ? { channelId } : {}),
    },
    trigger: null,
  });
}
