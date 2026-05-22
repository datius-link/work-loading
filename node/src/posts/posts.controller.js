import db from "../db/index.js";
import { extractMentions } from "./posts.utils.js";
import {
  findUsersByUsername,
  findServices,
} from "./posts.service.js";

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
export async function listPublicPosts(_req, res) {
  try {
    const posts = await db("posts as p")
      .join("provider_profiles as pp", "pp.provider_uuid", "p.provider_uuid")
      .leftJoin("post_media as pm", "pm.post_id", "p.id")
      .select(
        "p.id",
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
            json_agg(
              json_build_object('url', pm.url, 'type', pm.media_type)
              ORDER BY pm."order"
            ) FILTER (WHERE pm.id IS NOT NULL),
            '[]'
          ) as media`
        )
      )
      .groupBy(
        "p.id",
        "pp.username",
        "pp.full_name",
        "pp.profile_pic"
      )
      .orderBy("p.created_at", "desc")
      .limit(50);

    return res.json({ posts });
  } catch (err) {
    console.error("listPublicPosts error:", err);
    return res.status(500).json({ message: "Failed to load posts" });
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
