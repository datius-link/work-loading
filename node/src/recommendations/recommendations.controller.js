import db from "../db/index.js";

const RATEABLE_STATUSES = ["filled", "closed"];

function actor(req) {
  return req.user || req.viewer || null;
}

function privacySettings(value) {
  return {
    show_profile_in_recommendations: false,
    ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}),
  };
}

function recommenderPayload(row) {
  const visible = !!row.recommender_visible && privacySettings(row.recommender_privacy).show_profile_in_recommendations;
  if (!visible) return { visible: false, label: "Private client" };
  return {
    visible: true,
    uuid: row.recommender_uuid,
    username: row.recommender_username || "",
    full_name: row.recommender_full_name || "",
    profile_pic: row.recommender_profile_pic || "",
  };
}

async function refreshProviderRating(providerUuid) {
  const row = await db("job_ratings")
    .where({ provider_uuid: providerUuid })
    .avg({ average: "score" })
    .count("* as count")
    .first();

  await db("profiles").where({ uuid: providerUuid }).update({
    ratings: Number(row?.average || 0).toFixed(2),
    ratings_count: Number(row?.count || 0),
    updated_at: db.fn.now(),
  });
}

export async function listRecommendations(req, res) {
  try {
    const { profileUuid } = req.params;
    const rows = await db("job_recommendations as jr")
      .leftJoin("job_ratings as rt", "rt.id", "jr.rating_id")
      .leftJoin("profiles as rp", "rp.uuid", "jr.recommender_uuid")
      .where("jr.provider_uuid", profileUuid)
      .where("jr.status", "closed")
      .select(
        "jr.id",
        "jr.job_id",
        "jr.job_title",
        "jr.job_code",
        "jr.reason",
        "jr.recommender_visible",
        "jr.created_at",
        "rt.score",
        "rp.uuid as recommender_uuid",
        "rp.username as recommender_username",
        "rp.full_name as recommender_full_name",
        "rp.profile_pic as recommender_profile_pic",
        "rp.privacy_settings as recommender_privacy"
      )
      .orderBy("jr.created_at", "desc");

    return res.json({
      recommendations: rows.map((row) => ({
        id: row.id,
        job_id: row.job_id,
        job_title: row.job_title,
        job_code: row.job_code,
        reason: row.reason,
        score: row.score,
        created_at: row.created_at,
        recommender: recommenderPayload(row),
      })),
    });
  } catch (err) {
    console.error("listRecommendations error:", err);
    return res.status(500).json({ message: "Failed to load recommendations" });
  }
}

export async function rateJobProvider(req, res) {
  try {
    const me = actor(req);
    if (!me?.uuid) return res.status(401).json({ message: "Authorization required" });

    const jobId = Number(req.params.jobId);
    const providerUuid = String(req.body.provider_uuid || req.body.providerUuid || "").trim();
    const score = Number(req.body.score);
    const comment = String(req.body.comment || "").trim();
    const recommend = !!req.body.recommend;
    const reason = String(req.body.reason || "").trim();
    const recommenderVisible = !!(req.body.recommender_visible || req.body.recommenderVisible);

    if (!Number.isInteger(jobId)) return res.status(400).json({ message: "Valid job id required" });
    if (!providerUuid) return res.status(400).json({ message: "Provider is required" });
    if (!Number.isInteger(score) || score < 1 || score > 10) return res.status(400).json({ message: "Rating must be between 1 and 10" });
    if (recommend && reason.length < 8) return res.status(400).json({ message: "Recommendation reason is required" });

    const job = await db("jobs").where({ id: jobId }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.created_by !== me.uuid) return res.status(403).json({ message: "Only the hirer can rate this job" });
    if (job.assigned_provider_uuid !== providerUuid) return res.status(409).json({ message: "This provider was not assigned to the job" });
    if (!RATEABLE_STATUSES.includes(job.status)) return res.status(409).json({ message: "Rate after the job is accepted and completed" });

    const existing = await db("job_ratings")
      .where({ job_id: jobId, provider_uuid: providerUuid, rater_uuid: me.uuid })
      .first();

    let rating;
    if (existing) {
      const [updated] = await db("job_ratings")
        .where({ id: existing.id })
        .update({ score, comment, updated_at: db.fn.now() })
        .returning("*");
      rating = updated;
    } else {
      const [created] = await db("job_ratings")
        .insert({ job_id: jobId, provider_uuid: providerUuid, rater_uuid: me.uuid, score, comment })
        .returning("*");
      rating = created;
    }

    if (recommend) {
      const existingRecommendation = await db("job_recommendations")
        .where({ job_id: jobId, provider_uuid: providerUuid, recommender_uuid: me.uuid })
        .first();
      const payload = {
        rating_id: rating.id,
        job_title: job.title,
        job_code: job.job_code,
        reason,
        recommender_visible: recommenderVisible,
        status: "closed",
        updated_at: db.fn.now(),
      };
      if (existingRecommendation) {
        await db("job_recommendations").where({ id: existingRecommendation.id }).update(payload);
      } else {
        await db("job_recommendations").insert({
          job_id: jobId,
          provider_uuid: providerUuid,
          recommender_uuid: me.uuid,
          ...payload,
        });
      }
    }

    await refreshProviderRating(providerUuid);
    return res.json({ success: true, rating });
  } catch (err) {
    console.error("rateJobProvider error:", err);
    return res.status(500).json({ message: "Failed to save rating" });
  }
}
