export async function up(knex) {
  const hasNotifications = await knex.schema.hasTable("notifications");
  if (!hasNotifications) return;

  await addColumnIfMissing(knex, "notifications", "actor_uuid", (table) =>
    table.uuid("actor_uuid").references("uuid").inTable("profiles").onDelete("SET NULL")
  );

  await addColumnIfMissing(knex, "notifications", "job_code", (table) =>
    table.string("job_code", 12)
  );

  await addColumnIfMissing(knex, "notifications", "read_at", (table) =>
    table.timestamp("read_at", { useTz: true })
  );
}

async function addColumnIfMissing(knex, tableName, columnName, addColumn) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (exists) return;
  await knex.schema.alterTable(tableName, addColumn);
}

export async function down(knex) {
  const hasNotifications = await knex.schema.hasTable("notifications");
  if (!hasNotifications) return;

  await dropColumnIfExists(knex, "notifications", "read_at");
  await dropColumnIfExists(knex, "notifications", "job_code");
  await dropColumnIfExists(knex, "notifications", "actor_uuid");
}

async function dropColumnIfExists(knex, tableName, columnName) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (!exists) return;

  await knex.schema.alterTable(tableName, (table) => {
    table.dropColumn(columnName);
  });
}