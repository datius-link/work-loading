import db from "../db/index.js";
import { extractMentions } from "./posts.utils.js";
import {
  findUsersByUsername,
  findServices,
} from "./posts.service.js";
import {
  buildCommentTree,
  enrichCommentRow,
  fetchCommentById,
} from "./posts.comments.js";
import {
  enrichPostsWithViewerState,
  countCommentTree,
} from "./posts.feed.js";

/* =========================
   CREATE POST
========================= */
export async function createPost(req, res) {
  const providerUuid = req.user.uuid;
  const { caption, location, type, media } = req.body;

  if (!caption || !type || !Array.isArray(media) || media.length === 0) {
    return res.status(400).json({ message: "Invalid post payload" });
  }

  try {
    const mentions = extractMentions(caption);
    let postId;

    await db.transaction(async (trx) => {
      const [post] = await trx("posts")
        .insert({
          provider_uuid: providerUuid,
          caption,
          location: location || null,
          type,
        })
        .returning("id");

      postId = post.id;

      await trx("post_media").insert(
        media.map((m, index) => ({
          post_id: postId,
          url: m.url,
          media_type: m.type,
          fit_mode: m.fit || m.fit_mode || "cover",
          order: index,
        }))
      );

      if (mentions.length) {
        await trx("post_mentions").insert(
          mentions.map((m) => ({
            post_id: postId,
            type: m.type,
            value: m.value,
          }))
        );
      }
    });

    return res.status(201).json({ success: true, postId });
  } catch (err) {
    console.error("createPost error:", err);
    return res.status(500).json({ message: "Failed to create post" });
  }
}

/* =========================
   PUBLIC EXPLORE FEED
========================= */
export async function listPublicPosts(req, res) {
  try {
    const viewerUuid = req.viewer?.uuid || null;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const q = (req.query.q || "").trim();
    const qPlain = q.replace(/^[@#]+/, "");

    console.log("listPublicPosts called with:", { page, q, viewerUuid });

    // Check data existence
    const postCount = await db("posts").count("id as count").first();
    console.log("Total posts in DB:", postCount?.count || 0);

    let query = db("posts as p")
      .leftJoin("provider_profiles as pp", "pp.provider_uuid", "p.provider_uuid")
      .leftJoin("post_likes as pl", "pl.post_id", "p.id")
      .leftJoin("post_comments as pc", "pc.post_id", "p.id");

    if (q) {
      query = query.where((qb) => {
        qb.whereILike("p.caption", `%${q}%`)
          .orWhereILike("p.caption", `%${qPlain}%`)
          .orWhereILike("pp.full_name", `%${qPlain}%`)
          .orWhereILike("pp.username", `%${qPlain}%`);
      });
    }

    const posts = await query
      .select(
        "p.id",
        "p.provider_uuid",
        "p.caption",
        "p.location",
        "p.type",
        "p.created_at",
        "pp.username",
        "pp.full_name",
        "pp.profile_pic"
      )
      .select(
        db.raw(`COUNT(DISTINCT pl.id)::int as likes_count`),
        db.raw(`COUNT(DISTINCT pc.id)::int as comments_count`)
      )
      .select(
        db.raw(`
          COALESCE(
            (
              SELECT json_agg(json_build_object('url', pm.url, 'type', pm.media_type, 'fit', pm.fit_mode) ORDER BY pm."order")
              FROM post_media pm
              WHERE pm.post_id = p.id
            ),
            '[]'
          ) as media
        `)
      )
      .groupBy(
        "p.id",
        "p.provider_uuid",
        "p.caption",
        "p.location",
        "p.type",
        "p.created_at",
        "pp.username",
        "pp.full_name",
        "pp.profile_pic"
      )
      .orderBy("p.created_at", "desc")
      .limit(limit)
      .offset(offset);

    console.log(`Successfully fetched ${posts.length} posts`);

    const enrichedPosts = await enrichPostsWithViewerState(posts, viewerUuid);

    return res.json({
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });

  } catch (err) {
    console.error("listPublicPosts FULL error:", err?.message);
    console.error(err?.stack);
    return res.status(500).json({ 
      message: "Failed to load posts",
      debug: err?.message 
    });
  }
}
/* =========================
   SEARCH USERS (@)
========================= */
export async function searchUsers(req, res) {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);

  try {
    const users = await findUsersByUsername(q);
    return res.json(users);
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ message: "Failed to search users" });
  }
}

