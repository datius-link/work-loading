import crypto from "crypto";
import db from "../db/index.js";
import { insertNotification } from "../notifications/notificationSettings.js";

const ACTIVE_STATUSES = ["open", "applied"];
const DIRECT_HIRE_STATUSES = ["pending"];
const CONTACT_VISIBLE_STATUSES = ["closed", "filled", "completed", "active", "start_pending", "start_requested", "started", "working", "submitted", "revision_requested", "completion_pending", "disputed"];
let jobsColumnSet = null;
let jobMessagesColumnSet = null;

async function jobsColumns() {
  if (jobsColumnSet) return jobsColumnSet;
  const names = await db("information_schema.columns")
    .where({ table_schema: "public", table_name: "jobs" })
    .pluck("column_name");
  jobsColumnSet = new Set(names);
  return jobsColumnSet;
}

async function jobMessagesColumns() {
  if (jobMessagesColumnSet) return jobMessagesColumnSet;
  const names = await db("information_schema.columns")
    .where({ table_schema: "public", table_name: "job_messages" })
    .pluck("column_name");
  jobMessagesColumnSet = new Set(names);
  return jobMessagesColumnSet;
}

function setIfColumn(payload, columns, key, value) {
  if (columns.has(key)) payload[key] = value;
}

function actor(req) {
  const payload = req.viewer || req.user;
  if (!payload?.uuid) return null;
  return { uuid: payload.uuid };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).toLowerCase().trim()).filter(Boolean);
  return [];
}

function normalizeMedia(value, folder = "jobs") {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item?.url || item?.storageId)
    .map((item) => ({
      url: item.url || null,
      storageId: item.storageId || null,
      type: item.type || "image",
      fit: item.fit || "cover",
      folder: item.folder || folder,
      name: item.name || null,
      mimeType: item.mimeType || null,
    }));
}

function normalizeMessageMedia(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item?.url || item?.storageId)
    .slice(0, 8)
    .map((item) => {
      const type = item.type === "video" ? "video" : "image";
      return {
        url: item.url || null,
        storageId: item.storageId || null,
        type,
        thumbnail: item.thumbnail || item.poster || null,
        fit: item.fit || "cover",
        folder: item.folder || "workspace_messages",
        name: item.name || item.fileName || null,
        mimeType: item.mimeType || (type === "video" ? "video/mp4" : "image/jpeg"),
        width: item.width || null,
        height: item.height || null,
        duration: item.duration || null,
      };
    });
}

