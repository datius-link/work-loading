import db from "../db/index.js";

/* ---------------- USERS (@) ---------------- */
export async function findUsersByUsername(query) {
  return db("provider_profiles")
    .select("username", "profile_pic")
    .whereILike("username", `${query}%`)
    .limit(10);
}

/* ---------------- SERVICES (#) ---------------- */
export async function findServices(query) {
  const rows = await db("provider_profiles")
    .select(db.raw("jsonb_array_elements_text(services) as service"));

  const unique = [...new Set(rows.map(r => r.service))];

  return unique
    .filter(s => s.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 10);
}
