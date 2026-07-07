import express from "express";
import {
  changeMyPassword,
  getMyConnections,
  getMyProfile,
  getProfile,
  getProfileConnections,
  requestMyPhoneOtp,
  updateMyProfile,
  verifyMyPassword,
  verifyMyPhoneOtp,
} from "./profiles.controller.js";
import {
  optionalViewerOrProviderAuth,
  requireViewerOrProviderAuth,
} from "../auth/viewerOrProviderAuth.middleware.js";
import { otpAttemptLimiter, passwordAttemptLimiter } from "../utils/rateLimit.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Profiles
 */

/**
 * @swagger
 * /api/profiles/me:
 *   get:
 *     summary: Get my profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile loaded
 */
router.get("/me", requireViewerOrProviderAuth, getMyProfile);

/**
 * @swagger
 * /api/profiles/me/connections:
 *   get:
 *     summary: Get my followers and following
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connections loaded
 */
router.get("/me/connections", requireViewerOrProviderAuth, getMyConnections);

/**
 * @swagger
 * /api/profiles/me/phone/request-otp:
 *   post:
 *     summary: Request OTP to verify my phone number
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+255712345678"
 *     responses:
 *       200:
 *         description: OTP sent
 */
router.post("/me/phone/request-otp", requireViewerOrProviderAuth, requestMyPhoneOtp);

/**
 * @swagger
 * /api/profiles/me/phone/verify-otp:
 *   post:
 *     summary: Verify my phone number with OTP
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Phone verified
 */
router.post("/me/phone/verify-otp", requireViewerOrProviderAuth, otpAttemptLimiter, verifyMyPhoneOtp);

/**
 * @swagger
 * /api/profiles/{uuid}/connections:
 *   get:
 *     summary: Get a user's public followers and following
 *     tags: [Profiles]
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
router.get("/:uuid/connections", optionalViewerOrProviderAuth, getProfileConnections);

/**
 * @swagger
 * /api/profiles/{uuid}:
 *   get:
 *     summary: Get a shared public profile
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile loaded
 */
router.get("/:uuid", optionalViewerOrProviderAuth, getProfile);

/**
 * @swagger
 * /api/profiles/me:
 *   put:
 *     summary: Update my profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/me", requireViewerOrProviderAuth, updateMyProfile);

/**
 * @swagger
 * /api/profiles/me/change-password:
 *   post:
 *     summary: Change my password
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post("/me/change-password", requireViewerOrProviderAuth, passwordAttemptLimiter, changeMyPassword);

/**
 * @swagger
 * /api/profiles/me/verify-password:
 *   post:
 *     summary: Verify current password (e.g. before sensitive action)
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password verified
 */
router.post("/me/verify-password", requireViewerOrProviderAuth, passwordAttemptLimiter, verifyMyPassword);

export default router;
