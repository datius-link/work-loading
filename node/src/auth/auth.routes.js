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
} from "./auth.controller.js";
import { requireAnyToken } from "./auth.anyToken.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-provider", verifyProvider);
router.get("/verification-info", requireAnyToken, verificationInfo);
router.post("/request-code", requestVerificationCode);
router.post("/update-email", requireAnyToken, updateEmail);
router.post("/password/forgot", forgotPassword);
router.post("/password/verify-code", verifyPasswordResetCode);
router.post("/password/reset", resetPassword);

export default router;
