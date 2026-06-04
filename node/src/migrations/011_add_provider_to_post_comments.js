export async function up(knex) {
  await knex.schema.alterTable("post_comments", (table) => {
    table
      .uuid("provider_uuid")
      .nullable()
      .references("uuid")
      .inTable("provider_users")
      .onDelete("CASCADE");
  });

  await knex.raw(
    "ALTER TABLE post_comments ALTER COLUMN viewer_uuid DROP NOT NULL"
  );
}

export async function down(knex) {
  await knex.schema.alterTable("post_comments", (table) => {
    table.dropColumn("provider_uuid");
  });

  await knex.raw(
    "ALTER TABLE post_comments ALTER COLUMN viewer_uuid SET NOT NULL"
  );
}
