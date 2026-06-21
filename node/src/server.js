import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./auth/auth.routes.js";
import providerProfileRoutes from "./providerProfile/providerProfile.routes.js";
import postsRoutes from "./posts/posts.routes.js";
import hiringRoutes from "./hiring/hiring.routes.js";
import notificationsRoutes from "./notifications/notifications.routes.js";
import profilesRoutes from "./profiles/profiles.routes.js";
import recommendationsRoutes from "./recommendations/recommendations.routes.js";
import searchRoutes from "./search/search.routes.js";
import supportRoutes from "./support/support.routes.js";

import { setupSwagger } from "./config/swagger.js";

import db from "./db/index.js";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

setupSwagger(app);

app.use("/api/auth", authRoutes);

app.use(
  "/api/service-provider",
  providerProfileRoutes
);

app.use("/api/posts", postsRoutes);
app.use("/api/hiring", hiringRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/support", supportRoutes);

app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "e-kazi-api",
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, res) => {
  return res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, _req, res, _next) => {
  console.error("🔥 Server error:", err);
  const status = err.status || err.statusCode || 500;

  return res.status(status).json({
    message: err.expose ? err.message : "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await db.raw("SELECT 1");

    console.log("✅ PostgreSQL Connected");

    await db.migrate.latest();

    console.log("✅ Migrations up to date");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 Server running on port ${PORT}`
      );

      console.log(
        `📚 Swagger Docs: http://localhost:${PORT}/api-docs`
      );

      console.log(
        `❤️ Health Check: http://localhost:${PORT}/health`
      );
    });
  } catch (err) {
    console.error(
      "❌ Failed to start server"
    );

    console.error(err);
  }
}

startServer();
