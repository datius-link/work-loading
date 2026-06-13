import express from "express";
import { listRatings, listRecommendations, rateJobProvider } from "./recommendations.controller.js";
import { optionalViewerOrProviderAuth, requireViewerOrProviderAuth } from "../auth/viewerOrProviderAuth.middleware.js";

const router = express.Router();

router.get("/users/:uuid/ratings", optionalViewerOrProviderAuth, listRatings);
router.get("/users/:uuid", optionalViewerOrProviderAuth, listRecommendations);
router.get("/:profileUuid", optionalViewerOrProviderAuth, listRecommendations);
router.post("/jobs/:jobId/rate", requireViewerOrProviderAuth, rateJobProvider);

export default router;
