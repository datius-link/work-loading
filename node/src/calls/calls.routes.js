import express from "express";
import { requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";
import { notifyIncomingCall, logCallOutcome, listCallHistory } from "./calls.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Calls
 *     description: Push notification trigger for real in-app WebRTC calling (signaling itself happens over Convex)
 */

router.use(requireViewerOrProviderAuth);

/**
 * @swagger
 * /api/calls/notify:
 *   post:
 *     summary: Notify a user of an incoming in-app call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [calleeUuid, callId]
 *             properties:
 *               calleeUuid:
 *                 type: string
 *               callId:
 *                 type: string
 *               callerName:
 *                 type: string
 *               jobId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Callee notified
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Bearer token missing or invalid
 */
router.post("/notify", notifyIncomingCall);

/**
 * @swagger
 * /api/calls/log:
 *   post:
 *     summary: Record the final outcome of a call for a job's Calls tab
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Call outcome recorded
 *       400:
 *         description: Invalid payload
 *       403:
 *         description: Not a participant in this call/job
 */
router.post("/log", logCallOutcome);

/**
 * @swagger
 * /api/calls/job/{jobId}:
 *   get:
 *     summary: List call history for a job (the workspace Calls tab)
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Call history loaded
 */
router.get("/job/:jobId", listCallHistory);

export default router;
