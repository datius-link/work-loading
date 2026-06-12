import jwt from "jsonwebtoken";
import db from "../db/index.js";

export async function requireViewerOrProviderAuth(req, res, next) {
  let authHeader = null;
  try {
    authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[AUTH social] missing authorization", {
        method: req.method,
        path: req.originalUrl,
      });
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(token, process.env.AUTH_TOKEN_SECRET);
    console.log("[AUTH social] token payload", {
      method: req.method,
      path: req.originalUrl,
      uuid: payload.uuid,
      role: payload.role,
    });

    if (payload.role === "provider" || payload.role === "service_provider") {
      req.user = payload;
      return next();
    }

    if (payload.role === "viewer" || payload.role === "light_user") {
      const profile = await db("profiles")
        .select("uuid", "role", "is_verified")
        .where({ uuid: payload.uuid })
        .where({ role: "light_user" })
        .where({ is_verified: true })
        .first();
      if (!profile) {
        console.log("[AUTH social] verified user profile not found", {
          method: req.method,
          path: req.originalUrl,
          uuid: payload.uuid,
          role: payload.role,
        });
        return res.status(403).json({ message: "Email verification required" });
      }
      req.viewer = { ...payload, role: "light_user" };
      return next();
    }

    console.log("[AUTH social] invalid token role", {
      method: req.method,
      path: req.originalUrl,
      uuid: payload.uuid,
      role: payload.role,
    });
    return res.status(401).json({
      message: "Invalid token role",
    });
  } catch (err) {
    const decoded = authHeader?.startsWith("Bearer ")
      ? jwt.decode(authHeader.split(" ")[1])
      : null;
    console.log("[AUTH social] token verify failed", {
      method: req.method,
      path: req.originalUrl,
      decoded,
      name: err?.name,
      message: err?.message,
    });
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

export async function optionalViewerOrProviderAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      req.viewer = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.AUTH_TOKEN_SECRET);

    if (payload.role === "provider" || payload.role === "service_provider") {
      req.user = payload;
      req.viewer = null;
      return next();
    }

    if (payload.role === "viewer" || payload.role === "light_user") {
      const profile = await db("profiles")
        .select("uuid", "role", "is_verified")
        .where({ uuid: payload.uuid })
        .where({ role: "light_user" })
        .where({ is_verified: true })
        .first();
      req.user = null;
      req.viewer = profile ? { ...payload, role: "light_user" } : null;
      return next();
    }

    req.user = null;
    req.viewer = null;
    return next();
  } catch (err) {
    req.user = null;
    req.viewer = null;
    return next();
  }
}
