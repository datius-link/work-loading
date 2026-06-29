export async function up(knex) {
  const hasMessages = await knex.schema.hasTable("job_messages");
  if (!hasMessages) return;

  const [hasMedia, hasReadAt, hasDeliveredAt, hasMessageType] = await Promise.all([
    knex.schema.hasColumn("job_messages", "media"),
    knex.schema.hasColumn("job_messages", "read_at"),
    knex.schema.hasColumn("job_messages", "delivered_at"),
    knex.schema.hasColumn("job_messages", "message_type"),
  ]);

  await knex.schema.alterTable("job_messages", (table) => {
    if (!hasMedia) table.jsonb("media").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    if (!hasReadAt) table.timestamp("read_at", { useTz: true });
    if (!hasDeliveredAt) table.timestamp("delivered_at", { useTz: true });
    if (!hasMessageType) table.string("message_type", 24).notNullable().defaultTo("text");
  });

  await knex("job_messages")
    .whereNull("delivered_at")
    .update({ delivered_at: knex.raw("created_at") });
}

export async function down(knex) {
  const hasMessages = await knex.schema.hasTable("job_messages");
  if (!hasMessages) return;

  await knex.schema.alterTable("job_messages", (table) => {
    table.dropColumn("media");
    table.dropColumn("read_at");
    table.dropColumn("delivered_at");
    table.dropColumn("message_type");
  });
}
