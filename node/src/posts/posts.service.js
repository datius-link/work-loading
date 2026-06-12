import db from "../db/index.js";

export async function findUsersByUsername(query) {
  return db("profiles")
    .select("uuid", "username", "profile_pic")
    .whereNotNull("username")
    .whereILike("username", `${query}%`)
    .limit(10);
}

export async function findServices(query) {
  const rows = await db("profiles")
    .select(db.raw("jsonb_array_elements_text(services) as service"));

  const unique = [...new Set(rows.map((row) => row.service))];
  return unique
    .filter((service) => service.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 10);
}
