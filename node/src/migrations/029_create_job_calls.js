// Durable call history, one row per call attempt, scoped to the job it was
// made about — this is what the Job Workspace "Calls" tab reads from.
//
// The live call itself (offer/answer SDP, ICE candidates) stays entirely in
// Convex (mobile/convex/calls.js) since that's ephemeral signaling data that
// only matters while the call is actually connecting/active. This table is
// the opposite: it never touches signaling, it's just the permanent record
// of "who called whom, about which job, when, and how it ended" — written
// once a call reaches a terminal state (completed/missed/declined/busy/
// failed), the same way job_activity_logs is the durable journal for job
// status changes while the moment-to-moment work happens elsewhere.
export async function up(knex) {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_call_outcome') THEN
        CREATE TYPE job_call_outcome AS ENUM ('completed', 'missed', 'declined', 'busy', 'failed', 'cancelled');
      END IF;
    END
    $$;
  `);

  const hasTable = await knex.schema.hasTable("job_calls");
  if (!hasTable) {
    await knex.schema.createTable("job_calls", (table) => {
      table.increments("id").primary();
      table.integer("job_id").notNullable().references("id").inTable("jobs").onDelete("CASCADE");
      table.uuid("caller_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
      table.uuid("callee_uuid").notNullable().references("uuid").inTable("profiles").onDelete("CASCADE");
      // The Convex call doc id this row closes out — kept as a plain string
      // (Convex ids aren't Postgres types) purely for cross-referencing/
      // debugging, never joined on.
      table.string("convex_call_id", 64);
      table.specificType("outcome", "job_call_outcome").notNullable();
      table.timestamp("initiated_at", { useTz: true }).notNullable();
      table.timestamp("answered_at", { useTz: true });
      table.timestamp("ended_at", { useTz: true });
      // Denormalized on write so the history list never needs to recompute
      // it (and so a call can still show a duration even if one participant
      // is later deleted).
      table.integer("duration_seconds");
      table.timestamps(true, true);
      table.index(["job_id", "initiated_at"]);
      table.index(["caller_uuid"]);
      table.index(["callee_uuid"]);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("job_calls");
  await knex.raw("DROP TYPE IF EXISTS job_call_outcome");
}
