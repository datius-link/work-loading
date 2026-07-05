import express from "express";
import {
  listNotifications,
  markNotificationRead,
  registerPushToken,
  unregisterPushToken,
} from "./notifications.controller.js";
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

/**
 * @swagger
 * /api/notifications/push-token:
 *   post:
 *     summary: Register (or re-own) this device's Expo push token
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Push token registered
 *   delete:
 *     summary: Remove this device's Expo push token (e.g. on logout)
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Push token removed
 */
router.post("/push-token", registerPushToken);
router.delete("/push-token", unregisterPushToken);

export default router;