/* =========================
   SEARCH SERVICES (#)
========================= */
export async function searchServices(req, res) {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);

  try {
    const services = await findServices(q);
    return res.json(services);
  } catch (err) {
    console.error("searchServices error:", err);
    return res.status(500).json({ message: "Failed to search services" });
  }
}

/* =========================
   GET MY POSTS (authenticated provider)
========================= */
export async function listMyPosts(req, res) {
  const providerUuid = req.user.uuid;

  try {
    const posts = await db("posts as p")
      .join("provider_profiles as pp", "pp.provider_uuid", "p.provider_uuid")
      .select(
        "p.id",
        "p.provider_uuid",
        "p.caption",
        "p.location",
        "p.type",
        "p.created_at",
        "pp.username",
        "pp.full_name",
        "pp.profile_pic"
      )
      .select(
        db.raw(
          `COALESCE(
            (
              SELECT json_agg(json_build_object('url', pm.url, 'type', pm.media_type, 'fit', pm.fit_mode) ORDER BY pm."order")
              FROM post_media pm
              WHERE pm.post_id = p.id
            ),
            '[]'
          ) as media`
        )
      )
      .where("p.provider_uuid", providerUuid)
        .groupBy(
          "p.id",
          "p.provider_uuid",
          "p.caption",
          "p.location",
          "p.type",
          "p.created_at",
          "pp.username",
          "pp.full_name",
          "pp.profile_pic"
        )
      .orderBy("p.created_at", "desc");

    return res.json({ posts });
  } catch (err) {
    console.error("listMyPosts error:", err);
    return res.status(500).json({ message: "Failed to load your posts" });
  }
}

/* =========================
   GET PROVIDER POSTS (public profile)
========================= */
export async function listProviderPosts(req, res) {
  try {
    const { providerUuid } = req.params;
    const viewerUuid = req.viewer?.uuid || null;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!providerUuid) {
      return res.status(400).json({ message: "Provider UUID required" });
    }

    let query = db("posts as p")
      .leftJoin("provider_profiles as pp", "pp.provider_uuid", "p.provider_uuid")
      .leftJoin("post_likes as pl", "pl.post_id", "p.id")
      .leftJoin("post_comments as pc", "pc.post_id", "p.id");

    const posts = await query
      .select(
        "p.id",
        "p.provider_uuid",
        "p.caption",
        "p.location",
        "p.type",
        "p.created_at",
        "pp.username",
        "pp.full_name",
        "pp.profile_pic"
      )
      .select(
        db.raw(`COUNT(DISTINCT pl.id)::int as likes_count`),
        db.raw(`COUNT(DISTINCT pc.id)::int as comments_count`)
      )
      .select(
        db.raw(`
          COALESCE(
            (
              SELECT json_agg(json_build_object('url', pm.url, 'type', pm.media_type, 'fit', pm.fit_mode) ORDER BY pm."order")
              FROM post_media pm
              WHERE pm.post_id = p.id
            ),
            '[]'
          ) as media
        `)
      )
      .where("p.provider_uuid", providerUuid)
      .groupBy(
        "p.id",
        "p.provider_uuid",
        "p.caption",
        "p.location",
        "p.type",
        "p.created_at",
        "pp.username",
        "pp.full_name",
        "pp.profile_pic"
      )
      .orderBy("p.created_at", "desc")
      .limit(limit)
      .offset(offset);

    const enrichedPosts = await enrichPostsWithViewerState(posts, viewerUuid);

    return res.json({
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });

  } catch (err) {
    console.error("listProviderPosts error:", err?.message);
    return res.status(500).json({
      message: "Failed to load provider posts",
      debug: err?.message
    });
  }
}

export async function toggleLike(req, res) {
  const viewerUuid = req.viewer.uuid;
  const { postId } = req.params;

  const existing = await db("post_likes")
    .where({
      post_id: postId,
      viewer_uuid: viewerUuid,
    })
    .first();

  if (existing) {
    await db("post_likes")
      .where({ id: existing.id })
      .del();

    return res.json({
      liked: false,
    });
  }

  await db("post_likes").insert({
    post_id: postId,
    viewer_uuid: viewerUuid,
  });

  return res.json({
    liked: true,
  });
}

