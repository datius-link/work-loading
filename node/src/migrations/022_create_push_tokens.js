// Stores Expo push tokens for devices that have granted notification permission.
// A profile can have multiple rows (multiple devices). The token itself is the
// unique key so that if the same device re-registers under a different
// account (logout/login) ownership simply moves to the new profile_uuid.
export async function up(knex) {
  const exists = await knex.schema.hasTable("push_tokens");
  if (exists) return;

  await knex.schema.createTable("push_tokens", (table) => {
    table.increments("id").primary();
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.string("expo_push_token").notNullable().unique();
    table.string("platform", 16);
    table.string("device_id", 191);
    table.timestamps(true, true);
    table.index(["profile_uuid"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("push_tokens");
}
