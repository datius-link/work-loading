/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.createTable("provider_users", (table) => {
    table
      .uuid("uuid")
      .primary()
      .notNullable();

    table
      .string("email")
      .notNullable()
      .unique();

    table
      .string("password")
      .notNullable();

    table
      .boolean("is_verified")
      .notNullable()
      .defaultTo(false);

    table
      .timestamp("created_at", { useTz: true })
      .defaultTo(knex.fn.now());

    table
      .timestamp("updated_at", { useTz: true })
      .defaultTo(knex.fn.now());
  });
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("provider_users");
}
