/**
 * createAdmin.js — one-off CLI to create (or reset the password of) an
 * e-kazi admin account. There is deliberately no public "sign up as admin"
 * endpoint, so this is the only way to provision the first admin(s).
 *
 * Usage:
 *   node src/scripts/createAdmin.js --email=you@ekazi.co --password=Secret123 --name="Your Name" [--role=admin]
 *
 * Running it again with an email that already exists updates that admin's
 * name/password/role instead of failing — handy for resetting a forgotten
 * password.
 */
import dotenv from "dotenv";
import db from "../db/index.js";
import { hashPassword } from "../utils/hash.js";

dotenv.config();

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const match = /^--([a-zA-Z0-9_]+)=(.*)$/.exec(arg);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || "").trim().toLowerCase();
  const password = String(args.password || "");
  const fullName = String(args.name || "").trim();
  const role = String(args.role || "admin").trim();

  if (!email || !password || !fullName) {
    console.error(
      'Usage: node src/scripts/createAdmin.js --email=you@ekazi.co --password=Secret123 --name="Your Name" [--role=admin]'
    );
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  const existing = await db("admins").whereRaw("LOWER(email) = ?", [email]).first();

  if (existing) {
    await db("admins")
      .where({ id: existing.id })
      .update({
        full_name: fullName,
        password_hash: passwordHash,
        role,
        is_active: true,
        updated_at: db.fn.now(),
      });
    console.log(`Updated existing admin: ${email} (id ${existing.id})`);
  } else {
    const [created] = await db("admins")
      .insert({ email, password_hash: passwordHash, full_name: fullName, role })
      .returning(["id", "email"]);
    console.log(`Created admin: ${created.email} (id ${created.id})`);
  }
}

main()
  .catch((err) => {
    console.error("createAdmin failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy().catch(() => {});
  });
