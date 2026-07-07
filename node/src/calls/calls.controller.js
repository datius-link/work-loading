import db from "../db/index.js";
import { insertNotification } from "../notifications/notificationSettings.js";

const OUTCOMES = ["completed", "missed", "declined", "busy", "failed", "cancelled"];

async function actorForJob(jobId, uuid) {
  const job = await db("jobs").where({ id: jobId }).first();
  if (!job) return { error: { status: 404, message: "Job not found" } };
  const isParticipant =
    uuid && (job.created_by === uuid || job.assigned_provider_uuid === uuid || job.target_provider_uuid === uuid);
  if (!isParticipant) return { error: { status: 403, message: "You are not part of this job" } };
  return { job };
}

// The actual call itself is signaled peer-to-peer through Convex (see
// mobile/convex/calls.js) — this endpoint only exists to guarantee the
// callee gets a real OS push (and, via the mobile background task, a native
// CallKeep ringing screen) even if their app isn't in the foreground with a
// live Convex subscription open.
export async function notifyIncomingCall(req, res) {
  try {
    const callerUuid = req.user?.uuid || req.viewer?.uuid;
    const { calleeUuid, callId, callerName, jobId } = req.body || {};

    if (!callerUuid) return res.status(401).json({ message: "Authorization required" });
    if (!calleeUuid || !callId) {
      return res.status(400).json({ message: "calleeUuid and callId are required" });
    }

    const job = jobId ? await db("jobs").where({ id: jobId }).first() : null;
    const jobLabel = job ? (job.job_code ? `${job.job_code} - ${job.title}` : job.title) : null;

    await insertNotification(db, {
      profile_uuid: calleeUuid,
      actor_uuid: callerUuid,
      system: "calls",
      type: "incoming_call",
      title: "Incoming call",
      body: jobLabel
        ? `${callerName || "Someone"} is calling you about ${jobLabel}`
        : `${callerName || "Someone"} is calling you on e-kazi`,
      job_id: jobId || null,
      meta: {
        action: "incoming_call",
        call_id: callId,
        caller_uuid: callerUuid,
        caller_name: callerName || "",
        job_title: job?.title || null,
        job_code: job?.job_code || null,
      },
    });

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("notifyIncomingCall error:", err);
    return res.status(500).json({ message: "Failed to notify callee" });
  }
}

// Called by the client once a call reaches a terminal state (hung up,
// declined, timed out unanswered, or resolved busy) so there's a permanent
// row in job_calls for the workspace's Calls tab. The live Convex call doc
// is ephemeral signaling and is never read for history, this is the only
// source of truth for "who called whom, about which job, and how it ended."
export async function logCallOutcome(req, res) {
  try {
    const me = req.user?.uuid || req.viewer?.uuid;
    if (!me) return res.status(401).json({ message: "Authorization required" });

    const {
      job_id: jobId,
      caller_uuid: callerUuid,
      callee_uuid: calleeUuid,
      convex_call_id: convexCallId,
      outcome,
      initiated_at: initiatedAt,
      answered_at: answeredAt,
      ended_at: endedAt,
    } = req.body || {};

    if (!jobId || !callerUuid || !calleeUuid) {
      return res.status(400).json({ message: "job_id, caller_uuid and callee_uuid are required" });
    }
    if (!OUTCOMES.includes(outcome)) {
      return res.status(400).json({ message: `outcome must be one of: ${OUTCOMES.join(", ")}` });
    }
    if (me !== callerUuid && me !== calleeUuid) {
      return res.status(403).json({ message: "You are not part of this call" });
    }

    const { error } = await actorForJob(jobId, me);
    if (error) return res.status(error.status).json({ message: error.message });

    const initiated = initiatedAt ? new Date(initiatedAt) : new Date();
    const answered = answeredAt ? new Date(answeredAt) : null;
    const ended = endedAt ? new Date(endedAt) : new Date();
    const durationSeconds = answered ? Math.max(0, Math.round((ended.getTime() - answered.getTime()) / 1000)) : null;

    const [row] = await db("job_calls")
      .insert({
        job_id: jobId,
        caller_uuid: callerUuid,
        callee_uuid: calleeUuid,
        convex_call_id: convexCallId || null,
        outcome,
        initiated_at: initiated,
        answered_at: answered,
        ended_at: ended,
        duration_seconds: durationSeconds,
      })
      .returning("*");

    // A missed call is the one outcome that's genuinely useful to push to the
    // callee — mirrors how a real phone tells you "1 missed call" even if you
    // never look at the app again. Every other outcome (completed, declined,
    // busy, failed, cancelled) is visible enough just by opening the Calls
    // tab, and doesn't need its own push.
    if (outcome === "missed") {
      try {
        const caller = await db("profiles").where({ uuid: callerUuid }).select("username", "full_name").first();
        const job = await db("jobs").where({ id: jobId }).select("job_code", "title").first();
        const jobLabel = job ? (job.job_code ? `${job.job_code} - ${job.title}` : job.title) : "a job";
        await insertNotification(db, {
          profile_uuid: calleeUuid,
          actor_uuid: callerUuid,
          system: "calls",
          type: "missed_call",
          title: "Missed call",
          body: `You missed a call from ${caller?.full_name || caller?.username || "someone"} about ${jobLabel}`,
          job_id: jobId,
          meta: { action: "open_calls_tab", call_row_id: row.id },
        });
      } catch (notificationErr) {
        console.error("logCallOutcome missed-call notification error:", notificationErr);
      }
    }

    return res.status(201).json({ success: true, call: row });
  } catch (err) {
    console.error("logCallOutcome error:", err);
    return res.status(500).json({ message: "Failed to log call outcome" });
  }
}

