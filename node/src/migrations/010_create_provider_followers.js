export async function up(knex) {
  await knex.schema.createTable("provider_followers", (table) => {
    table.increments("id").primary();

    table
      .uuid("provider_uuid")
      .notNullable()
      .references("uuid")
      .inTable("provider_users")
      .onDelete("CASCADE");

    table
      .uuid("viewer_uuid")
      .notNullable()
      .references("uuid")
      .inTable("viewer_users")
      .onDelete("CASCADE");

    table.unique(["provider_uuid", "viewer_uuid"]);

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("provider_followers");
}