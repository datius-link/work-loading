export async function up(knex) {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM ('open', 'applied', 'filled', 'closed', 'cancelled', 'pending', 'active', 'declined', 'disputed');
      END IF;
    END
    $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_hire_type') THEN
        CREATE TYPE job_hire_type AS ENUM ('posted', 'direct');
      END IF;
    END
    $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_application_status') THEN
        CREATE TYPE job_application_status AS ENUM ('requested', 'approved', 'not_attained', 'withdrawn');
      END IF;
    END
    $$;
  `);

  await knex.schema.createTable("jobs", (table) => {
    table.increments("id").primary();
    table.string("job_code", 8).notNullable().unique();
    table.uuid("created_by").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.string("title").notNullable();
    table.text("description").notNullable();
    table.string("location").notNullable();
    table.string("service_type").notNullable();
    table.specificType("status", "job_status").notNullable().defaultTo("open");
    table.specificType("hire_type", "job_hire_type").notNullable().defaultTo("posted");
    table.uuid("target_provider_uuid").references("uuid").inTable("profiles").onDelete("SET NULL");
    table.uuid("assigned_provider_uuid").references("uuid").inTable("profiles").onDelete("SET NULL");
    table.timestamp("tender_closes_at", { useTz: true });
    table.boolean("availability_required").notNullable().defaultTo(false);
    table.string("scheduled_for");
    table.text("availability_notes");
    table.decimal("budget_min", 12, 2);
    table.decimal("budget_max", 12, 2);
    table.jsonb("media").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.timestamps(true, true);
    table.index(["created_by", "status"]);
    table.index(["service_type", "status"]);
    table.index(["hire_type", "target_provider_uuid"]);
    table.index(["assigned_provider_uuid"]);
  });

  await knex.schema.createTable("job_applications", (table) => {
    table.increments("id").primary();
    table.integer("job_id").notNullable().references("id").inTable("jobs").onDelete("CASCADE");
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.text("message");
    table.string("budget");
    table.string("duration");
    table.string("available_from");
    table.string("experience");
    table.text("notes");
    table.jsonb("media").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.specificType("status", "job_application_status").notNullable().defaultTo("requested");
    table.timestamp("withdrawn_at", { useTz: true });
    table.timestamps(true, true);
    table.unique(["job_id", "profile_uuid"]);
    table.index(["profile_uuid", "status"]);
    table.index(["job_id", "withdrawn_at"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("job_applications");
  await knex.schema.dropTableIfExists("jobs");
  await knex.raw("DROP TYPE IF EXISTS job_application_status");
  await knex.raw("DROP TYPE IF EXISTS job_hire_type");
  await knex.raw("DROP TYPE IF EXISTS job_status");
}
