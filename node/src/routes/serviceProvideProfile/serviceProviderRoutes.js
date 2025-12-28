import express from "express";
import { getMyProfile, updateProfile } from "../../controllers/serviceProvideProfile/serviceProviderController.js";
import { uploadImage } from "../../controllers/serviceProvideProfile/uploadController.js";
import { verifyAuth } from "../../middleware/verifyAuth.js";

const router = express.Router();

router.get("/me", verifyAuth, getMyProfile);

router.put("/update", verifyAuth, updateProfile);

router.post("/upload-pic", verifyAuth, uploadImage);

export default router;

