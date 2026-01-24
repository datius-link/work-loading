export async function up(knex) {
  return knex.schema.alterTable("provider_users", (table) => {
    table.string("otp_code", 6);
    table.timestamp("otp_expires_at");
  });
}

export async function down(knex) {
  return knex.schema.alterTable("provider_users", (table) => {
    table.dropColumn("otp_code");
    table.dropColumn("otp_expires_at");
  });
}
