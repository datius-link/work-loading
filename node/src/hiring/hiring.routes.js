import express from "express";
import {
  acceptDirectHire,
  applyToJob,
  assignProvider,
  cancelJob,
  createDirectHire,
  createJob,
  declineDirectHire,
  deleteJob,
  disputeJobCloseout,
  getJob,
  getJobWorkspace,
  listJobMessages,
  listMyJobs,
  listRequests,
  confirmJobCompletion,
  confirmJobStart,
  publishJobPublicly,
  sendJobMessage,
  suggestJobCompletion,
  suggestJobStart,
  updateJob,
  withdrawApplication,
} from "./hiring.controller.js";
import { requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Hiring
 */

router.use(requireViewerOrProviderAuth);

/**
 * @swagger
 * /api/hiring/my-jobs:
 *   get:
 *     summary: List jobs created by the signed-in user
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobs loaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/my-jobs", listMyJobs);
/**
 * @swagger
 * /api/hiring/jobs:
 *   post:
 *     summary: Create a public job post
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobPayload'
 *     responses:
 *       201:
 *         description: Job created
 *       400:
 *         description: Missing required job fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/jobs", createJob);
/**
 * @swagger
 * /api/hiring/direct-hire:
 *   post:
 *     summary: Create a direct job request for one provider
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DirectHirePayload'
 *     responses:
 *       201:
 *         description: Direct job request created
 *       400:
 *         description: Missing direct hire details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/direct-hire", createDirectHire);
/**
 * @swagger
 * /api/hiring/requests:
 *   get:
 *     summary: List jobs and direct requests for a provider
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by title, service, description, or location
 *     responses:
 *       200:
 *         description: Requests loaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 */
router.get("/requests", listRequests);

router.get("/jobs/:jobId/workspace", getJobWorkspace);
router.get("/jobs/:jobId/messages", listJobMessages);
router.post("/jobs/:jobId/messages", sendJobMessage);
router.post("/jobs/:jobId/start-suggest", suggestJobStart);
router.post("/jobs/:jobId/start-confirm", confirmJobStart);
router.post("/jobs/:jobId/complete-suggest", suggestJobCompletion);
router.post("/jobs/:jobId/complete-confirm", confirmJobCompletion);
router.post("/jobs/:jobId/dispute", disputeJobCloseout);
router.post("/jobs/:id/publish", publishJobPublicly);

/**
 * @swagger
 * /api/hiring/jobs/{id}:
 *   get:
 *     summary: Get job details
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job loaded
 *       404:
 *         description: Job not found
 */
router.get("/jobs/:id", getJob);
/**
 * @swagger
 * /api/hiring/jobs/{id}:
 *   put:
 *     summary: Update a job before applications arrive
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobPayload'
 *     responses:
 *       200:
 *         description: Job updated
 *       409:
 *         description: Job can no longer be updated
 */
router.put("/jobs/:id", updateJob);
/**
 * @swagger
 * /api/hiring/jobs/{id}:
 *   delete:
 *     summary: Delete a cancelled or closed job
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job deleted
 *       409:
 *         description: Job cannot be deleted in its current state
 */
router.delete("/jobs/:id", deleteJob);
/**
 * @swagger
 * /api/hiring/jobs/{id}/cancel:
 *   post:
 *     summary: Cancel a job
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job cancelled
 */
router.post("/jobs/:id/cancel", cancelJob);
/**
 * @swagger
 * /api/hiring/jobs/{id}/apply:
 *   post:
 *     summary: Apply to a public job
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplicationPayload'
 *     responses:
 *       201:
 *         description: Application created
 *       409:
 *         description: Application already exists or job is unavailable
 */
router.post("/jobs/:id/apply", applyToJob);
/**
 * @swagger
 * /api/hiring/jobs/{id}/withdraw:
 *   post:
 *     summary: Withdraw a job application
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Application withdrawn
 */
router.post("/jobs/:id/withdraw", withdrawApplication);
/**
 * @swagger
 * /api/hiring/jobs/{id}/assign:
 *   post:
 *     summary: Assign an applicant and close applications
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignProviderPayload'
 *     responses:
 *       200:
 *         description: Provider assigned
 */
router.post("/jobs/:id/assign", assignProvider);
/**
 * @swagger
 * /api/hiring/jobs/{id}/accept-direct:
 *   post:
 *     summary: Accept a direct hire request
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Direct hire accepted
 */
router.post("/jobs/:id/accept-direct", acceptDirectHire);
/**
 * @swagger
 * /api/hiring/jobs/{id}/decline-direct:
 *   post:
 *     summary: Decline a direct hire request
 *     tags: [Hiring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Direct hire declined
 */
router.post("/jobs/:id/decline-direct", declineDirectHire);

export default router;
