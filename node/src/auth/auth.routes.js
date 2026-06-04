import express from "express";

import {
  register,
  login,
  verifyProvider,
  verificationInfo,
  requestVerificationCode,
  updateEmail,
  forgotPassword,
  verifyPasswordResetCode,
  resetPassword,
  requestViewerCode,
  verifyViewerCode,
} from "./auth.controller.js";

import { requireAnyToken } from "./auth.anyToken.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Password
 *   - name: Viewer
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register provider
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: provider@gmail.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       201:
 *         description: Registered successfully
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login provider
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/verify-provider:
 *   post:
 *     summary: Verify provider account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verifyToken:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Verification successful
 */
router.post("/verify-provider", verifyProvider);

/**
 * @swagger
 * /api/auth/verification-info:
 *   get:
 *     summary: Get verification info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification info loaded
 */
router.get(
  "/verification-info",
  requireAnyToken,
  verificationInfo
);

/**
 * @swagger
 * /api/auth/request-code:
 *   post:
 *     summary: Request verification code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verifyToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code sent
 */
router.post("/request-code", requestVerificationCode);

/**
 * @swagger
 * /api/auth/update-email:
 *   post:
 *     summary: Update provider email
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: newemail@gmail.com
 *     responses:
 *       200:
 *         description: Email updated
 */
router.post(
  "/update-email",
  requireAnyToken,
  updateEmail
);

/**
 * @swagger
 * /api/auth/password/forgot:
 *   post:
 *     summary: Request password reset code
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset code sent
 */
router.post("/password/forgot", forgotPassword);

/**
 * @swagger
 * /api/auth/password/verify-code:
 *   post:
 *     summary: Verify password reset code
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code verified
 */
router.post(
  "/password/verify-code",
  verifyPasswordResetCode
);

/**
 * @swagger
 * /api/auth/password/reset:
 *   post:
 *     summary: Reset password
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post("/password/reset", resetPassword);

/**
 * @swagger
 * /api/auth/viewer/request-code:
 *   post:
 *     summary: Request viewer code
 *     tags: [Viewer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "255712345678"
 *     responses:
 *       200:
 *         description: Viewer code sent
 */
router.post(
  "/viewer/request-code",
  requestViewerCode
);

/**
 * @swagger
 * /api/auth/viewer/verify:
 *   post:
 *     summary: Verify viewer account
 *     tags: [Viewer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Viewer verified
 */
router.post("/viewer/verify", verifyViewerCode);

export default router;