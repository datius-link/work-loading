import db from "../../../models/index.js";

const { Job } = db;

// POST /api/jobs
export const createJob = async (req, res) => {
  try {
    const { title, location } = req.body;

    if (!title || !location) {
      return res.status(400).json({ message: "Missing job fields" });
    }

    const job = await Job.create({
      title,
      location,
      light_user_id: req.lightUserId,
    });

    return res.json({
      success: true,
      job,
    });
  } catch (err) {
    console.error("Create job error:", err);
    res.status(500).json({ message: "Failed to create job" });
  }
};
