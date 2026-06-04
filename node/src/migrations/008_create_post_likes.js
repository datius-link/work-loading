export async function up(knex) {
  await knex.schema.createTable("post_likes", (table) => {
    table.increments("id").primary();

    table
      .integer("post_id")
      .notNullable()
      .references("id")
      .inTable("posts")
      .onDelete("CASCADE");

    table
      .uuid("viewer_uuid")
      .notNullable()
      .references("uuid")
      .inTable("viewer_users")
      .onDelete("CASCADE");

    table.unique(["post_id", "viewer_uuid"]);

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("post_likes");
}