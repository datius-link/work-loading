import express from "express";
import { requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";
import { contactAdmin, reportProblem, sendFeedback } from "./support.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Support
 *     description: Authenticated contact, feedback, and problem reporting
 */

router.use(requireViewerOrProviderAuth);

/**
 * @swagger
 * /api/support/contact-admin:
 *   post:
 *     summary: Send a private message to the e-kazi admin team
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject:
 *                 type: string
 *                 example: Help with my job workspace
 *               message:
 *                 type: string
 *                 example: I need help understanding the current job status.
 *               type:
 *                 type: string
 *                 example: contact_admin
 *     responses:
 *       201:
 *         description: Support request saved
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Bearer token missing or invalid
 */
router.post("/contact-admin", contactAdmin);

/**
 * @swagger
 * /api/support/feedback:
 *   post:
 *     summary: Send product feedback
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, message]
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [UI, Jobs, Posts, Notifications, Performance, Other]
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 example: feedback
 *     responses:
 *       201:
 *         description: Feedback saved
 *       401:
 *         description: Bearer token missing or invalid
 */
router.post("/feedback", sendFeedback);

/**
 * @swagger
 * /api/support/reports:
 *   post:
 *     summary: Report a problem to the support team
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [problem_type, description]
 *             properties:
 *               problem_type:
 *                 type: string
 *                 example: Bug or technical issue
 *               description:
 *                 type: string
 *                 example: Tell us what happened and where it happened.
 *               type:
 *                 type: string
 *                 example: report_problem
 *     responses:
 *       201:
 *         description: Problem report saved
 *       401:
 *         description: Bearer token missing or invalid
 */
router.post("/reports", reportProblem);

export default router;
