/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.createTable("posts", (table) => {
    table.increments("id").primary();

    table
      .uuid("provider_uuid")
      .notNullable()
      .references("uuid")
      .inTable("provider_users")
      .onDelete("CASCADE");

    table
      .enu("type", ["moment", "reel"])
      .notNullable();

    table.text("caption").notNullable();
    table.string("location");

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("posts");
}
