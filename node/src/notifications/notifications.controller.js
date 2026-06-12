import db from "../db/index.js";

function profileUuid(req) {
  return req.user?.uuid || req.viewer?.uuid;
}

export async function listNotifications(req, res) {
  try {
    const uuid = profileUuid(req);
    const notifications = await db("notifications")
      .where({ profile_uuid: uuid })
      .orderBy("created_at", "desc")
      .limit(100);
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
