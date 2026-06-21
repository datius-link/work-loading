export async function up(knex) {
  await knex.raw("CREATE EXTENSION IF NOT EXISTS pg_trgm");

  await knex.raw(`
    UPDATE post_mentions
    SET value = CASE
      WHEN LOWER(value) IN ('plumber', 'plumbers', 'plumbing', 'plumbings') THEN 'plumbing'
      WHEN LOWER(value) IN ('electric', 'electrical', 'electrician', 'electricians') THEN 'electrical'
      WHEN LOWER(value) IN ('welder', 'welders', 'welding') THEN 'welding'
      WHEN LOWER(value) IN ('carpenter', 'carpenters', 'carpentry') THEN 'carpentry'
      WHEN LOWER(value) IN ('mason', 'masons', 'masonry') THEN 'masonry'
      ELSE LOWER(TRIM(value))
    END
    WHERE type IN ('service', 'hashtag')
  `);
  await knex.raw(`
    DELETE FROM post_mentions duplicate
    USING post_mentions original
    WHERE duplicate.id > original.id
      AND duplicate.post_id = original.post_id
      AND duplicate.type IN ('service', 'hashtag')
      AND original.type IN ('service', 'hashtag')
      AND LOWER(duplicate.value) = LOWER(original.value)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS profiles_username_lower_idx
    ON profiles (LOWER(username))
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS profiles_full_name_trgm_idx
    ON profiles USING gin (full_name gin_trgm_ops)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS posts_caption_trgm_idx
    ON posts USING gin (caption gin_trgm_ops)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS post_mentions_value_lower_idx
    ON post_mentions (type, LOWER(value))
  `);
}

export async function down(knex) {
  await knex.raw("DROP INDEX IF EXISTS post_mentions_value_lower_idx");
  await knex.raw("DROP INDEX IF EXISTS posts_caption_trgm_idx");
  await knex.raw("DROP INDEX IF EXISTS profiles_full_name_trgm_idx");
  await knex.raw("DROP INDEX IF EXISTS profiles_username_lower_idx");
}
