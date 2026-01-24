export async function up(knex) {
  await knex.schema.createTable("post_mentions", (table) => {
    table.increments("id").primary();

    table
      .integer("post_id")
      .references("id")
      .inTable("posts")
      .onDelete("CASCADE");

    table
      .enu("type", ["user", "service"])
      .notNullable();

    table.string("value").notNullable(); // username or service slug
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("post_mentions");
}