export async function getComments(req, res) {
  try {
    const postId = parseInt(req.params.postId, 10);

    if (!Number.isFinite(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const rows = await db("post_comments")
      .where({ post_id: postId })
      .orderBy("created_at", "asc");

    const parentMap = new Map(rows.map((row) => [row.id, row]));

    const enriched = await Promise.all(
      rows.map((row) => {
        const parentRow = row.parent_id
          ? parentMap.get(row.parent_id) || null
          : null;
        return enrichCommentRow(row, parentRow);
      })
    );

    const comments = buildCommentTree(enriched);
    const total_count = countCommentTree(comments);

    return res.json({ comments, total_count });
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({
      message: "Failed to load comments",
      error: err.message,
    });
  }
}

export async function createComment(req, res) {
  try {
    const postId = parseInt(req.params.postId, 10);

    if (!Number.isFinite(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const { text, parent_id } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        message: "Comment required",
      });
    }

    const isProvider = req.user?.role === "provider";
    const isViewer = req.viewer?.role === "viewer";

    if (!isProvider && !isViewer) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const post = await db("posts").where({ id: postId }).first();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const insertPayload = {
      post_id: postId,
      parent_id: parent_id || null,
      text: text.trim(),
      viewer_uuid: isViewer ? req.viewer.uuid : null,
      provider_uuid: isProvider ? req.user.uuid : null,
    };

    const [inserted] = await db("post_comments")
      .insert(insertPayload)
      .returning("*");

    const comment = await fetchCommentById(inserted.id);

    return res.json({
      success: true,
      comment,
    });
  } catch (err) {
    console.error("createComment error:", err);
    return res.status(500).json({
      message: "Failed to create comment",
      error: err.message,
    });
  }
}

export async function deleteComment(req, res) {
  try {
    const postId = parseInt(req.params.postId, 10);
    const commentId = parseInt(req.params.commentId, 10);

    if (!Number.isFinite(postId) || !Number.isFinite(commentId)) {
      return res.status(400).json({ message: "Invalid comment" });
    }

    const comment = await db("post_comments")
      .where({ id: commentId, post_id: postId })
      .first();

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isProviderOwner =
      req.user?.role === "provider" && comment.provider_uuid === req.user.uuid;
    const isViewerOwner =
      req.viewer?.role === "viewer" && comment.viewer_uuid === req.viewer.uuid;

    if (!isProviderOwner && !isViewerOwner) {
      return res.status(403).json({ message: "You can only delete your own comment" });
    }

    const rows = await db("post_comments")
      .select("id", "parent_id")
      .where({ post_id: postId });

    const childrenByParent = rows.reduce((map, row) => {
      if (!row.parent_id) return map;
      const list = map.get(row.parent_id) || [];
      list.push(row.id);
      map.set(row.parent_id, list);
      return map;
    }, new Map());

    const idsToDelete = [];
    const collect = (id) => {
      idsToDelete.push(id);
      (childrenByParent.get(id) || []).forEach(collect);
    };
    collect(commentId);

    await db("post_comments").whereIn("id", idsToDelete).del();

    return res.json({
      success: true,
      deleted_count: idsToDelete.length,
    });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(500).json({
      message: "Failed to delete comment",
      error: err.message,
    });
  }
}

export async function lookupProviderByUsername(req, res) {
  try {
    const username = String(req.params.username || "").trim();

    if (!username) {
      return res.status(400).json({ message: "Username required" });
    }

    const profile = await db("provider_profiles")
      .select("provider_uuid", "username", "profile_pic", "full_name")
      .where({ username })
      .first();

    if (!profile) {
      return res.status(404).json({ message: "Provider not found" });
    }

    return res.json({ provider: profile });
  } catch (err) {
    console.error("lookupProviderByUsername error:", err);
    return res.status(500).json({ message: "Lookup failed" });
  }
}

export async function toggleFollow(req, res) {
  const viewerUuid = req.viewer.uuid;
  const { providerUuid } = req.params;

  const existing = await db("provider_followers")
    .where({
      provider_uuid: providerUuid,
      viewer_uuid: viewerUuid,
    })
    .first();

  if (existing) {
    await db("provider_followers")
      .where({ id: existing.id })
      .del();

    return res.json({
      following: false,
    });
  }

  await db("provider_followers").insert({
    provider_uuid: providerUuid,
    viewer_uuid: viewerUuid,
  });

  return res.json({
    following: true,
  });
}

