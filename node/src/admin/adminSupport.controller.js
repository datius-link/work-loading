import db from "../db/index.js";

const TYPES = ["contact_admin", "feedback", "report_problem"];
const STATUSES = ["open", "in_progress", "resolved"];

function serializeRequest(row) {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    admin_note: row.admin_note || null,
    resolved_at: row.resolved_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    requester: {
      uuid: row.profile_uuid,
      username: row.username || "",
      full_name: row.full_name || "",
      email: row.email || "",
      profile_pic: row.profile_pic || "",
    },
  };
}

// GET /support?type=&status=&q=&page=&limit=
export async function listSupportRequests(req, res) {
  try {
    const { type, status, q } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const base = db("support_requests as sr").leftJoin("profiles as p", "p.uuid", "sr.profile_uuid");

    if (type && TYPES.includes(type)) base.where("sr.type", type);
    if (status && STATUSES.includes(status)) base.where("sr.status", status);
    if (q) {
      const like = `%${q}%`;
      base.where((qb) => {
        qb.whereILike("sr.subject", like)
          .orWhereILike("sr.message", like)
          .orWhereILike("p.username", like)
          .orWhereILike("p.full_name", like);
      });
    }

    const countRow = await base.clone().count("sr.id as count").first();
    const rows = await base
      .clone()
      .select(
        "sr.id", "sr.profile_uuid", "sr.type", "sr.category", "sr.subject", "sr.message",
        "sr.status", "sr.admin_note", "sr.resolved_at", "sr.created_at", "sr.updated_at",
        "p.username", "p.full_name", "p.email", "p.profile_pic"
      )
      .orderBy("sr.created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);

    return res.json({
      requests: rows.map(serializeRequest),
      pagination: { page, limit, total: Number(countRow?.count || 0) },
    });
  } catch (err) {
    console.error("listSupportRequests error:", err);
    return res.status(500).json({ message: "Failed to load support requests" });
  }
}

export async function getSupportRequest(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Valid request id required" });

    const row = await db("support_requests as sr")
      .leftJoin("profiles as p", "p.uuid", "sr.profile_uuid")
      .where("sr.id", id)
      .select(
        "sr.id", "sr.profile_uuid", "sr.type", "sr.category", "sr.subject", "sr.message",
        "sr.status", "sr.admin_note", "sr.resolved_at", "sr.created_at", "sr.updated_at",
        "p.username", "p.full_name", "p.email", "p.profile_pic"
      )
      .first();

    if (!row) return res.status(404).json({ message: "Support request not found" });
    return res.json({ request: serializeRequest(row) });
  } catch (err) {
    console.error("getSupportRequest error:", err);
    return res.status(500).json({ message: "Failed to load support request" });
  }
}

// PATCH /support/:id — { status?, admin_note? }
export async function updateSupportRequest(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Valid request id required" });

    const existing = await db("support_requests").where({ id }).first();
    if (!existing) return res.status(404).json({ message: "Support request not found" });

    const patch = { updated_at: db.fn.now() };
    if (req.body?.status !== undefined) {
      const status = String(req.body.status || "").trim();
      if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
      patch.status = status;
      if (status === "resolved") {
        patch.resolved_at = db.fn.now();
        patch.resolved_by = req.admin?.id || null;
      } else {
        patch.resolved_at = null;
        patch.resolved_by = null;
      }
    }
    if (req.body?.admin_note !== undefined) {
      patch.admin_note = String(req.body.admin_note || "").trim().slice(0, 2000) || null;
    }

    const [updated] = await db("support_requests").where({ id }).update(patch).returning("*");
    const row = await db("support_requests as sr")
      .leftJoin("profiles as p", "p.uuid", "sr.profile_uuid")
      .where("sr.id", updated.id)
      .select(
        "sr.id", "sr.profile_uuid", "sr.type", "sr.category", "sr.subject", "sr.message",
        "sr.status", "sr.admin_note", "sr.resolved_at", "sr.created_at", "sr.updated_at",
        "p.username", "p.full_name", "p.email", "p.profile_pic"
      )
      .first();

    return res.json({ request: serializeRequest(row) });
  } catch (err) {
    console.error("updateSupportRequest error:", err);
    return res.status(500).json({ message: "Failed to update support request" });
  }
}

// GET /dashboard-summary — small set of counts for the admin dashboard.
export async function getDashboardSummary(req, res) {
  try {
    const [openByType, totalOpen, totalToday] = await Promise.all([
      db("support_requests").where({ status: "open" }).select("type").count("* as count").groupBy("type"),
      db("support_requests").where({ status: "open" }).count("* as count").first(),
      db("support_requests").whereRaw("created_at >= NOW() - INTERVAL '24 hours'").count("* as count").first(),
    ]);

    const byType = { contact_admin: 0, feedback: 0, report_problem: 0 };
    for (const row of openByType) {
      if (byType[row.type] !== undefined) byType[row.type] = Number(row.count || 0);
    }

    return res.json({
      summary: {
        open_support_requests: Number(totalOpen?.count || 0),
        open_by_type: byType,
        new_last_24h: Number(totalToday?.count || 0),
        open_disputes: 0,
      },
    });
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    return res.status(500).json({ message: "Failed to load dashboard summary" });
  }
}
