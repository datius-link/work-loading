export async function up(knex) {
  const hasValue = await knex.schema.hasColumn("job_applications", "duration_value");
  if (!hasValue) {
    await knex.schema.alterTable("job_applications", (table) => {
      table.decimal("duration_value", 10, 2);
    });
  }

  const hasUnit = await knex.schema.hasColumn("job_applications", "duration_unit");
  if (!hasUnit) {
    await knex.schema.alterTable("job_applications", (table) => {
      table.string("duration_unit");
    });
  }
}

export async function down(knex) {
  const hasValue = await knex.schema.hasColumn("job_applications", "duration_value");
  const hasUnit = await knex.schema.hasColumn("job_applications", "duration_unit");
  await knex.schema.alterTable("job_applications", (table) => {
    if (hasValue) table.dropColumn("duration_value");
    if (hasUnit) table.dropColumn("duration_unit");
  });
}
