import db from "../db/index.js";
import { DEFAULT_NOTIFICATION_SETTINGS, loadNotificationSettings } from "./notificationSettingsStore.js";
import { sendPushForNotification } from "./pushService.js";

export { DEFAULT_NOTIFICATION_SETTINGS, loadNotificationSettings };

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

  const settings = await loadNotificationSettings(profileUuid, trx);
  return settings[bucket] !== false;
}

// A Knex `db.raw("?::jsonb", [JSON.stringify(obj)])` binding isn't a plain
// object, so callers that already built the jsonb raw value (every call site
// in hiring.controller.js / posts.controller.js) still need their original
// meta object recovered here - it's pulled straight back out of the raw
// binding rather than requiring every call site to be rewritten.
function extractMetaObject(meta) {
  if (!meta) return {};
  if (typeof meta === "object" && !Array.isArray(meta) && meta.constructor === Object) return meta;
  try {
    const bindings = meta?.bindings;
    if (Array.isArray(bindings) && typeof bindings[0] === "string") return JSON.parse(bindings[0]);
  } catch (_) {
    // fall through
  }
  return {};
}

export async function insertNotification(trx, payload) {
  const allowed = await notificationAllowed(payload?.profile_uuid, payload?.type, payload?.system, trx);
  if (!allowed) return null;

  const metaObject = extractMetaObject(payload?.meta);
  const [row] = await trx("notifications")
    .insert({
      ...payload,
      meta: db.raw("?::jsonb", [JSON.stringify(metaObject)]),
    })
    .returning("*");

  if (row) {
    // Fire-and-forget: a push delivery failure must never break the caller's
    // transaction/response.
    sendPushForNotification({ ...row, meta: metaObject }).catch((err) => {
      console.error("push notification dispatch error:", err?.message || err);
    });
  }

  return row;
}
