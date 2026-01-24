// migrations/001_create_provider_profile.js

export async function up(knex) {
  return knex.schema.createTable("provider_profiles", (table) => {
    table.increments("id").primary();

    table
      .uuid("provider_uuid")
      .notNullable()
      .references("uuid")
      .inTable("provider_users")
      .onDelete("CASCADE");

    table.string("username").unique();
    table.string("full_name");
    table.text("bio");

    // 👇 MULTIPLE VALUES SUPPORTED
    table.jsonb("contacts").defaultTo([]);
    table.jsonb("services").defaultTo([]);
    table.jsonb("socials").defaultTo([]);

    table.string("profile_pic");

    table.boolean("profile_completed").defaultTo(false);

    table.timestamps(true, true);
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists("provider_profiles");
}
