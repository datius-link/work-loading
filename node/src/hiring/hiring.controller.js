import crypto from "crypto";
import db from "../db/index.js";

const ACTIVE_STATUSES = ["open", "applied"];
const DIRECT_HIRE_STATUSES = ["pending"];
const CONTACT_VISIBLE_STATUSES = ["closed", "filled", "completed", "active", "start_pending", "started", "working", "submitted", "completion_pending"];
let jobsColumnSet = null;

async function jobsColumns() {
  if (jobsColumnSet) return jobsColumnSet;
  const names = await db("information_schema.columns")
    .where({ table_schema: "public", table_name: "jobs" })
    .pluck("column_name");
  jobsColumnSet = new Set(names);
  return jobsColumnSet;
}

function setIfColumn(payload, columns, key, value) {
  if (columns.has(key)) payload[key] = value;
}

function actor(req) {
  const payload = req.viewer || req.user;
  if (!payload?.uuid) return null;
  return { uuid: payload.uuid, role: payload.role || "user" };
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

async function addNotification(trx, profile_uuid, type, body, job, meta = {}, system = "hiring", title = null) {
  await trx("notifications").insert({
    profile_uuid,
    actor_uuid: meta.actor_uuid || meta.profile_uuid || null,
    job_code: job?.job_code || null,
    system,
    type,
    title: title || (job?.job_code ? `Job ${job.job_code}` : "e-kazi"),
    body,
    job_id: job?.id || null,
    meta: db.raw("?::jsonb", [JSON.stringify(meta)]),
  });
}

function durationUnit(value) {
  const unit = String(value || "").toLowerCase().trim();
  return ["hours", "days", "weeks", "months"].includes(unit) ? unit : null;
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
      await db("notifications").insert(
        providers.map((provider) => ({
          profile_uuid: provider.uuid,
          system: "hiring",
          type: "new_relevant_job",
          title: `Job ${job.job_code}`,
          body: `You received a relevant job ${job.job_code}. Open to view and apply.`,
          job_id: job.id,
          meta: db.raw("?::jsonb", [JSON.stringify({ job_code: job.job_code })]),
        }))
      );
    }

    try {
      await db("notifications").insert({
        profile_uuid: me.uuid,
        system: "hiring",
        type: "job_posted",
        title: `Job ${job.job_code}`,
        body: `Your job ${job.job_code}, ${job.title}, has been posted. Applications will appear in My Jobs.`,
        job_id: job.id,
        meta: db.raw("?::jsonb", [JSON.stringify({ job_code: job.job_code })]),
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
    if (!me || me.role !== "light_user") {
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
          direct_status: "pending",
          status: "pending",
          media: db.raw("?::jsonb", [JSON.stringify(media)]),
        };
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
        { job_code: created.job_code, light_user_uuid: me.uuid, actions: ["claim", "decline", "see_details"] }
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
          .select("id", "job_id", "message", "budget", "duration", "available_from", "experience", "notes", "media", "status", "created_at", "updated_at")
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
    if (!row) return res.status(404).json({ message: "Job not found" });

    row.contact_details = await assignedJobContactDetails(row, me);
    const job = serializeJob(row);
    let applications = [];
    if (me?.uuid && row.created_by === me.uuid) {
      applications = await db("job_applications as ja")
        .join("profiles as p", "p.uuid", "ja.profile_uuid")
        .where("ja.job_id", row.id)
        .whereNull("ja.withdrawn_at")
        .select(
          "ja.id",
          "ja.message",
          "ja.budget",
          "ja.duration",
          "ja.available_from",
          "ja.experience",
          "ja.notes",
          "ja.media",
          "ja.created_at",
          "p.uuid",
          "p.username",
          "p.full_name",
          "p.profile_pic",
          "p.services",
          "p.ratings"
        );
    }

    if (me?.uuid && row.created_by !== me.uuid) {
      const app = await db("job_applications").where({ job_id: row.id, profile_uuid: me.uuid }).whereNull("withdrawn_at").first();
      job.has_applied = !!app;
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
  return { row, job: serializeJob(row), role: isHirer ? "hirer" : "provider" };
}

function routeJobId(req) {
  return req.params.jobId || req.params.id;
}

async function listMessagesForJob(jobId) {
  const hasMessagesTable = await db.schema.hasTable("job_messages");
  if (!hasMessagesTable) return [];

  const safeJobId = Number(jobId);
  if (!Number.isInteger(safeJobId) || safeJobId < 1) return [];

  const rows = await db("job_messages as jm")
    .leftJoin("profiles as sender", "sender.uuid", "jm.sender_uuid")
    .where("jm.job_id", safeJobId)
    .orderBy("jm.created_at", "asc")
    .select(
      "jm.id",
      "jm.job_id",
      "jm.sender_uuid",
      "jm.message",
      "jm.created_at",
      "sender.username as sender_username",
      "sender.full_name as sender_full_name",
      "sender.profile_pic as sender_profile_pic"
    );

  return rows.map((row) => ({
    id: row.id,
    job_id: row.job_id,
    sender_uuid: row.sender_uuid,
    message: row.message || "",
    created_at: row.created_at,
    sender: {
      uuid: row.sender_uuid,
      username: row.sender_username || "",
      full_name: row.sender_full_name || "",
      profile_pic: row.sender_profile_pic || "",
    },
  }));
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
    const messages = await listMessagesForJob(result.row.id);
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
    const messages = await listMessagesForJob(result.row.id);
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
    if (message.length < 1) return res.status(400).json({ message: "Message is required" });
    if (message.length > 1000) return res.status(400).json({ message: "Message is too long" });

    const [created] = await db("job_messages")
      .insert({ job_id: result.row.id, sender_uuid: me.uuid, message })
      .returning("*");

    const recipientUuid = result.role === "hirer" ? result.row.assigned_provider_uuid : result.row.created_by;
    if (recipientUuid) {
      await db.transaction(async (trx) => {
        await addNotification(trx, recipientUuid, "job_message", `New message on job ${result.row.job_code}.`, result.row, { actor_uuid: me.uuid, message_id: created.id, action: "open_workspace" });
      });
    }

    const [serialized] = await listMessagesForJob(result.row.id).then((items) => items.filter((item) => item.id === created.id));
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
    const [updated] = await db("jobs").where({ id: result.row.id }).update({
      status: "start_pending",
      provider_suggested_start_at: suggestedAt,
      provider_start_note: closeoutNote(req, "provider_start_note"),
      started_requested_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning("*");
    updated.contact_details = await assignedJobContactDetails(updated, me);
    await db.transaction(async (trx) => {
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
    if (!["active", "start_pending"].includes(String(result.row.status))) return res.status(409).json({ message: "This job cannot be started from this state" });
    const officialAt = parseDateInput(req.body?.started_at || req.body?.start_at || req.body?.date || result.row.provider_suggested_start_at);
    if (!officialAt) return res.status(400).json({ message: "Valid start date/time required" });
    const [updated] = await db("jobs").where({ id: result.row.id }).update({
      status: "working",
      started_at: officialAt,
      started_by_uuid: me.uuid,
      started_confirmed_at: db.fn.now(),
      start_confirmed_by_boss_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning("*");
    updated.contact_details = await assignedJobContactDetails(updated, me);
    await db.transaction(async (trx) => {
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
    const [updated] = await db("jobs").where({ id: result.row.id }).update({
      status: "completion_pending",
      provider_suggested_completed_at: suggestedAt,
      provider_completion_note: closeoutNote(req, "provider_completion_note"),
      completion_requested_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning("*");
    updated.contact_details = await assignedJobContactDetails(updated, me);
    await db.transaction(async (trx) => {
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
    if (!["working", "completion_pending"].includes(String(result.row.status))) return res.status(409).json({ message: "This job cannot be completed from this state" });
    const officialAt = parseDateInput(req.body?.completed_at || req.body?.completion_at || req.body?.date || result.row.provider_suggested_completed_at);
    if (!officialAt) return res.status(400).json({ message: "Valid completion date/time required" });
    const [updated] = await db("jobs").where({ id: result.row.id }).update({
      status: "completed",
      completed_at: officialAt,
      completed_by_uuid: me.uuid,
      completion_confirmed_by_boss_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning("*");
    updated.contact_details = await assignedJobContactDetails(updated, me);
    await db.transaction(async (trx) => {
      await addNotification(trx, result.row.assigned_provider_uuid, "job_completed", `Job ${result.row.job_code} has been confirmed complete.`, updated, { actor_uuid: me.uuid, action: "rate_or_view" });
    });
    return res.json({ job: serializeJob({ ...updated, applicant_count: result.row.applicant_count }) });
  } catch (err) {
    console.error("confirmJobCompletion error:", err);
    return res.status(500).json({ message: "Failed to confirm completion" });
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
    const [updated] = await db("jobs").where({ id: result.row.id }).update({
      status: "disputed",
      disputed_by_uuid: me.uuid,
      dispute_reason: reason,
      dispute_created_at: db.fn.now(),
      updated_at: db.fn.now(),
    }).returning("*");
    updated.contact_details = await assignedJobContactDetails(updated, me);
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
    const [updated] = await db("jobs")
      .where({ id: job.id })
      .update({
        status: "active",
        direct_status: "accepted",
        assigned_provider_uuid: me.uuid,
        provider_start_note: String(req.body?.provider_start_note || req.body?.acceptance_note || "").trim() || job.provider_start_note || null,
        provider_start_date: providerStartDate || null,
        estimated_duration_value: Number.isFinite(durationValue) && durationValue > 0 ? Math.round(durationValue) : null,
        estimated_duration_unit: unit,
        updated_at: db.fn.now(),
      })
      .returning("*");

    await db("notifications").insert({
      profile_uuid: job.created_by,
      system: "hiring",
      type: "direct_job_accepted",
      title: `Job ${job.job_code}`,
      body: `${provider?.full_name || provider?.username || "Provider"} has accepted job ${job.job_code} of ${job.title}.`,
      job_id: job.id,
      meta: db.raw("?::jsonb", [JSON.stringify({ profile_uuid: me.uuid, actor_uuid: me.uuid, action: "open_workspace" })]),
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
    const [updated] = await db("jobs")
      .where({ id: job.id })
      .update({
        status: "declined",
        direct_status: "declined",
        updated_at: db.fn.now(),
      })
      .returning("*");

    await db("notifications").insert({
      profile_uuid: job.created_by,
      system: "hiring",
      type: "direct_job_declined",
      title: `Job ${job.job_code}`,
      body: `${provider?.full_name || provider?.username || "Provider"} has declined job ${job.job_code} of ${job.title}.`,
      job_id: job.id,
      meta: db.raw("?::jsonb", [JSON.stringify({ profile_uuid: me.uuid, actor_uuid: me.uuid, action: "publish_publicly" })]),
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

    const [updated] = await db("jobs")
      .where({ id: job.id })
      .update({
        status: "open",
        direct_status: null,
        hire_type: "posted",
        target_provider_uuid: null,
        assigned_provider_uuid: null,
        updated_at: db.fn.now(),
      })
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
    const applicationPayload = {
      job_id: job.id,
      profile_uuid: me.uuid,
      message: req.body.message || req.body.explanation || null,
      budget: req.body.budget || null,
      duration: req.body.duration || null,
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
