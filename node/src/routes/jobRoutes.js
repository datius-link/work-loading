import express from "express";
import { createJob } from "../controllers/LightUser/job.controller.js";
import { requireLightAuth } from "../../middleware/lightAuth.js";

const router = express.Router();

router.post("/", requireLightAuth, createJob);

export default router;