// Powers the Job Workspace "Calls" tab — every attempt for this job, newest
// first, with just enough of each participant's profile to render the row
// without a second round trip.
export async function listCallHistory(req, res) {
  try {
    const me = req.user?.uuid || req.viewer?.uuid;
    if (!me) return res.status(401).json({ message: "Authorization required" });

    const jobId = Number(req.params.jobId);
    if (!Number.isInteger(jobId)) return res.status(400).json({ message: "Valid job id required" });

    const { error } = await actorForJob(jobId, me);
    if (error) return res.status(error.status).json({ message: error.message });

    const rows = await db("job_calls as c")
      .where({ "c.job_id": jobId })
      .leftJoin("profiles as caller", "caller.uuid", "c.caller_uuid")
      .leftJoin("profiles as callee", "callee.uuid", "c.callee_uuid")
      .select(
        "c.id",
        "c.job_id",
        "c.caller_uuid",
        "c.callee_uuid",
        "c.outcome",
        "c.initiated_at",
        "c.answered_at",
        "c.ended_at",
        "c.duration_seconds",
        "caller.username as caller_username",
        "caller.full_name as caller_full_name",
        "caller.profile_pic as caller_profile_pic",
        "callee.username as callee_username",
        "callee.full_name as callee_full_name",
        "callee.profile_pic as callee_profile_pic"
      )
      .orderBy("c.initiated_at", "desc")
      .limit(200);

    const calls = rows.map((row) => ({
      id: row.id,
      job_id: row.job_id,
      outcome: row.outcome,
      initiated_at: row.initiated_at,
      answered_at: row.answered_at,
      ended_at: row.ended_at,
      duration_seconds: row.duration_seconds,
      // "direction" is from the requesting viewer's own point of view — the
      // same row reads as "Outgoing call to X" for the caller and "Incoming
      // call from X" for the callee, exactly like a real phone's call log.
      direction: row.caller_uuid === me ? "outgoing" : "incoming",
      caller: { uuid: row.caller_uuid, username: row.caller_username, full_name: row.caller_full_name, profile_pic: row.caller_profile_pic },
      callee: { uuid: row.callee_uuid, username: row.callee_username, full_name: row.callee_full_name, profile_pic: row.callee_profile_pic },
    }));

    return res.json({ calls });
  } catch (err) {
    console.error("listCallHistory error:", err);
    return res.status(500).json({ message: "Failed to load call history" });
  }
}