function messageTypeFor(message, media, requestedType) {
  const type = String(requestedType || "").toLowerCase();
  if (["text", "image", "video", "mixed"].includes(type)) return type;
  const hasVideo = media.some((item) => item.type === "video");
  const hasImage = media.some((item) => item.type === "image");
  if (hasVideo && hasImage) return "mixed";
  if (hasVideo) return message ? "mixed" : "video";
  if (hasImage) return message ? "mixed" : "image";
  return "text";
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

async function generateJobCode() {
  for (let i = 0; i < 20; i += 1) {
    const job_code = makeCode();
    const exists = await db("jobs").where({ job_code }).first();
    if (!exists) return job_code;
  }
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

function serializeJob(row) {
  const job = {
    id: row.id,
    job_code: row.job_code,
    title: row.title,
    description: row.description,
    location: row.location,
    service_type: row.service_type,
    status: row.status,
    direct_status: row.direct_status || null,
    created_by: row.created_by,
    assigned_provider_uuid: row.assigned_provider_uuid,
    target_provider_uuid: row.target_provider_uuid,
    hire_type: row.hire_type || "posted",
    tender_closes_at: row.tender_closes_at,
    availability_required: !!row.availability_required,
    scheduled_for: row.scheduled_for,
    availability_notes: row.availability_notes,
    budget_min: row.budget_min,
    budget_max: row.budget_max,
    media: Array.isArray(row.media) ? row.media : [],
    started_at: row.started_at || null,
    started_by_uuid: row.started_by_uuid || null,
    provider_suggested_start_at: row.provider_suggested_start_at || null,
    provider_start_note: row.provider_start_note || "",
    provider_start_date: row.provider_start_date || null,
    estimated_duration_value: row.estimated_duration_value || null,
    estimated_duration_unit: row.estimated_duration_unit || "",
    started_requested_at: row.started_requested_at || null,
    started_confirmed_at: row.started_confirmed_at || null,
    completion_requested_at: row.completion_requested_at || null,
    start_confirmed_by_boss_at: row.start_confirmed_by_boss_at || null,
    completed_at: row.completed_at || null,
    completed_by_uuid: row.completed_by_uuid || null,
    recommendation_decided_at: row.recommendation_decided_at || null,
    provider_suggested_completed_at: row.provider_suggested_completed_at || null,
    provider_completion_note: row.provider_completion_note || "",
    completion_confirmed_by_boss_at: row.completion_confirmed_by_boss_at || null,
    disputed_by_uuid: row.disputed_by_uuid || null,
    dispute_reason: row.dispute_reason || "",
    dispute_created_at: row.dispute_created_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    poster: row.poster_uuid
      ? {
          uuid: row.poster_uuid,
          username: row.poster_username || "",
          full_name: row.poster_full_name || "",
          profile_pic: row.poster_profile_pic || "",
        }
      : null,
    assigned_provider: row.assigned_uuid
      ? {
          uuid: row.assigned_uuid,
          username: row.assigned_username || "",
          full_name: row.assigned_full_name || "",
          profile_pic: row.assigned_profile_pic || "",
        }
      : null,
    target_provider: row.target_uuid
      ? {
          uuid: row.target_uuid,
          username: row.target_username || "",
          full_name: row.target_full_name || "",
          profile_pic: row.target_profile_pic || "",
        }
      : null,
    applicant_count: Number(row.applicant_count || 0),
    is_recommended: !!row.is_recommended,
    has_applied: !!row.has_applied,
    you_got_this_job: !!row.you_got_this_job,
    my_application: row.my_application || null,
  };

  if (row.contact_details) job.contact_details = row.contact_details;
  return job;
}

function profilePrivacy(profile) {
  return {
    show_email_in_jobs: false,
    show_phone_in_jobs: true,
    show_socials_in_jobs: false,
    show_public_insights: true,
    show_profile_in_recommendations: false,
    ...(profile?.privacy_settings && typeof profile.privacy_settings === "object" ? profile.privacy_settings : {}),
  };
}

function firstPhone(profile) {
  const phones = Array.isArray(profile?.phone_numbers) ? profile.phone_numbers : [];
  const first = phones[0];
  if (typeof first === "string") return first;
  return first?.number || profile?.phone_number || null;
}

function contactPayload(profile) {
  if (!profile) return null;
  const privacy = profilePrivacy(profile);
  return {
    uuid: profile.uuid,
    username: profile.username || "",
    full_name: profile.full_name || "",
    profile_pic: profile.profile_pic || "",
    phone_number: privacy.show_phone_in_jobs ? firstPhone(profile) : null,
    email: privacy.show_email_in_jobs ? profile.email || null : null,
    socials: privacy.show_socials_in_jobs && Array.isArray(profile.socials) ? profile.socials : [],
    visibility: {
      email: !!privacy.show_email_in_jobs,
      phone: !!privacy.show_phone_in_jobs,
      socials: !!privacy.show_socials_in_jobs,
    },
  };
}

async function assignedJobContactDetails(row, me) {
  if (!me?.uuid || !CONTACT_VISIBLE_STATUSES.includes(String(row.status || "").toLowerCase())) return null;
  if (!row.created_by || !row.assigned_provider_uuid) return null;
  const isPoster = row.created_by === me.uuid;
  const isAssignedProvider = row.assigned_provider_uuid === me.uuid;
  if (!isPoster && !isAssignedProvider) return null;

  const [poster, assignedProvider] = await Promise.all([
    db("profiles").where({ uuid: row.created_by }).first(),
    db("profiles").where({ uuid: row.assigned_provider_uuid }).first(),
  ]);

  return {
    viewer_role: isPoster ? "hirer" : "service_provider",
    hirer: contactPayload(poster),
    service_provider: contactPayload(assignedProvider),
  };
}

function baseJobsQuery() {
  return db("jobs as j")
    .leftJoin("profiles as poster", "poster.uuid", "j.created_by")
    .leftJoin("profiles as assigned", "assigned.uuid", "j.assigned_provider_uuid")
    .leftJoin("profiles as target", "target.uuid", "j.target_provider_uuid")
    .leftJoin("job_applications as active_apps", function joinApps() {
      this.on("active_apps.job_id", "j.id").andOnNull("active_apps.withdrawn_at");
    })
    .groupBy("j.id", "poster.uuid", "assigned.uuid", "target.uuid")
    .select(
      "j.*",
      "poster.uuid as poster_uuid",
      "poster.username as poster_username",
      "poster.full_name as poster_full_name",
      "poster.profile_pic as poster_profile_pic",
      "assigned.uuid as assigned_uuid",
      "assigned.username as assigned_username",
      "assigned.full_name as assigned_full_name",
      "assigned.profile_pic as assigned_profile_pic",
      "target.uuid as target_uuid",
      "target.username as target_username",
      "target.full_name as target_full_name",
      "target.profile_pic as target_profile_pic"
    )
    .count("active_apps.id as applicant_count");
}

function notificationJobTitle(job) {
  if (!job?.job_code) return "e-kazi";
  return job?.title ? `Job ${job.job_code} - ${job.title}` : `Job ${job.job_code}`;
}

async function addNotification(trx, profile_uuid, type, body, job, meta = {}, system = "hiring", title = null) {
  await insertNotification(trx, {
    profile_uuid,
    actor_uuid: meta.actor_uuid || meta.profile_uuid || null,
    job_code: job?.job_code || null,
    system,
    type,
    title: title || notificationJobTitle(job),
    body,
    job_id: job?.id || null,
    meta,
  });
}

// Every lifecycle transition (old or new flow) writes one row here, so the
// Progress screen can render a single, chronological "job journal" instead
// of piecing history back together from individual job columns.
async function logActivity(trx, { jobId, actorUuid, action, fromStatus, toStatus, note, meta = {} }) {
  await trx("job_activity_logs").insert({
    job_id: jobId,
    actor_uuid: actorUuid || null,
    action,
    from_status: fromStatus || null,
    to_status: toStatus || null,
    note: note || null,
    meta: db.raw("?::jsonb", [JSON.stringify(meta || {})]),
  });
}

function durationUnit(value) {
  const unit = String(value || "").toLowerCase().trim();
  return ["minutes", "hours", "days", "weeks", "months"].includes(unit) ? unit : null;
}

export async function createJob(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });

    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const location = String(req.body.location || "").trim();
    const service_type = String(req.body.service_type || req.body.category || "").trim();
    const media = normalizeMedia(req.body.media || req.body.images, "jobs");
    const availability_required = !!req.body.availability_required;
    const scheduled_for = req.body.scheduled_for || req.body.available_from || null;
    const availability_notes = req.body.availability_notes || null;

    if (!title || !description || !location || !service_type) {
      return res.status(400).json({ message: "Title, description, location and service type are required" });
    }

    const job_code = await generateJobCode();
    const columns = await jobsColumns();
    const jobPayload = {
        job_code,
        title,
        description,
        location,
        service_type,
        created_by: me.uuid,
        status: "open",
        tender_closes_at: req.body.tender_closes_at || req.body.deadline || null,
        media: db.raw("?::jsonb", [JSON.stringify(media)]),
      };
    setIfColumn(jobPayload, columns, "availability_required", availability_required);
    setIfColumn(jobPayload, columns, "scheduled_for", scheduled_for);
    setIfColumn(jobPayload, columns, "availability_notes", availability_notes);

    const [job] = await db("jobs")
      .insert(jobPayload)
      .returning("*");

    const providers = await db("profiles")
      .where({ is_verified: true })
      .whereRaw("services::text ILIKE ?", [`%${service_type}%`])
      .whereNot("uuid", me.uuid)
      .select("uuid");

    if (providers.length) {
      for (const provider of providers) {
        try {
          await insertNotification(db, {
            profile_uuid: provider.uuid,
            system: "hiring",
            type: "new_relevant_job",
            title: notificationJobTitle(job),
            body: `You received a relevant job ${job.job_code}, ${job.title}. Open to view and apply.`,
            job_id: job.id,
            meta: { job_code: job.job_code, action: "open_job_post" },
          });
        } catch (notificationErr) {
          console.error("createJob relevant-provider notification error:", notificationErr);
        }
      }
    }

    try {
      await insertNotification(db, {
        profile_uuid: me.uuid,
        system: "hiring",
        type: "job_posted",
        title: notificationJobTitle(job),
        body: `Your job ${job.job_code}, ${job.title}, has been posted. Applications will appear in My Jobs.`,
        job_id: job.id,
        meta: { job_code: job.job_code, action: "open_job_post" },
      });
    } catch (notificationErr) {
      console.error("createJob light-user notification error:", notificationErr);
    }

    return res.status(201).json({ job: serializeJob({ ...job, applicant_count: 0 }) });
  } catch (err) {
    console.error("createJob error:", err);
    return res.status(500).json({ message: "Failed to post job" });
  }
}

export async function createDirectHire(req, res) {
  try {
    const me = actor(req);
    if (!me) {
      return res.status(401).json({ message: "User account required" });
    }

    const targetProviderUuid = String(req.body.target_provider_uuid || req.body.profile_uuid || "").trim();
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const service_type = String(req.body.service_type || req.body.category || "Direct Hire").trim();
    const location = String(req.body.location || "Direct hire").trim();
    const media = normalizeMedia(req.body.media || req.body.images, "jobs");
    const availability_required = !!req.body.availability_required;
    const scheduled_for = req.body.scheduled_for || req.body.available_from || null;
    const availability_notes = req.body.availability_notes || null;

    if (!targetProviderUuid || !title || !description) {
      return res.status(400).json({ message: "Provider, title and description are required" });
    }

    const provider = await db("profiles")
      .where({ uuid: targetProviderUuid })
      .first();

    if (!provider) {
      return res.status(404).json({ message: "User not found" });
    }

    const job_code = await generateJobCode();
    const requester = await db("profiles").where({ uuid: me.uuid }).first();
    const [job] = await db.transaction(async (trx) => {
      const columns = await jobsColumns();
      const jobPayload = {
          job_code,
          title,
          description,
          location,
          service_type,
          tender_closes_at: null,
          created_by: me.uuid,
          target_provider_uuid: targetProviderUuid,
          hire_type: "direct",
          status: "pending",
          media: db.raw("?::jsonb", [JSON.stringify(media)]),
        };
      setIfColumn(jobPayload, columns, "direct_status", "pending");
      setIfColumn(jobPayload, columns, "availability_required", availability_required);
      setIfColumn(jobPayload, columns, "scheduled_for", scheduled_for);
      setIfColumn(jobPayload, columns, "availability_notes", availability_notes);

      const [created] = await trx("jobs")
        .insert(jobPayload)
        .returning("*");

      await addNotification(
        trx,
        targetProviderUuid,
        "direct_job_request",
        `${requester?.full_name || requester?.username || "A user"} has directly chosen you for job ${created.job_code}, ${created.title}.`,
        created,
        { job_code: created.job_code, requester_uuid: me.uuid, actions: ["claim", "decline", "see_details"] }
      );
      await addNotification(
        trx,
        me.uuid,
        "direct_job_sent",
        `Your direct hire request ${created.job_code}, ${created.title}, was sent to @${provider.username || "provider"}.`,
        created,
        { job_code: created.job_code, provider_uuid: targetProviderUuid }
      );
      return [created];
    });

    return res.status(201).json({ job: serializeJob({ ...job, applicant_count: 0 }) });
  } catch (err) {
    console.error("createDirectHire error:", err);
    return res.status(500).json({ message: "Failed to send hire request" });
  }
}

