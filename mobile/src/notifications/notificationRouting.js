// Shared between the in-app Notifications screen (Alert.js) and the push
// notification tap handler (pushNotifications.js), so an item is styled and
// routed the exact same way whether the user taps it in-app or taps an OS
// notification for it. This is the same logic that previously lived only in
// Alert.js.

export const TYPE_STYLES = {
  message: { icon: "message", color: "#1683C7", label: "Message" },
  follow: { icon: "plusUser", color: "#0B6B63", label: "Follow" },
  like: { icon: "heart", color: "#E63946", label: "Like" },
  comment: { icon: "comment", color: "#7C3AED", label: "Comment" },
  mention: { icon: "tag", color: "#D97706", label: "Mention" },
  directHire: { icon: "direct-hire", color: "#0F766E", label: "Direct hire" },
  application: { icon: "users", color: "#2563EB", label: "Application" },
  jobStatus: { icon: "briefcase", color: "#16A34A", label: "Job update" },
  followedPost: { icon: "posts", color: "#0891B2", label: "Followed post" },
  warning: { icon: "warning", color: "#F59E0B", label: "Attention" },
  general: { icon: "bell", color: "#64748B", label: "e-kazi" },
};

export function typeTone(item) {
  const raw = `${item?.type || ""} ${item?.system || ""} ${item?.title || ""}`.toLowerCase();
  const metaAction = String(item?.meta?.action || "").toLowerCase();

  if (raw.includes("message")) return TYPE_STYLES.message;
  if (raw.includes("follow")) return raw.includes("post") ? TYPE_STYLES.followedPost : TYPE_STYLES.follow;
  if (raw.includes("like") || raw.includes("reaction")) return TYPE_STYLES.like;
  if (raw.includes("comment") || raw.includes("reply")) return TYPE_STYLES.comment;
  if (raw.includes("mention") || raw.includes("tag")) return TYPE_STYLES.mention;
  if (raw.includes("direct")) return TYPE_STYLES.directHire;
  if (raw.includes("application") || raw.includes("applicant") || raw.includes("provider_withdrew")) return TYPE_STYLES.application;
  if (
    raw.includes("accepted") ||
    raw.includes("assigned") ||
    raw.includes("confirmed") ||
    raw.includes("completed") ||
    raw.includes("start_") ||
    raw.includes("completion_") ||
    raw.includes("filled") ||
    metaAction.includes("workspace") ||
    metaAction.includes("confirm")
  ) return TYPE_STYLES.jobStatus;
  if (raw.includes("declined") || raw.includes("cancelled") || raw.includes("warning")) return TYPE_STYLES.warning;
  if (raw.includes("post") || item?.post_id) return TYPE_STYLES.followedPost;
  return TYPE_STYLES.general;
}

// Which section of the in-app Notifications screen an item belongs to.
// Only "messages" and "applications" get their own header there (and their
// own header line on the OS push, see pushService.js#CATEGORY_HEADERS on the
// server) — everything else (follows, likes, comments, job updates, direct
// hire, followed posts) shares one chronological "Activity" section instead
// of getting a header per type, since most of those are one-off/low-volume.
export function notificationSection(item) {
  const raw = `${item?.type || ""} ${item?.system || ""} ${item?.title || ""}`.toLowerCase();
  if (raw.includes("message")) return "messages";
  if (raw.includes("application") || raw.includes("applicant") || raw.includes("provider_withdrew")) return "applications";
  return "activity";
}

export function notificationDestination(item) {
  const raw = `${item?.type || ""} ${item?.system || ""} ${item?.title || ""}`.toLowerCase();
  const action = String(item?.meta?.action || "").toLowerCase();
  const jobId = item?.job_id || item?.meta?.job_id;
  const post = item?.meta?.post || null;
  const postId = item?.post_id || item?.meta?.post_id;

  // Incoming/missed call pushes both belong on the workspace's Calls tab —
  // if the call is still actually ringing when this is tapped, CallProvider's
  // own global incomingFor subscription (see CallProvider.js) will already be
  // showing the CallOverlay on top of whatever screen this lands on; if it's
  // already resolved (missed, declined, ended) by the time they tap, the
  // Calls tab is exactly where the new history row is waiting.
  const isCall = raw.includes("call") && !raw.includes("recall");
  if (jobId && isCall) {
    return { name: "JobWorkspace", params: { jobId, tab: "calls" } };
  }

  const isMessage = raw.includes("message") || action.includes("message");
  const isProgress =
    raw.includes("start_") ||
    raw.includes("completion_") ||
    raw.includes("completed") ||
    raw.includes("confirmed") ||
    raw.includes("rejected") ||
    raw.includes("cancelled") ||
    raw.includes("filled") ||
    action.includes("progress") ||
    action.includes("confirm") ||
    action.includes("rate");

  if (jobId && isMessage) {
    return { name: "JobWorkspace", params: { jobId, tab: "chat", unreadMessageId: item?.meta?.message_id } };
  }

  if (jobId && isProgress) {
    return { name: "JobWorkspace", params: { jobId, tab: "progress", notificationId: item?.id } };
  }

  if (post) {
    return { name: "PostFeedView", params: { posts: [post], initialPostId: post.id || postId, preferredAuthActor: "viewer" } };
  }

  if (jobId) {
    return { name: "JobDetails", params: { jobId } };
  }

  return null;
}

// Same as notificationDestination(), but falls back to the Notifications
// screen instead of doing nothing. Used when a push notification is tapped
// from outside the app (cold start / background) - there's no "current
// screen" to just stay on, so "normal notification" items need somewhere to
// land.
export function resolveNotificationDestination(item, { fallbackToAlerts = false } = {}) {
  const destination = notificationDestination(item);
  if (destination) return destination;
  return fallbackToAlerts ? { name: "Alerts", params: {} } : null;
}
