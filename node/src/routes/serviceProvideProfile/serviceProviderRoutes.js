import express from "express";
import { getMyProfile, updateProfile } from "../../controllers/serviceProvideProfile/serviceProviderController.js";
import { uploadImage } from "../../controllers/serviceProvideProfile/uploadController.js";
import authMiddleware from "../../middleware/auth.js";

const router = express.Router();

router.get("/me", authMiddleware, getMyProfile);
router.put("/update", authMiddleware, updateProfile);
router.post("/upload-pic", authMiddleware, uploadImage);

export default router;