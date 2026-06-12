import express from "express";
import { listNotifications, markNotificationRead } from "./notifications.controller.js";
import { requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Notifications
 */

router.use(requireViewerOrProviderAuth);
/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: List my notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notifications loaded
 */
router.get("/", listNotifications);
/**
 * @swagger
 * /api/notifications/{id}/read:
 *   post:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notification updated
 */
router.post("/:id/read", markNotificationRead);

export default router;
