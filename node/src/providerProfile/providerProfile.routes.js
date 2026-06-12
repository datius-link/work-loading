import express from "express";

import {
  getMyProviderProfile,
  getMyProviderConnections,
  updateMyProviderProfile,
  getProviderProfile,
  getProviderConnections,
  searchProviderProfiles,
} from "./providerProfile.controller.js";

import { requireAuth } from "../auth/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Provider
 */

/**
 * @swagger
 * /api/service-provider/me:
 *   get:
 *     summary: Get my provider profile
 *     tags: [Provider]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile loaded
 */
router.get("/me", requireAuth, getMyProviderProfile);
/**
 * @swagger
 * /api/service-provider/me/connections:
 *   get:
 *     summary: Get my provider followers or following
 *     tags: [Provider]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connections loaded
 */
router.get("/me/connections", requireAuth, getMyProviderConnections);
/**
 * @swagger
 * /api/service-provider/search:
 *   get:
 *     summary: Search provider profiles
 *     tags: [Provider]
 *     responses:
 *       200:
 *         description: Providers loaded
 */
router.get("/search", searchProviderProfiles);

/**
 * @swagger
 * /api/service-provider/update:
 *   put:
 *     summary: Update provider profile
 *     tags: [Provider]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               username:
 *                 type: string
 *               field:
 *                 type: string
 *                 example: Plumber
 *               location:
 *                 type: string
 *                 example: Dar es Salaam
 *               bio:
 *                 type: string
 *               profilePic:
 *                 type: string
 *               contacts:
 *                 type: array
 *               services:
 *                 type: array
 *               socials:
 *                 type: array
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put(
  "/update",
  requireAuth,
  updateMyProviderProfile
);

/**
 * @swagger
 * /api/service-provider/{uuid}:
 *   get:
 *     summary: Get public provider profile
 *     tags: [Provider]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public profile loaded
 */
/**
 * @swagger
 * /api/service-provider/{uuid}/connections:
 *   get:
 *     summary: Get public provider followers or following
 *     tags: [Provider]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connections loaded
 */
router.get("/:uuid/connections", getProviderConnections);
router.get("/:uuid", getProviderProfile);

export default router;
