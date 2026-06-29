import db from "../db/index.js";

const DEFAULT_NOTIFICATION_SETTINGS = {
  enable_messages_notifications: true,
  enable_job_notifications: true,
  enable_follow_post_notifications: true,
};

function profileUuid(req) {
  return req.user?.uuid || req.viewer?.uuid;
}

function settingKeyForNotification(item) {
  const raw = `${item?.type || ""} ${item?.system || ""}`.toLowerCase();
  if (raw.includes("message")) return "enable_messages_notifications";
  if (raw.includes("hiring") || raw.includes("job") || raw.includes("application") || raw.includes("direct")) return "enable_job_notifications";
  if (raw.includes("profile") || raw.includes("post") || raw.includes("follow") || raw.includes("like") || raw.includes("comment") || raw.includes("mention") || raw.includes("tag")) return "enable_follow_post_notifications";
  return null;
}

function withJobTitle(item) {
  const jobTitle = item.job_title || "";
  const jobCode = item.job_code || item.meta?.job_code || "";
  if (!jobTitle || !jobCode) return item;
  const expected = `Job ${jobCode}`;
  const title = !item.title || item.title === expected ? `${expected} - ${jobTitle}` : item.title;
  return { ...item, title, job_title: jobTitle };
}

export async function listNotifications(req, res) {
  try {
    const uuid = profileUuid(req);
    const profile = await db("profiles").where({ uuid }).select("privacy_settings").first();
    const settings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...((profile?.privacy_settings?.notification_settings && typeof profile.privacy_settings.notification_settings === "object") ? profile.privacy_settings.notification_settings : {}),
    };

    const rows = await db("notifications as n")
      .leftJoin("jobs as j", "j.id", "n.job_id")
      .where("n.profile_uuid", uuid)
      .select("n.*", "j.title as job_title")
      .orderBy("n.created_at", "desc")
      .limit(100);

    const notifications = rows
      .filter((item) => {
        const key = settingKeyForNotification(item);
        return !key || settings[key] !== false;
      })
      .map(withJobTitle);

    return res.json({ notifications });
  } catch (err) {
    console.error("listNotifications error:", err);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const uuid = profileUuid(req);
    await db("notifications").where({ id: req.params.id, profile_uuid: uuid }).update({ read: true, updated_at: db.fn.now() });
    return res.json({ success: true });
  } catch (err) {
    console.error("markNotificationRead error:", err);
    return res.status(500).json({ message: "Failed to update notification" });
  }
}