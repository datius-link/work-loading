import db from "../db/index.js";
import { verifyAdminToken } from "./admin.tokens.js";

function toClientAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    last_login_at: row.last_login_at || null,
  };
}

export async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Admin token missing" });
    }

    const payload = verifyAdminToken(authHeader.split(" ")[1]);
    if (payload?.type !== "admin") {
      return res.status(401).json({ message: "Invalid admin token" });
    }

    const row = await db("admins").where({ id: payload.id, is_active: true }).first();
    if (!row) return res.status(403).json({ message: "Admin account is inactive or no longer exists" });

    req.admin = toClientAdmin(row);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
}

export { toClientAdmin };
