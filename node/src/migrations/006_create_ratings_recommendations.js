export async function up(knex) {
  await knex.schema.createTable("job_ratings", (table) => {
    table.increments("id").primary();
    table.integer("job_id").notNullable().references("id").inTable("jobs").onDelete("CASCADE");
    table.uuid("provider_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.uuid("rater_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.integer("score").notNullable();
    table.text("comment");
    table.timestamps(true, true);
    table.unique(["job_id", "provider_uuid", "rater_uuid"]);
    table.index(["provider_uuid", "created_at"]);
    table.index(["rater_uuid", "created_at"]);
  });

  await knex.raw("ALTER TABLE job_ratings ADD CONSTRAINT job_ratings_score_check CHECK (score BETWEEN 1 AND 5)");

  await knex.schema.createTable("job_recommendations", (table) => {
    table.increments("id").primary();
    table.integer("job_id").notNullable().references("id").inTable("jobs").onDelete("CASCADE");
    table.integer("rating_id").references("id").inTable("job_ratings").onDelete("SET NULL");
    table.uuid("provider_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.uuid("recommender_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.string("job_title").notNullable();
    table.string("job_code", 12);
    table.text("reason").notNullable();
    table.boolean("recommender_visible").notNullable().defaultTo(false);
    table.string("status").notNullable().defaultTo("closed");
    table.timestamps(true, true);
    table.unique(["job_id", "provider_uuid", "recommender_uuid"]);
    table.index(["provider_uuid", "created_at"]);
    table.index(["recommender_uuid", "created_at"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("job_recommendations");
  await knex.schema.dropTableIfExists("job_ratings");
}
