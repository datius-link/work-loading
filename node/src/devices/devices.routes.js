import express from "express";
import { listMyDevices, trustDevice, untrustDevice } from "./devices.controller.js";
import { requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Devices
 */

/**
 * @swagger
 * /api/devices/me:
 *   get:
 *     summary: List trusted devices for the current account
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trusted devices
 */
router.get("/me", requireViewerOrProviderAuth, listMyDevices);

/**
 * @swagger
 * /api/devices/trust:
 *   post:
 *     summary: Enable biometric quick-login for this account on this device (revokes any other account's trust on the same device)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Device trusted
 */
router.post("/trust", requireViewerOrProviderAuth, trustDevice);

/**
 * @swagger
 * /api/devices/untrust:
 *   post:
 *     summary: Disable biometric quick-login for this account on this device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Device untrusted
 */
router.post("/untrust", requireViewerOrProviderAuth, untrustDevice);

export default router;
