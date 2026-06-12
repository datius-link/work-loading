import express from "express";
import { listRecommendations, rateJobProvider } from "./recommendations.controller.js";
import { optionalViewerOrProviderAuth, requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";

const router = express.Router();

router.get("/:profileUuid", optionalViewerOrProviderAuth, listRecommendations);
router.post("/jobs/:jobId/rate", requireViewerOrProviderAuth, rateJobProvider);

export default router;
