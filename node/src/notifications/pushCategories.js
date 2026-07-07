// Shared push-notification category + Android channel naming.
//
// IMPORTANT: this logic is intentionally mirrored, line for line, in
// mobile/src/notifications/pushCategories.js. The mobile app pre-creates one
// Android notification channel per (category, sound, vibration) combination
// at startup, and this server picks the matching channel id when it sends a
// push so the OS applies the right sound/vibration behaviour. If you change
// the category rules here, change them on the client too.

export const PUSH_CATEGORIES = ["messages", "job_status", "applications", "direct_hire", "calls", "general"];

export function buildChannelId(category, { sound, vibration } = {}) {
  const cat = PUSH_CATEGORIES.includes(category) ? category : "general";
  const soundPart = sound ? "s1" : "s0";
  const vibratePart = vibration ? "v1" : "v0";
  return `${cat}__${soundPart}${vibratePart}`;
}

// Classifies a notification row (type/system/meta) into one of the five
// categories the app supports. This mirrors the heuristics already used by
// the mobile app's Notifications screen (see notificationRouting.js /
// former Alert.js typeTone()), so a push and its in-app counterpart always
// agree on category, channel, and (via notificationRouting) destination.
export function categoryForNotification({ type, system, meta } = {}) {
  const raw = `${type || ""} ${system || ""}`.toLowerCase();
  const action = String(meta?.action || meta?.application_action || "").toLowerCase();

  if (raw.includes("call")) return "calls";
  if (raw.includes("message")) return "messages";
  if (raw.includes("direct")) return "direct_hire";
  if (raw.includes("application") || raw.includes("provider_withdrew") || action.includes("application")) {
    return "applications";
  }
  if (
    raw.includes("start_") ||
    raw.includes("completion_") ||
    raw.includes("completed") ||
    raw.includes("confirmed") ||
    raw.includes("rejected") ||
    raw.includes("cancelled") ||
    raw.includes("filled") ||
    action.includes("progress") ||
    action.includes("confirm") ||
    action.includes("rate")
  ) {
    return "job_status";
  }
  return "general";
}
