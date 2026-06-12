export async function up(knex) {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role') THEN
        CREATE TYPE profile_role AS ENUM ('light_user', 'service_provider');
      END IF;
    END
    $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_purpose') THEN
        CREATE TYPE otp_purpose AS ENUM ('verify_email', 'login', 'reset_password', 'change_email');
      END IF;
    END
    $$;
  `);

  await knex.schema.createTable("profiles", (table) => {
    table.uuid("uuid").primary().notNullable();
    table.string("email").notNullable().unique();
    table.string("password");
    table.specificType("role", "profile_role").notNullable();
    table.boolean("is_verified").notNullable().defaultTo(false);
    table.string("username").unique();
    table.string("full_name");
    table.text("bio");
    table.string("profile_pic");
    table.string("phone_number").unique();
    table.jsonb("phone_numbers").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.jsonb("services").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.jsonb("socials").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.decimal("ratings", 4, 2);
    table.integer("ratings_count").notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.index(["role", "is_verified"]);
    table.index(["phone_number"]);
  });

  await knex.schema.createTable("auth_otps", (table) => {
    table.increments("id").primary();
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.string("email").notNullable();
    table.specificType("purpose", "otp_purpose").notNullable();
    table.string("otp_hash").notNullable();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("used_at", { useTz: true });
    table.integer("attempts").notNullable().defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["profile_uuid", "purpose", "used_at"]);
    table.index(["email", "purpose"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("auth_otps");
  await knex.schema.dropTableIfExists("profiles");
  await knex.raw("DROP TYPE IF EXISTS otp_purpose");
  await knex.raw("DROP TYPE IF EXISTS profile_role");
}
