import {
  searchEverything,
  searchHashtags,
  searchPeople,
  searchPosts,
} from "./search.service.js";
import { parseSearchQuery } from "./search.normalization.js";

function actorUuid(req) {
  return req.viewer?.uuid || req.user?.uuid || null;
}

export async function search(req, res) {
  const q = String(req.query.q || "").trim();
  const type = String(req.query.type || "top").toLowerCase();
  const limit = req.query.limit;
  const offset = req.query.offset;

  if (!q.replace(/^[@#]+/, "").trim()) {
    return res.json({
      query: parseSearchQuery(q),
      users: [],
      hashtags: [],
      posts: [],
      pagination: { limit: Number(limit) || 20, offset: Number(offset) || 0, hasMore: false },
    });
  }

  try {
    let data;
    const parsed = parseSearchQuery(q);

    if (parsed.mode === "users") {
      data = { users: await searchPeople(q, { limit, offset }), hashtags: [], posts: [] };
    } else if (parsed.mode === "hashtags" && type !== "posts") {
      data = { users: [], hashtags: await searchHashtags(q, { limit, offset }), posts: [] };
    } else if (type === "people" || type === "users") {
      data = { users: await searchPeople(q, { limit, offset }), hashtags: [], posts: [] };
    } else if (type === "hashtags") {
      data = { users: [], hashtags: await searchHashtags(q, { limit, offset }), posts: [] };
    } else if (type === "posts") {
      data = { users: [], hashtags: [], posts: await searchPosts(q, actorUuid(req), { limit, offset }) };
    } else if (type === "suggestions") {
      const [users, hashtags] = await Promise.all([
        parsed.mode === "hashtags" ? [] : searchPeople(q, { limit, offset }),
        parsed.mode === "users" ? [] : searchHashtags(q, { limit, offset }),
      ]);
      data = { users, hashtags, posts: [] };
    } else {
      data = await searchEverything(q, actorUuid(req), { limit, offset });
    }

    const selected = type === "people" || type === "users"
      ? data.users
      : type === "hashtags"
        ? data.hashtags
        : type === "posts"
          ? data.posts
          : [...data.users, ...data.hashtags, ...data.posts];

    return res.json({
      query: parseSearchQuery(q),
      ...data,
      pagination: {
        limit: Number(limit) || 20,
        offset: Number(offset) || 0,
        hasMore: selected.length >= (Number(limit) || 20),
      },
    });
  } catch (error) {
    console.error("search error:", error);
    return res.status(500).json({ message: "Search failed" });
  }
}
