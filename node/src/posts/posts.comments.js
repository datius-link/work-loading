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

function avatar(name) {
  const safe = encodeURIComponent(name || "user");
  return `https://ui-avatars.com/api/?name=${safe}&background=0B6B63&color=fff`;
}

export async function resolveMentions(text) {
  const mentions = extractMentions(text).filter((mention) => mention.type === "user");
  if (!mentions.length) return [];

  const usernames = [...new Set(mentions.map((mention) => mention.value))];
  const profiles = await db("profiles")
    .select("uuid", "username", "profile_pic")
    .whereIn("username", usernames);

  return profiles.map((profile) => ({
    username: profile.username,
    uuid: profile.uuid,
    profile_pic: profile.profile_pic || avatar(profile.username),
  }));
}

async function commentAuthor(profileUuid) {
  const profile = await db("profiles").where({ uuid: profileUuid }).first();
  const username = profile?.username || String(profile?.email || "user").split("@")[0] || "user";

  return {
    username,
    profile_pic: profile?.profile_pic || avatar(username),
    author_id: profileUuid,
    author_type: "user",
  };
}

export async function enrichCommentRow(row, parentRow = null) {
  const author = await commentAuthor(row.profile_uuid);
  let reply_to_username = null;
  let reply_to_profile_uuid = null;

  if (parentRow?.profile_uuid) {
    const parentAuthor = await commentAuthor(parentRow.profile_uuid);
    reply_to_username = parentAuthor.username;
    reply_to_profile_uuid = parentRow.profile_uuid;
  }

  const mentions = await resolveMentions(row.text);

  return {
    id: row.id,
    text: row.text,
    parent_id: row.parent_id,
    created_at: row.created_at,
    time_text: formatCommentTime(row.created_at),
    username: author.username,
    profile_pic: author.profile_pic,
    author_id: author.author_id,
    author_type: author.author_type,
    reply_to_username,
    reply_to_profile_uuid,
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

  const sortByDate = (list) => list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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

  const parentRow = row.parent_id
    ? await db("post_comments").where({ id: row.parent_id }).first()
    : null;

  return enrichCommentRow(row, parentRow);
}
