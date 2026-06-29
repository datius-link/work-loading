export async function up(knex) {
  const hasProfilePhotos = await knex.schema.hasColumn("profiles", "profile_photos");
  if (!hasProfilePhotos) {
    await knex.schema.alterTable("profiles", (table) => {
      table.jsonb("profile_photos").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    });
  }

  await knex.raw(`
    UPDATE profiles
    SET profile_photos = CASE
      WHEN profile_pic IS NULL OR profile_pic = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(profile_pic)
    END
    WHERE profile_photos IS NULL OR profile_photos = '[]'::jsonb
  `);
}

export async function down(knex) {
  const hasProfilePhotos = await knex.schema.hasColumn("profiles", "profile_photos");
  if (hasProfilePhotos) {
    await knex.schema.alterTable("profiles", (table) => {
      table.dropColumn("profile_photos");
    });
  }
}
