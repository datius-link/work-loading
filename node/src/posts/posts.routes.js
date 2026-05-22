import express from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createPost,
  listPublicPosts,
  searchUsers,
  searchServices,
} from "./posts.controller.js";

const router = express.Router();

/* PUBLIC EXPLORE FEED */
router.get("/public", listPublicPosts);

/* CREATE POST */
router.post("/", requireAuth, createPost);

/* MENTIONS */
router.get("/mentions/users", requireAuth, searchUsers);
router.get("/mentions/services", requireAuth, searchServices);

export default router;
