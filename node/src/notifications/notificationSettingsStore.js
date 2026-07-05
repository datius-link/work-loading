import db from "../db/index.js";

// Mirrors mobile/src/views/Settings/NotificationSettings.js DEFAULT_NOTIFICATION_SETTINGS.
// Keep both in sync.
export const DEFAULT_NOTIFICATION_SETTINGS = {
  enable_messages_notifications: true,
  enable_job_notifications: true,
  enable_follow_post_notifications: true,
  enable_sound: true,
  enable_vibration: true,
  popup_previews: true,
  message_preview_privacy: "show_all",
};

export async function loadNotificationSettings(profileUuid, trx = db) {
  const profile = await trx("profiles").where({ uuid: profileUuid }).select("privacy_settings").first();
  const stored = profile?.privacy_settings?.notification_settings;
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}),
  };
}
