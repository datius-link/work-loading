import db from "../db/index.js";
import { comparePassword } from "../utils/hash.js";
import { generateAdminToken } from "./admin.tokens.js";
import { toClientAdmin } from "./admin.middleware.js";

export async function adminLogin(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const row = await db("admins").whereRaw("LOWER(email) = ?", [email]).first();
    if (!row || !row.is_active) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await db("admins").where({ id: row.id }).update({ last_login_at: db.fn.now() });

    const token = generateAdminToken(row);
    return res.json({ token, admin: toClientAdmin(row) });
  } catch (err) {
    console.error("adminLogin error:", err);
    return res.status(500).json({ message: "Failed to sign in" });
  }
}

export async function getAdminMe(req, res) {
  return res.json({ admin: req.admin });
}
