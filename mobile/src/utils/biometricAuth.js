import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Guarded require: expo-local-authentication is a native module, so this file
// must not crash if it's ever loaded in an environment without it built in
// (matches the pattern used by bluetoothService.js / react-native-webrtc
// wrappers elsewhere in this app).
let LocalAuthentication = null;
try {
  LocalAuthentication = require("expo-local-authentication");
} catch (_err) {
  LocalAuthentication = null;
}

const ENABLED_KEY = "@ekazi/biometric_login_enabled";
// Structured binding, replacing the old flat boolean: biometric auth on a
// phone only proves "someone who can unlock this phone" — not which e-kazi
// account they meant. So biometric login is bound to exactly ONE profile per
// device at a time, recorded here as { enabled, profileUuid, enabledAt }.
const BINDING_KEY = "@ekazi/biometric_binding";

export function isBiometricModuleAvailable() {
  return !!LocalAuthentication;
}

/**
 * Whether this device actually has usable biometric hardware right now
 * (Face ID / Touch ID on iOS, fingerprint / face unlock on Android) with at
 * least one biometric enrolled. Returns false (never throws) on any
 * unsupported environment.
 */
export async function isBiometricHardwareReady() {
  if (!LocalAuthentication) return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return !!isEnrolled;
  } catch (_err) {
    return false;
  }
}

/**
 * Human label for the biometric type this device supports, so the UI can say
 * "Face ID" on iPhones with Face ID and "Fingerprint" on most Android
 * devices, instead of one generic term everywhere.
 */
export async function biometricLabel() {
  if (!LocalAuthentication) return Platform.OS === "ios" ? "Face ID" : "Fingerprint";
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const SecurityLevel = LocalAuthentication.AuthenticationType;
    if (Platform.OS === "ios" && types.includes(SecurityLevel.FACIAL_RECOGNITION)) return "Face ID";
    if (types.includes(SecurityLevel.FINGERPRINT)) return "Fingerprint";
    if (types.includes(SecurityLevel.FACIAL_RECOGNITION)) return "Face unlock";
    return Platform.OS === "ios" ? "Face ID" : "Fingerprint";
  } catch (_err) {
    return Platform.OS === "ios" ? "Face ID" : "Fingerprint";
  }
}

/**
 * Which specific biometric kinds this device can actually present, so the
 * UI can show a Fingerprint side, a Face ID side, or both — never a kind
 * the hardware doesn't have.
 */
export async function getSupportedBiometricKinds() {
  if (!LocalAuthentication) return { hasFingerprint: false, hasFaceId: false };
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const T = LocalAuthentication.AuthenticationType;
    return {
      hasFingerprint: types.includes(T.FINGERPRINT),
      hasFaceId: types.includes(T.FACIAL_RECOGNITION),
    };
  } catch (_err) {
    return { hasFingerprint: false, hasFaceId: false };
  }
}

export async function getBiometricBinding() {
  try {
    const raw = await AsyncStorage.getItem(BINDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.enabled ? parsed : null;
  } catch (_err) {
    return null;
  }
}

/** True if biometric login is on for ANY account on this device. */
export async function isBiometricLoginEnabled() {
  const binding = await getBiometricBinding();
  return !!binding?.enabled;
}

/** True only if biometric login is on AND bound to this specific profile. */
export async function isBiometricBoundToProfile(profileUuid) {
  if (!profileUuid) return false;
  const binding = await getBiometricBinding();
  return !!(binding?.enabled && binding.profileUuid === profileUuid);
}

export async function clearBiometricBinding() {
  try {
    await AsyncStorage.removeItem(BINDING_KEY);
    await AsyncStorage.removeItem(ENABLED_KEY); // legacy key cleanup
  } catch (_err) {
    // ignore
  }
}

/**
 * enabled=true requires profileUuid (who this device is now bound to);
 * enabled=false just clears the binding entirely, for anyone.
 */
export async function setBiometricLoginEnabled(enabled, profileUuid) {
  try {
    if (!enabled) {
      await clearBiometricBinding();
      return;
    }
    if (!profileUuid) return;
    await AsyncStorage.setItem(
      BINDING_KEY,
      JSON.stringify({ enabled: true, profileUuid, enabledAt: Date.now() })
    );
  } catch (_err) {
    // ignore
  }
}

/**
 * Prompts the OS Face ID / fingerprint challenge. Resolves true only on a
 * genuine successful match — any hardware absence, cancellation, or error
 * resolves false so callers can fall back to password.
 */
export async function promptBiometricUnlock(reasonEn = "Unlock e-kazi") {
  if (!LocalAuthentication) return false;
  try {
    const ready = await isBiometricHardwareReady();
    if (!ready) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reasonEn,
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
    });
    return !!result?.success;
  } catch (_err) {
    return false;
  }
}
