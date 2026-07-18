// Adds the data needed to compute a "Final Budget" for every hiring flow
// (posted job + provider offer, direct hire, and a future tender system),
// instead of the mobile app showing a static/placeholder budget.
//
//   final_budget   - the single number that's actually true once a provider
//                     is hired (set when a posted-job applicant is hired,
//                     when a direct hire offer is accepted, or later when a
//                     tender's winning bid is chosen). NULL until then —
//                     there is no separate "agreement" step; hiring IS the
//                     agreement.
//   requirements   - hirer-authored checklist shown on the job details screen
//   skills         - required-skills chips shown on the job details screen
export async function up(knex) {
  const hasFinalBudget = await knex.schema.hasColumn("jobs", "final_budget");
  const hasRequirements = await knex.schema.hasColumn("jobs", "requirements");
  const hasSkills = await knex.schema.hasColumn("jobs", "skills");

  await knex.schema.alterTable("jobs", (table) => {
    if (!hasFinalBudget) table.decimal("final_budget", 12, 2);
    if (!hasRequirements) table.jsonb("requirements").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    if (!hasSkills) table.jsonb("skills").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
  });
}

export async function down(knex) {
  await knex.schema.alterTable("jobs", (table) => {
    table.dropColumn("final_budget");
    table.dropColumn("requirements");
    table.dropColumn("skills");
  });
}
