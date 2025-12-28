import express from "express";
import { registerUser, loginUser, resetPassword, getMe, forgotPassword, verifyResetOtp } from "../controllers/auth/authController.js";
import { lightLogin } from "../controllers/LightUser/lightAuth.controller.js";
import { mockSendOtp, mockVerifyOtp } from "../controllers/auth/otp.controller.js";
import { sendVerificationOtp } from "../controllers/auth/otp.controller.js";
import { updateServiceProviderDetails } from "../controllers/auth/authController.js";
import { verifyAuth } from "../middleware/verifyAuth.js";
import { verifyOtp } from "../controllers/auth/otp.controller.js";

const router = express.Router();

router.post(
  "/update-service-provider-details",
  verifyAuth,
  updateServiceProviderDetails
);

router.post(
  "/send-verification-otp",
  verifyAuth,
  sendVerificationOtp
);

router.post(
  "/verify-otp",
  verifyAuth,
  verifyOtp
);

router.post("/register", registerUser);
router.post("/login", loginUser);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/light-login", lightLogin);
router.post("/mock-send-otp", mockSendOtp);
router.post("/mock-verify-otp", mockVerifyOtp);

router.get("/me", verifyAuth, getMe);

router.post("/verify-reset-otp", verifyResetOtp)
export default router;
