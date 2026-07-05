import express from "express";
import { adminLogin, getAdminMe } from "./admin.controller.js";
import { requireAdminAuth } from "./admin.middleware.js";
import {
  getDashboardSummary,
  getSupportRequest,
  listSupportRequests,
  updateSupportRequest,
} from "./adminSupport.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Admin web panel authentication and account
 */

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Admin sign-in for the web panel
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Signed in
 *       401:
 *         description: Invalid email or password
 */
router.post("/auth/login", adminLogin);

/**
 * @swagger
 * /api/admin/me:
 *   get:
 *     summary: Get the signed-in admin's profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile
 *       401:
 *         description: Missing or invalid admin token
 */
router.get("/me", requireAdminAuth, getAdminMe);

/**
 * @swagger
 * /api/admin/dashboard-summary:
 *   get:
 *     summary: Counts for the admin dashboard (open support requests, disputes)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary counts
 */
router.get("/dashboard-summary", requireAdminAuth, getDashboardSummary);

/**
 * @swagger
 * /api/admin/support:
 *   get:
 *     summary: List support requests (Contact Us, feedback, problem reports)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [contact_admin, feedback, report_problem] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, in_progress, resolved] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of support requests
 */
router.get("/support", requireAdminAuth, listSupportRequests);

/**
 * @swagger
 * /api/admin/support/{id}:
 *   get:
 *     summary: Get a single support request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Support request
 *       404:
 *         description: Not found
 *   patch:
 *     summary: Update a support request's status or admin note
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, resolved]
 *               admin_note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated support request
 */
router.get("/support/:id", requireAdminAuth, getSupportRequest);
router.patch("/support/:id", requireAdminAuth, updateSupportRequest);

export default router;
