import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import postsRoutes from "./posts/posts.routes.js";


/* ---------------------------
   LOAD ENV
--------------------------- */
dotenv.config();

/* ---------------------------
   APP INIT
--------------------------- */
const app = express();

/* ---------------------------
   GLOBAL MIDDLEWARES
--------------------------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------------------
   ROUTES
--------------------------- */
import authRoutes from "./auth/auth.routes.js";
import providerProfileRoutes from "./providerProfile/providerProfile.routes.js";

app.use("/api/auth", authRoutes);
app.use("/api/service-provider", providerProfileRoutes);
app.use("/api/posts", postsRoutes);

/* ---------------------------
   HEALTH CHECK
--------------------------- */
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "e-kazi-api",
    timestamp: new Date().toISOString(),
  });
});

/* ---------------------------
   404 HANDLER
--------------------------- */
app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

/* ---------------------------
   GLOBAL ERROR HANDLER
--------------------------- */
app.use((err, _req, res, _next) => {
  console.error("🔥 Server error:", err);

  res.status(500).json({
    message: "Internal server error",
  });
});

/* ---------------------------
   START SERVER
--------------------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
