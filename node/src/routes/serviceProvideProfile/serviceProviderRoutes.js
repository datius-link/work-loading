import express from "express";
import { getMyProfile, updateProfile } from "../../controllers/serviceProvideProfile/serviceProviderController.js";
import { verifyAuth } from "../../middleware/verifyAuth.js";

const router = express.Router();

router.get("/me", verifyAuth, getMyProfile);

router.put("/update", verifyAuth, updateProfile);

export default router;

