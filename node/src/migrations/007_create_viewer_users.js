export async function up(knex) {
  await knex.schema.createTable("viewer_users", (table) => {
    table.uuid("uuid").primary().notNullable();

    table.string("email").notNullable().unique();

    table.boolean("is_verified").defaultTo(false);

    table.string("otp_code", 6);
    table.timestamp("otp_expires_at");

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("viewer_users");
}