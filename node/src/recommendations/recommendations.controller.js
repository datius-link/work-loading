import db from "../db/index.js";

const RATEABLE_STATUSES = ["filled", "closed", "completed"];

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
    const profileUuid = req.params.uuid || req.params.profileUuid;
    const rows = await db("job_recommendations as jr")
      .leftJoin("job_ratings as rt", "rt.id", "jr.rating_id")
      .leftJoin("jobs as j", "j.id", "jr.job_id")
      .leftJoin("profiles as rp", "rp.uuid", "jr.recommender_uuid")
      .where("jr.provider_uuid", profileUuid)
      .where("jr.status", "closed")
      .select(
        "jr.id",
        "jr.job_id",
        "jr.job_title",
        "jr.job_code",
        "jr.service_type",
        "jr.started_at",
        "jr.completed_at",
        "jr.reason",
        "jr.recommender_visible",
        "jr.created_at",
        "rt.score",
        "j.service_type as job_service_type",
        "j.started_at as job_started_at",
        "j.completed_at as job_completed_at",
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
        service_type: row.service_type || row.job_service_type || "",
        started_at: row.started_at || row.job_started_at || null,
        completed_at: row.completed_at || row.job_completed_at || null,
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

export async function listRatings(req, res) {
  try {
    const profileUuid = req.params.uuid || req.params.profileUuid;
    const rows = await db("job_ratings as rt")
      .join("jobs as j", "j.id", "rt.job_id")
      .leftJoin("profiles as hp", "hp.uuid", "rt.rater_uuid")
      .where("rt.provider_uuid", profileUuid)
      .select(
        "rt.id",
        "rt.job_id",
        "rt.score",
        "rt.comment",
        "rt.created_at",
        "j.job_code",
        "j.title as job_title",
        "j.service_type",
        "j.started_at",
        "j.completed_at",
        "hp.uuid as hirer_uuid",
        "hp.username as hirer_username",
        "hp.full_name as hirer_full_name"
      )
      .orderBy("rt.created_at", "desc");

    return res.json({
      ratings: rows.map((row) => ({
        id: row.id,
        job_id: row.job_id,
        job_code: row.job_code,
        job_title: row.job_title,
        service_type: row.service_type || "",
        started_at: row.started_at || null,
        completed_at: row.completed_at || null,
        score: Number(row.score || 0),
        note: row.comment || "",
        created_at: row.created_at,
        hirer: {
          uuid: row.hirer_uuid,
          username: row.hirer_username || "",
          full_name: row.hirer_full_name || "",
        },
      })),
    });
  } catch (err) {
    console.error("listRatings error:", err);
    return res.status(500).json({ message: "Failed to load ratings" });
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

    if (!Number.isInteger(jobId)) return res.status(400).json({ message: "Valid job id required" });
    if (!providerUuid) return res.status(400).json({ message: "Provider is required" });
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const job = await db("jobs").where({ id: jobId }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.created_by !== me.uuid) return res.status(403).json({ message: "Only the hirer can rate this job" });
    if (job.assigned_provider_uuid !== providerUuid) return res.status(409).json({ message: "This provider was not assigned to the job" });
    if (!RATEABLE_STATUSES.includes(job.status)) return res.status(409).json({ message: "Rate after the job is accepted and completed" });

    const existing = await db("job_ratings")
      .where({ job_id: jobId, provider_uuid: providerUuid, rater_uuid: me.uuid })
      .first();
    if (existing) return res.status(409).json({ message: "Rating has already been submitted" });

    let rating;
    const [created] = await db("job_ratings")
      .insert({ job_id: jobId, provider_uuid: providerUuid, rater_uuid: me.uuid, score, comment })
      .returning("*");
    rating = created;

    await refreshProviderRating(providerUuid);
    return res.json({
      success: true,
      rating,
      rating_label: score <= 2 ? "low" : score <= 4 ? "good" : "best",
      recommendation_required: score === 5,
    });
  } catch (err) {
    console.error("rateJobProvider error:", err);
    return res.status(500).json({ message: "Failed to save rating" });
  }
}

export async function recommendJobProvider(req, res) {
  try {
    const me = actor(req);
    if (!me?.uuid) return res.status(401).json({ message: "Authorization required" });

    const jobId = Number(req.params.jobId);
    const providerUuid = String(req.body.provider_uuid || req.body.providerUuid || "").trim();
    const shouldRecommend = !!req.body.recommend;
    const reason = String(req.body.reason || "").trim();
    const recommenderVisible = !!(req.body.recommender_visible || req.body.recommenderVisible);

    if (!Number.isInteger(jobId)) return res.status(400).json({ message: "Valid job id required" });
    if (!providerUuid) return res.status(400).json({ message: "Provider is required" });

    const job = await db("jobs").where({ id: jobId }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.created_by !== me.uuid) return res.status(403).json({ message: "Only the hirer can recommend this job" });
    if (job.assigned_provider_uuid !== providerUuid) return res.status(409).json({ message: "This provider was not assigned to the job" });
    if (job.status !== "completed") return res.status(409).json({ message: "Recommendation is available after completion and rating" });

    const rating = await db("job_ratings")
      .where({ job_id: jobId, provider_uuid: providerUuid, rater_uuid: me.uuid })
      .first();
    if (!rating) return res.status(409).json({ message: "Submit rating before recommendation" });

    const existingRecommendation = await db("job_recommendations")
      .where({ job_id: jobId, provider_uuid: providerUuid, recommender_uuid: me.uuid })
      .first();
    if (existingRecommendation) return res.status(409).json({ message: "Recommendation decision has already been submitted" });

    let recommendation = null;
    if (shouldRecommend) {
      if (Number(rating.score || 0) !== 5) {
        return res.status(409).json({ message: "Only a 5-star rating can create a recommendation" });
      }
      if (reason.length < 8) return res.status(400).json({ message: "Recommendation reason is required" });
      const [created] = await db("job_recommendations")
        .insert({
          job_id: jobId,
          rating_id: rating.id,
          provider_uuid: providerUuid,
          recommender_uuid: me.uuid,
          job_title: job.title,
          job_code: job.job_code,
          service_type: job.service_type || null,
          started_at: job.started_at || null,
          completed_at: job.completed_at || null,
          reason,
          recommender_visible: recommenderVisible,
          status: "closed",
        })
        .returning("*");
      recommendation = created;
    }

    const [updatedJob] = await db("jobs")
      .where({ id: jobId })
      .update({ status: "closed", updated_at: db.fn.now() })
      .returning("*");

    return res.json({ success: true, recommendation, job: updatedJob });
  } catch (err) {
    console.error("recommendJobProvider error:", err);
    return res.status(500).json({ message: "Failed to save recommendation" });
  }
}
