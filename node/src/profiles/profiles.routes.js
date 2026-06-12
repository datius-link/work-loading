import express from "express";
import {
  getMyConnections,
  getMyProfile,
  getProfile,
  getProfileConnections,
  requestMyPhoneOtp,
  updateMyProfile,
  verifyMyPhoneOtp,
} from "./profiles.controller.js";
import {
  optionalViewerOrProviderAuth,
  requireViewerOrProviderAuth,
} from "../auth/viewerOrProviderAuth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Profiles
 */

/**
 * @swagger
 * /api/profiles/{uuid}:
 *   get:
 *     summary: Get a shared public profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile loaded
 */
router.get("/me/connections", requireViewerOrProviderAuth, getMyConnections);
router.get("/me", requireViewerOrProviderAuth, getMyProfile);
router.post("/me/phone/request-otp", requireViewerOrProviderAuth, requestMyPhoneOtp);
router.post("/me/phone/verify-otp", requireViewerOrProviderAuth, verifyMyPhoneOtp);
router.get("/:uuid/connections", optionalViewerOrProviderAuth, getProfileConnections);
router.get("/:uuid", optionalViewerOrProviderAuth, getProfile);
/**
 * @swagger
 * /api/profiles/me:
 *   put:
 *     summary: Update my shared profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/me", requireViewerOrProviderAuth, updateMyProfile);

export default router;
