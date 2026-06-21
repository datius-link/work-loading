import db from "../db/index.js";

const cleanText = (value, max) => String(value || "").trim().slice(0, max);

async function createSupportRequest(req, res, type) {
  try {
    const profileUuid = req.user?.uuid || req.viewer?.uuid;
    const subject = cleanText(req.body?.subject, 160);
    const category = cleanText(req.body?.category || req.body?.problem_type, 80);
    const message = cleanText(req.body?.message || req.body?.description, 5000);

    if (!profileUuid) return res.status(401).json({ message: "Authorization required" });
    if (!message) return res.status(400).json({ message: "Message or description is required" });
    if (type === "contact_admin" && !subject) {
      return res.status(400).json({ message: "Subject is required" });
    }
    if ((type === "feedback" || type === "report_problem") && !category) {
      return res.status(400).json({ message: "Category or problem type is required" });
    }

    const [request] = await db("support_requests")
      .insert({
        profile_uuid: profileUuid,
        type,
        category: category || null,
        subject: subject || null,
        message,
        metadata: db.raw("?::jsonb", [JSON.stringify({ source: "mobile_settings" })]),
      })
      .returning(["id", "type", "status", "created_at"]);

    return res.status(201).json({
      success: true,
      message: "Support request received",
      request,
    });
  } catch (err) {
    console.error("createSupportRequest error:", err);
    return res.status(500).json({ message: "Failed to save support request" });
  }
}

export const contactAdmin = (req, res) => createSupportRequest(req, res, "contact_admin");
export const sendFeedback = (req, res) => createSupportRequest(req, res, "feedback");
export const reportProblem = (req, res) => createSupportRequest(req, res, "report_problem");
