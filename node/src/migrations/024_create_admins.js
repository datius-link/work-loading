export async function up(knex) {
  const exists = await knex.schema.hasTable("admins");
  if (exists) return;

  await knex.schema.createTable("admins", (table) => {
    table.increments("id").primary();
    table.string("email", 160).notNullable().unique();
    table.string("password_hash").notNullable();
    table.string("full_name", 120).notNullable();
    // "admin" today; room to add e.g. "support" / "super_admin" later
    // without another migration.
    table.string("role", 40).notNullable().defaultTo("admin");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("last_login_at", { useTz: true });
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("admins");
}
