import express from "express";
import { listRatings, listRecommendations, rateJobProvider, recommendJobProvider } from "./recommendations.controller.js";
import { optionalViewerOrProviderAuth, requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Recommendations
 */

/**
 * @swagger
 * /api/recommendations/users/{uuid}/ratings:
 *   get:
 *     summary: List star ratings for a provider
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ratings loaded
 */
router.get("/users/:uuid/ratings", optionalViewerOrProviderAuth, listRatings);

/**
 * @swagger
 * /api/recommendations/users/{uuid}:
 *   get:
 *     summary: List written recommendations for a provider
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recommendations loaded
 */
router.get("/users/:uuid", optionalViewerOrProviderAuth, listRecommendations);

/**
 * @swagger
 * /api/recommendations/{profileUuid}:
 *   get:
 *     summary: List recommendations by profile UUID (alternate lookup)
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: profileUuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recommendations loaded
 */
router.get("/:profileUuid", optionalViewerOrProviderAuth, listRecommendations);

/**
 * @swagger
 * /api/recommendations/jobs/{jobId}/rate:
 *   post:
 *     summary: Rate a provider after job completion
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Rating saved
 *       401:
 *         description: Bearer token missing or invalid
 */
router.post("/jobs/:jobId/rate", requireViewerOrProviderAuth, rateJobProvider);

/**
 * @swagger
 * /api/recommendations/jobs/{jobId}/recommend:
 *   post:
 *     summary: Write a recommendation for a provider after job completion
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Great work, arrived on time and fixed everything."
 *     responses:
 *       201:
 *         description: Recommendation saved
 *       401:
 *         description: Bearer token missing or invalid
 */
router.post("/jobs/:jobId/recommend", requireViewerOrProviderAuth, recommendJobProvider);

export default router;