export async function listMyJobs(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const status = String(req.query.status || "all");
    const query = baseJobsQuery();
    query.where("j.created_by", me.uuid);
    if (status !== "all") query.where("j.status", status);
    const rows = await query.orderBy("j.created_at", "desc");
    return res.json({ jobs: rows.map(serializeJob) });
  } catch (err) {
    console.error("listMyJobs error:", err);
    return res.status(500).json({ message: "Failed to load jobs" });
  }
}

export async function listRequests(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });

    const profile = await db("profiles").where({ uuid: me.uuid }).first();
    const services = normalizeList(profile?.services);
    const search = String(req.query.q || "").trim();
    const scope = String(req.query.scope || "").trim();
    const browseOnly = scope === "browse";

    const query = baseJobsQuery();
    query
      .leftJoin("job_applications as mine", function joinMine() {
        this.on("mine.job_id", "j.id").andOn("mine.profile_uuid", db.raw("?", [me.uuid]));
      })
      .select(db.raw("BOOL_OR(mine.id IS NOT NULL AND mine.withdrawn_at IS NULL) as has_applied"));
    query.select(db.raw("BOOL_OR(j.assigned_provider_uuid = ?) as you_got_this_job", [me.uuid]));
    const recommendationSql = services.length
      ? services.map(() => "LOWER(j.service_type) = ?").join(" OR ")
      : "FALSE";
    query.select(
      db.raw(
        `BOOL_OR(j.target_provider_uuid = ? OR (${recommendationSql})) as is_recommended`,
        [me.uuid, ...services]
      )
    );

    query.where((qb) => {
      qb.where("j.target_provider_uuid", me.uuid)
        .orWhereNull("j.target_provider_uuid");
    });

    if (browseOnly) {
      query.whereNull("j.target_provider_uuid");
      query.whereNot("j.created_by", me.uuid);
      query.whereIn("j.status", ACTIVE_STATUSES);
    }

    if (search) {
      query.where((qb) => {
        qb.whereILike("j.title", `%${search}%`)
          .orWhereILike("j.job_code", `%${search}%`)
          .orWhereILike("j.location", `%${search}%`)
          .orWhereILike("j.service_type", `%${search}%`);
      });
    }

    const rows = await query.orderBy("is_recommended", "desc").orderBy("j.created_at", "desc");
    const jobIds = rows.map((row) => row.id);
    const mineRows = jobIds.length
      ? await db("job_applications")
          .whereIn("job_id", jobIds)
          .where({ profile_uuid: me.uuid })
          .whereNull("withdrawn_at")
          .select("id", "job_id", "message", "budget", "duration", "duration_value", "duration_unit", "available_from", "experience", "notes", "media", "status", "created_at", "updated_at")
      : [];
    const mineByJobId = new Map(mineRows.map((row) => [row.job_id, row]));
    const jobs = rows
      .map((row) => serializeJob({ ...row, my_application: mineByJobId.get(row.id) || null }))
      .filter((job) => !browseOnly || !job.has_applied);

    return res.json({ jobs });
  } catch (err) {
    console.error("listRequests error:", err);
    return res.status(500).json({ message: "Failed to load requests" });
  }
}

export async function getJob(req, res) {
  try {
    const me = actor(req);

    const query = baseJobsQuery();
    query.where("j.id", req.params.id);

    const row = await query.first();
    if (!row) {
      return res.status(404).json({ message: "Job not found" });
    }

    row.contact_details = await assignedJobContactDetails(row, me);

    const job = serializeJob(row);
    let applications = [];

    const isOwner = me?.uuid && row.created_by === me.uuid;

    if (isOwner) {
      applications = await db("job_applications as ja")
        .join("profiles as p", "p.uuid", "ja.profile_uuid")
        .where("ja.job_id", row.id)
        .whereNull("ja.withdrawn_at")
        .select(
          "ja.id",
          "ja.job_id",
          "ja.profile_uuid",
          "ja.message",
          "ja.budget",
          "ja.duration",
          "ja.duration_value",
          "ja.duration_unit",
          "ja.available_from",
          "ja.experience",
          "ja.notes",
          "ja.media",
          "ja.status",
          "ja.created_at",
          "ja.updated_at",
          "p.uuid",
          "p.username",
          "p.full_name",
          "p.profile_pic",
          "p.services",
          "p.ratings"
        );
    }

    if (me?.uuid && !isOwner) {
      const app = await db("job_applications")
        .where({
          job_id: row.id,
          profile_uuid: me.uuid,
        })
        .whereNull("withdrawn_at")
        .first();

      job.has_applied = !!app;
      job.my_application = app || null;
      job.you_got_this_job = row.assigned_provider_uuid === me.uuid;
      job.can_accept_direct_hire =
        row.hire_type === "direct" &&
        row.target_provider_uuid === me.uuid &&
        DIRECT_HIRE_STATUSES.includes(row.status);
    }

    return res.json({ job, applications });
  } catch (err) {
    console.error("getJob error:", err);
    return res.status(500).json({ message: "Failed to load job" });
  }
}

async function workspaceJob(jobIdOrCode, me) {
  const raw = String(jobIdOrCode || "").trim();

  if (!raw || raw === "undefined" || raw === "null") {
    return { error: { status: 400, message: "Valid job id or job code is required" } };
  }

  const query = baseJobsQuery();

  if (/^\d+$/.test(raw)) {
    query.where("j.id", Number(raw));
  } else {
    query.whereRaw("LOWER(j.job_code) = LOWER(?)", [raw]);
  }

  const row = await query.first();
  if (!row) return { error: { status: 404, message: "Job not found" } };

  const isHirer = me?.uuid && row.created_by === me.uuid;
  const isProvider =
    me?.uuid &&
    (row.assigned_provider_uuid === me.uuid || row.target_provider_uuid === me.uuid);

  if (!isHirer && !isProvider) {
    return {
      error: {
        status: 403,
        message: "Only the hirer and hired provider can access this workspace",
      },
    };
  }

  row.contact_details = await assignedJobContactDetails(row, me);
  const reputation = await reputationForJob(row.id, row.assigned_provider_uuid, row.created_by, row);
  return { row, job: { ...serializeJob(row), ...reputation }, role: isHirer ? "hirer" : "provider" };
}

function routeJobId(req) {
  return req.params.jobId || req.params.id;
}

async function listMessagesForJob(jobId, viewerUuid = null) {
  const hasMessagesTable = await db.schema.hasTable("job_messages");
  if (!hasMessagesTable) return [];

  const safeJobId = Number(jobId);
  if (!Number.isInteger(safeJobId) || safeJobId < 1) return [];
  const columns = await jobMessagesColumns();

  if (viewerUuid && columns.has("read_at")) {
    await db("job_messages")
      .where({ job_id: safeJobId })
      .whereNot("sender_uuid", viewerUuid)
      .whereNull("read_at")
      .update({ read_at: db.fn.now() });
  }

  const selectColumns = [
    "jm.id",
    "jm.job_id",
    "jm.sender_uuid",
    "jm.message",
    "jm.created_at",
    "sender.username as sender_username",
    "sender.full_name as sender_full_name",
    "sender.profile_pic as sender_profile_pic",
  ];
  if (columns.has("media")) selectColumns.push("jm.media");
  if (columns.has("message_type")) selectColumns.push("jm.message_type");
  if (columns.has("delivered_at")) selectColumns.push("jm.delivered_at");
  if (columns.has("read_at")) selectColumns.push("jm.read_at");

  const rows = await db("job_messages as jm")
    .leftJoin("profiles as sender", "sender.uuid", "jm.sender_uuid")
    .where("jm.job_id", safeJobId)
    .orderBy("jm.created_at", "asc")
    .select(selectColumns);

  return rows.map((row) => ({
    id: row.id,
    job_id: row.job_id,
    sender_uuid: row.sender_uuid,
    message: row.message || "",
    media: Array.isArray(row.media) ? row.media : [],
    message_type: row.message_type || (Array.isArray(row.media) && row.media.length ? "mixed" : "text"),
    delivered_at: row.delivered_at || null,
    read_at: row.read_at || null,
    created_at: row.created_at,
    sender: {
      uuid: row.sender_uuid,
      username: row.sender_username || "",
      full_name: row.sender_full_name || "",
      profile_pic: row.sender_profile_pic || "",
    },
  }));
}

