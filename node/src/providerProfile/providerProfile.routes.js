import express from "express";
import { getMyProviderProfile,
     updateMyProviderProfile } from "./providerProfile.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";

const router = express.Router();

router.get("/me", requireAuth, getMyProviderProfile);
router.put("/update", requireAuth, updateMyProviderProfile);

export default router;
