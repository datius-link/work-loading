// Tracks which (profile, device) pairs are allowed to use biometric quick
// login. Biometric auth on a phone only proves "someone who can unlock this
// phone" — not which e-kazi account they meant — so we enforce the rule that
// only ONE account can be biometric-active on a given device at a time here,
// server-side, not just on-device. Multiple accounts can still log into the
// same device normally; only biometric trust is exclusive per device.
export async function up(knex) {
  const exists = await knex.schema.hasTable("trusted_devices");
  if (exists) return;

  await knex.schema.createTable("trusted_devices", (table) => {
    table.increments("id").primary();
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.string("device_id", 191).notNullable();
    table.string("device_name", 191);
    table.boolean("biometric_enabled").notNullable().defaultTo(false);
    table.timestamp("last_used_at");
    table.timestamp("revoked_at");
    table.timestamps(true, true);
    table.index(["profile_uuid"]);
    table.index(["device_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("trusted_devices");
}
