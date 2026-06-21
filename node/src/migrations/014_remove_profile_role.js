export async function up(knex) {
  const hasProfiles = await knex.schema.hasTable("profiles");
  if (!hasProfiles) return;

  const hasRole = await knex.schema.hasColumn("profiles", "role");

  await knex.raw(`
    DROP INDEX IF EXISTS profiles_role_is_verified_index;
  `);

  if (hasRole) {
    await knex.schema.alterTable("profiles", (table) => {
      table.dropColumn("role");
    });
  }

  await knex.raw(`
    DROP TYPE IF EXISTS profile_role;
  `);
}

export async function down(knex) {
  const hasProfiles = await knex.schema.hasTable("profiles");
  if (!hasProfiles) return;

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role') THEN
        CREATE TYPE profile_role AS ENUM ('light_user', 'service_provider');
      END IF;
    END
    $$;
  `);

  const hasRole = await knex.schema.hasColumn("profiles", "role");

  if (!hasRole) {
    await knex.schema.alterTable("profiles", (table) => {
      table
        .specificType("role", "profile_role")
        .notNullable()
        .defaultTo("light_user");
    });
  }

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS profiles_role_is_verified_index
    ON profiles(role, is_verified);
  `);
}
