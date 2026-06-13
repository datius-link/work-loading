export async function up(knex) {
  const hasJobs = await knex.schema.hasTable("jobs");
  const hasProfiles = await knex.schema.hasTable("profiles");
  const hasMessages = await knex.schema.hasTable("job_messages");

  if (!hasJobs || !hasProfiles || hasMessages) return;

  await knex.schema.createTable("job_messages", (table) => {
    table.increments("id").primary();
    table.integer("job_id").notNullable().references("id").inTable("jobs").onDelete("CASCADE");
    table.uuid("sender_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.text("message").notNullable();
    table.timestamps(true, true);

    table.index(["job_id", "created_at"]);
    table.index(["sender_uuid", "created_at"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("job_messages");
}