async function reputationForJob(jobId, providerUuid, raterUuid, job = null) {
  if (!jobId || !providerUuid || !raterUuid) return {};
  const [hasRatingsTable, hasRecommendationsTable] = await Promise.all([
    db.schema.hasTable("job_ratings"),
    db.schema.hasTable("job_recommendations"),
  ]);
  if (!hasRatingsTable) return {};

  const rating = await db("job_ratings")
    .where({ job_id: jobId, provider_uuid: providerUuid, rater_uuid: raterUuid })
    .first();
  const recommendation = hasRecommendationsTable
    ? await db("job_recommendations")
        .where({ job_id: jobId, provider_uuid: providerUuid, recommender_uuid: raterUuid })
        .first()
    : null;

  return {
    rating: rating
      ? {
          id: rating.id,
          score: Number(rating.score || 0),
          comment: rating.comment || "",
          created_at: rating.created_at,
        }
      : null,
    rating_submitted_at: rating?.created_at || null,
    recommendation: recommendation
      ? {
          id: recommendation.id,
          reason: recommendation.reason || "",
          recommender_visible: !!recommendation.recommender_visible,
          created_at: recommendation.created_at,
        }
      : null,
    recommendation_submitted_at: recommendation?.created_at || job?.recommendation_decided_at || null,
  };
}

function parseDateInput(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function closeoutNote(req, key) {
  return String(req.body?.[key] || req.body?.note || req.body?.reason || "").trim();
}

export async function getJobWorkspace(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    const messages = await listMessagesForJob(result.row.id, me.uuid);
    return res.json({ job: result.job, role: result.role, messages });
  } catch (err) {
    console.error("getJobWorkspace error:", err);
    return res.status(500).json({ message: "Failed to load workspace" });
  }
}

export async function listJobMessages(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    const messages = await listMessagesForJob(result.row.id, me.uuid);
    return res.json({ messages });
  } catch (err) {
    console.error("listJobMessages error:", err);
    return res.status(500).json({ message: "Failed to load messages" });
  }
}

export async function sendJobMessage(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    const message = String(req.body?.message || "").trim();
    const media = normalizeMessageMedia(req.body?.media || req.body?.attachments);
    if (message.length < 1 && media.length < 1) return res.status(400).json({ message: "Message or media is required" });
    if (message.length > 1000) return res.status(400).json({ message: "Message is too long" });
    const columns = await jobMessagesColumns();
    const payload = {
      job_id: result.row.id,
      sender_uuid: me.uuid,
      message,
    };
    setIfColumn(payload, columns, "media", db.raw("?::jsonb", [JSON.stringify(media)]));
    setIfColumn(payload, columns, "message_type", messageTypeFor(message, media, req.body?.message_type));
    setIfColumn(payload, columns, "delivered_at", db.fn.now());

    const [created] = await db("job_messages")
      .insert(payload)
      .returning("*");

    const recipientUuid = result.role === "hirer" ? result.row.assigned_provider_uuid : result.row.created_by;
    if (recipientUuid) {
      const senderProfile = await db("profiles").where({ uuid: me.uuid }).select("username", "full_name").first();
      await db.transaction(async (trx) => {
        await addNotification(trx, recipientUuid, "job_message", `New message on job ${result.row.job_code}.`, result.row, {
          actor_uuid: me.uuid,
          message_id: created.id,
          action: "open_workspace",
          sender_name: senderProfile?.full_name || senderProfile?.username || null,
          // Kept short: this is only used to build the OS push preview text
          // (see pushService.js), never stored as the canonical message body.
          message_preview: message ? message.slice(0, 120) : (media.length ? "Sent an attachment" : ""),
        });
      });
    }

    const [serialized] = await listMessagesForJob(result.row.id, me.uuid).then((items) => items.filter((item) => item.id === created.id));
    return res.status(201).json({ success: true, message: serialized || created });
  } catch (err) {
    console.error("sendJobMessage error:", err);
    return res.status(500).json({ message: "Failed to send message" });
  }
}

