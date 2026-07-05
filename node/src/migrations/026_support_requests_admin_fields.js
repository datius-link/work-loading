export async function up(knex) {
  const hasNote = await knex.schema.hasColumn("support_requests", "admin_note");
  const hasResolvedAt = await knex.schema.hasColumn("support_requests", "resolved_at");
  const hasResolvedBy = await knex.schema.hasColumn("support_requests", "resolved_by");

  await knex.schema.alterTable("support_requests", (table) => {
    if (!hasNote) table.text("admin_note");
    if (!hasResolvedAt) table.timestamp("resolved_at");
    if (!hasResolvedBy) table.integer("resolved_by").references("id").inTable("admins").onDelete("SET NULL");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("support_requests", (table) => {
    table.dropColumn("admin_note");
    table.dropColumn("resolved_at");
    table.dropColumn("resolved_by");
  });
}
