import db from "../src/db/index.js";
import {
  buildCommentTree,
  enrichCommentRow,
} from "../src/posts/posts.comments.js";

const postId = parseInt(process.argv[2] || "1", 10);

try {
  const rows = await db("post_comments")
    .where({ post_id: postId })
    .orderBy("created_at", "asc");

  const parentMap = new Map(rows.map((row) => [row.id, row]));

  const enriched = await Promise.all(
    rows.map((row) =>
      enrichCommentRow(row, row.parent_id ? parentMap.get(row.parent_id) : null)
    )
  );

  console.log(JSON.stringify(buildCommentTree(enriched), null, 2));
} catch (err) {
  console.error("FAIL", err.message);
} finally {
  process.exit(0);
}
