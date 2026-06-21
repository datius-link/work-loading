export const config = { transaction: false };

export async function up(knex) {
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'start_pending'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'working'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'completion_pending'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'completed'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'submitted'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'started'");
  await knex.raw("ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'disputed'");

  await addColumnIfMissing(knex, "jobs", "started_requested_at", (table) =>
    table.timestamp("started_requested_at", { useTz: true })
  );

  await addColumnIfMissing(knex, "jobs", "started_confirmed_at", (table) =>
    table.timestamp("started_confirmed_at", { useTz: true })
  );

  await addColumnIfMissing(knex, "jobs", "completion_requested_at", (table) =>
    table.timestamp("completion_requested_at", { useTz: true })
  );

  await addColumnIfMissing(knex, "jobs", "start_confirmed_by_boss_at", (table) =>
    table.timestamp("start_confirmed_by_boss_at", { useTz: true })
  );

  await addColumnIfMissing(knex, "jobs", "completion_confirmed_by_boss_at", (table) =>
    table.timestamp("completion_confirmed_by_boss_at", { useTz: true })
  );
}

async function addColumnIfMissing(knex, tableName, columnName, addColumn) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (exists) return;
  await knex.schema.alterTable(tableName, addColumn);
}

export async function down(knex) {
  await dropColumnIfExists(knex, "jobs", "completion_confirmed_by_boss_at");
  await dropColumnIfExists(knex, "jobs", "start_confirmed_by_boss_at");
  await dropColumnIfExists(knex, "jobs", "completion_requested_at");
  await dropColumnIfExists(knex, "jobs", "started_confirmed_at");
  await dropColumnIfExists(knex, "jobs", "started_requested_at");
}

async function dropColumnIfExists(knex, tableName, columnName) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (!exists) return;
  await knex.schema.alterTable(tableName, (table) => table.dropColumn(columnName));
}