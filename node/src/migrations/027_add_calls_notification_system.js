// ALTER TYPE ... ADD VALUE cannot run inside the same transaction as other
// statements (same restriction migrations 008/023 hit), so this migration
// runs without an implicit transaction wrapper.
export const config = { transaction: false };

// notifyIncomingCall (src/calls/calls.controller.js) inserts notifications
// with system: "calls", but the notification_system enum (migration 004)
// was never extended for it — every incoming-call push notify was failing
// with a Postgres "invalid input value for enum" error (surfaced to the
// client as a 500 from POST /api/calls/notify).
export async function up(knex) {
  await knex.raw("ALTER TYPE notification_system ADD VALUE IF NOT EXISTS 'calls'");
}

export async function down(knex) {
  // Postgres has no DROP VALUE for enums; nothing to revert.
}
