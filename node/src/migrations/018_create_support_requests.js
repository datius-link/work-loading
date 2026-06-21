export async function up(knex) {
  const exists = await knex.schema.hasTable("support_requests");
  if (exists) return;

  await knex.schema.createTable("support_requests", (table) => {
    table.increments("id").primary();
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.string("type", 40).notNullable();
    table.string("category", 80);
    table.string("subject", 160);
    table.text("message").notNullable();
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.string("status", 30).notNullable().defaultTo("open");
    table.timestamps(true, true);
    table.index(["profile_uuid", "created_at"]);
    table.index(["type", "status"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("support_requests");
}
