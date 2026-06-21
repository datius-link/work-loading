import jwt from "jsonwebtoken";
import db from "../db/index.js";

async function verifiedUser(uuid) {
  if (!uuid) return null;
  return db("profiles")
    .select("uuid", "email", "is_verified")
    .where({ uuid, is_verified: true })
    .first();
}

export async function requireViewerAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "User token missing" });
    }

    const payload = jwt.verify(authHeader.split(" ")[1], process.env.AUTH_TOKEN_SECRET);
    const profile = await verifiedUser(payload.uuid);
    if (!profile) return res.status(403).json({ message: "Email verification required" });

    req.viewer = { uuid: profile.uuid, email: profile.email, is_verified: true };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired user token" });
  }
}

export async function optionalViewerAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      req.viewer = null;
      return next();
    }

    const payload = jwt.verify(authHeader.split(" ")[1], process.env.AUTH_TOKEN_SECRET);
    const profile = await verifiedUser(payload.uuid);
    req.viewer = profile
      ? { uuid: profile.uuid, email: profile.email, is_verified: true }
      : null;
    return next();
  } catch {
    req.viewer = null;
    return next();
  }
}
