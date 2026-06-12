export async function up(knex) {
  await knex.schema.createTable("posts", (table) => {
    table.increments("id").primary();
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.string("type").notNullable();
    table.text("caption");
    table.string("location");
    table.timestamps(true, true);
    table.index(["profile_uuid", "created_at"]);
    table.index(["type", "created_at"]);
  });

  await knex.schema.createTable("post_media", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.text("url").notNullable();
    table.enu("media_type", ["image", "video"], {
      useNative: true,
      enumName: "post_media_type",
    }).notNullable();
    table.string("fit_mode").notNullable().defaultTo("cover");
    table.integer("order").notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.index(["post_id", "order"]);
  });

  await knex.schema.createTable("post_mentions", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.string("type").notNullable();
    table.string("value").notNullable();
    table.index(["post_id"]);
    table.index(["type", "value"]);
  });

  await knex.schema.createTable("post_likes", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.timestamps(true, true);
    table.unique(["post_id", "profile_uuid"]);
    table.index(["profile_uuid"]);
  });

  await knex.schema.createTable("post_comments", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.integer("parent_id").references("id").inTable("post_comments").onDelete("CASCADE");
    table.text("text").notNullable();
    table.timestamps(true, true);
    table.index(["post_id", "created_at"]);
    table.index(["profile_uuid"]);
    table.index(["parent_id"]);
  });

  await knex.schema.createTable("profile_followers", (table) => {
    table.increments("id").primary();
    table.uuid("provider_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.uuid("follower_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.timestamps(true, true);
    table.unique(["provider_uuid", "follower_uuid"]);
    table.index(["follower_uuid"]);
  });

  await knex.schema.createTable("post_views", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.uuid("profile_uuid").references("uuid").inTable("profiles").onDelete("SET NULL");
    table.timestamps(true, true);
    table.index(["post_id"]);
    table.index(["profile_uuid"]);
  });

  await knex.schema.createTable("post_shares", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.uuid("profile_uuid").references("uuid").inTable("profiles").onDelete("SET NULL");
    table.timestamps(true, true);
    table.index(["post_id"]);
    table.index(["profile_uuid"]);
  });

  await knex.schema.createTable("post_saves", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.timestamps(true, true);
    table.unique(["post_id", "profile_uuid"]);
    table.index(["profile_uuid"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("post_saves");
  await knex.schema.dropTableIfExists("post_shares");
  await knex.schema.dropTableIfExists("post_views");
  await knex.schema.dropTableIfExists("profile_followers");
  await knex.schema.dropTableIfExists("post_comments");
  await knex.schema.dropTableIfExists("post_likes");
  await knex.schema.dropTableIfExists("post_mentions");
  await knex.schema.dropTableIfExists("post_media");
  await knex.schema.dropTableIfExists("posts");
  await knex.raw("DROP TYPE IF EXISTS post_media_type");
}
