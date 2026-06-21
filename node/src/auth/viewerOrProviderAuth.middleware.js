import jwt from "jsonwebtoken";
import db from "../db/index.js";

async function profileForToken(token) {
  const payload = jwt.verify(token, process.env.AUTH_TOKEN_SECRET);
  if (!payload?.uuid) return null;

  return db("profiles")
    .select("uuid", "email", "is_verified")
    .where({ uuid: payload.uuid })
    .first();
}

export async function requireViewerOrProviderAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    const profile = await profileForToken(authHeader.split(" ")[1]);
    if (!profile) return res.status(401).json({ message: "User account not found" });
    if (!profile.is_verified) return res.status(403).json({ message: "Email verification required" });

    const identity = { uuid: profile.uuid, email: profile.email, is_verified: true };
    req.user = identity;
    req.viewer = identity;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function optionalViewerOrProviderAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      req.user = null;
      req.viewer = null;
      return next();
    }

    const profile = await profileForToken(authHeader.split(" ")[1]);
    const identity = profile?.is_verified
      ? { uuid: profile.uuid, email: profile.email, is_verified: true }
      : null;
    req.user = identity;
    req.viewer = identity;
    return next();
  } catch {
    req.user = null;
    req.viewer = null;
    return next();
  }
}
