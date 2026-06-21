import express from "express";
import { optionalViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";
import { search } from "./search.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search people, posts, skills, and hashtags
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [top, posts, people, hashtags]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ranked search results
 */
router.get("/", optionalViewerOrProviderAuth, search);

export default router;
