import { Platform } from "react-native";
import { getNotificationsModule } from "./notificationRuntime";
import { PUSH_CATEGORIES, buildChannelId } from "./pushCategories";

const CATEGORY_LABELS = {
  messages: "Messages",
  job_status: "Job Updates",
  applications: "Applications",
  direct_hire: "Direct Hire",
  calls: "Calls",
  general: "General",
};

const SOUND_VIBRATION_COMBOS = [
  { sound: true, vibration: true },
  { sound: true, vibration: false },
  { sound: false, vibration: true },
  { sound: false, vibration: false },
];

// Android locks a channel's sound/vibration behaviour in at creation time -
// the app can't change it later, only the user can (in system settings). So
// instead of one channel per category, we pre-create every
// (category x sound x vibration) combination once, and pick the channel
// that matches the user's *current* NotificationSettings.js preferences
// whenever we schedule/send a notification (see pushNotifications.js and
// the server's pushService.js).
export async function ensureAndroidNotificationChannelsAsync() {
  if (Platform.OS !== "android") return;
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await Promise.all(
    PUSH_CATEGORIES.flatMap((category) =>
      SOUND_VIBRATION_COMBOS.map((combo) => {
        const channelId = buildChannelId(category, combo);
        const label = CATEGORY_LABELS[category] || "e-kazi";
        const suffix = combo.sound && combo.vibration
          ? ""
          : combo.sound
            ? " (sound only)"
            : combo.vibration
              ? " (vibrate only)"
              : " (silent)";

        return Notifications.setNotificationChannelAsync(channelId, {
          name: `${label}${suffix}`,
          // Calls ring even under Do Not Disturb-adjacent conditions and
          // reliably show as a heads-up banner, which is why they get MAX
          // instead of the HIGH used for every other category — this is
          // what gives CallKeep's native ringing screen the best chance of
          // actually surfacing when the app is backgrounded.
          importance: category === "calls" ? Notifications.AndroidImportance.MAX : Notifications.AndroidImportance.HIGH,
          sound: combo.sound ? "default" : undefined,
          enableVibrate: combo.vibration,
          vibrationPattern: combo.vibration ? [0, 250, 250, 250] : undefined,
          lightColor: "#0B6B63",
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      })
    )
  );
}
