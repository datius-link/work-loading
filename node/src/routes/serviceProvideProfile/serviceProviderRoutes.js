import express from "express";
import { getMyProfile } from "../../controllers/serviceProvideProfile/serviceProviderController.js";
import authMiddleware from "../../middleware/auth.js";
import { updateProfile } from "../../controllers/serviceProvideProfile/serviceProviderController.js";

const router = express.Router();

router.get("/me", authMiddleware, getMyProfile);
router.put("/update", authMiddleware, updateProfile);

export default router;
