/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("post_media", (table) => {
    table.string("fit_mode").notNullable().defaultTo("cover");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("post_media", (table) => {
    table.dropColumn("fit_mode");
  });
}
