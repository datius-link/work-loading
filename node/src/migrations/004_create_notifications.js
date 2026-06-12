export async function up(knex) {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_system') THEN
        CREATE TYPE notification_system AS ENUM ('posts', 'hiring', 'profile', 'general');
      END IF;
    END
    $$;
  `);

  await knex.schema.createTable("notifications", (table) => {
    table.increments("id").primary();
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.specificType("system", "notification_system").notNullable().defaultTo("general");
    table.string("type").notNullable();
    table.string("title").notNullable();
    table.text("body").notNullable();
    table.integer("job_id").references("id").inTable("jobs").onDelete("CASCADE");
    table.integer("post_id").references("id").inTable("posts").onDelete("CASCADE");
    table.jsonb("meta").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.boolean("read").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.index(["profile_uuid", "read"]);
    table.index(["system", "created_at"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("notifications");
  await knex.raw("DROP TYPE IF EXISTS notification_system");
}
