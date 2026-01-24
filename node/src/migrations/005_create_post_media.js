/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.createTable("post_media", (table) => {
    table.increments("id").primary();

    table
      .integer("post_id")
      .notNullable()
      .references("id")
      .inTable("posts")
      .onDelete("CASCADE");

    table.string("url").notNullable();

    table
      .enu("media_type", ["image", "video"])
      .notNullable();

    table.integer("order").defaultTo(0);

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("post_media");
}
