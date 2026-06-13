export const config = { transaction: false };

export async function up(knex) {
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'started'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'submitted'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'completed'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'start_pending'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'working'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'completion_pending'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'disputed'");

  const hasJobs = await knex.schema.hasTable("jobs");
  if (hasJobs) {
    await addColumnIfMissing(knex, "jobs", "started_at", (table) => table.timestamp("started_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "started_by_uuid", (table) => table.uuid("started_by_uuid").references("uuid").inTable("profiles").onDelete("SET NULL"));
    await addColumnIfMissing(knex, "jobs", "provider_suggested_start_at", (table) => table.timestamp("provider_suggested_start_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "provider_start_note", (table) => table.text("provider_start_note"));
    await addColumnIfMissing(knex, "jobs", "provider_start_date", (table) => table.timestamp("provider_start_date", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "estimated_duration_value", (table) => table.integer("estimated_duration_value"));
    await addColumnIfMissing(knex, "jobs", "estimated_duration_unit", (table) => table.string("estimated_duration_unit"));
    await addColumnIfMissing(knex, "jobs", "direct_status", (table) => table.string("direct_status"));
    await addColumnIfMissing(knex, "jobs", "started_requested_at", (table) => table.timestamp("started_requested_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "started_confirmed_at", (table) => table.timestamp("started_confirmed_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "completion_requested_at", (table) => table.timestamp("completion_requested_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "start_confirmed_by_boss_at", (table) => table.timestamp("start_confirmed_by_boss_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "completed_at", (table) => table.timestamp("completed_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "completed_by_uuid", (table) => table.uuid("completed_by_uuid").references("uuid").inTable("profiles").onDelete("SET NULL"));
    await addColumnIfMissing(knex, "jobs", "provider_suggested_completed_at", (table) => table.timestamp("provider_suggested_completed_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "provider_completion_note", (table) => table.text("provider_completion_note"));
    await addColumnIfMissing(knex, "jobs", "completion_confirmed_by_boss_at", (table) => table.timestamp("completion_confirmed_by_boss_at", { useTz: true }));
    await addColumnIfMissing(knex, "jobs", "disputed_by_uuid", (table) => table.uuid("disputed_by_uuid").references("uuid").inTable("profiles").onDelete("SET NULL"));
    await addColumnIfMissing(knex, "jobs", "dispute_reason", (table) => table.text("dispute_reason"));
    await addColumnIfMissing(knex, "jobs", "dispute_created_at", (table) => table.timestamp("dispute_created_at", { useTz: true }));

    const hasIndex = await knex.raw(`
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'jobs'
        AND indexname = 'jobs_status_assigned_provider_idx'
    `);

    if (!hasIndex.rows.length) {
      await knex.schema.alterTable("jobs", (table) => {
        table.index(["status", "assigned_provider_uuid"], "jobs_status_assigned_provider_idx");
      });
    }
  }

  const hasNotifications = await knex.schema.hasTable("notifications");
  if (hasNotifications) {
    await addColumnIfMissing(knex, "notifications", "actor_uuid", (table) => table.uuid("actor_uuid").references("uuid").inTable("profiles").onDelete("SET NULL"));
    await addColumnIfMissing(knex, "notifications", "job_code", (table) => table.string("job_code", 12));
    await addColumnIfMissing(knex, "notifications", "read_at", (table) => table.timestamp("read_at", { useTz: true }));
  }

  const hasRecommendations = await knex.schema.hasTable("job_recommendations");
  if (hasRecommendations) {
    await addColumnIfMissing(knex, "job_recommendations", "service_type", (table) => table.string("service_type"));
    await addColumnIfMissing(knex, "job_recommendations", "started_at", (table) => table.timestamp("started_at", { useTz: true }));
    await addColumnIfMissing(knex, "job_recommendations", "completed_at", (table) => table.timestamp("completed_at", { useTz: true }));
  }
}

async function addColumnIfMissing(knex, tableName, columnName, addColumn) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (exists) return;
  await knex.schema.alterTable(tableName, addColumn);
}

export async function down(knex) {
  const hasRecommendations = await knex.schema.hasTable("job_recommendations");
  if (hasRecommendations) {
    await dropColumnIfExists(knex, "job_recommendations", "completed_at");
    await dropColumnIfExists(knex, "job_recommendations", "started_at");
    await dropColumnIfExists(knex, "job_recommendations", "service_type");
  }

  const hasJobs = await knex.schema.hasTable("jobs");
  if (hasJobs) {
    const hasIndex = await knex.raw(`
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'jobs'
        AND indexname = 'jobs_status_assigned_provider_idx'
    `);

    if (hasIndex.rows.length) {
      await knex.schema.alterTable("jobs", (table) => {
        table.dropIndex(["status", "assigned_provider_uuid"], "jobs_status_assigned_provider_idx");
      });
    }

    await dropColumnIfExists(knex, "jobs", "dispute_created_at");
    await dropColumnIfExists(knex, "jobs", "dispute_reason");
    await dropColumnIfExists(knex, "jobs", "disputed_by_uuid");
    await dropColumnIfExists(knex, "jobs", "completion_confirmed_by_boss_at");
    await dropColumnIfExists(knex, "jobs", "provider_completion_note");
    await dropColumnIfExists(knex, "jobs", "provider_suggested_completed_at");
    await dropColumnIfExists(knex, "jobs", "completed_by_uuid");
    await dropColumnIfExists(knex, "jobs", "completed_at");
    await dropColumnIfExists(knex, "jobs", "start_confirmed_by_boss_at");
    await dropColumnIfExists(knex, "jobs", "completion_requested_at");
    await dropColumnIfExists(knex, "jobs", "started_confirmed_at");
    await dropColumnIfExists(knex, "jobs", "started_requested_at");
    await dropColumnIfExists(knex, "jobs", "direct_status");
    await dropColumnIfExists(knex, "jobs", "estimated_duration_unit");
    await dropColumnIfExists(knex, "jobs", "estimated_duration_value");
    await dropColumnIfExists(knex, "jobs", "provider_start_date");
    await dropColumnIfExists(knex, "jobs", "provider_start_note");
    await dropColumnIfExists(knex, "jobs", "provider_suggested_start_at");
    await dropColumnIfExists(knex, "jobs", "started_by_uuid");
    await dropColumnIfExists(knex, "jobs", "started_at");
  }
}

async function dropColumnIfExists(knex, tableName, columnName) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (!exists) return;

  await knex.schema.alterTable(tableName, (table) => {
    table.dropColumn(columnName);
  });
}