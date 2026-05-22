import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import postsRoutes from "./posts/posts.routes.js";
import authRoutes from "./auth/auth.routes.js";
import providerProfileRoutes from "./providerProfile/providerProfile.routes.js";

import db from "./db/index.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/service-provider", providerProfileRoutes);
app.use("/api/posts", postsRoutes);

// HEALTH CHECK
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "e-kazi-api",
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// ERROR HANDLER
app.use((err, _req, res, _next) => {
  console.error("🔥 Server error:", err);

  res.status(500).json({
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

// DATABASE CONNECTION TEST
db.raw("SELECT 1")
  .then(() => {
    console.log("✅ PostgreSQL Connected");

    // START SERVER ONLY IF DB CONNECTS
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ PostgreSQL Connection Failed");
    console.error(err.message);
  });