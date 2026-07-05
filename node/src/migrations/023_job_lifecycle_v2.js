// ALTER TYPE ... ADD VALUE cannot run inside the same transaction as other
// statements (same restriction migration 008 hit), so this migration runs
// without an implicit transaction wrapper.
export const config = { transaction: false };

export async function up(knex) {
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'start_requested'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'revision_requested'");
  // 'submitted' already exists (added by migration 008) and is reused here.

  const hasSubmissions = await knex.schema.hasTable("job_submissions");
  if (!hasSubmissions) {
    await knex.schema.createTable("job_submissions", (table) => {
      table.increments("id").primary();
      table.integer("job_id").notNullable().references("id").inTable("jobs").onDelete("CASCADE");
      table.uuid("provider_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
      table.integer("attempt_number").notNullable().defaultTo(1);
      table.text("note");
      table.jsonb("media").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
      // submitted | accepted | revision_requested - plain string (validated in
      // app code), consistent with jobs.direct_status elsewhere in this schema.
      table.string("status", 24).notNullable().defaultTo("submitted");
      table.timestamp("submitted_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.uuid("reviewed_by_uuid").references("uuid").inTable("profiles").onDelete("SET NULL");
      table.timestamp("reviewed_at", { useTz: true });
      table.text("review_note");
      table.timestamps(true, true);
      table.unique(["job_id", "attempt_number"]);
      table.index(["job_id", "status"]);
    });
  }

  const hasActivity = await knex.schema.hasTable("job_activity_logs");
  if (!hasActivity) {
    await knex.schema.createTable("job_activity_logs", (table) => {
      table.increments("id").primary();
      table.integer("job_id").notNullable().references("id").inTable("jobs").onDelete("CASCADE");
      table.uuid("actor_uuid").references("uuid").inTable("profiles").onDelete("SET NULL");
      table.string("action").notNullable();
      table.string("from_status", 32);
      table.string("to_status", 32);
      table.text("note");
      table.jsonb("meta").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.index(["job_id", "created_at"]);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("job_activity_logs");
  await knex.schema.dropTableIfExists("job_submissions");
}