export async function suggestJobStart(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    if (result.role !== "provider") return res.status(403).json({ message: "Only the hired provider can suggest start time" });
    if (!["active"].includes(String(result.row.status))) return res.status(409).json({ message: "This job is not ready to start" });
    const suggestedAt = parseDateInput(req.body?.started_at || req.body?.start_at || req.body?.date);
    if (!suggestedAt) return res.status(400).json({ message: "Valid start date/time required" });
    const [updated] = await db("jobs").where({ id: result.row.id, status: "active" }).update({
      status: "start_pending",
      provider_suggested_start_at: suggestedAt,
      provider_start_note: closeoutNote(req, "provider_start_note"),
      started_requested_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning("*");
    if (!updated) return res.status(409).json({ message: "This job is not ready to start" });
    updated.contact_details = await assignedJobContactDetails(updated, me);
    await db.transaction(async (trx) => {
      await logActivity(trx, { jobId: updated.id, actorUuid: me.uuid, action: "start_requested", fromStatus: "active", toStatus: "start_pending" });
      await addNotification(trx, result.row.created_by, "job_start_requested", `Start time was submitted for job ${result.row.job_code}. Confirm it to mark the job as working.`, updated, { actor_uuid: me.uuid, action: "confirm_start" });
    });
    return res.json({ job: serializeJob({ ...updated, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    console.error("suggestJobStart error:", err);
    return res.status(500).json({ message: "Failed to suggest start time" });
  }
}

export async function confirmJobStart(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    if (result.role !== "hirer") return res.status(403).json({ message: "Only the hirer can confirm start time" });
    // "active"/"start_pending" are the legacy start-suggest flow; "start_requested"
    // is the new provider-requests-start flow (see requestJobStart). Both land here.
    const fromStatus = String(result.row.status);
    if (!["active", "start_pending", "start_requested"].includes(fromStatus)) {
      return res.status(409).json({ message: "This job cannot be started from this state" });
    }
    const officialAt = parseDateInput(req.body?.started_at || req.body?.start_at || req.body?.date || result.row.provider_suggested_start_at);
    if (!officialAt) return res.status(400).json({ message: "Valid start date/time required" });
    const [updated] = await db("jobs")
      .where({ id: result.row.id, status: fromStatus })
      .update({
        status: "working",
        started_at: officialAt,
        started_by_uuid: me.uuid,
        started_confirmed_at: db.fn.now(),
        start_confirmed_by_boss_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");
    if (!updated) return res.status(409).json({ message: "This job was already updated" });
    updated.contact_details = await assignedJobContactDetails(updated, me);
    await db.transaction(async (trx) => {
      await logActivity(trx, { jobId: updated.id, actorUuid: me.uuid, action: "start_confirmed", fromStatus, toStatus: "working" });
      await addNotification(trx, result.row.assigned_provider_uuid, "job_start_confirmed", `Job ${result.row.job_code} is now marked as working.`, updated, { actor_uuid: me.uuid, action: "open_workspace" });
    });
    return res.json({ job: serializeJob({ ...updated, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    console.error("confirmJobStart error:", err);
    return res.status(500).json({ message: "Failed to confirm start time" });
  }
}

export async function suggestJobCompletion(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    if (result.role !== "provider") return res.status(403).json({ message: "Only the hired provider can submit completion" });
    if (!["working"].includes(String(result.row.status))) return res.status(409).json({ message: "This job cannot be submitted from this state" });
    const suggestedAt = parseDateInput(req.body?.completed_at || req.body?.completion_at || req.body?.date);
    if (!suggestedAt) return res.status(400).json({ message: "Valid completion date/time required" });
    const [updated] = await db("jobs").where({ id: result.row.id, status: "working" }).update({
      status: "completion_pending",
      provider_suggested_completed_at: suggestedAt,
      provider_completion_note: closeoutNote(req, "provider_completion_note"),
      completion_requested_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning("*");
    if (!updated) return res.status(409).json({ message: "This job cannot be submitted from this state" });
    updated.contact_details = await assignedJobContactDetails(updated, me);
    await db.transaction(async (trx) => {
      await logActivity(trx, { jobId: updated.id, actorUuid: me.uuid, action: "completion_requested", fromStatus: "working", toStatus: "completion_pending" });
      await addNotification(trx, result.row.created_by, "job_completion_requested", `Completion was submitted for job ${result.row.job_code}. Confirm it to close the job.`, updated, { actor_uuid: me.uuid, action: "confirm_completion" });
    });
    return res.json({ job: serializeJob({ ...updated, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    console.error("suggestJobCompletion error:", err);
    return res.status(500).json({ message: "Failed to submit completion" });
  }
}

export async function confirmJobCompletion(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    if (result.role !== "hirer") return res.status(403).json({ message: "Only the hirer can confirm completion" });
    const fromStatus = String(result.row.status);
    if (!["working", "completion_pending"].includes(fromStatus)) return res.status(409).json({ message: "This job cannot be completed from this state" });
    const officialAt = parseDateInput(req.body?.completed_at || req.body?.completion_at || req.body?.date || result.row.provider_suggested_completed_at);
    if (!officialAt) return res.status(400).json({ message: "Valid completion date/time required" });
    const [updated] = await db("jobs")
      .where({ id: result.row.id, status: fromStatus })
      .update({
        status: "completed",
        completed_at: officialAt,
        completed_by_uuid: me.uuid,
        completion_confirmed_by_boss_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");
    if (!updated) return res.status(409).json({ message: "This job was already updated" });
    updated.contact_details = await assignedJobContactDetails(updated, me);
    await db.transaction(async (trx) => {
      await logActivity(trx, { jobId: updated.id, actorUuid: me.uuid, action: "completion_confirmed", fromStatus, toStatus: "completed" });
      await addNotification(trx, result.row.assigned_provider_uuid, "job_completed", `Job ${result.row.job_code} has been confirmed complete.`, updated, { actor_uuid: me.uuid, action: "rate_or_view" });
    });
    return res.json({ job: serializeJob({ ...updated, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    console.error("confirmJobCompletion error:", err);
    return res.status(500).json({ message: "Failed to confirm completion" });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// New lifecycle (v2): assigned(active) -> start_requested -> working ->
// submitted -> completed, with a submitted -> revision_requested -> submitted
// loop supporting multiple attempts. `start-confirm` above already accepts
// "start_requested" as a valid source status, so requestJobStart + the
// existing confirmJobStart together form the new start flow.
// ─────────────────────────────────────────────────────────────────────────

function toClientSubmission(row, extra = {}) {
  if (!row) return null;
  return {
    id: row.id,
    job_id: row.job_id,
    provider_uuid: row.provider_uuid,
    attempt_number: row.attempt_number,
    note: row.note || "",
    media: Array.isArray(row.media) ? row.media : [],
    status: row.status,
    submitted_at: row.submitted_at,
    reviewed_by_uuid: row.reviewed_by_uuid || null,
    reviewed_at: row.reviewed_at || null,
    review_note: row.review_note || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...extra,
  };
}

export async function requestJobStart(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    if (result.role !== "provider") return res.status(403).json({ message: "Only the hired provider can request start" });

    const note = closeoutNote(req, "provider_start_note");
    const [updated] = await db("jobs")
      .where({ id: result.row.id, status: "active" })
      .update({
        status: "start_requested",
        provider_start_note: note || result.row.provider_start_note || null,
        started_requested_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning("*");

    if (!updated) return res.status(409).json({ message: "This job is not ready for a start request" });
    updated.contact_details = await assignedJobContactDetails(updated, me);

    await db.transaction(async (trx) => {
      await logActivity(trx, {
        jobId: updated.id,
        actorUuid: me.uuid,
        action: "start_requested",
        fromStatus: "active",
        toStatus: "start_requested",
        note,
      });
      await addNotification(
        trx,
        result.row.created_by,
        "job_start_requested",
        `The provider is ready to start job ${updated.job_code}. Confirm to begin work.`,
        updated,
        { actor_uuid: me.uuid, action: "confirm_start" }
      );
    });

    return res.json({ job: serializeJob({ ...updated, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    console.error("requestJobStart error:", err);
    return res.status(500).json({ message: "Failed to request start" });
  }
}

export async function submitJobWork(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    if (result.role !== "provider") return res.status(403).json({ message: "Only the hired provider can submit work" });

    const fromStatus = String(result.row.status);
    if (!["working", "revision_requested"].includes(fromStatus)) {
      return res.status(409).json({ message: "This job is not ready for submission" });
    }

    const note = String(req.body?.note || req.body?.message || "").trim();
    const media = normalizeMessageMedia(req.body?.media || req.body?.attachments);
    if (!note && !media.length) {
      return res.status(400).json({ message: "Add a note or at least one file before submitting" });
    }

    let submission = null;
    let updatedJob = null;

    await db.transaction(async (trx) => {
      const [updated] = await trx("jobs")
        .where({ id: result.row.id, status: fromStatus })
        .update({
          status: "submitted",
          provider_suggested_completed_at: db.fn.now(),
          provider_completion_note: note || result.row.provider_completion_note || null,
          completion_requested_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");

      if (!updated) {
        throw Object.assign(new Error("This job is not ready for submission"), { status: 409 });
      }
      updatedJob = updated;

      const priorAttempts = await trx("job_submissions").where({ job_id: updated.id }).count("* as count").first();
      const attemptNumber = Number(priorAttempts?.count || 0) + 1;

      [submission] = await trx("job_submissions")
        .insert({
          job_id: updated.id,
          provider_uuid: me.uuid,
          attempt_number: attemptNumber,
          note: note || null,
          media: db.raw("?::jsonb", [JSON.stringify(media)]),
          status: "submitted",
          submitted_at: db.fn.now(),
        })
        .returning("*");

      await logActivity(trx, {
        jobId: updated.id,
        actorUuid: me.uuid,
        action: "work_submitted",
        fromStatus,
        toStatus: "submitted",
        note,
        meta: { attempt_number: attemptNumber, submission_id: submission.id },
      });

      await addNotification(
        trx,
        result.row.created_by,
        "job_submitted",
        `The provider submitted work for job ${updated.job_code} (attempt #${attemptNumber}). Review it to accept or request changes.`,
        updated,
        { actor_uuid: me.uuid, action: "open_workspace_progress", attempt_number: attemptNumber }
      );
    });

    updatedJob.contact_details = await assignedJobContactDetails(updatedJob, me);
    return res.status(201).json({
      job: serializeJob({ ...updatedJob, applicant_count: result.row.applicant_count }),
      submission: toClientSubmission(submission),
    });
  } catch (err) {
    if (err?.status === 409) return res.status(409).json({ message: err.message });
    console.error("submitJobWork error:", err);
    return res.status(500).json({ message: "Failed to submit work" });
  }
}

export async function acceptJobSubmission(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    if (result.role !== "hirer") return res.status(403).json({ message: "Only the hirer can accept submitted work" });
    // "completion_pending" is the legacy complete-suggest flow's equivalent of
    // "submitted" - accepted here too so old in-flight jobs aren't stranded.
    const fromStatus = String(result.row.status);
    if (!["submitted", "completion_pending"].includes(fromStatus)) {
      return res.status(409).json({ message: "There is no pending submission to accept" });
    }

    let updatedJob = null;
    let latestAttempt = null;
    await db.transaction(async (trx) => {
      const [updated] = await trx("jobs")
        .where({ id: result.row.id, status: fromStatus })
        .update({
          status: "completed",
          completed_at: db.fn.now(),
          completed_by_uuid: me.uuid,
          completion_confirmed_by_boss_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");

      if (!updated) throw Object.assign(new Error("There is no pending submission to accept"), { status: 409 });
      updatedJob = updated;

      const latest = await trx("job_submissions").where({ job_id: updated.id }).orderBy("attempt_number", "desc").first();
      latestAttempt = latest?.attempt_number || null;
      if (latest) {
        await trx("job_submissions").where({ id: latest.id }).update({
          status: "accepted",
          reviewed_by_uuid: me.uuid,
          reviewed_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
      }

      await logActivity(trx, {
        jobId: updated.id,
        actorUuid: me.uuid,
        action: "work_accepted",
        fromStatus,
        toStatus: "completed",
        meta: { attempt_number: latestAttempt },
      });

      await addNotification(
        trx,
        result.row.assigned_provider_uuid,
        "job_completed",
        `Job ${updated.job_code} was accepted as complete. Ratings are now open.`,
        updated,
        { actor_uuid: me.uuid, action: "rate_or_view" }
      );
    });

    updatedJob.contact_details = await assignedJobContactDetails(updatedJob, me);
    return res.json({ job: serializeJob({ ...updatedJob, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    if (err?.status === 409) return res.status(409).json({ message: err.message });
    console.error("acceptJobSubmission error:", err);
    return res.status(500).json({ message: "Failed to accept submission" });
  }
}

export async function requestJobRevision(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    if (result.role !== "hirer") return res.status(403).json({ message: "Only the hirer can request revisions" });
    // "completion_pending" is the legacy complete-suggest flow's equivalent of
    // "submitted" - accepted here too so old in-flight jobs aren't stranded.
    const fromStatus = String(result.row.status);
    if (!["submitted", "completion_pending"].includes(fromStatus)) {
      return res.status(409).json({ message: "There is no pending submission to review" });
    }

    const reviewNote = String(req.body?.review_note || req.body?.note || req.body?.reason || "").trim();
    if (reviewNote.length < 5) {
      return res.status(400).json({ message: "Explain what needs to change (at least 5 characters)" });
    }

    let updatedJob = null;
    let latestAttempt = null;
    await db.transaction(async (trx) => {
      const [updated] = await trx("jobs")
        .where({ id: result.row.id, status: fromStatus })
        .update({
          status: "revision_requested",
          provider_suggested_completed_at: null,
          completion_requested_at: null,
          updated_at: db.fn.now(),
        })
        .returning("*");

      if (!updated) throw Object.assign(new Error("There is no pending submission to review"), { status: 409 });
      updatedJob = updated;

      const latest = await trx("job_submissions").where({ job_id: updated.id }).orderBy("attempt_number", "desc").first();
      latestAttempt = latest?.attempt_number || null;
      if (latest) {
        await trx("job_submissions").where({ id: latest.id }).update({
          status: "revision_requested",
          reviewed_by_uuid: me.uuid,
          reviewed_at: db.fn.now(),
          review_note: reviewNote,
          updated_at: db.fn.now(),
        });
      }

      await logActivity(trx, {
        jobId: updated.id,
        actorUuid: me.uuid,
        action: "revision_requested",
        fromStatus,
        toStatus: "revision_requested",
        note: reviewNote,
        meta: { attempt_number: latestAttempt },
      });

      await addNotification(
        trx,
        result.row.assigned_provider_uuid,
        "job_revision_requested",
        `The employer requested changes on job ${updated.job_code}${latestAttempt ? ` (attempt #${latestAttempt})` : ""}. ${reviewNote}`,
        updated,
        { actor_uuid: me.uuid, action: "open_workspace_progress", review_note: reviewNote }
      );
    });

    updatedJob.contact_details = await assignedJobContactDetails(updatedJob, me);
    return res.json({ job: serializeJob({ ...updatedJob, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    if (err?.status === 409) return res.status(409).json({ message: err.message });
    console.error("requestJobRevision error:", err);
    return res.status(500).json({ message: "Failed to request revision" });
  }
}

export async function listJobSubmissions(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });

    const rows = await db("job_submissions as s")
      .leftJoin("profiles as p", "p.uuid", "s.provider_uuid")
      .leftJoin("profiles as r", "r.uuid", "s.reviewed_by_uuid")
      .where("s.job_id", result.row.id)
      .orderBy("s.attempt_number", "asc")
      .select(
        "s.*",
        "p.username as provider_username",
        "p.full_name as provider_full_name",
        "p.profile_pic as provider_profile_pic",
        "r.username as reviewer_username",
        "r.full_name as reviewer_full_name"
      );

    const submissions = rows.map((row) =>
      toClientSubmission(row, {
        provider: {
          uuid: row.provider_uuid,
          username: row.provider_username || "",
          full_name: row.provider_full_name || "",
          profile_pic: row.provider_profile_pic || "",
        },
        reviewer: row.reviewed_by_uuid
          ? { uuid: row.reviewed_by_uuid, username: row.reviewer_username || "", full_name: row.reviewer_full_name || "" }
          : null,
      })
    );

    return res.json({ submissions });
  } catch (err) {
    console.error("listJobSubmissions error:", err);
    return res.status(500).json({ message: "Failed to load submissions" });
  }
}

export async function listJobActivity(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });

    const rows = await db("job_activity_logs as a")
      .leftJoin("profiles as p", "p.uuid", "a.actor_uuid")
      .where("a.job_id", result.row.id)
      .orderBy("a.created_at", "asc")
      .select(
        "a.*",
        "p.username as actor_username",
        "p.full_name as actor_full_name",
        "p.profile_pic as actor_profile_pic"
      );

    const activity = rows.map((row) => ({
      id: row.id,
      job_id: row.job_id,
      action: row.action,
      from_status: row.from_status,
      to_status: row.to_status,
      note: row.note || "",
      meta: row.meta && typeof row.meta === "object" ? row.meta : {},
      created_at: row.created_at,
      actor: row.actor_uuid
        ? {
            uuid: row.actor_uuid,
            username: row.actor_username || "",
            full_name: row.actor_full_name || "",
            profile_pic: row.actor_profile_pic || "",
          }
        : null,
    }));

    return res.json({ activity });
  } catch (err) {
    console.error("listJobActivity error:", err);
    return res.status(500).json({ message: "Failed to load activity" });
  }
}

export async function disputeJobCloseout(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const result = await workspaceJob(routeJobId(req), me);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    const reason = String(req.body?.reason || req.body?.dispute_reason || "").trim();
    if (reason.length < 8) return res.status(400).json({ message: "Please explain the dispute" });

    const completionRejected = result.role === "hirer" && String(result.row.status) === "completion_pending";
    const updatePayload = completionRejected
      ? {
          status: "working",
          provider_suggested_completed_at: null,
          provider_completion_note: null,
          completion_requested_at: null,
          disputed_by_uuid: me.uuid,
          dispute_reason: reason,
          dispute_created_at: db.fn.now(),
          updated_at: db.fn.now(),
        }
      : {
          status: "disputed",
          disputed_by_uuid: me.uuid,
          dispute_reason: reason,
          dispute_created_at: db.fn.now(),
          updated_at: db.fn.now(),
        };

    const [updated] = await db("jobs").where({ id: result.row.id }).update(updatePayload).returning("*");
    updated.contact_details = await assignedJobContactDetails(updated, me);

    await db.transaction(async (trx) => {
      await logActivity(trx, {
        jobId: updated.id,
        actorUuid: me.uuid,
        action: completionRejected ? "completion_rejected" : "disputed",
        fromStatus: result.row.status,
        toStatus: updated.status,
        note: reason,
      });

      if (completionRejected && result.row.assigned_provider_uuid) {
        const hirer = await db("profiles").where({ uuid: me.uuid }).first();
        const hirerName = hirer?.full_name || hirer?.username || "The hirer";
        await addNotification(
          trx,
          result.row.assigned_provider_uuid,
          "job_completion_rejected",
          `${hirerName} has not accepted your completion submission for job ${result.row.job_code}, ${result.row.title}. Reason: ${reason}`,
          updated,
          { actor_uuid: me.uuid, action: "open_workspace_progress", reason }
        );
      }
    });

    return res.json({ job: serializeJob({ ...updated, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    console.error("disputeJobCloseout error:", err);
    return res.status(500).json({ message: "Failed to report dispute" });
  }
}

export async function acceptDirectHire(req, res) {
  try {
    const me = actor(req);
    if (!me) {
      return res.status(401).json({ message: "User account required" });
    }

    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.hire_type !== "direct" || job.target_provider_uuid !== me.uuid) {
      return res.status(403).json({ message: "This direct hire request is not for you" });
    }
    if (job.status !== "pending") {
      return res.status(409).json({ message: "This hire request is no longer pending" });
    }

    const provider = await db("profiles").where({ uuid: me.uuid }).first();
    const providerStartDate = parseDateInput(req.body?.provider_start_date || req.body?.available_from || req.body?.start_date);
    const durationValue = Number(req.body?.estimated_duration_value || req.body?.duration_value || 0);
    const unit = durationUnit(req.body?.estimated_duration_unit || req.body?.duration_unit);
    const columns = await jobsColumns();
    const updatePayload = {
      status: "active",
      assigned_provider_uuid: me.uuid,
      updated_at: db.fn.now(),
    };
    setIfColumn(updatePayload, columns, "direct_status", "accepted");
    setIfColumn(updatePayload, columns, "provider_start_note", String(req.body?.provider_start_note || req.body?.acceptance_note || "").trim() || job.provider_start_note || null);
    setIfColumn(updatePayload, columns, "provider_start_date", providerStartDate || null);
    setIfColumn(updatePayload, columns, "estimated_duration_value", Number.isFinite(durationValue) && durationValue > 0 ? Math.round(durationValue) : null);
    setIfColumn(updatePayload, columns, "estimated_duration_unit", unit);
    const [updated] = await db("jobs")
      .where({ id: job.id })
      .update(updatePayload)
      .returning("*");

    await logActivity(db, {
      jobId: updated.id,
      actorUuid: me.uuid,
      action: "provider_assigned",
      fromStatus: job.status,
      toStatus: "active",
      meta: { via: "direct_hire" },
    });

    await insertNotification(db, {
      profile_uuid: job.created_by,
      system: "hiring",
      type: "direct_job_accepted",
      title: notificationJobTitle(job),
      body: `${provider?.full_name || provider?.username || "Provider"} has accepted job ${job.job_code} of ${job.title}.`,
      job_id: job.id,
      meta: { profile_uuid: me.uuid, actor_uuid: me.uuid, action: "open_job_details" },
    });

    return res.json({ success: true, message: "Direct hire accepted", job: serializeJob({ ...updated, applicant_count: 0 }), workspace: { job_id: updated.id } });
  } catch (err) {
    console.error("acceptDirectHire error:", err);
    return res.status(500).json({ message: "Failed to accept hire request" });
  }
}

export async function declineDirectHire(req, res) {
  try {
    const me = actor(req);
    if (!me) {
      return res.status(401).json({ message: "User account required" });
    }

    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.hire_type !== "direct" || job.target_provider_uuid !== me.uuid) {
      return res.status(403).json({ message: "This direct hire request is not for you" });
    }
    if (job.status !== "pending") {
      return res.status(409).json({ message: "This hire request is no longer pending" });
    }

    const provider = await db("profiles").where({ uuid: me.uuid }).first();
    const columns = await jobsColumns();
    const updatePayload = { status: "declined", updated_at: db.fn.now() };
    setIfColumn(updatePayload, columns, "direct_status", "declined");
    const [updated] = await db("jobs")
      .where({ id: job.id })
      .update(updatePayload)
      .returning("*");

    await insertNotification(db, {
      profile_uuid: job.created_by,
      system: "hiring",
      type: "direct_job_declined",
      title: notificationJobTitle(job),
      body: `${provider?.full_name || provider?.username || "Provider"} has declined job ${job.job_code} of ${job.title}.`,
      job_id: job.id,
      meta: { profile_uuid: me.uuid, actor_uuid: me.uuid, action: "publish_publicly" },
    });

    return res.json({ success: true, message: "Direct hire declined", job: serializeJob({ ...updated, applicant_count: 0 }) });
  } catch (err) {
    console.error("declineDirectHire error:", err);
    return res.status(500).json({ message: "Failed to decline hire request" });
  }
}

export async function publishJobPublicly(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.created_by !== me.uuid) return res.status(403).json({ message: "Only the hirer can publish this job" });
    if (job.hire_type !== "direct") return res.status(409).json({ message: "This job is already public" });
    if (!["pending", "declined"].includes(String(job.status))) {
      return res.status(409).json({ message: "Only pending or declined direct hires can be posted publicly" });
    }

    const columns = await jobsColumns();
    const updatePayload = {
      status: "open",
      hire_type: "posted",
      target_provider_uuid: null,
      assigned_provider_uuid: null,
      updated_at: db.fn.now(),
    };
    setIfColumn(updatePayload, columns, "direct_status", null);
    const [updated] = await db("jobs")
      .where({ id: job.id })
      .update(updatePayload)
      .returning("*");

    return res.json({ success: true, message: "Job posted publicly", job: serializeJob({ ...updated, applicant_count: 0 }) });
  } catch (err) {
    console.error("publishJobPublicly error:", err);
    return res.status(500).json({ message: "Failed to publish job" });
  }
}

export async function updateJob(req, res) {
  try {
    const me = actor(req);
    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (!me || job.created_by !== me.uuid) return res.status(403).json({ message: "Only the poster can edit this job" });

    const activeApps = await db("job_applications").where({ job_id: job.id }).whereNull("withdrawn_at").count("* as count").first();
    if (Number(activeApps?.count || 0) > 0) {
      return res.status(409).json({ message: "This job has applicants. Only cancellation or assignment is allowed now." });
    }

    const payload = { updated_at: db.fn.now() };
    ["title", "description", "location", "service_type"].forEach((field) => {
      if (typeof req.body[field] === "string" && req.body[field].trim()) payload[field] = req.body[field].trim();
    });

    const [updated] = await db("jobs").where({ id: job.id }).update(payload).returning("*");
    return res.json({ job: serializeJob({ ...updated, applicant_count: 0 }) });
  } catch (err) {
    console.error("updateJob error:", err);
    return res.status(500).json({ message: "Failed to update job" });
  }
}

export async function cancelJob(req, res) {
  try {
    const me = actor(req);
    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (!me || job.created_by !== me.uuid) return res.status(403).json({ message: "Only the poster can cancel this job" });
    if (!ACTIVE_STATUSES.includes(job.status)) return res.status(409).json({ message: "Job cannot be cancelled from this state" });

    await db.transaction(async (trx) => {
      const [updated] = await trx("jobs").where({ id: job.id }).update({ status: "cancelled", updated_at: db.fn.now() }).returning("*");
      await logActivity(trx, { jobId: updated.id, actorUuid: me.uuid, action: "cancelled", fromStatus: job.status, toStatus: "cancelled" });
      const apps = await trx("job_applications").where({ job_id: job.id }).whereNull("withdrawn_at").select("profile_uuid");
      for (const app of apps) {
        await addNotification(trx, app.profile_uuid, "job_cancelled", `Job ${updated.job_code} was cancelled.`, updated);
      }
    });

    return res.json({ success: true, message: "Job cancelled" });
  } catch (err) {
    console.error("cancelJob error:", err);
    return res.status(500).json({ message: "Failed to cancel job" });
  }
}

export async function applyToJob(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.hire_type === "direct" || job.target_provider_uuid) return res.status(409).json({ message: "Direct hire requests cannot be applied to" });
    if (job.created_by === me.uuid) return res.status(409).json({ message: "You cannot apply to your own job" });
    if (!ACTIVE_STATUSES.includes(job.status)) return res.status(409).json({ message: "This job is not accepting applications" });

    const profile = await db("profiles").where({ uuid: me.uuid }).first();

    const media = normalizeMedia(req.body.media || req.body.images, "applications");
    const durationValue = Number(req.body.duration_value ?? req.body.estimated_duration_value);
    const applicationDurationUnit = durationUnit(
      req.body.duration_unit || req.body.estimated_duration_unit
    );
    const structuredDuration =
      Number.isFinite(durationValue) && durationValue > 0 && applicationDurationUnit
        ? `${durationValue} ${applicationDurationUnit}`
        : req.body.duration || null;
    const applicationPayload = {
      job_id: job.id,
      profile_uuid: me.uuid,
      message: req.body.message || req.body.explanation || null,
      budget: req.body.budget || null,
      duration: structuredDuration,
      duration_value: Number.isFinite(durationValue) && durationValue > 0 ? durationValue : null,
      duration_unit: applicationDurationUnit,
      available_from: req.body.available_from || req.body.availableFrom || null,
      experience: req.body.experience || null,
      notes: req.body.notes || null,
      media: db.raw("?::jsonb", [JSON.stringify(media)]),
    };

    await db.transaction(async (trx) => {
      await trx("job_applications")
        .insert(applicationPayload)
        .onConflict(["job_id", "profile_uuid"])
        .merge({
          withdrawn_at: null,
          message: applicationPayload.message,
          budget: applicationPayload.budget,
          duration: applicationPayload.duration,
          duration_value: applicationPayload.duration_value,
          duration_unit: applicationPayload.duration_unit,
          available_from: applicationPayload.available_from,
          experience: applicationPayload.experience,
          notes: applicationPayload.notes,
          media: applicationPayload.media,
          updated_at: db.fn.now(),
        });
      if (job.status === "open") await trx("jobs").where({ id: job.id }).update({ status: "applied", updated_at: db.fn.now() });
      await addNotification(
        trx,
        job.created_by,
        "indirect_job_application",
        `@${profile?.username || "provider"} applied to job ${job.job_code} of ${job.title}, see their application.`,
        job,
        { profile_uuid: me.uuid, application_action: "see_application" }
      );
    });

    return res.status(201).json({ success: true, message: "Application submitted" });
  } catch (err) {
    console.error("applyToJob error:", err);
    return res.status(500).json({ message: "Failed to apply" });
  }
}

export async function withdrawApplication(req, res) {
  try {
    const me = actor(req);
    if (!me) return res.status(401).json({ message: "User account required" });
    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (!ACTIVE_STATUSES.includes(job.status)) return res.status(409).json({ message: "Application can no longer be withdrawn" });

    const profile = await db("profiles").where({ uuid: me.uuid }).first();
    await db.transaction(async (trx) => {
      await trx("job_applications")
        .where({ job_id: job.id, profile_uuid: me.uuid })
        .whereNull("withdrawn_at")
        .update({ status: "withdrawn", withdrawn_at: db.fn.now(), updated_at: db.fn.now() });
      const activeApps = await trx("job_applications").where({ job_id: job.id }).whereNull("withdrawn_at").count("* as count").first();
      if (Number(activeApps?.count || 0) === 0) await trx("jobs").where({ id: job.id }).update({ status: "open", updated_at: db.fn.now() });
      await addNotification(trx, job.created_by, "provider_withdrew", `@${profile?.username || "provider"} withdrew application for job ${job.job_code}.`, job, { profile_uuid: me.uuid });
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("withdrawApplication error:", err);
    return res.status(500).json({ message: "Failed to withdraw application" });
  }
}

export async function assignProvider(req, res) {
  try {
    const me = actor(req);
    const profile_uuid = String(req.body.profile_uuid || "").trim();
    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (!me || job.created_by !== me.uuid) return res.status(403).json({ message: "Only the poster can assign this job" });
    if (!ACTIVE_STATUSES.includes(job.status)) return res.status(409).json({ message: "Job cannot be assigned from this state" });

    const app = await db("job_applications").where({ job_id: job.id, profile_uuid }).whereNull("withdrawn_at").first();
    if (!app) return res.status(404).json({ message: "Provider has not applied to this job" });

    const [selected, poster] = await Promise.all([
      db("profiles").where({ uuid: profile_uuid }).first(),
      db("profiles").where({ uuid: me.uuid }).first(),
    ]);
    let assignedJob = null;
    await db.transaction(async (trx) => {
      const [updated] = await trx("jobs").where({ id: job.id }).update({ status: "active", assigned_provider_uuid: profile_uuid, updated_at: db.fn.now() }).returning("*");
      assignedJob = updated;
      await logActivity(trx, {
        jobId: updated.id,
        actorUuid: me.uuid,
        action: "provider_assigned",
        fromStatus: job.status,
        toStatus: "active",
        meta: { provider_uuid: profile_uuid },
      });
      const apps = await trx("job_applications").where({ job_id: job.id }).whereNull("withdrawn_at").select("profile_uuid");
      for (const item of apps) {
        if (item.profile_uuid === profile_uuid) {
          await trx("job_applications").where({ job_id: job.id, profile_uuid: item.profile_uuid }).update({ status: "approved", updated_at: db.fn.now() });
          await addNotification(
            trx,
            item.profile_uuid,
            "indirect_job_response",
            `You got the job ${updated.job_code} of ${updated.title} from @${poster?.username || "user"}.`,
            updated,
            { response: "accepted" }
          );
        } else {
          await trx("job_applications").where({ job_id: job.id, profile_uuid: item.profile_uuid }).update({ status: "not_attained", updated_at: db.fn.now() });
          await addNotification(trx, item.profile_uuid, "job_filled", `Job ${updated.job_code} has been assigned. Applications closed.`, updated);
        }
      }
      await addNotification(trx, me.uuid, "job_assignment_confirmed", `You assigned job ${updated.job_code} to @${selected?.username || "provider"}.`, updated, { profile_uuid });
    });

    return res.json({
      success: true,
      message: "Provider assigned",
      job: serializeJob({ ...(assignedJob || job), applicant_count: 0 }),
      workspace: { job_id: assignedJob?.id || job.id },
    });
  } catch (err) {
    console.error("assignProvider error:", err);
    return res.status(500).json({ message: "Failed to assign provider" });
  }
}

export async function deleteJob(req, res) {
  try {
    const me = actor(req);
    const job = await db("jobs").where({ id: req.params.id }).first();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (!me || job.created_by !== me.uuid) return res.status(403).json({ message: "Only the poster can delete this job" });
    if (!["cancelled", "closed", "completed"].includes(job.status)) return res.status(409).json({ message: "Only cancelled or completed jobs can be deleted" });
    await db("jobs").where({ id: job.id }).del();
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteJob error:", err);
    return res.status(500).json({ message: "Failed to delete job" });
  }
}
