import jwt from "jsonwebtoken";
import db from "../db/index.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    const payload = jwt.verify(authHeader.split(" ")[1], process.env.AUTH_TOKEN_SECRET);
    const profile = await db("profiles")
      .select("uuid", "email", "is_verified")
      .where({ uuid: payload.uuid })
      .first();

    if (!profile) return res.status(401).json({ message: "User account not found" });
    if (!profile.is_verified) return res.status(403).json({ message: "Email verification required" });

    req.user = { uuid: profile.uuid, email: profile.email, is_verified: true };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
