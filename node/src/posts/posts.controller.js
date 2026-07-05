import db from "../db/index.js";
import { insertNotification } from "../notifications/notificationSettings.js";
import { extractMentions } from "./posts.utils.js";
import { findUsersByUsername, findServices } from "./posts.service.js";
import { buildCommentTree, enrichCommentRow, fetchCommentById } from "./posts.comments.js";
import { enrichPostsWithViewerState, countCommentTree } from "./posts.feed.js";

function actorUuid(req) {
  return req.viewer?.uuid || req.user?.uuid;
}

function mediaSelectSql() {
  return `
    COALESCE(
      (
        SELECT json_agg(json_build_object('url', pm.url, 'type', pm.media_type, 'fit', pm.fit_mode) ORDER BY pm."order")
        FROM post_media pm
        WHERE pm.post_id = p.id
      ),
      '[]'
    ) as media
  `;
}

function basePostQuery() {
  return db("posts as p")
    .leftJoin("profiles as pr", "pr.uuid", "p.profile_uuid")
    .leftJoin("post_likes as pl", "pl.post_id", "p.id")
    .leftJoin("post_comments as pc", "pc.post_id", "p.id");
}

function selectPostColumns(query) {
  return query
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
      db.raw(mediaSelectSql())
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
    );
}

// ─── Time range helper ────────────────────────────────────────────────────────
// Supported ranges: "1h", "24h", "7d", "30d", "all"
// Returns a raw SQL interval string for Knex, or null for "all"
function timeRangeInterval(range) {
  const map = {
    "1h":  "1 hour",
    "24h": "24 hours",
    "7d":  "7 days",
    "30d": "30 days",
  };
  return map[range] || null;
}

function applyTimeFilter(query, column, interval) {
  if (!interval) return query;
  return query.where(column, ">=", db.raw(`NOW() - INTERVAL '${interval}'`));
}

// ─── Post CRUD ────────────────────────────────────────────────────────────────

