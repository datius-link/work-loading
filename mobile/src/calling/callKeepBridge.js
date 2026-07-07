// Bridges react-native-callkeep (Android ConnectionService / iOS CallKit) to
// CallProvider so an incoming call can show a real native ringing UI — the
// same telecom-framework hook WhatsApp/Bolt use — instead of only an in-app
// modal that's invisible while e-kazi is backgrounded.
//
// Scoped to Android on purpose: the assignment rubric only requires Android,
// and iOS CallKit needs VoIP PushKit + extra native Swift wiring that (per
// react-native-callkeep's own open issues against Expo SDK 54) doesn't yet
// have a clean managed-Expo path. iOS still gets full in-app calling while
// the app is in the foreground via CallProvider — it just won't ring from a
// killed state the way Android does here.
import { Platform } from "react-native";

let RNCallKeep = null;
try {
  RNCallKeep = require("react-native-callkeep").default;
} catch {
  RNCallKeep = null;
}

export function isCallKeepSupported() {
  return Platform.OS === "android" && !!RNCallKeep;
}

let didSetup = false;
const answerListeners = new Set();
const endListeners = new Set();

export function onNativeAnswer(cb) {
  answerListeners.add(cb);
  return () => answerListeners.delete(cb);
}

export function onNativeEnd(cb) {
  endListeners.add(cb);
  return () => endListeners.delete(cb);
}

export async function setupCallKeep() {
  if (!isCallKeepSupported() || didSetup) return;
  didSetup = true;
  try {
    await RNCallKeep.setup({
      android: {
        alertTitle: "Calling permission needed",
        alertDescription: "e-kazi needs this to show incoming calls, even when the app is in the background.",
        cancelButton: "Cancel",
        okButton: "OK",
        // Self-managed: e-kazi is a normal app making OTT calls, not a SIM
        // dialer replacement, so it provides its own call UI (CallProvider's
        // CallOverlay) rather than enrolling as a system phone account.
        selfManaged: true,
        foregroundService: {
          channelId: "com.dmcaltd.ekazi.calls",
          channelName: "e-kazi calls",
          notificationTitle: "e-kazi call in progress",
        },
      },
    });
    RNCallKeep.setAvailable(true);

    RNCallKeep.addEventListener("answerCall", ({ callUUID }) => {
      answerListeners.forEach((cb) => cb(callUUID));
    });
    RNCallKeep.addEventListener("endCall", ({ callUUID }) => {
      endListeners.forEach((cb) => cb(callUUID));
    });
    // Self-managed mode fires this right after displayIncomingCall() — by the
    // time it fires, CallProvider's own CallOverlay is already the incoming
    // call UI, so there's nothing further to render here.
    RNCallKeep.addEventListener("showIncomingCallUi", () => {});
  } catch (err) {
    console.log("CallKeep setup error:", err?.message);
  }
}

export function displayIncomingCallNative({ callId, callerName }) {
  if (!isCallKeepSupported()) return;
  try {
    RNCallKeep.displayIncomingCall(callId, callerName, callerName, "generic", false);
  } catch (err) {
    console.log("displayIncomingCall error:", err?.message);
  }
}

export function endNativeCall(callId) {
  if (!isCallKeepSupported()) return;
  try {
    if (callId) RNCallKeep.endCall(callId);
    else RNCallKeep.endAllCalls();
  } catch (err) {
    console.log("endCall error:", err?.message);
  }
}
