import axios from "axios";
import db from "../db/index.js";
import { buildChannelId, categoryForNotification } from "./pushCategories.js";
import { loadNotificationSettings } from "./notificationSettingsStore.js";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 90;

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Mirrors mobile/src/views/Settings/NotificationSettings.js messagePopupText().
// The real OS notification text is decided here, at send time, since once a
// push is delivered its title/body can't be re-rendered client side.
function messagePreviewBody(setting, senderName, messagePreview) {
  if (setting === "hide_all") return "You received a new message";
  if (setting === "hide_message") return `${senderName || "Someone"} sent you a message`;
  return `${senderName || "Someone"}: ${messagePreview || "New message"}`;
}

async function unreadBadgeCount(profileUuid) {
  const row = await db("notifications").where({ profile_uuid: profileUuid, read: false }).count("* as count").first();
  return Number(row?.count || 0);
}

async function cleanupTickets(tickets, batch) {
  if (!Array.isArray(tickets)) return;
  await Promise.all(
    tickets.map(async (ticket, index) => {
      if (ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        const token = batch[index]?.to;
        if (token) {
          await db("push_tokens").where({ expo_push_token: token }).del().catch(() => {});
        }
      }
    })
  );
}

// Only these two categories get a dedicated "header" on the push itself —
// they're the ones that actually pile up (many chat messages, many
// applicants on a popular job), so leading with the category name instead of
// the specific job context makes the notification shade scannable. Every
// other category (follows, likes, comments, job status, direct hire, calls)
// keeps its normal specific title, mirroring the same messages/applications
// split used for section headers in the in-app Notifications screen (see
// mobile/src/notifications/notificationRouting.js#notificationSection).
const CATEGORY_HEADERS = { messages: "Messages", applications: "Applications" };

// Sends a real OS push notification for a notification row that was just
// inserted (see notificationSettings.js#insertNotification). Any failure here
// is logged and swallowed - a push delivery problem should never break the
// underlying job/post/message action that triggered it.
export async function sendPushForNotification(notification) {
  try {
    const profileUuid = notification?.profile_uuid;
    if (!profileUuid) return;

    const tokens = await db("push_tokens").where({ profile_uuid: profileUuid }).select("expo_push_token", "platform");
    if (!tokens.length) return;

    const settings = await loadNotificationSettings(profileUuid);
    const category = categoryForNotification(notification);
    const soundEnabled = settings.enable_sound !== false;
    const vibrationEnabled = settings.enable_vibration !== false;
    const channelId = buildChannelId(category, { sound: soundEnabled, vibration: vibrationEnabled });
    const badge = await unreadBadgeCount(profileUuid);

    let title = notification.title || "e-kazi";
    let body = notification.body || "";
    if (category === "messages") {
      const previewSetting = settings.message_preview_privacy || "show_all";
      body = messagePreviewBody(previewSetting, notification.meta?.sender_name, notification.meta?.message_preview);
    }

    // Demote the specific title (e.g. "Job QHWU - Develop website") to an
    // iOS subtitle line, and promote the category name to the header both
    // platforms actually render: on Android that's the bold title line; on
    // iOS it's title + subtitle stacked. Android has no public "subText"
    // field through Expo's remote push payload, so the title swap is what
    // carries the header there.
    let subtitle;
    const headerLabel = CATEGORY_HEADERS[category];
    if (headerLabel) {
      subtitle = title;
      title = headerLabel;
    }

    const data = {
      notification_id: notification.id,
      type: notification.type,
      system: notification.system,
      job_id: notification.job_id || null,
      post_id: notification.post_id || null,
      job_code: notification.job_code || null,
      category,
      meta: notification.meta || {},
    };

    const messages = tokens
      .filter((row) => typeof row.expo_push_token === "string" && row.expo_push_token.startsWith("ExponentPushToken"))
      .map((row) => ({
        to: row.expo_push_token,
        title,
        ...(subtitle ? { subtitle } : {}),
        body,
        data,
        sound: soundEnabled ? "default" : null,
        priority: "high",
        channelId: row.platform === "android" ? channelId : undefined,
        badge: row.platform === "ios" ? badge : undefined,
      }));

    if (!messages.length) return;

    for (const batch of chunk(messages, BATCH_SIZE)) {
      const res = await axios.post(EXPO_PUSH_ENDPOINT, batch, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        timeout: 10000,
      });
      await cleanupTickets(res.data?.data, batch);
    }
  } catch (err) {
    console.error("sendPushForNotification error:", err?.response?.data || err?.message || err);
  }
}