export async function createPost(req, res) {
  const profileUuid = actorUuid(req);
  const { caption, location, type, media } = req.body;

  if (!profileUuid) return res.status(401).json({ message: "Authorization required" });
  if (!type || !Array.isArray(media) || media.length === 0) {
    return res.status(400).json({ message: "Invalid post payload" });
  }

  try {
    const profile = await db("profiles").where({ uuid: profileUuid }).first();
    if (!profile) return res.status(403).json({ message: "User account required" });

    const normalizedType = type === "reel" ? "clip" : type;
    const cleanCaption = String(caption || "").trim();
    const mentions = extractMentions(cleanCaption);
    let postId;

    await db.transaction(async (trx) => {
      const [post] = await trx("posts")
        .insert({
          profile_uuid: profileUuid,
          caption: cleanCaption || null,
          location: location || null,
          type: normalizedType,
        })
        .returning("id");

      postId = post.id;

      await trx("post_media").insert(
        media.map((item, index) => ({
          post_id: postId,
          url: item.url,
          media_type: item.type,
          fit_mode: item.fit || item.fit_mode || "cover",
          order: index,
        }))
      );

      if (mentions.length) {
        await trx("post_mentions").insert(
          mentions.map((mention) => ({
            post_id: postId,
            type: mention.type,
            value: mention.value,
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

export async function listPublicPosts(req, res) {
  try {
    const viewerUuid = actorUuid(req) || null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const q = String(req.query.q || "").trim();
    const qPlain = q.replace(/^[@#]+/, "");

    let query = basePostQuery();
    if (q) {
      query = query.where((qb) => {
        qb.whereILike("p.caption", `%${q}%`)
          .orWhereILike("p.caption", `%${qPlain}%`)
          .orWhereILike("pr.full_name", `%${qPlain}%`)
          .orWhereILike("pr.username", `%${qPlain}%`)
          .orWhereExists(function hashtagSearch() {
            this.select(1)
              .from("post_mentions as pm")
              .whereRaw("pm.post_id = p.id")
              .whereIn("pm.type", ["service", "hashtag"])
              .whereILike("pm.value", `%${qPlain}%`);
          });
      });
    }

    const posts = await selectPostColumns(query)
      .orderBy("p.created_at", "desc")
      .limit(limit)
      .offset(offset);

    const enrichedPosts = await enrichPostsWithViewerState(posts, viewerUuid);
    return res.json({ posts: enrichedPosts, pagination: { page, limit, hasMore: posts.length === limit } });
  } catch (err) {
    console.error("listPublicPosts error:", err);
    return res.status(500).json({ message: "Failed to load posts", debug: err?.message });
  }
}

export async function searchUsers(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);

  try {
    const users = await findUsersByUsername(q);
    return res.json(users);
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ message: "Failed to search users" });
  }
}

export async function searchServices(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);

  try {
    const services = await findServices(q);
    return res.json(services);
  } catch (err) {
    console.error("searchServices error:", err);
    return res.status(500).json({ message: "Failed to search services" });
  }
}

export async function listMyPosts(req, res) {
  const profileUuid = actorUuid(req);
  if (!profileUuid) return res.status(401).json({ message: "Authorization required" });

  try {
    const posts = await selectPostColumns(basePostQuery())
      .where("p.profile_uuid", profileUuid)
      .orderBy("p.created_at", "desc");

    return res.json({ posts });
  } catch (err) {
    console.error("listMyPosts error:", err);
    return res.status(500).json({ message: "Failed to load your posts" });
  }
}

// ─── Engagement summary with time-range support ───────────────────────────────
// Query param: ?range=1h|24h|7d|30d|all  (default: all)
// Each section can also be individually scoped:
//   ?range=7d  (global), or per-section via ?content_range=7d&hiring_range=30d etc.
// For simplicity the frontend uses a single `range` param per section.

export async function getEngagementSummary(req, res) {
  try {
    const profileUuid = actorUuid(req);
    if (!profileUuid) return res.status(401).json({ message: "Authorization required" });

    // Accept per-section ranges so each section dropdown is independent
    const globalRange   = String(req.query.range          || "all");
    const activityRange = String(req.query.activity_range || req.query.range || "all");
    const contentRange  = String(req.query.content_range  || req.query.range || "all");
    const hiringRange   = String(req.query.hiring_range   || req.query.range || "all");
    const workRange     = String(req.query.work_range     || req.query.range || "all");

    const activityInterval = timeRangeInterval(activityRange);
    const contentInterval  = timeRangeInterval(contentRange);
    const hiringInterval   = timeRangeInterval(hiringRange);
    const workInterval     = timeRangeInterval(workRange);

    // ── Content / post metrics ──────────────────────────────────────────────
    // Older databases may have migration 002 marked complete without all of
    // these tracking tables. Keep Insights available while repair migration
    // 019 creates the missing tables on the next server startup.
    const engagementTables = {
      likes: "post_likes",
      comments: "post_comments",
      views: "post_views",
      shares: "post_shares",
      saves: "post_saves",
    };
    const engagementAliases = {
      likes: "pl",
      comments: "pc",
      views: "pv",
      shares: "ps",
      saves: "sv",
    };
    const engagementTableEntries = Object.entries(engagementTables);
    const engagementTableChecks = await Promise.all(
      engagementTableEntries.map(([, tableName]) => db.schema.hasTable(tableName))
    );
    const availableEngagement = Object.fromEntries(
      engagementTableEntries.map(([metric], index) => [metric, engagementTableChecks[index]])
    );
    const countExpression = (metric) =>
      availableEngagement[metric]
        ? `COUNT(DISTINCT ${engagementAliases[metric]}.id)::int`
        : "0::int";

    let postsQuery = db("posts as p");
    for (const [metric, tableName] of engagementTableEntries) {
      if (availableEngagement[metric]) {
        const alias = engagementAliases[metric];
        postsQuery = postsQuery.leftJoin(`${tableName} as ${alias}`, `${alias}.post_id`, "p.id");
      }
    }

    postsQuery = postsQuery
      .where("p.profile_uuid", profileUuid)
      .groupBy("p.id")
      .select(
        "p.id",
        "p.caption",
        "p.type",
        "p.created_at",
        db.raw(`${countExpression("likes")} as likes`),
        db.raw(`${countExpression("comments")} as comments`),
        db.raw(`${countExpression("views")} as views`),
        db.raw(`${countExpression("shares")} as shares`),
        db.raw(`${countExpression("saves")} as saves`)
      );

    const engagementOrderMetrics = ["likes", "comments", "shares", "saves"]
      .filter((metric) => availableEngagement[metric])
      .map((metric) => `COUNT(DISTINCT ${engagementAliases[metric]}.id)`);
    postsQuery = engagementOrderMetrics.length
      ? postsQuery.orderByRaw(`(${engagementOrderMetrics.join(" + ")}) DESC`)
      : postsQuery.orderBy("p.created_at", "desc");
    postsQuery = postsQuery.limit(10);

    if (contentInterval) {
      postsQuery = postsQuery.where("p.created_at", ">=", db.raw(`NOW() - INTERVAL '${contentInterval}'`));
    }

    const posts = await postsQuery;

    // ── Followers ──────────────────────────────────────────────────────────
    let followersQuery     = db("profile_followers").where({ provider_uuid: profileUuid });
    let followers7dQuery   = db("profile_followers").where({ provider_uuid: profileUuid })
      .where("created_at", ">=", db.raw("NOW() - INTERVAL '7 days'"));

    if (contentInterval) {
      followersQuery = followersQuery.where("created_at", ">=", db.raw(`NOW() - INTERVAL '${contentInterval}'`));
    }

    const [followersRow, followers7dRow] = await Promise.all([
      followersQuery.count("* as count").first(),
      followers7dQuery.count("* as count").first(),
    ]);

    // ── Profile & base data ────────────────────────────────────────────────
    const profile = await db("profiles").where({ uuid: profileUuid }).first();

    // ── Hiring metrics ─────────────────────────────────────────────────────
    let jobsBase = () => db("jobs").where({ created_by: profileUuid });
    if (hiringInterval) {
      jobsBase = () => db("jobs").where({ created_by: profileUuid })
        .where("created_at", ">=", db.raw(`NOW() - INTERVAL '${hiringInterval}'`));
    }

    const [
      jobsPostedRow,
      jobsFilledRow,
      jobsOpenRow,
      jobsWaitingRow,
      applicantsReceivedRow,
      directHiresMadeRow,
      topJobs,
      avgTimeFirstApplicantRow,
      avgTimeToFillRow,
    ] = await Promise.all([
      jobsBase().count("* as count").first(),
      jobsBase().whereIn("status", ["filled", "closed"]).count("* as count").first(),
      jobsBase().where("status", "open").count("* as count").first(),
      // Jobs open and waiting for a decision (have at least 1 application)
      db("jobs as j")
        .where("j.created_by", profileUuid)
        .where("j.status", "open")
        .modify((qb) => {
          if (hiringInterval) qb.where("j.created_at", ">=", db.raw(`NOW() - INTERVAL '${hiringInterval}'`));
        })
        .whereExists(function waiting() {
          this.select(1).from("job_applications as ja").whereRaw("ja.job_id = j.id").where("ja.status", "requested");
        })
        .count("* as count")
        .first(),
      // Applicants received on my jobs
      db("job_applications as ja")
        .join("jobs as j", "j.id", "ja.job_id")
        .where("j.created_by", profileUuid)
        .modify((qb) => {
          if (hiringInterval) qb.where("ja.created_at", ">=", db.raw(`NOW() - INTERVAL '${hiringInterval}'`));
        })
        .count("* as count")
        .first(),
      // Direct hires I created
      db("jobs").where({ created_by: profileUuid, hire_type: "direct" })
        .modify((qb) => {
          if (hiringInterval) qb.where("created_at", ">=", db.raw(`NOW() - INTERVAL '${hiringInterval}'`));
        })
        .count("* as count")
        .first(),
      // Top jobs by applicants
      db("jobs as j")
        .leftJoin("job_applications as ja", "ja.job_id", "j.id")
        .where("j.created_by", profileUuid)
        .modify((qb) => {
          if (hiringInterval) qb.where("j.created_at", ">=", db.raw(`NOW() - INTERVAL '${hiringInterval}'`));
        })
        .groupBy("j.id", "j.job_code", "j.title", "j.status", "j.created_at")
        .select(
          "j.id", "j.job_code", "j.title", "j.status", "j.created_at",
          db.raw("0::int as views"),
          db.raw("COUNT(ja.id)::int as applicant_count")
        )
        .orderByRaw("COUNT(ja.id) DESC")
        .limit(5),
      // Average time from job creation to first application (in hours)
      db("jobs as j")
        .join("job_applications as ja", "ja.job_id", "j.id")
        .where("j.created_by", profileUuid)
        .modify((qb) => {
          if (hiringInterval) qb.where("j.created_at", ">=", db.raw(`NOW() - INTERVAL '${hiringInterval}'`));
        })
        .groupBy("j.id")
        .select(
          db.raw("EXTRACT(EPOCH FROM (MIN(ja.created_at) - j.created_at))/3600 as hours_to_first")
        )
        .then((rows) => {
          if (!rows.length) return null;
          const avg = rows.reduce((sum, r) => sum + Number(r.hours_to_first || 0), 0) / rows.length;
          return { avg_hours: avg };
        }),
      // Average time from job creation to filled/closed (in hours)
      db("jobs")
        .where({ created_by: profileUuid })
        .whereIn("status", ["filled", "closed"])
        .whereNotNull("updated_at")
        .modify((qb) => {
          if (hiringInterval) qb.where("created_at", ">=", db.raw(`NOW() - INTERVAL '${hiringInterval}'`));
        })
        .select(db.raw("EXTRACT(EPOCH FROM (updated_at - created_at))/3600 as hours_to_fill"))
        .then((rows) => {
          if (!rows.length) return null;
          const avg = rows.reduce((sum, r) => sum + Number(r.hours_to_fill || 0), 0) / rows.length;
          return { avg_hours: avg };
        }),
    ]);

    // ── Work/application metrics (as a provider seeking work) ──────────────
    let appsBase = () => db("job_applications").where({ profile_uuid: profileUuid });
    if (workInterval) {
      appsBase = () => db("job_applications").where({ profile_uuid: profileUuid })
        .where("created_at", ">=", db.raw(`NOW() - INTERVAL '${workInterval}'`));
    }

    const [
      applicationsSentRow,
      pendingApplicationsRow,
      rejectedApplicationsRow,
      jobsAttainedRow,
      directHiresReceivedRow,
    ] = await Promise.all([
      appsBase().count("* as count").first(),
      appsBase().where({ status: "requested" }).count("* as count").first(),
      appsBase().whereIn("status", ["not_attained", "withdrawn"]).count("* as count").first(),
      appsBase().where({ status: "approved" }).count("* as count").first(),
      db("jobs").where({ target_provider_uuid: profileUuid, hire_type: "direct" })
        .modify((qb) => {
          if (workInterval) qb.where("created_at", ">=", db.raw(`NOW() - INTERVAL '${workInterval}'`));
        })
        .count("* as count")
        .first(),
    ]);

    // ── Activity score components ──────────────────────────────────────────
    // For activity, we pull all engagement actions in the activity window
    let activityLikesRow, activityCommentsRow, activityPostsRow, activityJobsAppliedRow, activityJobsPostedRow;
    if (activityInterval) {
      [activityLikesRow, activityCommentsRow, activityPostsRow, activityJobsAppliedRow, activityJobsPostedRow] = await Promise.all([
        db("post_likes").where({ profile_uuid: profileUuid }).where("created_at", ">=", db.raw(`NOW() - INTERVAL '${activityInterval}'`)).count("* as count").first(),
        db("post_comments").where({ profile_uuid: profileUuid }).where("created_at", ">=", db.raw(`NOW() - INTERVAL '${activityInterval}'`)).count("* as count").first(),
        db("posts").where({ profile_uuid: profileUuid }).where("created_at", ">=", db.raw(`NOW() - INTERVAL '${activityInterval}'`)).count("* as count").first(),
        db("job_applications").where({ profile_uuid: profileUuid }).where("created_at", ">=", db.raw(`NOW() - INTERVAL '${activityInterval}'`)).count("* as count").first(),
        db("jobs").where({ created_by: profileUuid }).where("created_at", ">=", db.raw(`NOW() - INTERVAL '${activityInterval}'`)).count("* as count").first(),
      ]);
    } else {
      [activityLikesRow, activityCommentsRow, activityPostsRow, activityJobsAppliedRow, activityJobsPostedRow] = await Promise.all([
        db("post_likes").where({ profile_uuid: profileUuid }).count("* as count").first(),
        db("post_comments").where({ profile_uuid: profileUuid }).count("* as count").first(),
        db("posts").where({ profile_uuid: profileUuid }).count("* as count").first(),
        db("job_applications").where({ profile_uuid: profileUuid }).count("* as count").first(),
        db("jobs").where({ created_by: profileUuid }).count("* as count").first(),
      ]);
    }

    // ── Compute totals ─────────────────────────────────────────────────────
    const totals = posts.reduce(
      (acc, post) => ({
        views:    acc.views    + Number(post.views    || 0),
        likes:    acc.likes    + Number(post.likes    || 0),
        comments: acc.comments + Number(post.comments || 0),
        shares:   acc.shares   + Number(post.shares   || 0),
        saves:    acc.saves    + Number(post.saves    || 0),
      }),
      { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
    );

    const jobsPosted           = Number(jobsPostedRow?.count || 0);
    const jobsApplied          = Number(applicationsSentRow?.count || 0);
    const jobsAttained         = Number(jobsAttainedRow?.count || 0);
    const applicantsReceived   = Number(applicantsReceivedRow?.count || 0);
    const applicationSuccessRate = jobsApplied ? Math.round((jobsAttained / jobsApplied) * 100) : 0;

    const activityLikes      = Number(activityLikesRow?.count || 0);
    const activityComments   = Number(activityCommentsRow?.count || 0);
    const activityPosts      = Number(activityPostsRow?.count || 0);
    const activityJobsApplied = Number(activityJobsAppliedRow?.count || 0);
    const activityJobsPosted  = Number(activityJobsPostedRow?.count || 0);
    const activityScore = activityLikes + activityComments + activityPosts + activityJobsApplied + activityJobsPosted;

    // Format average time helpers
    function formatHours(avgHoursObj) {
      if (!avgHoursObj?.avg_hours) return null;
      const h = avgHoursObj.avg_hours;
      if (h < 1)   return `${Math.round(h * 60)}m`;
      if (h < 24)  return `${Math.round(h)}h`;
      return `${Math.round(h / 24)}d`;
    }

    const topPosts = posts.map((post) => {
      const views    = Number(post.views    || 0);
      const likes    = Number(post.likes    || 0);
      const comments = Number(post.comments || 0);
      return {
        ...post,
        engagement_rate: views ? Math.round(((likes + comments) / views) * 100) : 0,
      };
    });

    return res.json({
      summary: {
        // Applied ranges (so frontend knows what was used)
        _ranges: {
          activity: activityRange,
          content:  contentRange,
          hiring:   hiringRange,
          work:     workRange,
        },

        // Activity
        activity_score:        activityScore,
        activity_likes:        activityLikes,
        activity_comments:     activityComments,
        activity_posts:        activityPosts,
        activity_jobs_applied: activityJobsApplied,
        activity_jobs_posted:  activityJobsPosted,

        // Content performance
        ...totals,
        profile_visits:    0,
        media_posts:       posts.length,
        followers:         Number(followersRow?.count  || 0),
        followers_gained:  Number(followers7dRow?.count || 0),
        average_rating:    profile?.ratings     || 0,
        rating_count:      Number(profile?.ratings_count || 0),

        // Hiring (as poster)
        jobs_posted:               jobsPosted,
        jobs_created:              jobsPosted,
        jobs_filled:               Number(jobsFilledRow?.count || 0),
        jobs_open:                 Number(jobsOpenRow?.count   || 0),
        jobs_waiting_decision:     Number(jobsWaitingRow?.count || 0),
        jobs_viewed:               0,
        applicants_received:       applicantsReceived,
        average_applicants_per_job: jobsPosted ? Number((applicantsReceived / jobsPosted).toFixed(1)) : 0,
        direct_hires_made:         Number(directHiresMadeRow?.count || 0),
        average_time_to_first_applicant: formatHours(avgTimeFirstApplicantRow),
        average_time_to_fill:            formatHours(avgTimeToFillRow),

        // Work (as provider applying)
        jobs_applied:            jobsApplied,
        jobs_attained:           jobsAttained,
        pending_applications:    Number(pendingApplicationsRow?.count    || 0),
        rejected_applications:   Number(rejectedApplicationsRow?.count   || 0),
        direct_hires_received:   Number(directHiresReceivedRow?.count    || 0),
        application_success_rate: applicationSuccessRate,

        // Top content
        top_posts:           topPosts,
        top_jobs:            topJobs,
        best_performing_media: topPosts.slice(0, 3),
      },
    });
  } catch (err) {
    console.error("getEngagementSummary error:", err);
    return res.status(500).json({ message: "Failed to load engagement summary" });
  }
}

// ─── Remaining handlers (unchanged) ──────────────────────────────────────────

export async function listProviderPosts(req, res) {
  try {
    const { providerUuid } = req.params;
    const viewerUuid = actorUuid(req) || null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!providerUuid) return res.status(400).json({ message: "Provider UUID required" });

    const posts = await selectPostColumns(basePostQuery())
      .where("p.profile_uuid", providerUuid)
      .orderBy("p.created_at", "desc")
      .limit(limit)
      .offset(offset);

    const enrichedPosts = await enrichPostsWithViewerState(posts, viewerUuid);
    return res.json({ posts: enrichedPosts, pagination: { page, limit, hasMore: posts.length === limit } });
  } catch (err) {
    console.error("listProviderPosts error:", err);
    return res.status(500).json({ message: "Failed to load provider posts", debug: err?.message });
  }
}

export async function toggleLike(req, res) {
  const profileUuid = actorUuid(req);
  const { postId } = req.params;
  if (!profileUuid) return res.status(401).json({ message: "Unauthorized" });

  const existing = await db("post_likes").where({ post_id: postId, profile_uuid: profileUuid }).first();
  if (existing) {
    await db("post_likes").where({ id: existing.id }).del();
    return res.json({ liked: false });
  }

  await db("post_likes").insert({ post_id: postId, profile_uuid: profileUuid });
  return res.json({ liked: true });
}

export async function getComments(req, res) {
  try {
    const postId = parseInt(req.params.postId, 10);
    if (!Number.isFinite(postId)) return res.status(400).json({ message: "Invalid post id" });

    const rows = await db("post_comments").where({ post_id: postId }).orderBy("created_at", "asc");
    const parentMap = new Map(rows.map((row) => [row.id, row]));

    const enriched = await Promise.all(
      rows.map((row) => enrichCommentRow(row, row.parent_id ? parentMap.get(row.parent_id) || null : null))
    );

    const comments = buildCommentTree(enriched);
    return res.json({ comments, total_count: countCommentTree(comments) });
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({ message: "Failed to load comments", error: err.message });
  }
}

export async function createComment(req, res) {
  try {
    const postId = parseInt(req.params.postId, 10);
    if (!Number.isFinite(postId)) return res.status(400).json({ message: "Invalid post id" });

    const { text, parent_id } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment required" });

    const profileUuid = actorUuid(req);
    if (!profileUuid) return res.status(401).json({ message: "Unauthorized" });

    const post = await db("posts").where({ id: postId }).first();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const [inserted] = await db("post_comments")
      .insert({
        post_id: postId,
        profile_uuid: profileUuid,
        parent_id: parent_id || null,
        text: text.trim(),
      })
      .returning("*");

    const comment = await fetchCommentById(inserted.id);
    return res.json({ success: true, comment });
  } catch (err) {
    console.error("createComment error:", err);
    return res.status(500).json({ message: "Failed to create comment", error: err.message });
  }
}

export async function deleteComment(req, res) {
  try {
    const postId    = parseInt(req.params.postId, 10);
    const commentId = parseInt(req.params.commentId, 10);
    if (!Number.isFinite(postId) || !Number.isFinite(commentId)) {
      return res.status(400).json({ message: "Invalid comment" });
    }

    const comment = await db("post_comments").where({ id: commentId, post_id: postId }).first();
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.profile_uuid !== actorUuid(req)) {
      return res.status(403).json({ message: "You can only delete your own comment" });
    }

    const rows = await db("post_comments").select("id", "parent_id").where({ post_id: postId });
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
    return res.json({ success: true, deleted_count: idsToDelete.length });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(500).json({ message: "Failed to delete comment", error: err.message });
  }
}

export async function lookupProviderByUsername(req, res) {
  try {
    const username = String(req.params.username || "").trim();
    if (!username) return res.status(400).json({ message: "Username required" });

    const profile = await db("profiles")
      .select("uuid", "username", "profile_pic", "full_name")
      .where({ username })
      .first();

    if (!profile) return res.status(404).json({ message: "Provider not found" });
    return res.json({ provider: profile });
  } catch (err) {
    console.error("lookupProviderByUsername error:", err);
    return res.status(500).json({ message: "Lookup failed" });
  }
}

export async function toggleFollow(req, res) {
  const followerUuid  = actorUuid(req);
  const { providerUuid } = req.params;
  if (!followerUuid) return res.status(401).json({ message: "Unauthorized" });

  if (providerUuid === followerUuid) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  const provider = await db("profiles").where({ uuid: providerUuid }).first();
  if (!provider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  const existing = await db("profile_followers")
    .where({ provider_uuid: providerUuid, follower_uuid: followerUuid })
    .first();

  const followResponse = async (following) => {
    const [followersRow, followingRow] = await Promise.all([
      db("profile_followers").where({ provider_uuid: providerUuid }).count("* as count").first(),
      db("profile_followers").where({ follower_uuid: followerUuid }).count("* as count").first(),
    ]);
    return res.json({
      following,
      actor_uuid: followerUuid,
      target_uuid: providerUuid,
      followers_count: Number(followersRow?.count || 0),
      following_count: Number(followingRow?.count || 0),
    });
  };

  if (existing) {
    await db("profile_followers").where({ id: existing.id }).del();
    return followResponse(false);
  }

  await db.transaction(async (trx) => {
    await trx("profile_followers").insert({ provider_uuid: providerUuid, follower_uuid: followerUuid });
    const follower = await trx("profiles").where({ uuid: followerUuid }).first();
    const receiverAlreadyFollows = await trx("profile_followers")
      .where({ provider_uuid: followerUuid, follower_uuid: providerUuid })
      .first();
    await insertNotification(trx, {
      profile_uuid: providerUuid,
      system: "profile",
      type: "follow",
      title: "New follower",
      body: `@${follower?.username || "user"} is now following you`,
      meta: { follower_uuid: followerUuid, show_follow_back: !receiverAlreadyFollows },
    });
  });
  return followResponse(true);
}
