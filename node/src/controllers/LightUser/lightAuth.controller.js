import jwt from "jsonwebtoken";
import db from "../../../models/index.js";

const { LightUser } = db;

export const lightLogin = async (req, res) => {
  try {
    const { type, contact } = req.body;

    if (!type || !contact) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    // 1️⃣ Find or create light user
    const [user] = await LightUser.findOrCreate({
      where: { contact },
      defaults: {
        type,
        role: "JOB_POSTER",
      },
    });

    // 2️⃣ Issue LIGHT JWT
    const token = jwt.sign(
      {
        id: user.id,
        authType: "LIGHT",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        contact: user.contact,
        type: user.type,
      },
    });
  } catch (err) {
    console.error("Light login error:", err);
    res.status(500).json({ message: "Light login failed" });
  }
};
