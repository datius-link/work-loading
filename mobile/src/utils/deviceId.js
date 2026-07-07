import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Device from "expo-device";

const DEVICE_ID_KEY = "@ekazi/device_id";
let cachedDeviceId = null;

function randomId() {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand()}-${rand()}`;
}

// Not a hardware identifier — Expo doesn't expose one without extra native
// permissions/entitlements, and we don't need anything that strong. This is
// just a random id generated once and persisted for this install, used
// purely to scope "which physical device is this" for biometric trust (so
// the server can enforce "only one account biometric-active per device").
// Reinstalling the app resets it, which is fine: a fresh install has no
// biometric trust to carry over anyway.
export async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = randomId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  } catch (_err) {
    return randomId();
  }
}

export function getDeviceName() {
  try {
    return Device.deviceName || Device.modelName || (Platform.OS === "ios" ? "iPhone" : "Android device");
  } catch (_err) {
    return Platform.OS === "ios" ? "iPhone" : "Android device";
  }
}
