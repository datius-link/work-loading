export async function up(knex) {
  const hasProfiles = await knex.schema.hasTable("profiles");
  if (!hasProfiles) return;

  const hasRatingsCount = await knex.schema.hasColumn("profiles", "ratings_count");
  if (!hasRatingsCount) {
    await knex.schema.alterTable("profiles", (table) => {
      table.integer("ratings_count").notNullable().defaultTo(0);
    });
  }

  const hasRatings = await knex.schema.hasColumn("profiles", "ratings");
  if (!hasRatings) {
    await knex.schema.alterTable("profiles", (table) => {
      table.decimal("ratings", 4, 2).defaultTo(0);
    });
  }

  const hasJobRatings = await knex.schema.hasTable("job_ratings");
  if (hasJobRatings) {
    await knex.raw(`
      UPDATE profiles p
      SET
        ratings = COALESCE(r.avg_score, 0),
        ratings_count = COALESCE(r.rating_count, 0),
        updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT
          provider_uuid,
          ROUND(AVG(score)::numeric, 2) AS avg_score,
          COUNT(*)::int AS rating_count
        FROM job_ratings
        GROUP BY provider_uuid
      ) r
      WHERE p.uuid = r.provider_uuid
    `);
  }
}

export async function down(knex) {
  const hasProfiles = await knex.schema.hasTable("profiles");
  if (!hasProfiles) return;

  const hasRatingsCount = await knex.schema.hasColumn("profiles", "ratings_count");
  if (hasRatingsCount) {
    await knex.schema.alterTable("profiles", (table) => {
      table.dropColumn("ratings_count");
    });
  }
}