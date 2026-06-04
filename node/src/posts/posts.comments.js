import db from "../db/index.js";
import { extractMentions } from "./posts.utils.js";

export function formatCommentTime(createdAt) {
  if (!createdAt) return "now";

  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now - date;

  if (diffMs < 60_000) return "now";

  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m`;

  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function viewerUsername(email) {
  if (!email) return "user";
  return String(email).split("@")[0] || "user";
}

function viewerAvatar(name) {
  const safe = encodeURIComponent(name || "user");
  return `https://ui-avatars.com/api/?name=${safe}&background=0B6B63&color=fff`;
}

export async function resolveMentions(text) {
  const mentions = extractMentions(text).filter((m) => m.type === "user");

  if (!mentions.length) return [];

  const usernames = [...new Set(mentions.map((m) => m.value))];

  const providers = await db("provider_profiles")
    .select("provider_uuid", "username", "profile_pic")
    .whereIn("username", usernames);

  return providers.map((p) => ({
    username: p.username,
    provider_uuid: p.provider_uuid,
    profile_pic: p.profile_pic || viewerAvatar(p.username),
  }));
}

export async function enrichCommentRow(row, parentRow = null) {
  let username = "user";
  let profile_pic = viewerAvatar("user");
  let author_id = null;
  let author_type = "viewer";

  if (row.provider_uuid) {
    const profile = await db("provider_profiles")
      .where({ provider_uuid: row.provider_uuid })
      .first();

    username = profile?.username || "provider";
    profile_pic =
      profile?.profile_pic || viewerAvatar(profile?.username || "provider");
    author_id = row.provider_uuid;
    author_type = "provider";
  } else if (row.viewer_uuid) {
    const viewer = await db("viewer_users")
      .where({ uuid: row.viewer_uuid })
      .first();

    username = viewerUsername(viewer?.email);
    profile_pic = viewerAvatar(username);
    author_id = row.viewer_uuid;
    author_type = "viewer";
  }

  let reply_to_username = null;
  let reply_to_provider_uuid = null;

  if (parentRow) {
    if (parentRow.provider_uuid) {
      const parentProfile = await db("provider_profiles")
        .where({ provider_uuid: parentRow.provider_uuid })
        .first();
      reply_to_username = parentProfile?.username || "provider";
      reply_to_provider_uuid = parentRow.provider_uuid;
    } else if (parentRow.viewer_uuid) {
      const parentViewer = await db("viewer_users")
        .where({ uuid: parentRow.viewer_uuid })
        .first();
      reply_to_username = viewerUsername(parentViewer?.email);
    }
  }

  const mentions = await resolveMentions(row.text);

  return {
    id: row.id,
    text: row.text,
    parent_id: row.parent_id,
    created_at: row.created_at,
    time_text: formatCommentTime(row.created_at),
    username,
    profile_pic,
    author_id,
    author_type,
    reply_to_username,
    reply_to_provider_uuid,
    mentions,
  };
}

export function buildCommentTree(flatComments) {
  const map = new Map();
  const roots = [];

  flatComments.forEach((comment) => {
    map.set(comment.id, { ...comment, replies: [] });
  });

  map.forEach((comment) => {
    if (comment.parent_id && map.has(comment.parent_id)) {
      map.get(comment.parent_id).replies.push(comment);
    } else {
      roots.push(comment);
    }
  });

  const sortByDate = (list) =>
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const sortTree = (nodes) => {
    sortByDate(nodes);
    nodes.forEach((node) => {
      if (node.replies?.length) sortTree(node.replies);
    });
  };

  sortTree(roots);
  return roots;
}

export async function fetchCommentById(commentId) {
  const row = await db("post_comments").where({ id: commentId }).first();
  if (!row) return null;

  let parentRow = null;
  if (row.parent_id) {
    parentRow = await db("post_comments").where({ id: row.parent_id }).first();
  }

  return enrichCommentRow(row, parentRow);
}
