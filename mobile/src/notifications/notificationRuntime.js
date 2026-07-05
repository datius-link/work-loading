import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Application from "expo-application";
import getDevicePushTokenAsync from "expo-notifications/build/getDevicePushTokenAsync";
import setBadgeCountAsync from "expo-notifications/build/setBadgeCountAsync";
import scheduleNotificationAsync from "expo-notifications/build/scheduleNotificationAsync";
import ServerRegistrationModule from "expo-notifications/build/ServerRegistrationModule";
import setNotificationChannelAsync from "expo-notifications/build/setNotificationChannelAsync";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications/build/NotificationChannelManager.types";
import { addNotificationReceivedListener, addNotificationResponseReceivedListener, getLastNotificationResponseAsync } from "expo-notifications/build/NotificationsEmitter";
import { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
import { getPermissionsAsync, requestPermissionsAsync } from "expo-notifications/build/NotificationPermissions";

let didLogExpoGoSkip = false;

export function isRunningInExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function explainExpoGoPushSkip() {
  if (didLogExpoGoSkip) return;
  didLogExpoGoSkip = true;
  console.log(
    "Skipping expo-notifications inside Expo Go: remote push notifications were removed from Expo Go in SDK 53+. " +
      "Use an EAS development build to test real push notifications."
  );
}

async function getDeviceIdAsync() {
  try {
    const installationId = await ServerRegistrationModule.getInstallationIdAsync?.();
    if (installationId) return installationId;
  } catch {}

  return Constants.sessionId || Constants.installationId || "unknown-device";
}

function getDeviceToken(devicePushToken) {
  if (typeof devicePushToken?.data === "string") return devicePushToken.data;
  return JSON.stringify(devicePushToken?.data || {});
}

function getExpoTokenType(devicePushToken) {
  if (devicePushToken?.type === "ios") return "apns";
  if (devicePushToken?.type === "android") return "fcm";
  return devicePushToken?.type || "android";
}

async function getExpoPushTokenAsync(options = {}) {
  const devicePushToken = options.devicePushToken || (await getDevicePushTokenAsync());
  const projectId = options.projectId || Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  const applicationId = options.applicationId || Application.applicationId;

  if (!projectId || !applicationId) return null;

  const deviceId = options.deviceId || (await getDeviceIdAsync());
  const response = await fetch(options.url || "https://exp.host/--/api/v2/push/getExpoPushToken", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: getExpoTokenType(devicePushToken),
      deviceId: String(deviceId).toLowerCase(),
      development: false,
      appId: applicationId,
      deviceToken: getDeviceToken(devicePushToken),
      projectId,
    }),
  });

  const payload = await response.json();
  return payload?.data?.expoPushToken ? { type: "expo", data: payload.data.expoPushToken } : null;
}

export function getNotificationsModule() {
  if (isRunningInExpoGo()) {
    explainExpoGoPushSkip();
  }

  return {
    AndroidImportance,
    AndroidNotificationVisibility,
    addNotificationReceivedListener,
    addNotificationResponseReceivedListener,
    getExpoPushTokenAsync,
    getLastNotificationResponseAsync,
    getPermissionsAsync,
    requestPermissionsAsync,
    scheduleNotificationAsync,
    setBadgeCountAsync,
    setNotificationChannelAsync,
    setNotificationHandler,
  };
}
