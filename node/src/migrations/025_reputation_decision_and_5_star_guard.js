export async function up(knex) {
  const hasRatings = await knex.schema.hasTable("job_ratings");
  if (hasRatings) {
    await knex.raw(`
      ALTER TABLE job_ratings
      DROP CONSTRAINT IF EXISTS job_ratings_score_check
    `);

    await knex.raw(`
      UPDATE job_ratings
      SET score = CASE
        WHEN score >= 9 THEN 5
        WHEN score >= 7 THEN 4
        WHEN score >= 5 THEN 3
        WHEN score >= 3 THEN 2
        ELSE 1
      END
      WHERE score < 1 OR score > 5
    `);

    await knex.raw(`
      ALTER TABLE job_ratings
      ADD CONSTRAINT job_ratings_score_check
      CHECK (score BETWEEN 1 AND 5)
    `);
  }

  const hasJobs = await knex.schema.hasTable("jobs");
  const hasDecisionColumn = hasJobs && (await knex.schema.hasColumn("jobs", "recommendation_decided_at"));
  if (hasJobs && !hasDecisionColumn) {
    await knex.schema.alterTable("jobs", (table) => {
      table.timestamp("recommendation_decided_at", { useTz: true });
    });
  }
}

export async function down(knex) {
  const hasJobs = await knex.schema.hasTable("jobs");
  const hasDecisionColumn = hasJobs && (await knex.schema.hasColumn("jobs", "recommendation_decided_at"));
  if (hasJobs && hasDecisionColumn) {
    await knex.schema.alterTable("jobs", (table) => {
      table.dropColumn("recommendation_decided_at");
    });
  }
}
