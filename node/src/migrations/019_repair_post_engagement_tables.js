export async function up(knex) {
  const [hasPosts, hasProfiles] = await Promise.all([
    knex.schema.hasTable("posts"),
    knex.schema.hasTable("profiles"),
  ]);
  if (!hasPosts || !hasProfiles) return;

  await createTrackingTableIfMissing(knex, "post_views", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.uuid("profile_uuid").references("uuid").inTable("profiles").onDelete("SET NULL");
    table.timestamps(true, true);
    table.index(["post_id"]);
    table.index(["profile_uuid"]);
  });

  await createTrackingTableIfMissing(knex, "post_shares", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.uuid("profile_uuid").references("uuid").inTable("profiles").onDelete("SET NULL");
    table.timestamps(true, true);
    table.index(["post_id"]);
    table.index(["profile_uuid"]);
  });

  await createTrackingTableIfMissing(knex, "post_saves", (table) => {
    table.increments("id").primary();
    table.integer("post_id").notNullable().references("id").inTable("posts").onDelete("CASCADE");
    table.uuid("profile_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
    table.timestamps(true, true);
    table.unique(["post_id", "profile_uuid"]);
    table.index(["profile_uuid"]);
  });
}

async function createTrackingTableIfMissing(knex, tableName, defineTable) {
  const exists = await knex.schema.hasTable(tableName);
  if (exists) return;
  await knex.schema.createTable(tableName, defineTable);
}

export async function down() {
  // Repair migration: preserve engagement records if these tables already existed.
}
