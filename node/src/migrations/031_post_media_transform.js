// Stores the pan/zoom crop the user chose in the mobile app's media editor
// (EditMedia.js) so the feed can reproduce the exact same framing instead of
// cropping the original file. Kept as a nullable jsonb sibling to the
// existing fit_mode column rather than separate scale/offset columns, since
// this is display metadata, not part of the row's core shape.
//   { scale: number, offsetXRatio: number, offsetYRatio: number }
// offsetX/Y are ratios of the frame size (not raw pixels), so they can be
// replayed against a differently-sized container.
export async function up(knex) {
  const hasTransform = await knex.schema.hasColumn("post_media", "transform");
  await knex.schema.alterTable("post_media", (table) => {
    if (!hasTransform) table.jsonb("transform");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("post_media", (table) => {
    table.dropColumn("transform");
  });
}
