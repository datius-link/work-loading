import express from "express";
import { updateProfile } from "../../controllers/serviceProvideProfile/serviceProviderController.js";
import { uploadImage } from "../../controllers/serviceProvideProfile/uploadController.js";

const router = express.Router();

router.put("/update",  updateProfile);
router.post("/upload-pic",  uploadImage);

export default router;