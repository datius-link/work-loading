import db from "../db/index.js";

const DEFAULT_NOTIFICATION_SETTINGS = {
  enable_messages_notifications: true,
  enable_job_notifications: true,
  enable_follow_post_notifications: true,
};

function notificationBucket(type, system) {
  const raw = `${type || ""} ${system || ""}`.toLowerCase();
  if (raw.includes("message")) return "enable_messages_notifications";
  if (raw.includes("hiring") || raw.includes("job") || raw.includes("application") || raw.includes("direct")) return "enable_job_notifications";
  if (raw.includes("profile") || raw.includes("post") || raw.includes("follow") || raw.includes("like") || raw.includes("comment") || raw.includes("mention") || raw.includes("tag")) return "enable_follow_post_notifications";
  return null;
}

export async function notificationAllowed(profileUuid, type, system = "general", trx = db) {
  if (!profileUuid) return false;
  const bucket = notificationBucket(type, system);
  if (!bucket) return true;

  const profile = await trx("profiles").where({ uuid: profileUuid }).select("privacy_settings").first();
  const settings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...((profile?.privacy_settings?.notification_settings && typeof profile.privacy_settings.notification_settings === "object") ? profile.privacy_settings.notification_settings : {}),
  };
  return settings[bucket] !== false;
}

export async function insertNotification(trx, payload) {
  const allowed = await notificationAllowed(payload?.profile_uuid, payload?.type, payload?.system, trx);
  if (!allowed) return null;
  return trx("notifications").insert(payload);
}