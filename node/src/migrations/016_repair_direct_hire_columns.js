export async function up(knex) {
  const hasJobs = await knex.schema.hasTable("jobs");
  if (!hasJobs) return;

  await addColumnIfMissing(knex, "jobs", "direct_status", (table) => table.string("direct_status"));
  await addColumnIfMissing(knex, "jobs", "provider_start_note", (table) => table.text("provider_start_note"));
  await addColumnIfMissing(knex, "jobs", "provider_start_date", (table) =>
    table.timestamp("provider_start_date", { useTz: true })
  );
  await addColumnIfMissing(knex, "jobs", "estimated_duration_value", (table) =>
    table.integer("estimated_duration_value")
  );
  await addColumnIfMissing(knex, "jobs", "estimated_duration_unit", (table) =>
    table.string("estimated_duration_unit")
  );
}

async function addColumnIfMissing(knex, tableName, columnName, addColumn) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (exists) return;
  await knex.schema.alterTable(tableName, addColumn);
}

export async function down() {
  // Repair migration: preserve columns that may already contain live direct-hire data.
}
