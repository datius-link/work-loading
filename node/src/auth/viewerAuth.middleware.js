import jwt from "jsonwebtoken";
import db from "../db/index.js";

async function verifiedLightUser(uuid) {
  if (!uuid) return null;
  return db("profiles")
    .select("uuid", "role", "is_verified")
    .where({ uuid })
    .where({ role: "light_user" })
    .where({ is_verified: true })
    .first();
}

export async function requireViewerAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Viewer token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(
      token,
      process.env.AUTH_TOKEN_SECRET
    );

    if (payload.role !== "light_user" && payload.role !== "viewer") {
      return res.status(403).json({ message: "User token required" });
    }

    const profile = await verifiedLightUser(payload.uuid);
    if (!profile) {
      return res.status(403).json({ message: "Email verification required" });
    }

    req.viewer = { ...payload, role: "light_user" };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired viewer token",
    });
  }
}

export async function optionalViewerAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.viewer = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(
      token,
      process.env.AUTH_TOKEN_SECRET
    );

    if (payload.role === "light_user" || payload.role === "viewer") {
      const profile = await verifiedLightUser(payload.uuid);
      req.viewer = profile ? { ...payload, role: "light_user" } : null;
    } else {
      req.viewer = null;
    }
    next();
  } catch (err) {
    // Token invalid, but continue without viewer
    req.viewer = null;
    next();
  }
}
