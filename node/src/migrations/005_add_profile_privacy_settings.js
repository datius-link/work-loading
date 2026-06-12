export async function up(knex) {
  await knex.schema.alterTable("profiles", (table) => {
    table.jsonb("privacy_settings").notNullable().defaultTo(
      knex.raw("'{}'::jsonb")
    );
  });
}

export async function down(knex) {
  await knex.schema.alterTable("profiles", (table) => {
    table.dropColumn("privacy_settings");
  });
}
