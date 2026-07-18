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

// Real hashtag suggestions, drawn from hashtags people have actually used
// (post_mentions.type = 'hashtag'), ranked by how often each one appears so
// the dropdown surfaces popular tags first — same idea as findUsersByUsername
// but for "#" instead of "@".
export async function findHashtags(query, limit = 15) {
  const rows = await db("post_mentions")
    .select("value")
    .count("* as uses")
    .where("type", "hashtag")
    .whereILike("value", `${query}%`)
    .groupBy("value")
    .orderBy("uses", "desc")
    .limit(limit);

  return rows.map((row) => ({ value: row.value, uses: Number(row.uses) }));
}
