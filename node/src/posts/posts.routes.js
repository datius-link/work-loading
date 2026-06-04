import express from "express";

import { requireAuth } from "../auth/auth.middleware.js";

import {
  requireViewerAuth,
  optionalViewerAuth,
} from "../auth/viewerAuth.middleware.js";

import { requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";

import {
  createPost,
  listPublicPosts,
  listMyPosts,
  listProviderPosts,
  searchUsers,
  searchServices,
  toggleLike,
  getComments,
  createComment,
  deleteComment,
  toggleFollow,
  lookupProviderByUsername,
} from "./posts.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Posts
 */

/**
 * @swagger
 * /api/posts/public:
 *   get:
 *     summary: Get public posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Posts loaded
 */
router.get(
  "/public",
  optionalViewerAuth,
  listPublicPosts
);

/**
 * @swagger
 * /api/posts/me:
 *   get:
 *     summary: Get my posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My posts loaded
 */
router.get("/me", requireAuth, listMyPosts);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caption:
 *                 type: string
 *                 example: New work done #electrician
 *               location:
 *                 type: string
 *                 example: Dar es Salaam
 *               type:
 *                 type: string
 *                 example: moment
 *               media:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                       example: image
 *     responses:
 *       201:
 *         description: Post created
 */
router.post("/", requireAuth, createPost);

/**
 * @swagger
 * /api/posts/provider/{providerUuid}:
 *   get:
 *     summary: Get provider posts
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: providerUuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider posts loaded
 */
router.get(
  "/provider/:providerUuid",
  optionalViewerAuth,
  listProviderPosts
);

/**
 * @swagger
 * /api/posts/mentions/provider/{username}:
 *   get:
 *     summary: Lookup provider by username
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider found
 */
router.get(
  "/mentions/provider/:username",
  lookupProviderByUsername
);

/**
 * @swagger
 * /api/posts/mentions/users:
 *   get:
 *     summary: Search users for mentions
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users loaded
 */
router.get(
  "/mentions/users",
  requireAuth,
  searchUsers
);

/**
 * @swagger
 * /api/posts/mentions/services:
 *   get:
 *     summary: Search services for mentions
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Services loaded
 */
router.get(
  "/mentions/services",
  requireAuth,
  searchServices
);

/**
 * @swagger
 * /api/posts/{postId}/like:
 *   post:
 *     summary: Like or unlike post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Like updated
 */
router.post(
  "/:postId/like",
  requireViewerAuth,
  toggleLike
);

/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   get:
 *     summary: Get post comments
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comments loaded
 */
router.get(
  "/:postId/comments",
  getComments
);

/**
 * @swagger
 * /api/posts/{postId}/comments:
 *   post:
 *     summary: Create comment
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Comment created
 */
router.post(
  "/:postId/comments",
  requireViewerOrProviderAuth,
  createComment
);

/**
 * @swagger
 * /api/posts/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment and its replies
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment deleted
 */
router.delete(
  "/:postId/comments/:commentId",
  requireViewerOrProviderAuth,
  deleteComment
);

/**
 * @swagger
 * /api/posts/follow/{providerUuid}:
 *   post:
 *     summary: Follow or unfollow provider
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: providerUuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Follow updated
 */
router.post(
  "/follow/:providerUuid",
  requireViewerAuth,
  toggleFollow
);

export default router;
