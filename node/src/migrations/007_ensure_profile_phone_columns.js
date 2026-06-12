export async function up(knex) {
  const hasProfiles = await knex.schema.hasTable("profiles");
  if (!hasProfiles) return;

  const hasPhoneNumbers = await knex.schema.hasColumn("profiles", "phone_numbers");
  if (!hasPhoneNumbers) {
    await knex.schema.alterTable("profiles", (table) => {
      table.jsonb("phone_numbers").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    });
  }

  const hasPhoneNumber = await knex.schema.hasColumn("profiles", "phone_number");
  if (!hasPhoneNumber) {
    await knex.schema.alterTable("profiles", (table) => {
      table.string("phone_number");
    });
  }

  await knex.raw(`
    UPDATE profiles
    SET phone_number = COALESCE(
      NULLIF(phone_number, ''),
      CASE
        WHEN jsonb_typeof(phone_numbers) = 'array'
         AND jsonb_array_length(phone_numbers) > 0
        THEN phone_numbers ->> 0
        ELSE NULL
      END
    )
    WHERE phone_number IS NULL
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique
    ON profiles (phone_number)
    WHERE phone_number IS NOT NULL
  `);
}

export async function down(knex) {
  const hasProfiles = await knex.schema.hasTable("profiles");
  if (!hasProfiles) return;

  await knex.raw("DROP INDEX IF EXISTS profiles_phone_number_unique");
  const hasPhoneNumber = await knex.schema.hasColumn("profiles", "phone_number");
  if (hasPhoneNumber) {
    await knex.schema.alterTable("profiles", (table) => {
      table.dropColumn("phone_number");
    });
  }
}
