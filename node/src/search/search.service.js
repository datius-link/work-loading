import db from "../db/index.js";
import { enrichPostsWithViewerState } from "../posts/posts.feed.js";
import {
  hashtagSearchTerms,
  normalizeHashtag,
  parseSearchQuery,
} from "./search.normalization.js";

function safeLimit(value, fallback = 20, maximum = 50) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function safeOffset(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function searchPeople(query, options = {}) {
  const { plain } = parseSearchQuery(query);
  if (!plain) return [];

  const limit = safeLimit(options.limit, 10);
  const offset = safeOffset(options.offset);
  const exact = plain.toLowerCase();
  const starts = `${exact}%`;
  const contains = `%${exact}%`;

  return db("profiles")
    .select("uuid", "username", "full_name", "profile_pic", "bio", "services")
    .where((qb) => {
      qb.whereILike("username", contains)
        .orWhereILike("full_name", contains)
        .orWhereRaw("services::text ILIKE ?", [contains]);
    })
    .orderByRaw(
      `CASE
        WHEN LOWER(username) = ? THEN 0
        WHEN LOWER(username) LIKE ? THEN 1
        WHEN LOWER(full_name) LIKE ? THEN 2
        WHEN LOWER(full_name) LIKE ? THEN 3
        WHEN services::text ILIKE ? THEN 4
        ELSE 5
      END`,
      [exact, starts, starts, contains, contains]
    )
    .orderBy("username", "asc")
    .limit(limit)
    .offset(offset);
}

export async function searchHashtags(query, options = {}) {
  const { hashtag } = parseSearchQuery(query);
  if (!hashtag) return [];

  const limit = safeLimit(options.limit, 10);
  const offset = safeOffset(options.offset);
  const starts = `${hashtag}%`;
  const searchTerms = hashtagSearchTerms(hashtag);
  const patterns = searchTerms.map((term) => `%${normalizeHashtag(term)}%`);
  const filters = patterns
    .map(() => "REGEXP_REPLACE(LOWER(name), '[^a-z0-9]', '', 'g') LIKE ?")
    .join(" OR ");

  const result = await db.raw(
    `
      WITH discoverable AS (
        SELECT LOWER(pm.value) AS name, pm.post_id
        FROM post_mentions pm
        WHERE pm.type IN ('service', 'hashtag')
        UNION ALL
        SELECT LOWER(skill.value) AS name, NULL::integer AS post_id
        FROM profiles profile
        CROSS JOIN LATERAL jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(profile.services) = 'array' THEN profile.services ELSE '[]'::jsonb END
        ) AS skill(value)
      )
      SELECT name, COUNT(DISTINCT post_id)::int AS posts_count
      FROM discoverable
      WHERE (${filters})
      GROUP BY name
      ORDER BY
        CASE
          WHEN REGEXP_REPLACE(LOWER(name), '[^a-z0-9]', '', 'g') = ? THEN 0
          WHEN REGEXP_REPLACE(LOWER(name), '[^a-z0-9]', '', 'g') LIKE ? THEN 1
          ELSE 2
        END,
        posts_count DESC,
        name ASC
      LIMIT ? OFFSET ?
    `,
    [...patterns, hashtag, `${hashtag}%`, limit, offset]
  );

  const rows = result.rows || result;
  const merged = new Map();
  rows.forEach((row) => {
    const name = normalizeHashtag(row.name);
    const current = merged.get(name) || { name, posts_count: 0 };
    current.posts_count += Number(row.posts_count) || 0;
    merged.set(name, current);
  });
  return [...merged.values()].slice(0, limit);
}

function postMediaSql() {
  return `
    COALESCE(
      (
        SELECT json_agg(json_build_object('url', media.url, 'type', media.media_type, 'fit', media.fit_mode) ORDER BY media."order")
        FROM post_media media
        WHERE media.post_id = p.id
      ),
      '[]'
    ) as media
  `;
}

export async function searchPosts(query, viewerUuid, options = {}) {
  const { plain, hashtag } = parseSearchQuery(query);
  if (!plain) return [];

  const limit = safeLimit(options.limit, 20);
  const offset = safeOffset(options.offset);
  const plainContains = `%${plain}%`;
  const hashtagContains = `%${hashtag || plain}%`;
  const compactContains = `%${normalizeHashtag(hashtag || plain)}%`;

  const rows = await db("posts as p")
    .leftJoin("profiles as pr", "pr.uuid", "p.profile_uuid")
    .leftJoin("post_likes as pl", "pl.post_id", "p.id")
    .leftJoin("post_comments as pc", "pc.post_id", "p.id")
    .where((qb) => {
      qb.whereILike("pr.username", plainContains)
        .orWhereILike("pr.full_name", plainContains)
        .orWhereILike("p.caption", plainContains)
        .orWhereILike("p.location", plainContains)
        .orWhereRaw("pr.bio ILIKE ?", [plainContains])
        .orWhereRaw("pr.services::text ILIKE ?", [plainContains])
        .orWhereRaw(
          "REGEXP_REPLACE(LOWER(pr.services::text), '[^a-z0-9]', '', 'g') LIKE ?",
          [compactContains]
        )
        .orWhereExists(function relatedHashtag() {
          this.select(1)
            .from("post_mentions as pm")
            .whereRaw("pm.post_id = p.id")
            .whereIn("pm.type", ["service", "hashtag"])
            .where((mentionQuery) => {
              mentionQuery
                .whereILike("pm.value", hashtagContains)
                .orWhereRaw(
                  "REGEXP_REPLACE(LOWER(pm.value), '[^a-z0-9]', '', 'g') LIKE ?",
                  [compactContains]
                );
            });
        });
    })
    .select(
      "p.id",
      "p.profile_uuid",
      "p.caption",
      "p.location",
      "p.type",
      "p.created_at",
      "pr.username",
      "pr.full_name",
      "pr.profile_pic"
    )
    .select(
      db.raw("COUNT(DISTINCT pl.id)::int as likes_count"),
      db.raw("COUNT(DISTINCT pc.id)::int as comments_count"),
      db.raw(postMediaSql())
    )
    .groupBy(
      "p.id",
      "p.profile_uuid",
      "p.caption",
      "p.location",
      "p.type",
      "p.created_at",
      "pr.username",
      "pr.full_name",
      "pr.profile_pic"
    )
    .orderByRaw(
      `CASE
        WHEN LOWER(pr.username) = LOWER(?) THEN 0
        WHEN LOWER(pr.username) LIKE LOWER(?) THEN 1
        WHEN LOWER(pr.full_name) LIKE LOWER(?) THEN 2
        WHEN LOWER(pr.full_name) LIKE LOWER(?) THEN 3
        WHEN EXISTS (
          SELECT 1 FROM post_mentions rank_pm
          WHERE rank_pm.post_id = p.id
            AND rank_pm.type IN ('service', 'hashtag')
            AND LOWER(rank_pm.value) = LOWER(?)
        ) THEN 4
        WHEN EXISTS (
          SELECT 1 FROM post_mentions rank_pm
          WHERE rank_pm.post_id = p.id
            AND rank_pm.type IN ('service', 'hashtag')
            AND LOWER(rank_pm.value) LIKE LOWER(?)
        ) THEN 5
        WHEN p.caption ILIKE ? THEN 6
        ELSE 7
      END`,
      [plain, `${plain}%`, `${plain}%`, plainContains, hashtag, `${hashtag}%`, plainContains]
    )
    .orderBy("p.created_at", "desc")
    .limit(limit)
    .offset(offset);

  return enrichPostsWithViewerState(rows, viewerUuid || null);
}

export async function searchEverything(query, viewerUuid, options = {}) {
  const { mode } = parseSearchQuery(query);
  const limit = safeLimit(options.limit, 10);
  const offset = safeOffset(options.offset);

  if (mode === "users") {
    return { users: await searchPeople(query, { limit, offset }), hashtags: [], posts: [] };
  }
  if (mode === "hashtags") {
    return { users: [], hashtags: await searchHashtags(query, { limit, offset }), posts: [] };
  }

  const [users, hashtags, posts] = await Promise.all([
    searchPeople(query, { limit, offset }),
    searchHashtags(query, { limit, offset }),
    searchPosts(query, viewerUuid, { limit, offset }),
  ]);

  return { users, hashtags, posts };
}
