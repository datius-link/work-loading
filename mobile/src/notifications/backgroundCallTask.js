// The one piece of "ring even when the app is backgrounded/killed" that
// actually runs outside a normal React tree: Expo's background notification
// task briefly boots a headless JS context when a push arrives, whether or
// not the app is open. If that push is our "incoming_call" type, we hand it
// straight to CallKeep so Android shows a real ringing UI — CallProvider
// picks the rest up normally once the user taps into the app.
import * as TaskManager from "expo-task-manager";
import { getNotificationsModule, isRunningInExpoGo } from "./notificationRuntime";
import { displayIncomingCallNative, isCallKeepSupported } from "../calling/callKeepBridge";

export const BACKGROUND_CALL_TASK = "EKAZI_BACKGROUND_CALL_TASK";

if (!isRunningInExpoGo()) {
  TaskManager.defineTask(BACKGROUND_CALL_TASK, ({ data, error }) => {
    if (error) {
      console.log("background call task error:", error?.message || error);
      return;
    }
    try {
      const content = data?.notification?.request?.content;
      const payload = content?.data;
      if (payload?.type === "incoming_call" && isCallKeepSupported()) {
        const meta = payload.meta || {};
        displayIncomingCallNative({
          callId: String(meta.call_id || ""),
          callerName: meta.caller_name || "Work Loading user",
        });
      }
    } catch (err) {
      console.log("background call task handling error:", err?.message);
    }
  });
}

export async function registerBackgroundCallTask() {
  if (isRunningInExpoGo()) return;
  const Notifications = getNotificationsModule();
  if (!Notifications?.registerTaskAsync) return;
  try {
    await Notifications.registerTaskAsync(BACKGROUND_CALL_TASK);
  } catch (err) {
    console.log("registerBackgroundCallTask error:", err?.message);
  }
}
