import express from "express";
import { register, login, verifyProvider, verificationInfo, requestVerificationCode, updateEmail } from "./auth.controller.js";
import { requireAnyToken } from "./auth.anyToken.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-provider", verifyProvider);
router.get("/verification-info", verificationInfo);
router.post("/request-code", requestVerificationCode);
router.post("/update-email", requireAnyToken, updateEmail);

export default router;
