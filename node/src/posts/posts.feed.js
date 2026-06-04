import db from "../db/index.js";

export async function enrichPostsWithViewerState(posts, viewerUuid) {
  if (!posts?.length) return [];

  if (!viewerUuid) {
    return posts.map((post) => ({
      ...post,
      is_liked: false,
      is_following: false,
    }));
  }

  const postIds = posts.map((p) => p.id);
  const providerUuids = [
    ...new Set(posts.map((p) => p.provider_uuid).filter(Boolean)),
  ];

  const [likes, follows] = await Promise.all([
    db("post_likes")
      .where({ viewer_uuid: viewerUuid })
      .whereIn("post_id", postIds)
      .select("post_id"),
    providerUuids.length
      ? db("provider_followers")
          .where({ viewer_uuid: viewerUuid })
          .whereIn("provider_uuid", providerUuids)
          .select("provider_uuid")
      : [],
  ]);

  const likedSet = new Set(likes.map((r) => r.post_id));
  const followingSet = new Set(follows.map((r) => r.provider_uuid));

  return posts.map((post) => ({
    ...post,
    is_liked: likedSet.has(post.id),
    is_following: followingSet.has(post.provider_uuid),
  }));
}

export function countCommentTree(comments) {
  let total = 0;

  const walk = (nodes) => {
    (nodes || []).forEach((node) => {
      total += 1;
      if (node.replies?.length) walk(node.replies);
    });
  };

  walk(comments);
  return total;
}
